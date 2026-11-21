"use strict";
(function(root){
  const DEFAULT_THRESHOLDS=[1.5,2,3,5,10];
  function clean(values){
    return (Array.isArray(values)?values:[]).map(Number).filter(v=>Number.isFinite(v)&&v>=1);
  }
  function wilson(successes,total,z=1.96){
    if(!total)return {low:0,high:1};
    const p=successes/total,z2=z*z,den=1+z2/total;
    const center=(p+z2/(2*total))/den;
    const margin=z*Math.sqrt((p*(1-p)+z2/(4*total))/total)/den;
    return {low:Math.max(0,center-margin),high:Math.min(1,center+margin)};
  }
  function probabilities(values,thresholds=DEFAULT_THRESHOLDS){
    const a=clean(values);
    return thresholds.map(threshold=>{
      const successes=a.filter(v=>v>=threshold).length;
      const interval=wilson(successes,a.length);
      return {threshold,count:a.length,successes,probability:a.length?successes/a.length:0,low:interval.low,high:interval.high};
    });
  }
  function brierScore(forecasts,outcomes){
    if(!forecasts.length||forecasts.length!==outcomes.length)return null;
    return forecasts.reduce((sum,p,i)=>sum+(p-(outcomes[i]?1:0))**2,0)/forecasts.length;
  }
  function backtest(values,{trainRatio=.8,window=200,minHistory=50,thresholds=DEFAULT_THRESHOLDS}={}){
    const a=clean(values),cut=Math.floor(a.length*trainRatio),train=a.slice(0,cut),test=a.slice(cut);
    if(train.length<minHistory||!test.length)return {count:a.length,trainCount:train.length,testCount:test.length,results:[],message:"تحتاج بيانات أكثر لإجراء اختبار زمني."};
    const results=thresholds.map(threshold=>{
      const base=train.filter(v=>v>=threshold).length/train.length;
      const staticForecasts=[],rollingForecasts=[],outcomes=[];
      for(let i=0;i<test.length;i++){
        const history=a.slice(Math.max(0,cut+i-window),cut+i);
        if(history.length<minHistory)continue;
        const successes=history.filter(v=>v>=threshold).length;
        const priorWeight=20;
        const rolling=(successes+base*priorWeight)/(history.length+priorWeight);
        staticForecasts.push(base);rollingForecasts.push(rolling);outcomes.push(test[i]>=threshold);
      }
      const actual=outcomes.length?outcomes.filter(Boolean).length/outcomes.length:0;
      return {threshold,observations:outcomes.length,trainingRate:base,actualRate:actual,staticBrier:brierScore(staticForecasts,outcomes),rollingBrier:brierScore(rollingForecasts,outcomes)};
    });
    return {count:a.length,trainCount:train.length,testCount:test.length,results};
  }
  function recentTrend(values,windows=[30,100],thresholds=[2,3,5]){
    const a=clean(values);
    return windows.map(window=>{
      const current=a.slice(-window);
      const previous=a.slice(-2*window,-window);
      const rates=thresholds.map(threshold=>{
        const currentRate=current.length?current.filter(v=>v>=threshold).length/current.length:null;
        const previousRate=previous.length===window?previous.filter(v=>v>=threshold).length/previous.length:null;
        const delta=currentRate!==null&&previousRate!==null?currentRate-previousRate:null;
        return {threshold,currentCount:current.length,currentRate,previousCount:previous.length,previousRate,delta,direction:delta===null?"insufficient":delta>0.03?"up":delta< -0.03?"down":"flat"};
      });
      return {window,currentCount:current.length,previousCount:previous.length,rates};
    });
  }
  function forecastNext(values,thresholds=DEFAULT_THRESHOLDS){
    const a=clean(values);
    return {sampleSize:a.length,probabilities:probabilities(a,thresholds),method:"historical-frequency",warning:"احتمالات وصفية من النتائج السابقة وليست كشفًا أو ضمانًا لنتيجة الجولة القادمة."};
  }
  const api={clean,wilson,probabilities,brierScore,backtest,recentTrend,forecastNext,DEFAULT_THRESHOLDS};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.CrashForecast=api;
})(typeof window!=="undefined"?window:globalThis);
