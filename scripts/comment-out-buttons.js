// Wraps the .btn/.btn-* section of kit.css in a single block comment so
// those rules no longer apply. Because CSS has no nested comments, any
// internal `*/` is rewritten to `* /` inside the wrapped range — this
// keeps the outer /* ... */ boundaries intact without destroying the
// original comment text visually.

const fs = require('fs');
const path = require('path');

const CSS_PATH = path.resolve(__dirname, '../src/app/styles/kit.css');
const START_LINE = 352;  // line of `.btn {`
const END_LINE = 667;    // line of `.btn-link:hover:not(:disabled) { ... }`

const lines = fs.readFileSync(CSS_PATH, 'utf8').split('\n');

if (!lines[START_LINE - 1].trim().startsWith('.btn')) {
    throw new Error(`Expected '.btn' at line ${START_LINE}, got: ${lines[START_LINE - 1]}`);
}

const block = lines.slice(START_LINE - 1, END_LINE)
    .map(line => line.replace(/\*\//g, '* /'))
    .join('\n');

const wrapped = [
    '/* =========================================================================',
    '   Button styles — COMMENTED OUT.',
    '   The canonical Button component now lives at shared/ui/Button/. Its own',
    '   Button.module.css holds the scoped copy of these rules. This block is',
    '   kept here for reference; to re-enable remove the outer /* */ wrapper and',
    '   restore internal `* /` sequences to `*/`.',
    '   ========================================================================= */',
    '/*',
    block,
    '*/',
].join('\n');

const before = lines.slice(0, START_LINE - 1);
const after = lines.slice(END_LINE);
const out = [...before, wrapped, ...after].join('\n');
fs.writeFileSync(CSS_PATH, out);
console.log(`Wrapped lines ${START_LINE}–${END_LINE} of kit.css in a block comment.`);
