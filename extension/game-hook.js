(() => {
 if (window.__crashLiveHookInstalled) return;
 window.__crashLiveHookInstalled = true;
 const NativeWebSocket = window.WebSocket;
 const emit = data => {
  if (typeof data !== "string") return;
  for (const frame of data.split(/[\x1e\n]+/)) {
   if (!frame.trim() || frame.trim() === "{}") continue;
   try {
    const msg = JSON.parse(frame);
    const list = Array.isArray(msg) ? msg : [msg];
    for (const item of list) {
     if (item && item.type === 1 && ["OnCrash","OnResult"].includes(item.target)) {
      window.postMessage({source:"ROHNY_CRASH_COLLECTOR",kind:"signalr",target:item.target,args:item.arguments||[]}, location.origin);
     }
    }
   } catch (_) {}
  }
 };
 window.WebSocket = new Proxy(NativeWebSocket, {
  construct(target,args,newTarget) {
   const ws = Reflect.construct(target,args,newTarget);
   ws.addEventListener("message", event => emit(event.data));
   return ws;
  }
 });
 Object.setPrototypeOf(window.WebSocket, NativeWebSocket);
})();