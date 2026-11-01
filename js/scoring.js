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
    // Partnerships are four-over slots, never keys derived from editable names.
    // Only slots with recorded deliveries contribute to average/highest totals.
    partnerships(events, pairs, oppositionNames, batting) {
      const slots = [];
      let counted = 0;
      for (const event of events) {
        const index = Math.min(2, Math.floor(counted / 24));
        const slot = slots[index] ||= {runs: 0, dots: 0, names: []};
        slot.runs += event.runs;
        if (event.legal && event.runs === 0 && ['dot', 'bat', 'wicket'].includes(event.type)) slot.dots++;
        // New deliveries retain the pair at scoring time. Legacy deliveries can
        // still supply recorded batters without rewriting their stored history.
        const recorded = event.pairNames || (event.batter ? [event.batter] : []);
        for (const name of recorded) {
          if (name && !slot.names.includes(name)) slot.names.push(name);
        }
        counted += event.legal || 0;
      }
      const currentIndex = Math.min(2, Math.floor(counted / 24));
      const current = slots[currentIndex] || {runs: 0, dots: 0};
      const values = slots.filter(Boolean).map(slot => slot.runs);
      return {
        currentNames: current.names?.length ? [...current.names] : (batting ? pairs[currentIndex] : oppositionNames),
        currentRuns: current.runs,
        currentDots: current.dots,
        slots,
        average: values.length ? values.reduce((sum, runs) => sum + runs, 0) / values.length : 0,
        highest: values.length ? Math.max(...values) : 0
      };
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
