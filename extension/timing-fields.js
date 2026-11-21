"use strict";
(function(root){
 const KEY=/(remaining|countdown|time[_-]?left|ends?[_-]?at|crash[_-]?at|deadline|expires?[_-]?at|duration|timer|clock)/i;
 function collect(payload){
  const found={};
  const seen=new Set();
  function walk(value,path,depth){
   if(!value||typeof value!=="object"||depth>3||seen.has(value))return;
   seen.add(value);
   for(const [key,item] of Object.entries(value).slice(0,60)){
    const next=path?path+"."+key:key;
    if(KEY.test(key)&&(typeof item==="number"&&Number.isFinite(item)||typeof item==="string"&&item.trim()!==""&&item.length<=80)){
     found[next]=item;
     if(Object.keys(found).length>=30)return;
    }else if(item&&typeof item==="object"&&!Array.isArray(item))walk(item,next,depth+1);
   }
  }
  walk(payload,"",0);
  return found;
 }
 const api={collect};
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 root.CrashTimingFields=api;
})(typeof window!=="undefined"?window:globalThis);
