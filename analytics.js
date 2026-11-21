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
  function wilson(successes, total, z = 1.96) {
    if (!total) return { low: null, high: null };
    const p = successes / total, z2 = z * z, den = 1 + z2 / total;
    const center = (p + z2 / (2 * total)) / den;
    const margin = z * Math.sqrt((p * (1 - p) / total) + z2 / (4 * total * total)) / den;
    return { low: Math.max(0, center - margin), high: Math.min(1, center + margin) };
  }
  function forecast(values, thresholds = [1.5, 2, 3, 5, 10], windowSize = 300) {
    const a = values.filter(v => Number.isFinite(v) && v >= 1);
    const sample = a.slice(-Math.max(1, windowSize));
    return {
      sampleSize: sample.length,
      median: median(sample),
      mean: sample.length ? sample.reduce((s, v) => s + v, 0) / sample.length : 0,
      thresholds: thresholds.map(threshold => {
        const successes = sample.filter(v => v >= threshold).length;
        const ci = wilson(successes, sample.length);
        return { threshold, successes, total: sample.length, rate: sample.length ? successes / sample.length : null, low: ci.low, high: ci.high };
      })
    };
  }
  function backtest(values, trainFraction = 0.8, thresholds = [1.5, 2, 3, 5, 10]) {
    const a = values.filter(v => Number.isFinite(v) && v >= 1);
    const split = Math.max(1, Math.min(a.length - 1, Math.floor(a.length * trainFraction)));
    if (a.length < 2 || split < 1 || split >= a.length) return { trainSize: split, testSize: 0, rows: [] };
    const train = a.slice(0, split), test = a.slice(split);
    return { trainSize: train.length, testSize: test.length, rows: thresholds.map(threshold => {
      const hits = train.filter(v => v >= threshold).length;
      const p = hits / train.length;
      const testHits = test.filter(v => v >= threshold).length;
      const brier = test.reduce((sum, value) => sum + (Number(value >= threshold) - p) ** 2, 0) / test.length;
      return { threshold, trainRate: p, testRate: testHits / test.length, brier, trainHits: hits, testHits };
    }) };
  }
  const api = { parseMultipliers, median, summarize, buckets, analyzeTransitions, wilson, forecast, backtest };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CrashAnalytics = api;
})(typeof window !== "undefined" ? window : globalThis);
