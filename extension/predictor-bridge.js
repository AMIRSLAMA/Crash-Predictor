(() => {
 const send = async () => {
  try {
   const {recentRounds=[],predictorBridge={}}=await chrome.storage.local.get(["recentRounds","predictorBridge"]);
   let sent=0;
   for(const round of recentRounds){
    window.dispatchEvent(new CustomEvent("crash-live-round",{detail:JSON.stringify(round)}));
    sent++;
   }
   await chrome.storage.local.set({predictorBridge:{...predictorBridge,lastSendAt:new Date().toISOString(),sent,total:Array.isArray(recentRounds)?recentRounds.length:0,pageUrl:location.href}});
  } catch (error) {
   try{await chrome.storage.local.set({predictorBridge:{lastError:String(error),pageUrl:location.href}});}catch(_){}
  }
 };
 window.addEventListener("message",async event=>{
  const d=event.data;
  if(event.origin!==location.origin||d?.source!=="CRASH_PREDICTOR_PAGE"||d.type!=="ROUND_RECEIVED"||!d.roundId)return;
  try{
   const {predictorBridge={}}=await chrome.storage.local.get("predictorBridge");
   const ids=Array.isArray(predictorBridge.receivedRoundIds)?predictorBridge.receivedRoundIds:[];
   if(!ids.includes(String(d.roundId)))ids.push(String(d.roundId));
   const receivedRoundIds=ids.slice(-5000);
   await chrome.storage.local.set({predictorBridge:{...predictorBridge,received:receivedRoundIds.length,receivedRoundIds,lastReceivedAt:new Date().toISOString(),lastReceivedRoundId:String(d.roundId)}});
  }catch(_){}
 });
 window.addEventListener("message",event=>{
  const d=event.data;
  if(event.origin===location.origin&&d?.source==="CRASH_PREDICTOR_PAGE"&&d.type==="READY"){chrome.storage.local.get("predictorBridge").then(({predictorBridge={}})=>chrome.storage.local.set({predictorBridge:{...predictorBridge,pageReady:true,lastReadyAt:new Date().toISOString(),pageUrl:location.href}}));send();}
 });
 chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==="local"&&changes.recentRounds)send();
 });
 send();
 setTimeout(send,1500);
})();