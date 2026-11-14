(function (root) {
  "use strict";
  function parseMultipliers(input) {
    const matches = String(input || "").match(/(?:\d+(?:[.,]\d+)?|[.,]\d+)/g) || [];
    return matches.map(v => Number(v.replace(",", "."))).filter(v => Number.isFinite(v) && v >= 1);
  }
  function median(values) {
    if (!values.length) return 0;
    const a = [...values].sort((x, y) => x - y), m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }
  function summarize(values) {
    const a = values.filter(v => Number.isFinite(v) && v >= 1);
    if (!a.length) return { count: 0, average: 0, median: 0, min: 0, max: 0, above2: 0, above5: 0, lowStreak: 0 };
    let lowStreak = 0;
    for (let i = a.length - 1; i >= 0 && a[i] < 2; i--) lowStreak++;
    return {
      count: a.length, average: a.reduce((s, v) => s + v, 0) / a.length,
      median: median(a), min: Math.min(...a), max: Math.max(...a),
      above2: a.filter(v => v >= 2).length / a.length * 100,
      above5: a.filter(v => v >= 5).length / a.length * 100, lowStreak
    };
  }
  function buckets(values) {
    const ranges = [{label:"أقل من 1.50",test:v=>v<1.5},{label:"1.50–1.99",test:v=>v>=1.5&&v<2},
      {label:"2–4.99",test:v=>v>=2&&v<5},{label:"5–9.99",test:v=>v>=5&&v<10},{label:"10 فأكثر",test:v=>v>=10}];
    const total = values.length || 1;
    return ranges.map(r => ({label:r.label,count:values.filter(r.test).length,percent:values.filter(r.test).length/total*100}));
  }
  function analyzeTransitions(values, threshold = 2) {
    const a = values.filter(v => Number.isFinite(v) && v >= 1);
    const groups = {
      afterBelow: { previousCount: 0, nextAtOrAbove: 0 },
      afterAtOrAbove: { previousCount: 0, nextAtOrAbove: 0 }
    };
    let total = 0, nextAtOrAbove = 0;
    for (let i = 0; i < a.length - 1; i++) {
      const previousHigh = a[i] >= threshold;
      const nextHigh = a[i + 1] >= threshold;
      const group = previousHigh ? groups.afterAtOrAbove : groups.afterBelow;
      group.previousCount++;
      if (nextHigh) group.nextAtOrAbove++;
      total++;
      if (nextHigh) nextAtOrAbove++;
    }
    const rate = group => group.previousCount ? group.nextAtOrAbove / group.previousCount * 100 : null;
    return {
      threshold, pairs: total, overallRate: total ? nextAtOrAbove / total * 100 : null,
      afterBelow: { ...groups.afterBelow, rate: rate(groups.afterBelow) },
      afterAtOrAbove: { ...groups.afterAtOrAbove, rate: rate(groups.afterAtOrAbove) }
    };
  }
  const api = { parseMultipliers, median, summarize, buckets, analyzeTransitions };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CrashAnalytics = api;
})(typeof window !== "undefined" ? window : globalThis);
