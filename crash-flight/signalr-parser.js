function parseSignalRFrame(payload) {
  if (typeof payload !== 'string') return [];
  const events = [];
  for (const chunk of payload.split(String.fromCharCode(30))) {
    const value = chunk.trim();
    if (!value || value[0] !== '{') continue;
    try {
      const message = JSON.parse(value);
      if (message.type === 1 && typeof message.target === 'string') {
        events.push({ target: message.target, args: message.arguments ?? [] });
      }
    } catch { /* Ignore non-JSON and binary frames. */ }
  }
  return events;
}

module.exports = { parseSignalRFrame };
