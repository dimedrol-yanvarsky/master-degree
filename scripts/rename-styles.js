/* Renames auto-generated class names (like s54_wlryi) to semantic,
   CSS-shape-derived names per module. Updates both the .module.css and
   the .jsx that consumes it. No visual change. */

const fs = require('fs');
const path = require('path');

const KIT_DIR = path.resolve(__dirname, '../src/shared/ui/kit');

function parseCss(text) {
  const rules = [];
  const re = /\.([\w-]+)\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(text))) {
    const className = m[1];
    const body = m[2];
    const decls = body.split(';').map(s => s.trim()).filter(Boolean);
    const pairs = decls.map(d => {
      const i = d.indexOf(':');
      return [d.slice(0, i).trim(), d.slice(i + 1).trim()];
    });
    rules.push({ className, pairs, raw: m[0] });
  }
  return rules;
}

function nameFromRules(pairs) {
  const m = Object.fromEntries(pairs);
  const d = m['display'];
  const dir = m['flex-direction'];
  const pos = m['position'];
  const fs = m['font-size'];
  const fw = m['font-weight'];
  const ff = m['font-family'] || '';
  const tt = m['text-transform'];
  const align = m['align-items'];
  const justify = m['justify-content'];

  if (pos === 'absolute') {
    if (m['inset'] === '0px') return 'fill';
    if (m['top'] && m['left']) return 'absTopLeft';
    if (m['top'] && m['right']) return 'absTopRight';
    if (m['bottom'] && m['left']) return 'absBottomLeft';
    if (m['bottom'] && m['right']) return 'absBottomRight';
    return 'abs';
  }
  if (pos === 'fixed') return 'fixed';
  if (pos === 'sticky') return 'sticky';
  if (pos === 'relative' && (m['overflow'] === 'hidden' || m['isolation'])) return 'stage';

  if (d === 'grid') {
    const gtc = m['grid-template-columns'] || '';
    const rep = gtc.match(/repeat\((\d+),/);
    if (rep) return `grid${rep[1]}`;
    if (gtc.includes('1fr 1fr 1fr 1fr')) return 'grid4';
    if (gtc.includes('1fr 1fr 1fr')) return 'grid3';
    if (gtc.includes('1fr 1fr')) return 'grid2';
    return 'grid';
  }

  if (d === 'flex' || d === 'inline-flex') {
    const col = dir === 'column';
    const pref = col ? 'col' : 'row';
    if (justify === 'center' && align === 'center') return `${pref}Center`;
    if (justify === 'space-between' && align === 'center') return `${pref}Between`;
    if (justify === 'space-between') return `${pref}Split`;
    if (justify === 'flex-end' || justify === 'end') return `${pref}End`;
    if (align === 'center' && m['gap']) return `${pref}Items`;
    if (align === 'baseline') return `${pref}Baseline`;
    if (m['flex-wrap'] === 'wrap') return `${pref}Wrap`;
    if (align === 'center') return `${pref}Middle`;
    if (align === 'flex-start' || align === 'start') return `${pref}Top`;
    if (d === 'inline-flex') return `inline${pref[0].toUpperCase()}${pref.slice(1)}`;
    return pref;
  }

  if (d === 'inline-block') return 'inlineBlock';
  if (d === 'none') return 'hidden';
  if (d === 'block') return 'block';

  if (tt === 'uppercase') return 'eyebrow';
  if (ff.includes('mono')) return 'mono';

  if (fw && parseInt(fw, 10) >= 600) {
    if (fs && parseInt(fs, 10) >= 24) return 'heading';
    if (fs && parseInt(fs, 10) >= 18) return 'title';
    return 'textBold';
  }
  if (fs) {
    const n = parseInt(fs, 10);
    if (n >= 28) return 'heading';
    if (n >= 20) return 'title';
    if (n >= 16) return 'textLg';
    if (n >= 13) return 'textMd';
    if (n >= 11) return 'textSm';
    return 'textXs';
  }

  if (m['color'] && Object.keys(m).length <= 2) return 'textColor';

  if (m['background'] || m['background-color']) {
    if (m['border-radius'] === '50%') return 'dot';
    if ((m['border-radius'] || '').includes('pill') || m['border-radius'] === '999px') return 'pill';
    if (m['width'] && m['height'] && parseInt(m['width'], 10) <= 32) return 'swatch';
    return 'panel';
  }

  if (m['border'] || m['border-top'] || m['border-bottom']) return 'divider';
  if (m['border-radius']) return 'rounded';
  if (m['width'] === '100%') return 'wFull';
  if (m['height'] === '100%') return 'hFull';

  if (m['overflow'] === 'hidden') return 'clip';
  if (m['opacity']) return 'faded';
  if (m['pointer-events'] === 'none') return 'passthru';

  if (m['padding'] || m['padding-top']) return 'padded';
  if (m['margin'] || m['margin-top']) return 'spaced';

  return 'box';
}

function makeUnique(baseName, used) {
  if (!used.has(baseName)) { used.add(baseName); return baseName; }
  let i = 2;
  while (used.has(`${baseName}${i}`)) i++;
  const n = `${baseName}${i}`;
  used.add(n);
  return n;
}

function processModule(folder) {
  const cssPath = path.join(KIT_DIR, folder, `${folder}.module.css`);
  const jsxPath = path.join(KIT_DIR, folder, `${folder}.jsx`);
  if (!fs.existsSync(cssPath) || !fs.existsSync(jsxPath)) return null;

  const cssText = fs.readFileSync(cssPath, 'utf8');
  const rules = parseCss(cssText);
  if (!rules.length) return null;

  const used = new Set();
  const rename = new Map();
  for (const r of rules) {
    const base = nameFromRules(r.pairs);
    const unique = makeUnique(base, used);
    rename.set(r.className, unique);
  }

  // Rewrite CSS file (preserve order, body, just swap the selector)
  let newCss = cssText;
  // Replace in reverse by length to avoid collisions where one class is a prefix of another
  const sorted = [...rename.keys()].sort((a, b) => b.length - a.length);
  for (const oldName of sorted) {
    const newName = rename.get(oldName);
    // CSS selector replacement: .oldName{ → .newName{
    const re = new RegExp(`\\.${oldName}(?=\\s|[,{])`, 'g');
    newCss = newCss.replace(re, `.${newName}`);
  }
  fs.writeFileSync(cssPath, newCss);

  // Rewrite JSX file: swap styles.oldName → styles.newName
  let jsxText = fs.readFileSync(jsxPath, 'utf8');
  for (const oldName of sorted) {
    const newName = rename.get(oldName);
    // match styles.oldName at word boundary (no other identifier char after)
    const re = new RegExp(`\\bstyles\\.${oldName}\\b`, 'g');
    jsxText = jsxText.replace(re, `styles.${newName}`);
  }
  fs.writeFileSync(jsxPath, jsxText);

  return { folder, renamed: rename.size };
}

const folders = fs.readdirSync(KIT_DIR).filter(f => fs.statSync(path.join(KIT_DIR, f)).isDirectory());
let total = 0;
for (const folder of folders) {
  const r = processModule(folder);
  if (r) {
    console.log(`${r.folder}: ${r.renamed} classes renamed`);
    total += r.renamed;
  }
}
console.log(`total renamed: ${total}`);
