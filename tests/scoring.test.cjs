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

const lineup = [['A', 'B'], ['C', 'D'], ['E', 'F']];
const partnershipStats = events => rules.partnerships(events, lineup, ['Visitor 1', 'Visitor 2'], true);
const deliveries = (count, runs = 0) => Array.from({length: count}, () => ({type: 'bat', runs, legal: 1}));

test('partnerships advance immediately at four-over boundaries', () => {
  for (const [count, pair] of [[0, 0], [23, 0], [24, 1], [47, 1], [48, 2], [72, 2]]) {
    const result = partnershipStats(deliveries(count, 1));
    assert.deepEqual(result.currentNames, lineup[pair]);
    assert.equal(result.currentRuns, count === 72 ? 24 : count % 24);
    assert.equal(result.currentDots, 0);
  }
});

test('opposition partnerships are distinct four-over slots too', () => {
  const result = rules.partnerships(deliveries(48, 1), lineup, ['Visitor 1', 'Visitor 2'], false);
  assert.deepEqual(result.currentNames, ['Visitor 1', 'Visitor 2']);
  assert.equal(result.average, 24);
  assert.equal(result.highest, 24);
  assert.equal(result.currentRuns, 0);
  assert.equal(result.slots.length, 2);
});

test('extras, wickets and undo keep partnership boundaries and averages consistent', () => {
  const events = deliveries(23, 1);
  events.push({type: 'wide', runs: 2, legal: 1});
  assert.equal(partnershipStats(events).currentRuns, 0);
  assert.equal(partnershipStats(events).average, 25);
  events.push({type: 'wicket', runs: 0, wicket: 1, legal: 1});
  assert.equal(partnershipStats(events).currentDots, 1);
  assert.equal(partnershipStats(events).average, 12.5);
  events.pop();
  assert.equal(partnershipStats(events).average, 25);
  events.pop();
  assert.equal(partnershipStats(events).currentRuns, 23);
  const final = deliveries(66, 0);
  final.push({type: 'wide', runs: 2, legal: 0}, {type: 'noball', runs: 2, legal: 0});
  assert.equal(partnershipStats(final).currentRuns, 4);
  assert.equal(partnershipStats(final).currentDots, 18);
});

test('editing lineup names cannot regroup recorded partnerships', () => {
  const events = deliveries(25, 1).map(event => ({...event, pairNames: ['Original', 'Partner']}));
  const result = rules.partnerships(events, [['New', 'Names'], ['New', 'Names'], ['New', 'Names']], [], true);
  assert.equal(result.slots.length, 2);
  assert.equal(result.currentRuns, 1);
  assert.equal(result.average, 12.5);
  assert.equal(result.highest, 24);
  assert.deepEqual(result.slots[0].names, ['Original', 'Partner']);
});
