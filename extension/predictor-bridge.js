(() => {
 const send = async () => {
  try {
   const {recentRounds=[]}=await chrome.storage.local.get("recentRounds");
   let sent=0;
   for(const round of recentRounds){
    window.dispatchEvent(new CustomEvent("crash-live-round",{detail:JSON.stringify(round)}));
    sent++;
   }
   await chrome.storage.local.set({predictorBridge:{lastSendAt:new Date().toISOString(),sent,total:Array.isArray(recentRounds)?recentRounds.length:0,pageUrl:location.href}});
  } catch (error) {
   try{await chrome.storage.local.set({predictorBridge:{lastError:String(error),pageUrl:location.href}});}catch(_){}
  }
 };
 window.addEventListener("message",event=>{
  const d=event.data;
  if(event.source===window&&event.origin===location.origin&&d?.source==="CRASH_PREDICTOR_PAGE"&&d.type==="READY")send();
 });
 chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==="local"&&changes.recentRounds)send();
 });
 send();
 setTimeout(send,1500);
})();