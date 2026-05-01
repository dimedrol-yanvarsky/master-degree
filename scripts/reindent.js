// Doubles leading-space runs in a file: 2→4, 4→8, etc.
// Safe for files that use consistent 2-space indentation.

const fs = require('fs');
const path = require('path');

const TARGETS = [
    'package.json',
    'src/App.css',
    'src/App.test.js',
    'src/index.css',
    'src/index.js',
    'src/reportWebVitals.js',
    'src/setupTests.js',
    'src/app/styles/kit.css',
];

const root = path.resolve(__dirname, '..');

for (const rel of TARGETS) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) { console.log('skip', rel); continue; }
    const text = fs.readFileSync(abs, 'utf8');
    const out = text.replace(/^( +)/gm, (m) => ' '.repeat(m.length * 2));
    fs.writeFileSync(abs, out);
    console.log('reindented', rel);
}
