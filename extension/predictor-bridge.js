(() => {
 const send = async () => {
  try {
   const {recentRounds=[]}=await chrome.storage.local.get("recentRounds");
   for(const round of recentRounds) window.postMessage({source:"CRASH_LIVE_EXTENSION",type:"ROUND",round},location.origin);
  } catch (_) {}
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