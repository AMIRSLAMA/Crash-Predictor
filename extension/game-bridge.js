(() => {
 if (window.__crashLiveBridgeInstalled) return;
 window.__crashLiveBridgeInstalled = true;
 const valid = v => {const n=Number(v);return Number.isFinite(n)&&n>=1&&n<=100000?n:null;};
 window.addEventListener("message", async event => {
  const d=event.data;
  if(event.source!==window||event.origin!==location.origin||!d||d.source!=="ROHNY_CRASH_COLLECTOR"||d.kind!=="signalr")return;
  const a=Array.isArray(d.args)?d.args:[],o=a[0]&&typeof a[0]==="object"?a[0]:{};
  const roundId=o.l??o.roundId??o.round_id;
  if(roundId===undefined||roundId===null)return;
  const isCrash=d.target==="OnCrash",isResult=d.target==="OnResult";
  const crash=isCrash?valid(o.f??o.multiplier??o.crash):null;
  const resultCrash=isResult?valid(o.f??o.crashCoefficient??o.crash_coefficient):null;
  const resultUser=isResult?valid(o.k??o.userCoefficient??o.user_coefficient):null;
  if(crash===null&&resultCrash===null)return;
  const round={roundId:String(roundId),finalMultiplier:crash??resultCrash,crash,resultCrash,resultUser,sources:[...(crash!==null?["OnCrash"]:[]),...(resultCrash!==null?["OnResult"]:[])],firstEventTime:o.ts??o.t??null,lastEventTime:o.ts??o.t??null,updatedAt:new Date().toISOString()};
  try{await chrome.runtime.sendMessage({type:"CRASH_ROUND",round});}catch(_){}
 });
})();