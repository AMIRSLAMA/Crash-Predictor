(() => {
"use strict";
const $=id=>document.getElementById(id),input=$("historyInput"),STORAGE_KEY="crash-collected-rounds-v1";
let importedHistory=[];
const importedHistoryPromise=fetch(new URL("./data/crash-rounds.json",document.baseURI),{cache:"no-store"})
 .then(response=>{if(!response.ok)throw new Error("History file unavailable");return response.json();})
 .then(rows=>{if(!Array.isArray(rows))throw new Error("Invalid history file");importedHistory=rows.filter(r=>Number.isFinite(Number(r.multiplier))&&Number(r.multiplier)>=1);return importedHistory;})
 .catch(()=>{importedHistory=[];return importedHistory;});
input.value=localStorage.getItem("crash-history")||"";
function loadCollected(){try{const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");return Array.isArray(data)?data:[];}catch(_){return [];}}
function saveCollected(rounds){localStorage.setItem(STORAGE_KEY,JSON.stringify(rounds));renderCollected();}
function renderCollected(){
 const rounds=loadCollected(),count=$("collectorCount"),list=$("collectorSaved");
 count.textContent="الجولات المحفوظة: "+rounds.length;list.replaceChildren();
 const title=document.createElement("h3");title.textContent="آخر 10 جولات محفوظة";list.appendChild(title);
 const recent=rounds.slice(-10).reverse();
 if(!recent.length){const p=document.createElement("p");p.textContent="لسه مفيش نتائج محفوظة. الصق أول رسائل OnCrash أو OnResult واضغط «حلّل واجمع النتائج».";list.appendChild(p);return;}
 const ol=document.createElement("ol");recent.forEach(r=>{const li=document.createElement("li");li.textContent="جولة "+r.roundId+" — "+Number(r.finalMultiplier).toFixed(2)+"x · "+(r.sources||[]).join(" + ")+(r.mismatch?" · اختلاف بين المصدرين":"");ol.appendChild(li);});list.appendChild(ol);
}
async function predictionValues(){
 await importedHistoryPromise;
 const byRound=new Map();
 importedHistory.forEach(r=>byRound.set(String(r.roundId),Number(r.multiplier)));
 loadCollected().forEach(r=>{const value=Number(r.finalMultiplier);if(Number.isFinite(value)&&value>=1)byRound.set(String(r.roundId),value);});
 const combined=[...byRound.entries()].sort((a,b)=>{const x=Number(a[0]),y=Number(b[0]);return Number.isFinite(x)&&Number.isFinite(y)?x-y:String(a[0]).localeCompare(String(b[0]));}).map(x=>x[1]);
 const manual=CrashAnalytics.parseMultipliers(input.value);
 if(combined.length>=30)return {values:combined,source:"قاعدة النتائج المرفقة والجولات الجديدة المحفوظة"};
 return {values:manual,source:"السجل الذي أدخلته يدويًا"};
}

function rollingStats(values){
 const windows=[100,300,500];
 return windows.map(n=>{const sample=values.slice(-Math.min(n,values.length));const rates=[2,3,5,10].map(t=>({t,p:sample.filter(v=>v>=t).length/sample.length}));const best=rates.sort((a,b)=>Math.abs(a.p-.5)-Math.abs(b.p-.5)||a.t-b.t)[0];return "آخر "+sample.length+" جولة: "+best.t+"x ("+(best.p*100).toFixed(1)+"%)";}).join(" · ");
}
function showRolling(values){const el=$("rollingStats");if(el)el.textContent=rollingStats(values);}

function recordPrediction(item){
 const key="crash-live-lab-v1";let a=[];
 try{const parsed=JSON.parse(localStorage.getItem(key)||"[]");if(Array.isArray(parsed))a=parsed;}catch(_){}
 a.push(item);localStorage.setItem(key,JSON.stringify(a));
}

function downloadFile(name,type,content){
 const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
$("toggleHistory").addEventListener("click",()=>{const panel=$("historyPanel"),open=panel.classList.toggle("hidden")===false;$("toggleHistory").setAttribute("aria-expanded",String(open));$("toggleHistory").textContent=open?"− إخفاء سجل النتائج":"＋ إدخال سجل النتائج السابقة";});
$("sampleHistory").addEventListener("click",()=>{input.value="1.12 1.45 2.08 1.01 3.62 1.78 5.24 1.20 2.31 1.04 8.70 1.66 2.05 1.33 4.10 1.09 12.40 2.70 1.51 1.02";});
$("saveHistory").addEventListener("click",()=>{const values=CrashAnalytics.parseMultipliers(input.value);if(values.length<3){$("historyMessage").textContent="أدخل 3 نتائج صحيحة على الأقل.";return;}localStorage.setItem("crash-history",input.value);$("historyMessage").textContent="تم حفظ "+values.length+" نتيجة على هذا الجهاز.";});

// استقبال الجولات المكتملة من إضافة Chrome وربطها بالسجل المحلي.
function receiveLiveRound(round){
 const value=Number(round?.finalMultiplier);
 if(!round?.roundId||!Number.isFinite(value)||value<1||value>100000)return false;
 const merged=CrashCollector.mergeCollections(loadCollected(),[round]);
 saveCollected(merged.rounds);
 const message=$("actualRoundMessage");
 if(message)message.textContent="وصلت نتيجة مباشرة: الجولة "+round.roundId+" — "+value.toFixed(2)+"x. إجمالي الجولات المحفوظة: "+merged.rounds.length;
 const btn=$("nextRound");
 if(btn&&!btn.disabled)btn.click();
 return true;
}
window.addEventListener("crash-live-round",event=>{
 try{
  const round=JSON.parse(String(event.detail||"{}"));
  if(receiveLiveRound(round))window.postMessage({source:"CRASH_PREDICTOR_PAGE",type:"ROUND_RECEIVED",roundId:String(round.roundId)},location.origin);
 }catch(_){}
});
window.addEventListener("message",event=>{
 const d=event.data;
 if(event.origin===location.origin&&d?.source==="CRASH_LIVE_EXTENSION"&&d.type==="ROUND"&&d.round){
  if(receiveLiveRound(d.round))window.postMessage({source:"CRASH_PREDICTOR_PAGE",type:"ROUND_RECEIVED",roundId:String(d.round.roundId)},location.origin);
 }
});
window.postMessage({source:"CRASH_PREDICTOR_PAGE",type:"READY"},location.origin);
$("saveActualRound").addEventListener("click",()=>{
 const field=$("actualRound"),message=$("actualRoundMessage"),value=Number(field.value);
 if(!Number.isFinite(value)||value<1){message.textContent="اكتب نتيجة صحيحة أكبر من أو تساوي 1.";return;}
 const rounds=loadCollected();
 rounds.push({roundId:String(Date.now()),finalMultiplier:value,sources:["Manual"],updatedAt:new Date().toISOString()});
 localStorage.setItem(STORAGE_KEY,JSON.stringify(rounds));
 message.textContent="تم حفظ الجولة "+value.toFixed(2)+"x. يتم الآن تحديث التحليل…";
 location.reload();
});
$("nextRound").addEventListener("click",async()=>{
 const btn=$("nextRound"),status=$("status"),number=$("multiplier"),note=$("subnote");
 btn.disabled=true;btn.textContent="جارٍ حساب النسبة…";
 try {
 const {values,source}=await predictionValues();
 const candidates=[2,3,5,10];
 if(values.length<30){
  $("historyPanel").classList.remove("hidden");$("toggleHistory").setAttribute("aria-expanded","true");$("toggleHistory").textContent="− إخفاء سجل النتائج";
  status.textContent="تعذر تحميل سجل النتائج. المتاح حاليًا "+values.length+" نتيجة؛ تأكد من فتح رابط GitHub Pages.";
  number.innerHTML="--<small>%</small>";note.textContent="تعذر الحساب لعدم توفر 30 نتيجة على الأقل.";return;
 }
 const sample=values.slice(-Math.min(100,values.length));
 const threshold=candidates.map(t=>({t,rate:sample.filter(v=>v>=t).length/sample.length})).sort((a,b)=>Math.abs(a.rate-.5)-Math.abs(b.rate-.5)||a.t-b.t)[0].t;
 const wins=sample.filter(v=>v>=threshold).length,base=wins/sample.length;
 // Laplace/Beta smoothing: prevents tiny samples from producing extreme 0% or 100% estimates.
 const priorStrength=20,p=(wins+priorStrength*0.5)/(sample.length+priorStrength);
 const pct=(p*100).toFixed(1);
 number.innerHTML=pct+'<small>%</small>';
 status.textContent="الاحتمال التاريخي لنتيجة "+threshold+"x أو أكثر: "+pct+"%";
 $("autoThreshold").textContent="العتبة التلقائية المختارة من البيانات: "+threshold+"x فأكثر";
 const intervalN=sample.length+priorStrength,z=1.96,center=(p+z*z/(2*intervalN))/(1+z*z/intervalN);
 const margin=z*Math.sqrt((p*(1-p)/intervalN)+(z*z/(4*intervalN*intervalN)))/(1+z*z/intervalN);
 const low=Math.max(0,center-margin)*100,high=Math.min(1,center+margin)*100;
 note.textContent="تم الحساب من آخر "+sample.length+" جولة من إجمالي "+values.length+" ("+source+"). اختار البرنامج العتبة الأقرب إلى معدل تاريخي 50% من بين 2x و3x و5x و10x. تحقق الشرط في "+wins+" جولة ("+(base*100).toFixed(1)+"% خام). نطاق عدم اليقين التقريبي 95%: "+low.toFixed(1)+"%–"+high.toFixed(1)+"%. أُضيف التقدير لسجل الاختبار؛ أدخل النتيجة الفعلية في المختبر لقياس الدقة. الجولات المستقلة قد لا تتبع هذا المعدل.";
 recordPrediction({id:Date.now(),time:new Date().toISOString(),threshold,p,actual:null,n:sample.length,total:values.length,base,source,method:"smoothed-historical-frequency"});
 showRolling(values);
 btn.textContent="✓ تم حساب النسبة";
 } catch(error) {
  status.textContent="حصل خطأ أثناء الحساب. أعد تحميل الصفحة وجرب مرة أخرى.";
  note.textContent=String(error&&error.message||error);
 } finally {
  setTimeout(()=>{btn.disabled=false;btn.textContent="الجولة التالية";},900);
 }
});

const decoderInput=$("decoderInput"),decoderResults=$("decoderResults");
$("decodeMessages").addEventListener("click",()=>{
 const report=CrashDecoder.analyze(decoderInput.value),status=$("decoderStatus");decoderResults.replaceChildren();
 if(!report.total){status.textContent="لم أتعرف على رسائل SignalR صحيحة. انسخ الرسالة كاملة كما ظهرت في Network.";return;}
 const old=loadCollected(),merged=CrashCollector.mergeCollections(old,report.completed),saved=merged.rounds;saveCollected(saved);
 status.textContent="تم تحليل "+report.total+" رسالة: أُضيفت "+merged.added+" جولة جديدة، وتحدّثت "+merged.updated+" جولة موجودة، وتُركت "+merged.skipped+" سجلات غير صالحة. إجمالي الجولات الفريدة: "+saved.length+".";
 const summary=document.createElement("div");summary.className="decoder-summary";summary.textContent="OnCrash: "+report.counts.crashes+" · OnResult: "+report.counts.results+" · Cashouts/Profits (ليست نتائج انهيار): "+(report.counts.cashouts+report.counts.profits)+" · نتائج جديدة مكتشفة: "+report.completed.length;decoderResults.appendChild(summary);
 const note=document.createElement("p");note.className="decoder-note";note.textContent="تم حفظ بيانات الجولات فقط، دون تخزين رسائل Network الخام أو بيانات الحساب. إذا لصقت مصدرًا آخر لنفس رقم الجولة فسيتم دمجه بدل تكراره. OnCrash / OnResult نتيجتان بعد الجولة وليستا إشارة مسبقة.";decoderResults.appendChild(note);
});
$("clearDecoder").addEventListener("click",()=>{decoderInput.value="";decoderResults.replaceChildren();$("decoderStatus").textContent="تم مسح مربع الرسائل فقط؛ السجل المحفوظ لم يتغير.";});
$("exportJson").addEventListener("click",()=>{const rounds=loadCollected();if(!rounds.length){$("decoderStatus").textContent="لا توجد جولات لتصديرها حتى الآن.";return;}downloadFile("crash-rounds.json","application/json;charset=utf-8",JSON.stringify(rounds,null,2));});
$("exportCsv").addEventListener("click",()=>{const rounds=loadCollected();if(!rounds.length){$("decoderStatus").textContent="لا توجد جولات لتصديرها حتى الآن.";return;}const q=v=>'"'+String(v??"").replace(/"/g,'""')+'"';const rows=[["roundId","finalMultiplier","sources","mismatch","crash","resultCrash","resultUser","firstEventTime","lastEventTime"],...rounds.map(r=>[r.roundId,r.finalMultiplier,(r.sources||[]).join("|"),r.mismatch,r.crash,r.resultCrash,r.resultUser,r.firstEventTime,r.lastEventTime])];downloadFile("crash-rounds.csv","text/csv;charset=utf-8","\uFEFF"+rows.map(row=>row.map(q).join(",")).join("\r
"));});
$("clearCollected").addEventListener("click",()=>{if(!loadCollected().length){$("decoderStatus").textContent="السجل المحفوظ فارغ بالفعل.";return;}if(!window.confirm("هل تريد مسح كل الجولات المحفوظة على هذا الجهاز؟ لا يمكن التراجع عن ذلك."))return;localStorage.removeItem(STORAGE_KEY);renderCollected();$("decoderStatus").textContent="تم مسح السجل المحفوظ من هذا المتصفح.";});
renderCollected();
// اعرض النسبة تلقائيًا عند فتح الصفحة، من دون تسجيل جولة توقع جديدة.
predictionValues().then(({values})=>{
 if(values.length<30){$("status").textContent="تعذر تحميل سجل النتائج — جرّب تحديث الصفحة.";return;}
 const candidates=[2,3,5,10];
 const sample=values.slice(-Math.min(100,values.length));
 const threshold=candidates.map(t=>({t,rate:sample.filter(v=>v>=t).length/sample.length})).sort((a,b)=>Math.abs(a.rate-.5)-Math.abs(b.rate-.5)||a.t-b.t)[0].t;
 const wins=sample.filter(v=>v>=threshold).length,p=(wins+10)/(sample.length+20);
 $("multiplier").innerHTML=(p*100).toFixed(1)+"<small>%</small>";
 $("autoThreshold").textContent="العتبة التلقائية: "+threshold+"x فأكثر";
 $("status").textContent="تم تحميل "+values.length+" جولة؛ النسبة محسوبة من آخر "+sample.length+" جولة. أضف نتيجة الجولة الفعلية لتحديثها.";showRolling(values);
}).catch(()=>{$("status").textContent="تعذر تحميل البيانات. افتح الموقع من GitHub Pages ثم حدّث الصفحة.";});
})();