"use strict";
(function(root){
  function validMultiplier(value){
    const n=Number(value);
    return Number.isFinite(n)&&n>=1?n:null;
  }
  function normalizeRound(round){
    if(!round||round.roundId===undefined||round.roundId===null||String(round.roundId).trim()==="") return null;
    const crash=validMultiplier(round.crash);
    const resultCrash=validMultiplier(round.resultCrash);
    const final=validMultiplier(round.finalMultiplier)??crash??resultCrash;
    if(final===null) return null;
    const sources=[...new Set((Array.isArray(round.sources)?round.sources:[]).filter(s=>s==="OnCrash"||s==="OnResult"))];
    if(crash!==null&&!sources.includes("OnCrash")) sources.push("OnCrash");
    if(resultCrash!==null&&!sources.includes("OnResult")) sources.push("OnResult");
    return {
      roundId:String(round.roundId),finalMultiplier:crash??resultCrash??final,
      crash,resultCrash,resultUser:validMultiplier(round.resultUser),
      sources, mismatch:crash!==null&&resultCrash!==null&&Math.abs(crash-resultCrash)>0.000001,
      firstEventTime:round.firstEventTime??null,lastEventTime:round.lastEventTime??null,
      updatedAt:round.updatedAt||new Date().toISOString()
    };
  }
  function mergeRounds(existing,incoming){
    const a=normalizeRound(existing),b=normalizeRound(incoming);
    if(!a) return b;
    if(!b) return a;
    if(a.roundId!==b.roundId) throw new Error("Cannot merge different rounds");
    const crash=b.crash??a.crash,resultCrash=b.resultCrash??a.resultCrash;
    const sources=[...new Set([...a.sources,...b.sources])];
    const times=[a.firstEventTime,b.firstEventTime,a.lastEventTime,b.lastEventTime].filter(v=>v!==null&&v!==undefined).map(v=>Number(v)).filter(Number.isFinite);
    const firstCandidates=[a.firstEventTime,b.firstEventTime].filter(v=>v!==null&&v!==undefined);
    const lastCandidates=[a.lastEventTime,b.lastEventTime].filter(v=>v!==null&&v!==undefined);
    return {
      roundId:a.roundId,finalMultiplier:crash??resultCrash??b.finalMultiplier??a.finalMultiplier,
      crash,resultCrash,resultUser:b.resultUser??a.resultUser,sources,
      mismatch:crash!==null&&resultCrash!==null&&Math.abs(crash-resultCrash)>0.000001,
      firstEventTime:firstCandidates.length?Math.min(...firstCandidates.map(Number).filter(Number.isFinite)):null,
      lastEventTime:lastCandidates.length?Math.max(...lastCandidates.map(Number).filter(Number.isFinite)):null,
      updatedAt:new Date().toISOString()
    };
  }
  function mergeCollections(existing,incoming){
    const map=new Map();
    for(const item of Array.isArray(existing)?existing:[]){
      const normalized=normalizeRound(item);if(normalized)map.set(normalized.roundId,normalized);
    }
    let added=0,updated=0,skipped=0;
    for(const item of Array.isArray(incoming)?incoming:[]){
      const normalized=normalizeRound(item);if(!normalized){skipped++;continue;}
      if(map.has(normalized.roundId)){map.set(normalized.roundId,mergeRounds(map.get(normalized.roundId),normalized));updated++;}
      else{map.set(normalized.roundId,normalized);added++;}
    }
    const rounds=[...map.values()].sort((x,y)=>{
      const a=Number(x.roundId),b=Number(y.roundId);
      return Number.isFinite(a)&&Number.isFinite(b)?a-b:x.roundId.localeCompare(y.roundId);
    });
    return {rounds,added,updated,skipped};
  }
  const api={normalizeRound,mergeRounds,mergeCollections};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.CrashCollector=api;
})(typeof window!=="undefined"?window:globalThis);
