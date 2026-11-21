"use strict";
(function(root){
 const TIME_KEY=/(remaining|countdown|timeleft|endsat|endat|crashat|deadline|expiresat)/i;
 function candidateKeys(payload){
  if(!payload||typeof payload!=="object"||Array.isArray(payload))return [];
  return Object.keys(payload).filter(key=>{
   if(!TIME_KEY.test(key))return false;
   const value=payload[key];
   return typeof value==="number"||(typeof value==="string"&&value.trim()!=="");
  });
 }
 function createSensor(){
  let active=null;
  const counts={starts:0,stages:0,crashes:0,betting:0,registration:0};
  const measurements=[];
  function observe(target,payload,now){
   const name=String(target||"").toLowerCase();
   const data=payload&&typeof payload==="object"?payload:{};
   const at=Number.isFinite(Number(now))?Number(now):Date.now();
   const id=data.l??data.roundId??data.round_id??null;
   const roundId=id===null?null:String(id);
   if(name==="onstart"){
    counts.starts++;
    active={roundId,startedAt:at,lastStageAt:null,stageCount:0,candidateKeys:candidateKeys(data)};
    return {type:"start",roundId,counts:snapshot().counts};
   }
   if(name==="onstage"){
    counts.stages++;
    if(!active||(roundId!==null&&active.roundId!==null&&roundId!==active.roundId)){
     active={roundId,startedAt:null,lastStageAt:null,stageCount:0,candidateKeys:[]};
    }
    if(active.roundId===null)active.roundId=roundId;
    active.lastStageAt=at;
    active.stageCount++;
    active.candidateKeys=[...new Set([...active.candidateKeys,...candidateKeys(data)])];
    return {type:"stage",roundId:active.roundId,stageCount:active.stageCount,stageState:data.s??null,candidateKeys:[...active.candidateKeys],counts:snapshot().counts};
   }
   if(name==="onbetting"||name==="onregistration"){
    if(name==="onbetting")counts.betting++;else counts.registration++;
    if(!active)active={roundId,startedAt:null,lastStageAt:null,stageCount:0,candidateKeys:[]};
    const found=candidateKeys(data);
    active.candidateKeys=[...new Set([...active.candidateKeys,...found])];
    return found.length?{type:"signal",target,roundId:active.roundId,candidateKeys:[...active.candidateKeys],counts:snapshot().counts}:null;
   }
   if(name==="oncrash"){
    counts.crashes++;
    const sameRound=!active||roundId===null||active.roundId===null||active.roundId===roundId;
    const source=sameRound?active:null;
    const measurement={
     roundId:roundId??source?.roundId??null,
     startedToCrashMs:source&&source.startedAt!==null?Math.max(0,at-source.startedAt):null,
     lastStageToCrashMs:source&&source.lastStageAt!==null?Math.max(0,at-source.lastStageAt):null,
     stageCount:source?source.stageCount:0,
     countdownCandidateKeys:source?[...source.candidateKeys]:[],
     observedAt:at
    };
    measurements.push(measurement);
    if(measurements.length>200)measurements.shift();
    active=null;
    return {type:"crash",measurement,counts:snapshot().counts};
   }
   return null;
  }
  function snapshot(){return {active:active?{...active,candidateKeys:[...active.candidateKeys]}:null,counts:{...counts},measurements:measurements.slice()};}
  return {observe,snapshot};
 }
 const api={createSensor,candidateKeys};
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 root.CrashEarlySensor=api;
})(typeof window!=="undefined"?window:globalThis);
