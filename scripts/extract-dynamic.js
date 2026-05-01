/* Phase 1: extract ALL remaining `style={{…}}` occurrences into the
   per-component .module.css, routing dynamic values via CSS custom
   properties. A class declared here uses `property: var(--prop);` and
   the JSX element keeps a minimal inline `style` with only the `--prop`
   assignments (or is removed if everything became static).

   Zero visual change — the CSS var bindings replicate the previous
   runtime values exactly. */

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const KIT_DIR = path.resolve(__dirname, '../src/shared/ui/kit');

const UNITLESS = new Set([
  'opacity','zIndex','fontWeight','lineHeight','flex','flexGrow','flexShrink',
  'order','gridRow','gridColumn','columnCount','tabSize','aspectRatio','scale','rotate',
  'animationIterationCount','strokeOpacity','fillOpacity',
]);

const kebab = s => s.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
function cssLiteral(key, val) {
  if (typeof val === 'number' && val === 0) return '0';
  if (typeof val === 'number' && !UNITLESS.has(key)) return `${val}px`;
  return String(val);
}

function parseCssClassNames(cssText) {
  const names = new Set();
  const re = /\.([A-Za-z][\w-]*)\s*[,{]/g;
  let m;
  while ((m = re.exec(cssText))) names.add(m[1]);
  return names;
}

function nameFromRules(pairs) {
  const m = Object.fromEntries(pairs);
  const d = m['display'];
  const dir = m['flex-direction'];
  const pos = m['position'];
  const fsz = m['font-size'];
  const fw = m['font-weight'];
  const ff = m['font-family'] || '';
  const tt = m['text-transform'];
  const align = m['align-items'];
  const justify = m['justify-content'];

  if (pos === 'absolute') {
    if (m['inset'] === '0' || m['inset'] === '0px') return 'fill';
    return 'abs';
  }
  if (pos === 'fixed') return 'fixed';
  if (pos === 'sticky') return 'sticky';
  if (pos === 'relative' && m['overflow'] === 'hidden') return 'stage';

  if (d === 'grid') return 'grid';
  if (d === 'flex' || d === 'inline-flex') {
    const col = dir === 'column';
    const pref = col ? 'col' : 'row';
    if (justify === 'center' && align === 'center') return `${pref}Center`;
    if (justify === 'space-between' && align === 'center') return `${pref}Between`;
    if (justify === 'space-between') return `${pref}Split`;
    if (justify === 'flex-end' || justify === 'end') return `${pref}End`;
    if (align === 'center') return `${pref}Middle`;
    if (m['flex-wrap'] === 'wrap') return `${pref}Wrap`;
    if (align === 'baseline') return `${pref}Baseline`;
    return pref;
  }
  if (d === 'inline-block') return 'inlineBlock';
  if (d === 'none') return 'hidden';
  if (d === 'block') return 'block';
  if (tt === 'uppercase') return 'eyebrow';
  if (ff.includes('mono')) return 'mono';
  if (fw && parseInt(fw, 10) >= 600) {
    if (fsz && parseInt(fsz, 10) >= 24) return 'heading';
    if (fsz && parseInt(fsz, 10) >= 18) return 'title';
    return 'textBold';
  }
  if (fsz) {
    const n = parseInt(fsz, 10);
    if (n >= 28) return 'heading';
    if (n >= 20) return 'title';
    if (n >= 16) return 'textLg';
    if (n >= 13) return 'textMd';
    if (n >= 11) return 'textSm';
    return 'textXs';
  }
  if (m['background'] || m['background-color']) {
    if (m['border-radius'] === '50%') return 'dot';
    if (m['border-radius'] === '999px' || m['border-radius'] === '9999px') return 'pill';
    return 'panel';
  }
  if (m['border'] || m['border-top'] || m['border-bottom']) return 'divider';
  if (m['border-radius']) return 'rounded';
  if (m['width'] === '100%') return 'wFull';
  if (m['height'] === '100%') return 'hFull';
  if (m['overflow'] === 'hidden') return 'clip';
  if (m['opacity']) return 'faded';
  if (m['pointer-events'] === 'none') return 'passthru';
  if (m['transform']) return 'transformed';
  if (m['transition']) return 'animated';
  if (m['color'] && Object.keys(m).length <= 2) return 'textColor';
  if (m['padding'] || m['padding-top']) return 'padded';
  if (m['margin'] || m['margin-top']) return 'spaced';
  return 'box';
}

function makeUnique(base, used) {
  if (!used.has(base)) { used.add(base); return base; }
  let i = 2;
  while (used.has(`${base}${i}`)) i++;
  const n = `${base}${i}`;
  used.add(n);
  return n;
}

function mergeClassName(elt, newClassExpr) {
  const existing = elt.attributes.find(
    a => a.type === 'JSXAttribute' && a.name && a.name.name === 'className'
  );
  if (!existing) {
    elt.attributes.push(t.jsxAttribute(t.jsxIdentifier('className'), t.jsxExpressionContainer(newClassExpr)));
    return;
  }
  const ev = existing.value;
  if (!ev) { existing.value = t.jsxExpressionContainer(newClassExpr); return; }
  if (ev.type === 'StringLiteral') {
    existing.value = t.jsxExpressionContainer(
      t.templateLiteral(
        [t.templateElement({raw: ev.value + ' ', cooked: ev.value + ' '}, false),
         t.templateElement({raw: '', cooked: ''}, true)],
        [newClassExpr]
      )
    );
    return;
  }
  if (ev.type === 'JSXExpressionContainer') {
    ev.expression = t.binaryExpression(
      '+',
      t.binaryExpression('+', ev.expression, t.stringLiteral(' ')),
      newClassExpr
    );
  }
}

function processFile(folder) {
  const cssPath = path.join(KIT_DIR, folder, `${folder}.module.css`);
  const jsxPath = path.join(KIT_DIR, folder, `${folder}.jsx`);
  if (!fs.existsSync(cssPath) || !fs.existsSync(jsxPath)) return null;

  const cssText = fs.readFileSync(cssPath, 'utf8');
  const used = parseCssClassNames(cssText);
  const src = fs.readFileSync(jsxPath, 'utf8');
  const ast = parser.parse(src, { sourceType: 'module', plugins: ['jsx'] });

  const added = []; // {className, rules}
  const canonicalMap = new Map();

  function registerRules(pairs) {
    const canonical = pairs.map(([k, v]) => `${k}:${v}`).sort().join(';');
    if (canonicalMap.has(canonical)) return canonicalMap.get(canonical);
    const base = nameFromRules(pairs);
    const className = makeUnique(base, used);
    added.push({ className, rules: pairs });
    canonicalMap.set(canonical, className);
    return className;
  }

  let modified = 0;

  traverse(ast, {
    JSXAttribute(p) {
      const attr = p.node;
      if (!attr.name || attr.name.name !== 'style') return;
      const v = attr.value;
      if (!v || v.type !== 'JSXExpressionContainer') return;
      const expr = v.expression;
      if (expr.type !== 'ObjectExpression') return;
      // Bail if any non-property or computed key is present
      for (const prop of expr.properties) {
        if (prop.type !== 'ObjectProperty' || prop.computed) return;
      }

      const rules = [];
      const varAssigns = [];
      const preservedProps = [];
      let usedVarNames = new Set();

      for (const prop of expr.properties) {
        const key = prop.key.type === 'Identifier' ? prop.key.name
                  : prop.key.type === 'StringLiteral' ? prop.key.value
                  : null;
        if (!key) return;
        if (key.startsWith('--')) { preservedProps.push(prop); continue; }

        const val = prop.value;
        if (val.type === 'StringLiteral') {
          rules.push([kebab(key), val.value]);
        } else if (val.type === 'NumericLiteral') {
          rules.push([kebab(key), cssLiteral(key, val.value)]);
        } else if (val.type === 'UnaryExpression' && val.operator === '-' && val.argument.type === 'NumericLiteral') {
          rules.push([kebab(key), cssLiteral(key, -val.argument.value)]);
        } else {
          let varName = `--${kebab(key)}`;
          let suffix = 1;
          while (usedVarNames.has(varName)) { suffix++; varName = `--${kebab(key)}-${suffix}`; }
          usedVarNames.add(varName);
          rules.push([kebab(key), `var(${varName})`]);
          varAssigns.push([varName, val]);
        }
      }

      if (rules.length === 0) return;

      const className = registerRules(rules);
      modified++;

      const elt = p.parentPath.node;
      if (elt.type !== 'JSXOpeningElement') return;
      mergeClassName(elt, t.memberExpression(t.identifier('styles'), t.identifier(className)));

      const newProps = [...preservedProps];
      for (const [vn, expr] of varAssigns) newProps.push(t.objectProperty(t.stringLiteral(vn), expr, false));
      if (newProps.length === 0) {
        p.remove();
      } else {
        attr.value = t.jsxExpressionContainer(t.objectExpression(newProps));
      }
    },
  });

  if (modified === 0) return { folder, modified: 0, added: 0 };

  // Ensure styles import exists (some files might not have it if no statics were extracted earlier)
  const body = ast.program.body;
  const hasStylesImport = body.some(
    n => n.type === 'ImportDeclaration' && n.specifiers.some(s => s.type === 'ImportDefaultSpecifier' && s.local.name === 'styles')
  );
  if (!hasStylesImport) {
    const decl = t.importDeclaration(
      [t.importDefaultSpecifier(t.identifier('styles'))],
      t.stringLiteral(`./${folder}.module.css`)
    );
    let i = 0;
    for (; i < body.length; i++) if (body[i].type !== 'ImportDeclaration') break;
    body.splice(i, 0, decl);
  }

  const out = generate(ast, { retainLines: true, jsescOption: { minimal: true } }, src).code;
  fs.writeFileSync(jsxPath, out);

  const cssAdd = added.map(({className, rules}) =>
    `.${className} {\n${rules.map(([k,v]) => `  ${k}: ${v};`).join('\n')}\n}`
  ).join('\n\n');
  fs.writeFileSync(cssPath, cssText.trimEnd() + '\n\n' + cssAdd + '\n');

  return { folder, modified, added: added.length };
}

const folders = fs.readdirSync(KIT_DIR).filter(f => fs.statSync(path.join(KIT_DIR, f)).isDirectory());
let totalModified = 0, totalAdded = 0;
for (const folder of folders) {
  const r = processFile(folder);
  if (r && r.modified) {
    console.log(`${folder}: ${r.modified} styles extracted, ${r.added} new classes`);
    totalModified += r.modified; totalAdded += r.added;
  }
}
console.log(`total: ${totalModified} styles, ${totalAdded} new classes`);
