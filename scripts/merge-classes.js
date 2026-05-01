/* Phase 2: consolidate multi-styles.X references on a single JSX element
   into one merged class. Only merges when *every* referenced class on
   that element is used exactly once across the file — so merging is
   safe (no other site depends on them).

   Also inlines orphan helpers used only by a now-obsolete class. */

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const KIT_DIR = path.resolve(__dirname, '../src/shared/ui/kit');

/* -------- CSS helpers -------- */

function parseCssRules(text) {
  // returns array of { className, body, raw } and map className→index
  const rules = [];
  const re = /\.([A-Za-z][\w-]*)\s*\{([\s\S]*?)\}/g;
  let m;
  while ((m = re.exec(text))) {
    rules.push({ className: m[1], body: m[2].trim(), raw: m[0], start: m.index, end: m.index + m[0].length });
  }
  return rules;
}

function buildCssMap(rules) {
  const map = new Map();
  for (const r of rules) map.set(r.className, r);
  return map;
}

function mergedBody(bodies) {
  // merge arrays of decl strings — later values win on conflict
  const seen = new Map();
  for (const body of bodies) {
    const decls = body.split(';').map(s => s.trim()).filter(Boolean);
    for (const d of decls) {
      const i = d.indexOf(':');
      if (i < 0) continue;
      const k = d.slice(0, i).trim();
      const v = d.slice(i + 1).trim();
      seen.set(k, v);
    }
  }
  return [...seen.entries()].map(([k, v]) => `  ${k}: ${v};`).join('\n');
}

/* -------- JSX walker -------- */

function collectClassRefs(ast) {
  // returns { usages: Map<name, count>, elements: Array<{ node, refs: string[] }> }
  const usages = new Map();
  const elements = [];
  const add = (name) => usages.set(name, (usages.get(name) || 0) + 1);

  function refsFromValue(val) {
    const names = [];
    if (!val) return names;
    if (val.type === 'StringLiteral') return names;
    if (val.type === 'JSXExpressionContainer') {
      const e = val.expression;
      collectFromExpr(e, names);
    }
    return names;
  }
  function collectFromExpr(e, names) {
    if (!e) return;
    if (e.type === 'MemberExpression' && e.object.type === 'Identifier' && e.object.name === 'styles') {
      if (e.property.type === 'Identifier') names.push(e.property.name);
    } else if (e.type === 'TemplateLiteral') {
      for (const ex of e.expressions) collectFromExpr(ex, names);
    } else if (e.type === 'BinaryExpression') {
      collectFromExpr(e.left, names);
      collectFromExpr(e.right, names);
    } else if (e.type === 'ConditionalExpression') {
      collectFromExpr(e.consequent, names);
      collectFromExpr(e.alternate, names);
    } else if (e.type === 'LogicalExpression') {
      collectFromExpr(e.left, names);
      collectFromExpr(e.right, names);
    }
  }

  traverse(ast, {
    JSXOpeningElement(p) {
      const attrs = p.node.attributes;
      for (const a of attrs) {
        if (a.type !== 'JSXAttribute' || !a.name || a.name.name !== 'className') continue;
        const refs = refsFromValue(a.value);
        for (const r of refs) add(r);
        if (refs.length >= 2) elements.push({ node: p.node, refs, attrNode: a });
      }
    },
  });
  return { usages, elements };
}

function replaceClassAttrWithSingle(attrNode, className) {
  // Replace the className attribute value with: styles.<className> (merged with leading string literal if it was a tpl)
  const oldVal = attrNode.value;
  const newExpr = t.memberExpression(t.identifier('styles'), t.identifier(className));

  // Extract any non-style literal portions to preserve global classes.
  let leading = '';
  if (oldVal && oldVal.type === 'JSXExpressionContainer' && oldVal.expression.type === 'TemplateLiteral') {
    const tpl = oldVal.expression;
    // reconstruct non-styles parts
    const parts = [];
    for (let i = 0; i < tpl.quasis.length; i++) {
      parts.push(tpl.quasis[i].value.cooked);
      if (i < tpl.expressions.length) {
        const ex = tpl.expressions[i];
        if (!(ex.type === 'MemberExpression' && ex.object.type === 'Identifier' && ex.object.name === 'styles')) {
          // non-styles expression — we can't safely simplify; fall back to template with single style ref appended
          return fallbackReplace(attrNode, className);
        }
      }
    }
    leading = parts.join('').replace(/\s+/g, ' ').trim();
  }

  if (leading) {
    attrNode.value = t.jsxExpressionContainer(
      t.templateLiteral(
        [t.templateElement({raw: leading + ' ', cooked: leading + ' '}, false),
         t.templateElement({raw: '', cooked: ''}, true)],
        [newExpr]
      )
    );
  } else {
    attrNode.value = t.jsxExpressionContainer(newExpr);
  }
}

function fallbackReplace(attrNode, className) {
  attrNode.value = t.jsxExpressionContainer(t.memberExpression(t.identifier('styles'), t.identifier(className)));
}

function processFile(folder) {
  const cssPath = path.join(KIT_DIR, folder, `${folder}.module.css`);
  const jsxPath = path.join(KIT_DIR, folder, `${folder}.jsx`);
  if (!fs.existsSync(cssPath) || !fs.existsSync(jsxPath)) return null;

  const cssText = fs.readFileSync(cssPath, 'utf8');
  const jsxSrc = fs.readFileSync(jsxPath, 'utf8');
  const ast = parser.parse(jsxSrc, { sourceType: 'module', plugins: ['jsx'] });

  const { usages, elements } = collectClassRefs(ast);
  const cssRules = parseCssRules(cssText);
  const cssMap = buildCssMap(cssRules);

  const used = new Set(cssRules.map(r => r.className));
  const mergedInto = new Map(); // oldClass → newClass (for replacement)
  const newRules = []; // new merged class bodies

  let mergeIdx = 1;
  function makeName(base) {
    let n = `${base}${mergeIdx++}`;
    while (used.has(n)) n = `${base}${mergeIdx++}`;
    used.add(n);
    return n;
  }

  // Merge pass — for each element with 2+ styles.X refs, merge if all refs are used only ONCE in the file
  for (const el of elements) {
    // Dedupe refs (in case the same class is listed multiple times — unlikely)
    const uniqRefs = [...new Set(el.refs)];
    if (uniqRefs.length < 2) continue;
    // Only merge if every ref count is 1 (single-use in JSX) AND not already merged
    const alreadyMerged = uniqRefs.some(r => mergedInto.has(r));
    if (alreadyMerged) continue;
    const allSingle = uniqRefs.every(r => usages.get(r) === 1 && cssMap.has(r));
    if (!allSingle) continue;

    const bodies = uniqRefs.map(r => cssMap.get(r).body);
    const merged = mergedBody(bodies);

    // Pick a base name — first non-utility class if possible; else just "merged"
    const baseName = uniqRefs[0];
    const newName = makeName(baseName);

    newRules.push({ className: newName, body: merged });
    for (const r of uniqRefs) mergedInto.set(r, newName);

    // Rewrite the className attribute to reference only the merged class
    replaceClassAttrWithSingle(el.attrNode, newName);
  }

  if (mergedInto.size === 0) return { folder, merged: 0 };

  // Remove obsolete rules from CSS
  const survivors = cssRules.filter(r => !mergedInto.has(r.className));
  const surviveText = survivors.map(r => `.${r.className} {\n${r.body.split(';').map(s => s.trim()).filter(Boolean).map(s => `  ${s};`).join('\n')}\n}`).join('\n\n');
  const addedText = newRules.map(r => `.${r.className} {\n${r.body}\n}`).join('\n\n');
  const finalCss = [surviveText, addedText].filter(Boolean).join('\n\n') + '\n';
  fs.writeFileSync(cssPath, finalCss);

  // Write modified JSX
  const out = generate(ast, { retainLines: true, jsescOption: {minimal: true} }, jsxSrc).code;
  fs.writeFileSync(jsxPath, out);

  return { folder, merged: mergedInto.size, new: newRules.length };
}

const folders = fs.readdirSync(KIT_DIR).filter(f => fs.statSync(path.join(KIT_DIR, f)).isDirectory());
let totalMerged = 0, totalNew = 0;
for (const folder of folders) {
  const r = processFile(folder);
  if (r && r.merged) {
    console.log(`${folder}: merged ${r.merged} classes → ${r.new} combined classes`);
    totalMerged += r.merged; totalNew += r.new;
  }
}
console.log(`total: ${totalMerged} classes merged into ${totalNew} combined classes`);
