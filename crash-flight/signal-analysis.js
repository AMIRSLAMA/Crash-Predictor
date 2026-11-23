function median(values) {
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Finds repeatable stage-to-crash timing candidates using completed rounds only.
 * A candidate is descriptive evidence, not a prediction of the next multiplier.
 */
function analyzeStageSignals(events, currentRound = null, options = {}) {
  const minSamples = Number.isInteger(options.minSamples) ? Math.max(3, options.minSamples) : 5;
  const minLeadSeconds = Number.isFinite(options.minLeadSeconds) ? options.minLeadSeconds : 1;
  const maxLeadSeconds = Number.isFinite(options.maxLeadSeconds) ? options.maxLeadSeconds : 5;
  const groups = new Map();

  for (const event of events || []) {
    if (event?.roundId == null || !Number.isFinite(event.receivedAtMs)) continue;
    const key = String(event.roundId);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }

  const observations = new Map();
  for (const roundEvents of groups.values()) {
    const crash = roundEvents
      .filter(event => event.target === 'OnCrash' || event.target === 'OnResult')
      .sort((a, b) => a.receivedAtMs - b.receivedAtMs)[0];
    if (!crash) continue;

    // Use the first occurrence of a stage in each round. Using only the final
    // stage before a crash would create a misleading post-hoc "signal".
    const firstByStage = new Map();
    for (const event of roundEvents) {
      if (event.target !== 'OnStage' || !Number.isFinite(event.stage)) continue;
      if (event.receivedAtMs >= crash.receivedAtMs) continue;
      if (!firstByStage.has(event.stage) || event.receivedAtMs < firstByStage.get(event.stage)) {
        firstByStage.set(event.stage, event.receivedAtMs);
      }
    }
    for (const [stage, firstAt] of firstByStage) {
      const lead = (crash.receivedAtMs - firstAt) / 1000;
      if (!observations.has(stage)) observations.set(stage, []);
      observations.get(stage).push(lead);
    }
  }

  const candidates = [];
  for (const [stage, leads] of observations) {
    const inWindow = leads.filter(lead => lead >= minLeadSeconds && lead <= maxLeadSeconds);
    const precision = inWindow.length / leads.length;
    const leadSeconds = median(leads);
    if (leads.length >= minSamples && precision >= 0.8 &&
        leadSeconds >= minLeadSeconds && leadSeconds <= maxLeadSeconds) {
      candidates.push({
        stage,
        samples: leads.length,
        precision: Number((precision * 100).toFixed(1)),
        leadSeconds: Number(leadSeconds.toFixed(1))
      });
    }
  }
  candidates.sort((a, b) => b.samples - a.samples || b.precision - a.precision);
  const candidate = candidates[0] || null;
  const alert = currentRound?.status === 'جارية' && candidate &&
    Number.isFinite(currentRound.lastStage) && currentRound.lastStage === candidate.stage
      ? { ...candidate, level: 'experimental' }
      : null;

  return { candidate, alert, completedRounds: [...groups.values()].filter(items =>
    items.some(event => event.target === 'OnCrash' || event.target === 'OnResult')).length };
}

module.exports = { analyzeStageSignals, median };
