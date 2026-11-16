chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
 if(!message||message.type!=="CRASH_ROUND"||!message.round)return;
 (async()=>{
  const {recentRounds=[]}=await chrome.storage.local.get("recentRounds");
  const incoming=message.round, id=String(incoming.roundId??"");
  if(!id)return;
  const map=new Map((Array.isArray(recentRounds)?recentRounds:[]).map(r=>[String(r.roundId),r]));
  const old=map.get(id)||{};
  const merged={...old,...incoming,
   crash:incoming.crash??old.crash??null,
   resultCrash:incoming.resultCrash??old.resultCrash??null,
   resultUser:incoming.resultUser??old.resultUser??null,
   sources:[...new Set([...(old.sources||[]),...(incoming.sources||[])])],
   finalMultiplier:incoming.crash??incoming.resultCrash??old.crash??old.resultCrash??incoming.finalMultiplier??old.finalMultiplier
  };
  map.set(id,merged);
  const sorted=[...map.values()].sort((a,b)=>{const x=Number(a.roundId),y=Number(b.roundId);return Number.isFinite(x)&&Number.isFinite(y)?x-y:String(a.roundId).localeCompare(String(b.roundId));}).slice(-5000);
  await chrome.storage.local.set({recentRounds:sorted,lastRoundAt:new Date().toISOString()});
  sendResponse({ok:true,total:sorted.length});
 })().catch(e=>sendResponse({ok:false,error:String(e)}));
 return true;
});