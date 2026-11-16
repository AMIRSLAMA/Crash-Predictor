(() => {
 if (window.__crashPredictorBridgeInstalled) return;
 window.__crashPredictorBridgeInstalled = true;
 const pageOrigin = location.origin;
 let sending = false;
 const send = async () => {
  if (sending) return;
  sending = true;
  try {
   const { recentRounds = [], predictorBridge = {} } = await chrome.storage.local.get(["recentRounds", "predictorBridge"]);
   let sent = 0;
   for (const round of (Array.isArray(recentRounds) ? recentRounds : [])) {
    // CustomEvent is shared with the page world and is already handled by app.js.
    window.dispatchEvent(new CustomEvent("crash-live-round", { detail: JSON.stringify(round) }));
    // Fallback transport: page-world message listener, in case isolated-world DOM events are not delivered.
    window.postMessage({ source: "CRASH_LIVE_EXTENSION", type: "ROUND", round }, pageOrigin);
    sent++;
   }
   await chrome.storage.local.set({
    predictorBridge: {
     ...predictorBridge,
     lastSendAt: new Date().toISOString(),
     sent,
     total: sent,
     pageUrl: location.href,
     transport: "CustomEvent"
    }
   });
  } catch (error) {
   try {
    const { predictorBridge = {} } = await chrome.storage.local.get("predictorBridge");
    await chrome.storage.local.set({ predictorBridge: { ...predictorBridge, lastError: String(error), pageUrl: location.href } });
   } catch (_) {}
  } finally {
   sending = false;
  }
 };
 window.addEventListener("message", async event => {
  const d = event.data;
  if (event.source !== window || event.origin !== pageOrigin || d?.source !== "CRASH_PREDICTOR_PAGE" || d.type !== "ROUND_RECEIVED" || !d.roundId) return;
  try {
   const { predictorBridge = {} } = await chrome.storage.local.get("predictorBridge");
   const ids = Array.isArray(predictorBridge.receivedRoundIds) ? predictorBridge.receivedRoundIds : [];
   if (!ids.includes(String(d.roundId))) ids.push(String(d.roundId));
   const receivedRoundIds = ids.slice(-5000);
   await chrome.storage.local.set({
    predictorBridge: {
     ...predictorBridge,
     received: receivedRoundIds.length,
     receivedRoundIds,
     lastReceivedAt: new Date().toISOString(),
     lastReceivedRoundId: String(d.roundId)
    }
   });
  } catch (_) {}
 });
 window.addEventListener("message", event => {
  const d = event.data;
  if (event.source === window && event.origin === pageOrigin && d?.source === "CRASH_PREDICTOR_PAGE" && d.type === "READY") {
   chrome.storage.local.get("predictorBridge").then(({ predictorBridge = {} }) => chrome.storage.local.set({ predictorBridge: { ...predictorBridge, pageReady: true, readyAt: new Date().toISOString(), pageUrl: location.href } })).catch(() => {});
   send();
  }
 });
 chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.recentRounds) send();
 });
 send();
 setTimeout(send, 1000);
})();