const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../js/scoring.js');
const pairs = [['A', 'B'], ['A', 'B'], ['A', 'B']];
const balls = (count, runs) => Array.from({length: count}, () => ({type: 'bat', runs, legal: 1}));

test('repeated pair names never merge runs or dots across slots', () => {
  const result = rules.partnerships([...balls(24, 1), ...balls(24, 0), ...balls(1, 4)], pairs, [], true);
  assert.equal(result.slots.length, 3);
  assert.deepEqual(result.slots.map(slot => slot.runs), [24, 0, 4]);
  assert.equal(result.currentRuns, 4);
  assert.equal(result.currentDots, 0);
  assert.equal(result.average, 28 / 3);
  assert.equal(result.highest, 24);
});

test('editing the batting order preserves recorded partnership names and figures', () => {
  const events = balls(25, 1).map(event => ({...event, pairNames: ['Original', 'Partner']}));
  const before = rules.partnerships(events, pairs, [], true);
  const after = rules.partnerships(events, [['New', 'Names'], ['Other', 'Players'], ['Last', 'Pair']], [], true);
  assert.deepEqual(after, before);
  assert.deepEqual(after.currentNames, ['Original', 'Partner']);
  assert.deepEqual(events[0].pairNames, ['Original', 'Partner']);
});

test('legacy recorded batters remain visible after editing the lineup', () => {
  const result = rules.partnerships([{type: 'bat', runs: 4, legal: 1, batter: 'Original'}], pairs, [], true);
  assert.deepEqual(result.currentNames, ['Original']);
});
