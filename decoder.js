"use strict";
(function(root){
  function splitFrames(raw){
    return String(raw||"").split(/[\x1e\n]+/).map(s=>s.trim()).filter(Boolean);
  }
  function parseFrames(raw){
    const messages=[], ignored=[];
    for(const frame of splitFrames(raw)){
      try{
        const parsed=JSON.parse(frame);
        const items=Array.isArray(parsed)?parsed:[parsed];
        for(const item of items){
          if(item&&typeof item==="object"&&Number.isFinite(Number(item.type))){
            messages.push(item);
          } else ignored.push(frame.slice(0,120));
        }
      }catch(_){ ignored.push(frame.slice(0,120)); }
    }
    return {messages,ignored};
  }
  function eventFrom(message,index){
    const target=String(message.target||"").toLowerCase();
    const args=Array.isArray(message.arguments)?message.arguments:[];
    const data=args[0]&&typeof args[0]==="object"?args[0]:{};
    const roundId=data.l??data.roundId??data.round_id??null;
    const event={index,type:message.type,target:message.target||"SignalR",roundId:roundId===null?null:String(roundId),timestamp:data.ts??null,fields:Object.keys(data)};
    if(target==="oncrash"){
      const raw=data.f??data.multiplier??data.crash;
      const multiplier=Number(raw);
      if(raw!==undefined&&Number.isFinite(multiplier)&&multiplier>=1) event.multiplier=multiplier;
      event.kind="crash-result";
    }else if(target==="onstart") event.kind="round-start";
    else if(target==="onregistration"){
      event.kind="registration";
      if(Array.isArray(data.fs)) event.historyCount=data.fs.length;
    }else if(target==="oncashouts") event.kind="cashouts";
    else if(target==="onprofits") event.kind="profits";
    else event.kind="other";
    return event;
  }
  function analyze(raw){
    const parsed=parseFrames(raw);
    const events=parsed.messages.map(eventFrom);
    const rounds=new Map();
    for(const event of events){
      if(!event.roundId) continue;
      const current=rounds.get(event.roundId)||{roundId:event.roundId,started:false,crash:null,events:[]};
      current.events.push(event.target);
      if(event.kind==="round-start") current.started=true;
      if(event.kind==="crash-result"&&event.multiplier!==undefined) current.crash=event.multiplier;
      rounds.set(event.roundId,current);
    }
    const completed=[...rounds.values()].filter(r=>r.crash!==null);
    const values=completed.map(r=>r.crash);
    const counts={registration:0,starts:0,crashes:0,cashouts:0,profits:0,other:0};
    for(const e of events){
      if(e.kind==="registration") counts.registration++;
      else if(e.kind==="round-start") counts.starts++;
      else if(e.kind==="crash-result") counts.crashes++;
      else if(e.kind==="cashouts") counts.cashouts++;
      else if(e.kind==="profits") counts.profits++;
      else counts.other++;
    }
    return {events,rounds:[...rounds.values()],completed,values,counts,ignored:parsed.ignored.length,total:parsed.messages.length};
  }
  const api={parseFrames,eventFrom,analyze};
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.CrashDecoder=api;
})(typeof window!=="undefined"?window:globalThis);
