(() => {
"use strict";
const $=id=>document.getElementById(id),input=$("historyInput"),STORAGE_KEY="crash-collected-rounds-v1";
input.value=localStorage.getItem("crash-history")||"";
function loadCollected(){try{const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");return Array.isArray(data)?data:[];}catch(_){return [];}}
function saveCollected(rounds){localStorage.setItem(STORAGE_KEY,JSON.stringify(rounds));renderCollected();}
function renderCollected(){
 const rounds=loadCollected(),count=$("collectorCount"),list=$("collectorSaved");
 const values=rounds.map(r=>Number(r.finalMultiplier)).filter(v=>Number.isFinite(v)&&v>=1);
 if(values.length){
  $("multiplier").innerHTML=CrashAnalytics.median(values).toFixed(2)+'<small>x</small>';
  $("status").textContent="الوسيط المحسوب تلقائيًا من "+values.length+" جولة محفوظة — ليس توقعًا للجولة القادمة";
  $("subnote").textContent="تتغير هذه القيمة عند إضافة نتائج جديدة إلى الجامع. هي ملخص للنتائج السابقة فقط وليست إشارة للمراهنة.";
 }else{
  $("multiplier").innerHTML='--<small>x</small>';
  $("status").textContent="لم تُجمع نتائج بعد؛ أضف رسائل OnCrash أو OnResult";
  $("subnote").textContent="سيظهر هنا الوسيط التاريخي تلقائيًا بعد جمع النتائج. لا توجد قيمة توقع موثوقة للجولة القادمة.";
 }
 count.textContent="الجولات المحفوظة: "+rounds.length;list.replaceChildren();
 const title=document.createElement("h3");title.textContent="آخر 10 جولات محفوظة";list.appendChild(title);
 const recent=rounds.slice(-10).reverse();
 if(!recent.length){const p=document.createElement("p");p.textContent="لسه مفيش نتائج محفوظة. الصق أول رسائل OnCrash أو OnResult واضغط «حلّل واجمع النتائج».";list.appendChild(p);return;}
 const ol=document.createElement("ol");recent.forEach(r=>{const li=document.createElement("li");li.textContent="جولة "+r.roundId+" — "+Number(r.finalMultiplier).toFixed(2)+"x · "+(r.sources||[]).join(" + ")+(r.mismatch?" · اختلاف بين المصدرين":"");ol.appendChild(li);});list.appendChild(ol);
}
function downloadFile(name,type,content){
 const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
$("toggleHistory").addEventListener("click",()=>{const panel=$("historyPanel"),open=panel.classList.toggle("hidden")===false;$("toggleHistory").setAttribute("aria-expanded",String(open));$("toggleHistory").textContent=open?"− إخفاء سجل النتائج":"＋ إدخال سجل النتائج السابقة";});
$("sampleHistory").addEventListener("click",()=>{input.value="1.12 1.45 2.08 1.01 3.62 1.78 5.24 1.20 2.31 1.04 8.70 1.66 2.05 1.33 4.10 1.09 12.40 2.70 1.51 1.02";});
$("saveHistory").addEventListener("click",()=>{const values=CrashAnalytics.parseMultipliers(input.value);if(values.length<3){$("historyMessage").textContent="أدخل 3 نتائج صحيحة على الأقل.";return;}localStorage.setItem("crash-history",input.value);$("historyMessage").textContent="تم حفظ "+values.length+" نتيجة على هذا الجهاز.";});
$("nextRound").addEventListener("click",()=>{
 const values=CrashAnalytics.parseMultipliers(input.value),status=$("status"),number=$("multiplier"),btn=$("nextRound"),note=$("subnote");
 if(values.length<3){$("historyPanel").classList.remove("hidden");$("toggleHistory").setAttribute("aria-expanded","true");$("toggleHistory").textContent="− إخفاء سجل النتائج";status.textContent="أدخل 3 نتائج سابقة على الأقل أولًا";number.innerHTML='--<small>x</small>';note.textContent="لا توجد بيانات كافية لتحليل السجل.";return;}
 const recent=values.slice(-30),stats=CrashAnalytics.summarize(recent);number.innerHTML=stats.median.toFixed(2)+'<small>x</small>';
 status.textContent="الوسيط التاريخي للنتائج المدخلة — وليس توقعًا للجولة القادمة";
 const transitions=CrashAnalytics.analyzeTransitions(recent,2);
 const afterLow=transitions.afterBelow.rate===null?"غير كافٍ":transitions.afterBelow.rate.toFixed(1)+"% ("+transitions.afterBelow.nextAtOrAbove+"/"+transitions.afterBelow.previousCount+")";
 const afterHigh=transitions.afterAtOrAbove.rate===null?"غير كافٍ":transitions.afterAtOrAbove.rate.toFixed(1)+"% ("+transitions.afterAtOrAbove.nextAtOrAbove+"/"+transitions.afterAtOrAbove.previousCount+")";
 note.textContent="عدد الجولات: "+stats.count+" · المتوسط: "+stats.average.toFixed(2)+"x · نتائج 2x فأكثر: "+stats.above2.toFixed(1)+"% · نتائج 5x فأكثر: "+stats.above5.toFixed(1)+"%. الانتقال التاريخي للجولة التالية إلى 2x+: بعد أقل من 2x: "+afterLow+"؛ بعد 2x أو أكثر: "+afterHigh+"؛ إجمالي أزواج المقارنة: "+transitions.pairs+". هذا وصف تاريخي وليس توقعًا.";
 btn.disabled=true;btn.innerHTML="✓ تم تحليل السجل";setTimeout(()=>{btn.disabled=false;btn.innerHTML="<span>✦</span> حلّل السجل التاريخي";},1200);
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
$("exportCsv").addEventListener("click",()=>{const rounds=loadCollected();if(!rounds.length){$("decoderStatus").textContent="لا توجد جولات لتصديرها حتى الآن.";return;}const q=v=>'"'+String(v??"").replace(/"/g,'""')+'"';const rows=[["roundId","finalMultiplier","sources","mismatch","crash","resultCrash","resultUser","firstEventTime","lastEventTime"],...rounds.map(r=>[r.roundId,r.finalMultiplier,(r.sources||[]).join("|"),r.mismatch,r.crash,r.resultCrash,r.resultUser,r.firstEventTime,r.lastEventTime])];downloadFile("crash-rounds.csv","text/csv;charset=utf-8","\uFEFF"+rows.map(row=>row.map(q).join(",")).join("\r\n"));});
$("clearCollected").addEventListener("click",()=>{if(!loadCollected().length){$("decoderStatus").textContent="السجل المحفوظ فارغ بالفعل.";return;}if(!window.confirm("هل تريد مسح كل الجولات المحفوظة على هذا الجهاز؟ لا يمكن التراجع عن ذلك."))return;localStorage.removeItem(STORAGE_KEY);renderCollected();$("decoderStatus").textContent="تم مسح السجل المحفوظ من هذا المتصفح.";});
renderCollected();
})();