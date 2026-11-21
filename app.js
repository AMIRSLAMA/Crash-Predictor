(() => {
"use strict";
const $=id=>document.getElementById(id),input=$("historyInput"),STORAGE_KEY="crash-collected-rounds-v1",PREDICTION_LOG_KEY="crash-round-prediction-log-v1",PENDING_PREDICTION_KEY="crash-pending-round-prediction-v1";
let importedHistory=[];
const importedHistoryPromise=fetch(new URL("./data/crash-rounds.json",document.baseURI),{cache:"no-store"})
 .then(response=>{if(!response.ok)throw new Error("History file unavailable");return response.json();})
 .then(rows=>{if(!Array.isArray(rows))throw new Error("Invalid history file");importedHistory=rows.filter(r=>Number.isFinite(Number(r.multiplier))&&Number(r.multiplier)>=1);return importedHistory;})
 .catch(()=>{importedHistory=[];return importedHistory;});
input.value=localStorage.getItem("crash-history")||"";
function loadCollected(){try{const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");return Array.isArray(data)?data:[];}catch(_){return [];}}
function saveCollected(rounds){localStorage.setItem(STORAGE_KEY,JSON.stringify(rounds));renderCollected();renderLiveRounds();}
function loadPredictionLog(){try{const data=JSON.parse(localStorage.getItem(PREDICTION_LOG_KEY)||"[]");return Array.isArray(data)?data:[];}catch(_){return [];}}
function renderPredictionComparisons(){
 const el=$("latestComparison");if(!el)return;
 const rows=loadPredictionLog().slice(-5).reverse();el.replaceChildren();
 if(!rows.length){el.textContent="ستظهر مقارنة الاحتمالات بعد وصول جولات جديدة.";return;}
 rows.forEach(r=>{
  const item=document.createElement("div"),head=document.createElement("strong"),detail=document.createElement("span");
  item.className="prediction-comparison-row";
  const p=Number(r.probability2),validP=Number.isFinite(p)&&p>=0&&p<=1,actual=typeof r.actualAtLeast2==="boolean"; 
  head.textContent="الجولة "+r.roundId+" · احتمال 2x+ "+(validP?(p*100).toFixed(1)+"%":"غير متوفر")+" · الفعلي "+(actual?(r.actualAtLeast2?"حقق 2x+":"أقل من 2x"):"غير مسجل");
  const score=validP&&actual?(Number.isFinite(Number(r.brier2))?Number(r.brier2):((p-(r.actualAtLeast2?1:0))**2)):null;
  detail.textContent="درجة Brier: "+(score===null?"غير متوفرة":score.toFixed(3))+(score===null?"":" · كلما اقتربت من صفر كان أفضل.");
  item.append(head,detail);el.appendChild(item);
 });
}
function renderCollected(){
 const rounds=loadCollected(),count=$("collectorCount"),list=$("collectorSaved");
 count.textContent="الجولات المحفوظة: "+rounds.length;list.replaceChildren();
 const title=document.createElement("h3");title.textContent="آخر 10 جولات محفوظة";list.appendChild(title);
 const recent=rounds.slice(-10).reverse();
 if(!recent.length){const p=document.createElement("p");p.textContent="لسه مفيش نتائج محفوظة. الصق أول رسائل OnCrash أو OnResult واضغط «حلّل واجمع النتائج».";list.appendChild(p);return;}
 const ol=document.createElement("ol");recent.forEach(r=>{const li=document.createElement("li");li.textContent="جولة "+r.roundId+" — "+Number(r.finalMultiplier).toFixed(2)+"x · "+(r.sources||[]).join(" + ")+(r.mismatch?" · اختلاف بين المصدرين":"");ol.appendChild(li);});list.appendChild(ol);
}
function renderLiveRounds(){
 const rounds=loadCollected().filter(r=>Number.isFinite(Number(r.finalMultiplier))&&Number(r.finalMultiplier)>=1);
 const latest=rounds[rounds.length-1],valueEl=$("latestRoundValue"),metaEl=$("latestRoundMeta"),list=$("recentRoundsList"),count=$("liveRoundsCount");
 if(!valueEl||!metaEl||!list)return;
 list.replaceChildren();count.textContent="إجمالي النتائج الفعلية المحفوظة: "+rounds.length;
 if(!latest){valueEl.textContent="بانتظار أول نتيجة";metaEl.textContent="اترك اللعبة مفتوحة حتى تنتهي الجولة الأولى.";renderPredictionComparisons();return;}
 valueEl.textContent=Number(latest.finalMultiplier).toFixed(2)+"x";
 metaEl.textContent="رقم الجولة: "+latest.roundId+" · "+((latest.sources||[]).join(" + ")||"مصدر مباشر");
 rounds.slice(-10).reverse().forEach(r=>{const item=document.createElement("li"),strong=document.createElement("strong"),small=document.createElement("span");strong.textContent=Number(r.finalMultiplier).toFixed(2)+"x";small.textContent="جولة "+r.roundId;item.append(strong,small);list.appendChild(item);});
 renderPredictionComparisons();
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
 const trend=CrashForecast.recentTrend(values,[30,100],[2,3,5]);
 const names={up:"↑ ارتفاع",down:"↓ انخفاض",flat:"↔ ثابت",insufficient:"مقارنة غير كافية"};
 return trend.map(row=>"آخر "+row.window+" جولة: "+row.rates.map(rate=>rate.threshold+"x "+(rate.currentRate===null?"—":(rate.currentRate*100).toFixed(1)+"%")+" ("+names[rate.direction]+(rate.delta===null?"":", "+(rate.delta>0?"+":"")+(rate.delta*100).toFixed(1)+" نقطة"))).join(" / ")).join(" · ");
}
function showRolling(values){const el=$("rollingStats");if(el){el.textContent=rollingStats(values);el.hidden=false;}}

function downloadFile(name,type,content){
 const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
$("toggleHistory").addEventListener("click",()=>{const panel=$("historyPanel"),open=panel.classList.toggle("hidden")===false;$("toggleHistory").setAttribute("aria-expanded",String(open));$("toggleHistory").textContent=open?"− إخفاء سجل النتائج":"＋ إدخال سجل النتائج السابقة";});
$("sampleHistory").addEventListener("click",()=>{input.value="1.12 1.45 2.08 1.01 3.62 1.78 5.24 1.20 2.31 1.04 8.70 1.66 2.05 1.33 4.10 1.09 12.40 2.70 1.51 1.02";});
$("saveHistory").addEventListener("click",()=>{const values=CrashAnalytics.parseMultipliers(input.value);if(values.length<3){$("historyMessage").textContent="أدخل 3 نتائج صحيحة على الأقل.";return;}localStorage.setItem("crash-history",input.value);$("historyMessage").textContent="تم حفظ "+values.length+" نتيجة على هذا الجهاز.";});

// تحديث المؤشر تلقائيًا بعد وصول جولة جديدة، دون الضغط على زر يدوي.
let predictionRefreshTimer=null;
function schedulePredictionRefresh(){
 if(predictionRefreshTimer)clearTimeout(predictionRefreshTimer);
 predictionRefreshTimer=setTimeout(()=>{refreshPredictionFromHistory();},180);
}
async function refreshPredictionFromHistory(){
 const number=$("multiplier"),thresholdEl=$("autoThreshold"),status=$("status"),btn=$("nextRound"),note=$("subnote");
 try{
  const {values,source}=await predictionValues();
  showRolling(values);
  if(values.length<30){
   number.innerHTML="--<small>%</small>";
   thresholdEl.textContent="بانتظار 30 نتيجة فعلية على الأقل";
   if(status)status.textContent="المتاح "+values.length+" نتيجة؛ نحتاج 30 نتيجة مكتملة.";
   if(note)note.textContent="لا يتم عرض احتمال قبل توفر عينة كافية.";
   return;
  }
  const forecast=CrashForecast.forecastNext(values),byThreshold=new Map(forecast.probabilities.map(x=>[x.threshold,x]));
  const p2=byThreshold.get(2),p3=byThreshold.get(3),p5=byThreshold.get(5);
  number.innerHTML=(p2.probability*100).toFixed(1)+"<small>%</small>";
  thresholdEl.textContent="3x: "+(p3.probability*100).toFixed(1)+"% · 5x: "+(p5.probability*100).toFixed(1)+"% · فاصل 95% لـ2x: "+(p2.low*100).toFixed(1)+"–"+(p2.high*100).toFixed(1)+"% · n="+forecast.sampleSize;
  if(status)status.textContent="تم تحديث الاحتمالات من النتائج المسجلة.";
  if(note)note.textContent="3x: "+(p3.probability*100).toFixed(1)+"% · 5x: "+(p5.probability*100).toFixed(1)+"% · فاصل ثقة 95% لاحتمال 2x+: "+(p2.low*100).toFixed(1)+"%–"+(p2.high*100).toFixed(1)+"%. المصدر: "+source+". احتمالات تاريخية وصفية وليست ضمانًا للجولة القادمة.";
  const collected=loadCollected();
  const latestRoundId=collected.length?String(collected[collected.length-1].roundId):null;
  localStorage.setItem(PENDING_PREDICTION_KEY,JSON.stringify({probabilities:forecast.probabilities,basedOnRoundId:latestRoundId,capturedAt:new Date().toISOString(),sampleSize:forecast.sampleSize}));
  if(btn&&!btn.disabled)btn.textContent="تحديث الاحتمالات";
 }catch(error){
  if(status)status.textContent="تعذر تحديث الاحتمالات: "+String(error&&error.message||error);
 }
}

// استقبال الجولات المكتملة من إضافة Chrome وربطها بالسجل المحلي.
function receiveLiveRound(round){
 const value=Number(round?.finalMultiplier);
 if(!round?.roundId||!Number.isFinite(value)||value<1||value>100000)return false;
 const current=loadCollected();
 const existing=current.find(r=>String(r.roundId)===String(round.roundId));
 if(existing&&Number(existing.finalMultiplier)===value)return true;
 if(!existing){
  try{const pending=JSON.parse(localStorage.getItem(PENDING_PREDICTION_KEY)||"null");const p2=pending?.probabilities?.find(x=>Number(x.threshold)===2);if(p2&&Number.isFinite(Number(p2.probability))&&Number(p2.probability)>=0&&Number(p2.probability)<=1&&String(pending.basedOnRoundId)!==String(round.roundId)){const log=loadPredictionLog();if(!log.some(x=>String(x.roundId)===String(round.roundId))){const actualAtLeast2=value>=2,probability2=Number(p2.probability);log.push({roundId:String(round.roundId),probability2,actualAtLeast2,brier2:(probability2-(actualAtLeast2?1:0))**2,basedOnRoundId:pending.basedOnRoundId,capturedAt:pending.capturedAt,recordedAt:new Date().toISOString()});localStorage.setItem(PREDICTION_LOG_KEY,JSON.stringify(log.slice(-500)));}}}catch(_){}
 }
 const merged=CrashCollector.mergeCollections(current,[round]);
 saveCollected(merged.rounds);
 const message=$("actualRoundMessage");
 if(message)message.textContent="وصلت نتيجة مباشرة: الجولة "+round.roundId+" — "+value.toFixed(2)+"x. إجمالي الجولات المحفوظة: "+merged.rounds.length;
 schedulePredictionRefresh();
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
// Handshake response: supports extension injection after the page has already loaded.
window.addEventListener("message",event=>{
 const d=event.data;
 if(event.source===window&&event.origin===location.origin&&d?.source==="CRASH_LIVE_EXTENSION"&&d.type==="PING"){
  window.postMessage({source:"CRASH_PREDICTOR_PAGE",type:"READY"},location.origin);
 }
});
window.postMessage({source:"CRASH_PREDICTOR_PAGE",type:"READY"},location.origin);
renderLiveRounds();
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
 const btn=$("nextRound");
 btn.disabled=true;btn.textContent="جارٍ تحديث المؤشر…";
 await refreshPredictionFromHistory();
 setTimeout(()=>{btn.disabled=false;btn.textContent="تحديث الاحتمالات";},500);
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
// تحميل المؤشر تلقائيًا فور فتح البرنامج.
refreshPredictionFromHistory();
})();