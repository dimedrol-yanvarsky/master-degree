/* Extracts static inline `style={{…}}` props from each kit JSX file into
   a sibling `.module.css` file. Dynamic styles (with variables, template
   literals, function calls, spread) are left inline. */

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
]);

const kebab = (s) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

function cssValue(key, val) {
  if (typeof val === 'number' && !UNITLESS.has(key)) return `${val}px`;
  return String(val);
}

function tryExtractStatic(objectExpr) {
  const rules = [];
  for (const prop of objectExpr.properties) {
    if (prop.type !== 'ObjectProperty' || prop.computed || prop.shorthand) return null;
    const key =
      prop.key.type === 'Identifier' ? prop.key.name :
      prop.key.type === 'StringLiteral' ? prop.key.value : null;
    if (!key) return null;

    const v = prop.value;
    let resolved;
    if (v.type === 'StringLiteral') {
      resolved = v.value;
    } else if (v.type === 'NumericLiteral') {
      resolved = v.value;
    } else if (v.type === 'UnaryExpression' && v.operator === '-' && v.argument.type === 'NumericLiteral') {
      resolved = -v.argument.value;
    } else {
      return null;
    }
    rules.push([kebab(key), cssValue(key, resolved)]);
  }
  return rules;
}

function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function processFile(jsxPath) {
  const src = fs.readFileSync(jsxPath, 'utf8');
  const ast = parser.parse(src, {
    sourceType: 'module',
    plugins: ['jsx'],
  });

  const seen = new Map();
  const classList = [];
  let counter = 0;

  function registerStyle(rulesPairs) {
    const canonical = rulesPairs.map(([k, v]) => `${k}:${v}`).sort().join(';');
    if (seen.has(canonical)) return seen.get(canonical);
    counter += 1;
    const className = `s${counter}_${hash(canonical).slice(0, 5)}`;
    classList.push({ className, rules: rulesPairs });
    seen.set(canonical, className);
    return className;
  }

  let replaced = 0;
  traverse(ast, {
    JSXAttribute(nodePath) {
      const attr = nodePath.node;
      if (attr.name.name !== 'style') return;
      const v = attr.value;
      if (!v || v.type !== 'JSXExpressionContainer') return;
      const expr = v.expression;
      if (expr.type !== 'ObjectExpression') return;
      const rules = tryExtractStatic(expr);
      if (!rules || rules.length === 0) return;

      const className = registerStyle(rules);
      const elt = nodePath.parentPath.node;
      if (elt.type !== 'JSXOpeningElement') return;

      const existing = elt.attributes.find(a => a.type === 'JSXAttribute' && a.name && a.name.name === 'className');
      const styleExpr = t.memberExpression(t.identifier('styles'), t.identifier(className));

      if (existing) {
        const ev = existing.value;
        if (!ev) {
          existing.value = t.jsxExpressionContainer(styleExpr);
        } else if (ev.type === 'StringLiteral') {
          existing.value = t.jsxExpressionContainer(
            t.templateLiteral(
              [
                t.templateElement({ raw: ev.value + ' ', cooked: ev.value + ' ' }, false),
                t.templateElement({ raw: '', cooked: '' }, true),
              ],
              [styleExpr]
            )
          );
        } else if (ev.type === 'JSXExpressionContainer') {
          ev.expression = t.binaryExpression(
            '+',
            t.binaryExpression('+', ev.expression, t.stringLiteral(' ')),
            styleExpr
          );
        }
      } else {
        elt.attributes.push(
          t.jsxAttribute(t.jsxIdentifier('className'), t.jsxExpressionContainer(styleExpr))
        );
      }
      nodePath.remove();
      replaced += 1;
    },
  });

  if (replaced === 0) return { replaced: 0, classes: 0 };

  // Inject `import styles from './<name>.module.css'` after the last import
  const base = path.basename(jsxPath, '.jsx');
  const cssImport = t.importDeclaration(
    [t.importDefaultSpecifier(t.identifier('styles'))],
    t.stringLiteral(`./${base}.module.css`)
  );
  const body = ast.program.body;
  let insertAt = 0;
  for (let i = 0; i < body.length; i++) {
    if (body[i].type === 'ImportDeclaration') insertAt = i + 1;
    else break;
  }
  body.splice(insertAt, 0, cssImport);

  const out = generate(ast, { retainLines: true, jsescOption: { minimal: true } }, src).code;
  fs.writeFileSync(jsxPath, out);

  const cssPath = path.join(path.dirname(jsxPath), `${base}.module.css`);
  const cssText = classList
    .map(({ className, rules }) => {
      const body = rules.map(([k, v]) => `  ${k}: ${v};`).join('\n');
      return `.${className} {\n${body}\n}`;
    })
    .join('\n\n') + '\n';
  fs.writeFileSync(cssPath, cssText);

  return { replaced, classes: classList.length, cssPath };
}

const folders = fs.readdirSync(KIT_DIR).filter(f => fs.statSync(path.join(KIT_DIR, f)).isDirectory());
for (const folder of folders) {
  const jsxPath = path.join(KIT_DIR, folder, `${folder}.jsx`);
  if (!fs.existsSync(jsxPath)) { console.log(`skip: ${folder}`); continue; }
  const res = processFile(jsxPath);
  console.log(`${folder}: replaced ${res.replaced} styles, wrote ${res.classes} classes`);
}
