// Phase 3: clean up the generated *.module.css files:
//   1) drop classes with no remaining JSX reference (orphans),
//   2) dedupe classes whose bodies are byte-identical (rewrite JSX refs),
//   3) group surviving classes by the React component that consumes them,
//      emitting /* === ComponentName === */ section headers for navigability.
//
// Visual output is preserved: orphans cannot affect the DOM, duplicates
// produce identical CSS, and reordering classes within the same file is
// safe because each class has a unique, non-overlapping selector.

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const KIT_DIR = path.resolve(__dirname, '../src/shared/ui/kit');

function parseCssRules(text) {
  const rules = [];
  const re = /\.([A-Za-z][\w-]*)\s*\{([\s\S]*?)\}/g;
  let m;
  while ((m = re.exec(text))) {
    const className = m[1];
    const body = m[2]
      .split(/;/)
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => s.replace(/\s+/g, ' '))
      .join(';');
    rules.push({ className, body });
  }
  return rules;
}

function canonicalBody(body) {
  return body.split(';').map(s => s.trim()).filter(Boolean).sort().join(';');
}

function walkJsx(ast) {
  /* Returns:
       usages: Map<className, count>
       byFunction: Map<functionName, Set<className>>
       classToFunction: Map<className, functionName[]> (for grouping) */
  const usages = new Map();
  const byFunction = new Map();
  const stack = [];

  function collectFromExpr(e, out) {
    if (!e) return;
    if (e.type === 'MemberExpression' && e.object.type === 'Identifier' && e.object.name === 'styles' && e.property.type === 'Identifier') {
      out.push(e.property.name);
    } else if (e.type === 'TemplateLiteral') {
      for (const ex of e.expressions) collectFromExpr(ex, out);
    } else if (e.type === 'BinaryExpression') {
      collectFromExpr(e.left, out); collectFromExpr(e.right, out);
    } else if (e.type === 'ConditionalExpression') {
      collectFromExpr(e.consequent, out); collectFromExpr(e.alternate, out);
    } else if (e.type === 'LogicalExpression') {
      collectFromExpr(e.left, out); collectFromExpr(e.right, out);
    }
  }
  function refsFromClassAttr(a) {
    if (!a || !a.value) return [];
    const out = [];
    if (a.value.type === 'JSXExpressionContainer') collectFromExpr(a.value.expression, out);
    return out;
  }

  traverse(ast, {
    FunctionDeclaration: {
      enter(p) { if (p.node.id) stack.push(p.node.id.name); },
      exit(p) { if (p.node.id) stack.pop(); },
    },
    VariableDeclarator: {
      enter(p) {
        if (p.node.init && (p.node.init.type === 'ArrowFunctionExpression' || p.node.init.type === 'FunctionExpression')) {
          if (p.node.id && p.node.id.type === 'Identifier') stack.push(p.node.id.name);
        }
      },
      exit(p) {
        if (p.node.init && (p.node.init.type === 'ArrowFunctionExpression' || p.node.init.type === 'FunctionExpression')) {
          if (p.node.id && p.node.id.type === 'Identifier') stack.pop();
        }
      },
    },
    JSXOpeningElement(p) {
      const attrs = p.node.attributes;
      for (const a of attrs) {
        if (a.type !== 'JSXAttribute' || !a.name || a.name.name !== 'className') continue;
        const refs = refsFromClassAttr(a);
        const fn = stack.length ? stack[stack.length - 1] : '_orphan';
        for (const r of refs) {
          usages.set(r, (usages.get(r) || 0) + 1);
          if (!byFunction.has(fn)) byFunction.set(fn, new Set());
          byFunction.get(fn).add(r);
        }
      }
    },
  });

  return { usages, byFunction };
}

function rewriteJsxReferences(jsxSrc, aliasMap) {
  // Simple safe replacement: `styles.OLD` → `styles.NEW` at word boundary.
  let out = jsxSrc;
  // Apply longer names first to prevent prefix clashes.
  const keys = [...aliasMap.keys()].sort((a, b) => b.length - a.length);
  for (const oldName of keys) {
    const newName = aliasMap.get(oldName);
    if (oldName === newName) continue;
    const re = new RegExp(`\\bstyles\\.${oldName}\\b`, 'g');
    out = out.replace(re, `styles.${newName}`);
  }
  return out;
}

function formatRule(className, body) {
  const decls = body.split(';').map(s => s.trim()).filter(Boolean);
  return `.${className} {\n${decls.map(d => `  ${d};`).join('\n')}\n}`;
}

function sectionTitle(fn) {
  if (fn === '_orphan') return 'module-level helpers';
  return fn;
}

function processModule(folder) {
  const cssPath = path.join(KIT_DIR, folder, `${folder}.module.css`);
  const jsxPath = path.join(KIT_DIR, folder, `${folder}.jsx`);
  if (!fs.existsSync(cssPath) || !fs.existsSync(jsxPath)) return null;

  const jsxSrc = fs.readFileSync(jsxPath, 'utf8');
  const ast = parser.parse(jsxSrc, { sourceType: 'module', plugins: ['jsx'] });
  const { usages, byFunction } = walkJsx(ast);

  const rules = parseCssRules(fs.readFileSync(cssPath, 'utf8'));

  // Dedupe: collapse classes whose canonical body is identical. The first
  // occurrence keeps its name; others become aliases pointing at that name.
  const byCanonical = new Map();
  const aliasMap = new Map(); // oldName → canonicalName
  for (const r of rules) {
    const key = canonicalBody(r.body);
    if (!byCanonical.has(key)) {
      byCanonical.set(key, r.className);
      aliasMap.set(r.className, r.className);
    } else {
      aliasMap.set(r.className, byCanonical.get(key));
    }
  }

  // Rewrite JSX to use canonical names for duplicates.
  const aliasesForRewrite = new Map(
    [...aliasMap.entries()].filter(([o, n]) => o !== n)
  );
  let newJsx = jsxSrc;
  if (aliasesForRewrite.size) newJsx = rewriteJsxReferences(jsxSrc, aliasesForRewrite);

  // Build the final, live class list: one rule per canonical body.
  const liveRules = [];
  const seen = new Set();
  for (const r of rules) {
    if (seen.has(r.className)) continue;
    const canonical = aliasMap.get(r.className);
    if (canonical !== r.className) continue; // it's an alias — skip, the canonical owner remains
    // Count how many JSX refs point to this canonical class after rewrite.
    let refs = usages.get(r.className) || 0;
    for (const [old, canon] of aliasMap.entries()) {
      if (old === r.className) continue;
      if (canon === r.className) refs += usages.get(old) || 0;
    }
    if (refs === 0) continue; // orphan — drop
    seen.add(r.className);
    liveRules.push(r);
  }

  // Group by component function: primary owner = function that has the most usages of this class.
  // Simpler heuristic: order components by first appearance in the JSX AST; for each class,
  // assign it to the first component that references it.
  const componentOrder = [...byFunction.keys()];
  const classToSection = new Map();
  for (const r of liveRules) {
    let owner = '_orphan';
    for (const fn of componentOrder) {
      const refs = byFunction.get(fn);
      if (refs.has(r.className) || [...aliasMap.entries()].some(([o, c]) => c === r.className && refs.has(o))) {
        owner = fn; break;
      }
    }
    classToSection.set(r.className, owner);
  }

  // Sort components by their first appearance in the file for stable output.
  const sections = new Map();
  for (const r of liveRules) {
    const s = classToSection.get(r.className);
    if (!sections.has(s)) sections.set(s, []);
    sections.get(s).push(r);
  }

  // Emit CSS.
  const pieces = [];
  // Order: components in source order, then _orphan last.
  const orderedSections = [...sections.keys()].sort((a, b) => {
    if (a === '_orphan') return 1;
    if (b === '_orphan') return -1;
    return componentOrder.indexOf(a) - componentOrder.indexOf(b);
  });
  for (const s of orderedSections) {
    pieces.push(`/* ═══════════════ ${sectionTitle(s)} ═══════════════ */`);
    for (const r of sections.get(s)) pieces.push(formatRule(r.className, r.body));
  }
  const finalCss = pieces.join('\n\n') + '\n';

  fs.writeFileSync(cssPath, finalCss);
  if (newJsx !== jsxSrc) fs.writeFileSync(jsxPath, newJsx);

  return {
    folder,
    before: rules.length,
    after: liveRules.length,
    deduped: aliasesForRewrite.size,
    orphans: rules.length - liveRules.length - aliasesForRewrite.size,
  };
}

const folders = fs.readdirSync(KIT_DIR).filter(f => fs.statSync(path.join(KIT_DIR, f)).isDirectory());
let tBefore = 0, tAfter = 0, tDedup = 0, tOrph = 0;
for (const folder of folders) {
  const r = processModule(folder);
  if (!r) continue;
  console.log(`${folder}: ${r.before}→${r.after} classes (dedup ${r.deduped}, orphans ${r.orphans})`);
  tBefore += r.before; tAfter += r.after; tDedup += r.deduped; tOrph += r.orphans;
}
console.log(`total: ${tBefore}→${tAfter} classes (dedup ${tDedup}, orphans ${tOrph})`);
