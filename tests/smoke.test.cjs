const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
test('app assets exist and are referenced', () => {
 const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
 for (const file of ['css/styles.css','js/app.js','js/players.js','js/scoring.js','manifest.webmanifest','service-worker.js']) {
  assert.ok(fs.existsSync(path.join(root,file)), `${file} exists`);
 }
 assert.match(html, /css\/styles\.css/);
 assert.match(html, /js\/app\.js/);
});
test('no duplicated inline application script', () => {
 const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
 assert.ok(!html.includes('function renderLiveStats()'));
});
