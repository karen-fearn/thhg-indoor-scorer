/* Pure scoring rules shared by the browser and Node regression tests. */
(function (root) {
  const rules = {
    totals(events) {
      return events.reduce((score, event) => {
        score.runs += event.runs;
        score.legal += event.legal || 0;
        score.wickets += event.wicket ? 1 : 0;
        const extra = {wide: 'wides', noball: 'noballs', bye: 'byes', legbye: 'legbyes'}[event.type];
        if (extra) score[extra] += event.runs;
        return score;
      }, {runs: 0, legal: 0, wickets: 0, wides: 0, noballs: 0, byes: 0, legbyes: 0});
    },
    countsAsBall(type, counted, overs) {
      return !['wide', 'noball'].includes(type) || counted < Math.max(0, (overs - 1) * 6);
    },
    changesEnds(event) {
      return ['bat', 'wicket', 'bye', 'legbye'].includes(event.type) && event.runs % 2 === 1;
    },
    nextStriker(names, previous, counted, resetPair) {
      if (!previous) return names[0];
      const before = Math.floor(Math.max(0, counted - (previous.legal || 0)) / 6);
      const after = Math.floor(counted / 6);
      if (resetPair && Math.floor(before / 4) !== Math.floor(after / 4)) return names[0];
      const index = names.indexOf(previous.batter);
      if (index < 0) return names[0];
      const swaps = Number(rules.changesEnds(previous)) + Number(before !== after);
      return names[(index + swaps) % names.length];
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = rules;
  else root.ScoringRules = rules;
})(globalThis);
