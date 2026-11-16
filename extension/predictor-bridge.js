(() => {
 const send = async () => {
  try {
   const {recentRounds=[]}=await chrome.storage.local.get("recentRounds");
   for(const round of recentRounds) window.postMessage({source:"CRASH_LIVE_EXTENSION",type:"ROUND",round},location.origin);
  } catch (_) {}
 };
 chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==="local"&&changes.recentRounds)send();
 });
 send();
})();