(() => {
 if (window.__crashLiveBridgeInstalled) return;
 window.__crashLiveBridgeInstalled = true;
 chrome.storage.local.get("collectorDiagnostics").then(({collectorDiagnostics={}})=>chrome.storage.local.set({collectorDiagnostics:{...collectorDiagnostics,pageUrl:location.href,frameUrl:location.href,iframeUrls:[...document.querySelectorAll("iframe")].map(x=>x.src||"(iframe بلا src)").filter(Boolean)}})).catch(()=>{});
 const valid = v => {const n=Number(v);return Number.isFinite(n)&&n>=1&&n<=100000?n:null;};
 window.addEventListener("message", async event => {
  const d=event.data;
  if(event.source!==window||event.origin!==location.origin||!d||d.source!=="ROHNY_CRASH_COLLECTOR")return;
  const {collectorDiagnostics={}}=await chrome.storage.local.get("collectorDiagnostics");
  const diag={...collectorDiagnostics};
  if(d.kind==="socket"){
   if(d.action==="created")diag.wsCreated=(diag.wsCreated||0)+1;
   if(d.action==="opened")diag.wsOpened=(diag.wsOpened||0)+1;
   if(d.action==="message"){diag.wsFrames=(diag.wsFrames||0)+1;diag.lastDataType=d.dataType;diag.lastDataLength=d.dataLength;}
   if(d.action==="error")diag.wsErrors=(diag.wsErrors||0)+1;
   if(d.action==="closed")diag.wsClosed=(diag.wsClosed||0)+1;
   if(d.action==="protocol")diag.lastProtocolType=d.protocolType;
   if(d.action==="unparsed")diag.unparsedFrames=(diag.unparsedFrames||0)+1;
   diag.lastSeenAt=new Date().toISOString();
   await chrome.storage.local.set({collectorDiagnostics:diag});
   return;
  }
  if(d.kind!=="signalr")return;
  const a=Array.isArray(d.args)?d.args:[],o=a[0]&&typeof a[0]==="object"?a[0]:{};
  const target=String(d.target||"");
  diag.wsMessages=(diag.wsMessages||0)+1;diag.lastTarget=target;diag.lastSeenAt=new Date().toISOString();
  const isCrash=target==="OnCrash",isResult=target==="OnResult";
  if(!isCrash&&!isResult){await chrome.storage.local.set({collectorDiagnostics:diag});return;}
  const roundId=o.l??o.roundId??o.round_id;
  if(roundId===undefined||roundId===null){diag.missingRoundId=(diag.missingRoundId||0)+1;await chrome.storage.local.set({collectorDiagnostics:diag});return;}
  const crash=isCrash?valid(o.f??o.multiplier??o.crash):null;
  const resultCrash=isResult?valid(o.f??o.crashCoefficient??o.crash_coefficient):null;
  const resultUser=isResult?valid(o.k??o.userCoefficient??o.user_coefficient):null;
  if(crash===null&&resultCrash===null){diag.missingMultiplier=(diag.missingMultiplier||0)+1;await chrome.storage.local.set({collectorDiagnostics:diag});return;}
  const round={roundId:String(roundId),finalMultiplier:crash??resultCrash,crash,resultCrash,resultUser,sources:[...(crash!==null?["OnCrash"]:[]),...(resultCrash!==null?["OnResult"]:[])],firstEventTime:o.ts??o.t??null,lastEventTime:o.ts??o.t??null,updatedAt:new Date().toISOString()};
  try{
   const response=await chrome.runtime.sendMessage({type:"CRASH_ROUND",round});
   if(response?.ok){diag.roundsCaptured=(diag.roundsCaptured||0)+1;diag.lastRoundId=String(roundId);}
   else diag.lastError=response?.error||"background rejected round";
  }catch(e){diag.lastError=String(e);}
  await chrome.storage.local.set({collectorDiagnostics:diag});
 });
})();