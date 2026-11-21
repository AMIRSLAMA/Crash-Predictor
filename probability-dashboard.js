(()=>{"use strict";
const $=id=>document.getElementById(id);
const localKey="crash-collected-rounds-v1";
const fmt=p=>(p*100).toFixed(1)+"%";
function localRounds(){try{const x=JSON.parse(localStorage.getItem(localKey)||"[]");return Array.isArray(x)?x:[]}catch(_){return[]}}
function make(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e}
function render(values){
 const root=$("probabilityDashboard");if(!root)return;
 root.replaceChildren();
 const valid=CrashProbability.valid(values);
 const title=make("h2","pd-title","تحليل احتمالات العتبات");
 const description=make("p","pd-desc","احتمالات تاريخية محسوبة من آخر 300 جولة مكتملة، وليست توقعًا لرقم الجولة التالية.");
 root.append(title,description);
 if(valid.length<100){root.append(make("p","pd-empty","نحتاج 100 جولة صالحة على الأقل. المتاح: "+valid.length));return;}
 const estimate=CrashProbability.estimate(valid,{windowSize:300});
 const table=make("div","pd-grid");
 estimate.thresholds.forEach(row=>{
  const card=make("article","pd-card");
  card.append(make("div","pd-threshold","تجاوز "+row.threshold+"x"),make("div","pd-rate",fmt(row.probability)));
  card.append(make("div","pd-ci","فاصل ثقة 95%: "+fmt(row.interval.low)+" – "+fmt(row.interval.high)));
  card.append(make("div","pd-count",row.successes+" من "+row.count+" جولة"));
  table.append(card);
 });
 root.append(table);
 const test=CrashProbability.backtest(valid,{minimum:100,windowSize:300});
 const section=make("section","pd-backtest");
 section.append(make("h3","","اختبار زمني خارج العينة"),make("p","pd-desc","كل جولة اختُبرت باستخدام الجولات السابقة لها فقط. نقارن نافذة آخر 300 جولة بخط أساس تراكمي."));
 const rows=make("div","pd-test-grid");
 test.scores.forEach(s=>{
  const d=make("div","pd-test-row");
  const delta=s.rollingBrier-s.expandingBrier;
  d.append(make("strong","","عتبة "+s.threshold+"x"));
  d.append(make("span","","Brier للنافذة: "+s.rollingBrier.toFixed(4)));
  d.append(make("span","","Brier للخط الأساسي: "+s.expandingBrier.toFixed(4)));
  d.append(make("span",delta<0?"pd-better":"pd-not-better",delta<0?"النافذة أفضل في هذه العينة":"لا توجد أفضلية للنافذة"));
  rows.append(d);
 });
 section.append(rows,make("p","pd-foot","عدد اختبارات كل عتبة: "+test.testedRounds+" · مقياس Brier الأقل أفضل. حتى لو تحسنت النتيجة تاريخيًا فهذا لا يكشف نتيجة الجولة القادمة ولا يثبت استمرار النمط."));
 root.append(section,make("p","pd-source","مصدر الحساب: data/crash-rounds.json مع الجولات الجديدة المحفوظة محليًا. لا يتم إرسال بيانات حساب أو اتصال إلى أي خادم."));
}
async function start(){
 const host=$("liveResults")||document.querySelector(".stage");if(!host)return;
 let panel=$("probabilityDashboard");
 if(!panel){panel=make("section","pd-panel");panel.id="probabilityDashboard";host.insertAdjacentElement("afterend",panel);}
 let base=[];
 try{const response=await fetch("./data/crash-rounds.json",{cache:"no-store"});if(response.ok){const rows=await response.json();if(Array.isArray(rows))base=rows.map(x=>({roundId:String(x.roundId),multiplier:Number(x.multiplier)}));}}catch(_){}
 function combined(){
  const map=new Map();
  base.forEach(r=>{if(r.roundId&&Number.isFinite(r.multiplier)&&r.multiplier>=1)map.set(r.roundId,r.multiplier)});
  localRounds().forEach(r=>{const n=Number(r.finalMultiplier);if(r.roundId!==undefined&&Number.isFinite(n)&&n>=1)map.set(String(r.roundId),n)});
  return [...map.entries()].sort((a,b)=>{const x=Number(a[0]),y=Number(b[0]);return Number.isFinite(x)&&Number.isFinite(y)?x-y:a[0].localeCompare(b[0])}).map(x=>x[1]);
 }
 render(combined());
 window.addEventListener("crash-live-round",()=>render(combined()));
 window.addEventListener("storage",e=>{if(e.key===localKey)render(combined())});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
