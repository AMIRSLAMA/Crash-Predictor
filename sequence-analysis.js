"use strict";
function clean(values){
  return (Array.isArray(values)?values:[]).map(Number).filter(v=>Number.isFinite(v)&&v>=1);
}
function previousBucket(value){
  if(value<1.5)return "low";
  if(value<2)return "mid";
  if(value<5)return "high";
  return "very-high";
}
function trailingLowStreak(values,endExclusive){
  let count=0;
  for(let i=endExclusive-1;i>=0&&values[i]<1.5;i--)count++;
  return Math.min(count,3);
}
function brier(probabilities,outcomes){
  if(!probabilities.length)return null;
  return probabilities.reduce((sum,p,i)=>sum+(p-(outcomes[i]?1:0))**2,0)/probabilities.length;
}
function walkForwardSequenceAudit(values,{trainRatio=.8,minHistory=100,priorWeight=30,thresholds=[2,3,5]}={}){
  const a=clean(values),cut=Math.max(minHistory,Math.floor(a.length*trainRatio));
  if(a.length<=cut)return {count:a.length,trainCount:Math.min(cut,a.length),testCount:0,results:[],message:"تحتاج بيانات أكثر من الحد الأدنى لإجراء اختبار زمني."};
  const results=thresholds.map(threshold=>{
    const baseline=[],bucketModel=[],streakModel=[],outcomes=[];
    for(let i=cut;i<a.length;i++){
      const history=a.slice(0,i),base=history.filter(v=>v>=threshold).length/history.length;
      const bucket=previousBucket(a[i-1]),streak=trailingLowStreak(a,i);
      let bucketN=0,bucketSuccess=0,streakN=0,streakSuccess=0;
      for(let j=1;j<history.length;j++){
        if(previousBucket(history[j-1])===bucket){bucketN++;if(history[j]>=threshold)bucketSuccess++;}
        if(trailingLowStreak(history,j)===streak){streakN++;if(history[j]>=threshold)streakSuccess++;}
      }
      baseline.push(base);
      bucketModel.push((bucketSuccess+base*priorWeight)/(bucketN+priorWeight));
      streakModel.push((streakSuccess+base*priorWeight)/(streakN+priorWeight));
      outcomes.push(a[i]>=threshold);
    }
    const baselineBrier=brier(baseline,outcomes),bucketBrier=brier(bucketModel,outcomes),streakBrier=brier(streakModel,outcomes);
    return {threshold,observations:outcomes.length,actualRate:outcomes.filter(Boolean).length/outcomes.length,
      baselineBrier,bucketBrier,bucketImprovement:baselineBrier-bucketBrier,
      streakBrier,streakImprovement:baselineBrier-streakBrier};
  });
  return {count:a.length,trainCount:cut,testCount:a.length-cut,method:"strict-walk-forward-with-shrinkage",
    note:"التحسن الموجب يعني أن السياق تفوق على معدل الماضي المتاح فقط؛ لا يثبت كشفًا مسبقًا ولا يضمن الجولة التالية.",results};
}
module.exports={clean,previousBucket,trailingLowStreak,brier,walkForwardSequenceAudit};
