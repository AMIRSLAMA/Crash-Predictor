(() => {
 if (window.__crashLiveHookInstalled) return;
 window.__crashLiveHookInstalled = true;
 const NativeWebSocket = window.WebSocket;
 const post = payload => window.postMessage({source:"ROHNY_CRASH_COLLECTOR",...payload}, location.origin);
 const emit = data => {
  post({kind:"socket",action:"message",dataType:typeof data,dataLength:typeof data==="string"?data.length:0});
  if (typeof data !== "string") return;
  for (const frame of data.split(/[\x1e\n]+/)) {
   if (!frame.trim() || frame.trim() === "{}") continue;
   try {
    const msg = JSON.parse(frame);
    const list = Array.isArray(msg) ? msg : [msg];
    for (const item of list) {
     if (item && item.type === 1 && typeof item.target === "string") {
      post({kind:"signalr",target:item.target,args:item.arguments||[]});
     } else if (item && item.type !== undefined) {
      post({kind:"socket",action:"protocol",protocolType:String(item.type)});
     }
    }
   } catch (_) {
    post({kind:"socket",action:"unparsed"});
   }
  }
 };
 window.WebSocket = new Proxy(NativeWebSocket, {
  construct(target,args,newTarget) {
   const ws = Reflect.construct(target,args,newTarget);
   post({kind:"socket",action:"created"});
   ws.addEventListener("open", () => post({kind:"socket",action:"opened"}));
   ws.addEventListener("error", () => post({kind:"socket",action:"error"}));
   ws.addEventListener("close", () => post({kind:"socket",action:"closed"}));
   ws.addEventListener("message", event => emit(event.data));
   return ws;
  }
 });
 Object.setPrototypeOf(window.WebSocket, NativeWebSocket);
})();