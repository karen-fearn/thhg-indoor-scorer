const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
function render(deliveries, pairs = [['A', 'B'], ['A', 'B'], ['C', 'D']], innings = 1) {
  const stored = new Map([
    ['thhg-events', JSON.stringify(deliveries)],
    ['thhg-current-innings', String(innings)],
    ['thhg-match-order-v1', JSON.stringify({ pairs, bowlers: Array(6).fill('Bowler') })],
  ]);
  const nodes = new Map();
  const defaults = { start: '200', penalty: '5', limit: '12', wideValue: '2', nbValue: '2' };
  const document = {
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, {
        value: defaults[id] || '', style: {}, innerHTML: '',
        addEventListener() {}, appendChild() {},
      });
      return nodes.get(id);
    },
    createElement() { return {}; },
  };
  const context = vm.createContext({ document, localStorage: {
    getItem: key => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, String(value)),
  } });
  vm.runInContext(source, context);
  function tile(label) {
    const html = nodes.get('liveStatGrid').innerHTML;
    const match = html.match(new RegExp('<span>' + label + '</span><strong>(.*?)</strong>'));
    assert.ok(match, label);
    return match[1];
  }
  return { tile, context };
}
function ball(runs = 0, fields = {}) {
  return { type: 'bat', runs, legal: 1, innings: 'THHG batting', inningsNumber: 1, ...fields };
}

test('repeated names in adjacent slots remain distinct partnerships', () => {
  const { tile } = render([...Array.from({ length: 24 }, () => ball(1)), ball(4)]);
  assert.equal(tile('Current batting pair'), 'A &amp; B');
  assert.equal(tile('Current pair runs'), '4');
  assert.equal(tile('Current pair dots'), '0');
  assert.equal(tile('Average partnership'), '14.0');
  assert.equal(tile('Highest partnership'), '24');
});

test('nonadjacent repeated names do not combine dot counts', () => {
  const { tile } = render(Array.from({ length: 49 }, () => ball()), [['A', 'B'], ['C', 'D'], ['A', 'B']]);
  assert.equal(tile('Current pair dots'), '1');
  assert.equal(tile('Average partnership'), '0.0');
});

test('a new slot starts only when its first event is recorded, including a noncounting extra', () => {
  const deliveries = Array.from({ length: 24 }, () => ball(1));
  const { tile, context } = render(deliveries);
  assert.equal(tile('Current pair runs'), '24');
  assert.equal(tile('Average partnership'), '24.0');
  vm.runInContext("events.push({type:'wide', runs:2, legal:0, innings:'THHG batting', inningsNumber:1}); render()", context);
  assert.equal(tile('Current pair runs'), '2');
  assert.equal(tile('Average partnership'), '13.0');
  vm.runInContext('undo()', context);
  assert.equal(tile('Current pair runs'), '24');
  assert.equal(tile('Average partnership'), '24.0');
});

test('empty innings has no partnerships', () => {
  const { tile } = render([]);
  assert.equal(tile('Current batting pair'), 'Not started');
  assert.equal(tile('Average partnership'), '0');
  assert.equal(tile('Highest partnership'), '0');
});

test('other innings is excluded and opposition retains one partnership', () => {
  const deliveries = [ball(100), ...Array.from({ length: 25 }, () => ball(1, {
    innings: 'THHG bowling', inningsNumber: 2,
  }))];
  const { tile } = render(deliveries, undefined, 2);
  assert.equal(tile('Current batting pair'), 'Opposition batting');
  assert.equal(tile('Current pair runs'), '25');
  assert.equal(tile('Average partnership'), '25.0');
  assert.equal(tile('Highest partnership'), '25');
});
