const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../js/scoring.js');

test('totals distinguish batter runs, all extras and wickets', () => {
  const events = [
    {type: 'bat', runs: 4, legal: 1},
    {type: 'wide', runs: 2, legal: 1},
    {type: 'noball', runs: 2, legal: 0},
    {type: 'bye', runs: 1, legal: 1},
    {type: 'legbye', runs: 3, legal: 1},
    {type: 'wicket', runs: 2, legal: 1, wicket: 1}
  ];
  assert.deepEqual(rules.totals(events), {runs: 14, legal: 5, wickets: 1, wides: 2, noballs: 2, byes: 1, legbyes: 3});
});

test('wides and no-balls count before the final over only', () => {
  for (const overs of [1, 2, 12]) {
    for (const type of ['wide', 'noball']) {
      if (overs > 1) assert.equal(rules.countsAsBall(type, (overs - 1) * 6 - 1, overs), true);
      assert.equal(rules.countsAsBall(type, (overs - 1) * 6, overs), false);
      assert.equal(rules.countsAsBall(type, overs * 6 - 1, overs), false);
    }
    for (const type of ['dot', 'bat', 'bye', 'legbye', 'wicket']) {
      assert.equal(rules.countsAsBall(type, (overs - 1) * 6, overs), true);
    }
  }
});

test('only odd completed runs rotate strike', () => {
  for (const type of ['bat', 'wicket', 'bye', 'legbye']) {
    assert.equal(rules.changesEnds({type, runs: 1}), true);
    assert.equal(rules.changesEnds({type, runs: 2}), false);
  }
  for (const type of ['wide', 'noball', 'custom', 'dot']) {
    assert.equal(rules.changesEnds({type, runs: 1}), false);
  }
});

test('over-end changes combine with running and pair changes', () => {
  const names = ['First', 'Second'];
  assert.equal(rules.nextStriker(names, {type: 'bat', batter: 'First', runs: 1, legal: 1}, 6, true), 'First');
  assert.equal(rules.nextStriker(names, {type: 'dot', batter: 'First', runs: 0, legal: 1}, 6, true), 'Second');
  assert.equal(rules.nextStriker(names, {type: 'dot', batter: 'Second', runs: 0, legal: 1}, 24, true), 'First');
});

test('uncounted final-over extras do not change strike at the boundary', () => {
  const names = ['First', 'Second'];
  for (const type of ['wide', 'noball']) {
    assert.equal(rules.nextStriker(names, {type, batter: 'Second', runs: 2, legal: 0}, 66, true), 'Second');
  }
});
