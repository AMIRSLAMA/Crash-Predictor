(function(root){
"use strict";
const THRESHOLDS=[1.5,2,3,5,10];
function valid(values){return (Array.isArray(values)?values:[]).map(Number).filter(v=>Number.isFinite(v)&&v>=1);}
function wilson(successes,total,z=1.96){
 if(!total)return {low:0,high:1};
 const p=successes/total,z2=z*z,den=1+z2/total,center=(p+z2/(2*total))/den;
 const margin=z*Math.sqrt((p*(1-p)+z2/(4*total))/total)/den;
 return {low:Math.max(0,center-margin),high:Math.min(1,center+margin)};
}
function rate(values,threshold){
 const a=valid(values),successes=a.filter(v=>v>=threshold).length;
 return {threshold,count:a.length,successes,probability:a.length?successes/a.length:0,interval:wilson(successes,a.length)};
}
function estimate(values,options={}){
 const a=valid(values),windowSize=Math.max(30,Number(options.windowSize)||300);
 const sample=a.slice(-windowSize);
 return {sampleSize:sample.length,windowSize,thresholds:THRESHOLDS.map(t=>rate(sample,t))};
}
function backtest(values,options={}){
 const a=valid(values),minimum=Math.max(30,Number(options.minimum)||100),windowSize=Math.max(30,Number(options.windowSize)||300);
 const scores=THRESHOLDS.map(threshold=>{
  const rolling={n:0,brier:0,logLoss:0},expanding={n:0,brier:0,logLoss:0};
  for(let i=minimum;i<a.length;i++){
   const y=a[i]>=threshold?1:0;
   const samples=[a.slice(Math.max(0,i-windowSize),i),a.slice(0,i)];
   for(const [score,sample] of [[rolling,samples[0]],[expanding,samples[1]]]){
    const successes=sample.filter(v=>v>=threshold).length;
    const p=(successes+1)/(sample.length+2);
    score.n++;score.brier+=(p-y)**2;score.logLoss+=-(y*Math.log(p)+(1-y)*Math.log(1-p));
   }
  }
  return {threshold,n:rolling.n,rollingBrier:rolling.n?rolling.brier/rolling.n:null,expandingBrier:expanding.n?expanding.brier/expanding.n:null,rollingLogLoss:rolling.n?rolling.logLoss/rolling.n:null,expandingLogLoss:expanding.n?expanding.logLoss/expanding.n:null};
 });
 return {minimum,windowSize,testedRounds:Math.max(0,a.length-minimum),scores};
}
const api={THRESHOLDS,valid,wilson,rate,estimate,backtest};
if(typeof module!=="undefined"&&module.exports)module.exports=api;
root.CrashProbability=api;
})(typeof window!=="undefined"?window:globalThis);
