(() => {
"use strict";
const $=id=>document.getElementById(id), input=$("historyInput");
input.value=localStorage.getItem("crash-history")||"";
$("toggleHistory").addEventListener("click",()=>{const panel=$("historyPanel"),open=panel.classList.toggle("hidden")===false;$("toggleHistory").setAttribute("aria-expanded",String(open));$("toggleHistory").textContent=open?"− إخفاء سجل النتائج":"＋ إدخال سجل النتائج السابقة";});
$("sampleHistory").addEventListener("click",()=>{input.value="1.12 1.45 2.08 1.01 3.62 1.78 5.24 1.20 2.31 1.04 8.70 1.66 2.05 1.33 4.10 1.09 12.40 2.70 1.51 1.02";});
$("saveHistory").addEventListener("click",()=>{const values=CrashAnalytics.parseMultipliers(input.value);if(values.length<3){$("historyMessage").textContent="أدخل 3 نتائج صحيحة على الأقل.";return;}localStorage.setItem("crash-history",input.value);$("historyMessage").textContent="تم حفظ "+values.length+" نتيجة على هذا الجهاز.";});
$("nextRound").addEventListener("click",()=>{
 const values=CrashAnalytics.parseMultipliers(input.value),status=$("status"),number=$("multiplier"),btn=$("nextRound"),note=$("subnote");
 if(values.length<3){$("historyPanel").classList.remove("hidden");$("toggleHistory").setAttribute("aria-expanded","true");$("toggleHistory").textContent="− إخفاء سجل النتائج";status.textContent="أدخل 3 نتائج سابقة على الأقل أولًا";number.innerHTML='--<small>x</small>';note.textContent="لا توجد بيانات كافية لتحليل السجل.";return;}
 const recent=values.slice(-30),stats=CrashAnalytics.summarize(recent);
 number.innerHTML=stats.median.toFixed(2)+'<small>x</small>';
 status.textContent="الوسيط التاريخي للنتائج المدخلة — وليس توقعًا للجولة القادمة";
 note.textContent="عدد الجولات: "+stats.count+" · المتوسط: "+stats.average.toFixed(2)+"x · نتائج 2x فأكثر: "+stats.above2.toFixed(1)+"% · نتائج 5x فأكثر: "+stats.above5.toFixed(1)+"%.";
 btn.disabled=true;btn.innerHTML="✓ تم تحليل السجل";
 setTimeout(()=>{btn.disabled=false;btn.innerHTML="<span>✦</span> حلّل السجل التاريخي";},1200);
});

 const decodeButton=$("decodeMessages"), decoderInput=$("decoderInput"), decoderResults=$("decoderResults");
 decodeButton.addEventListener("click",()=>{
   const report=CrashDecoder.analyze(decoderInput.value),status=$("decoderStatus");
   decoderResults.replaceChildren();
   if(!report.total){status.textContent="لم أتعرف على رسائل SignalR صحيحة. تأكد من نسخ الرسالة كاملة.";return;}
   status.textContent="تم تحليل "+report.total+" رسالة؛ رسائل غير مفهومة: "+report.ignored+".";
   const summary=document.createElement("div");summary.className="decoder-summary";
   summary.textContent="بداية جولات: "+report.counts.starts+" · OnCrash: "+report.counts.crashes+" · OnResult: "+report.counts.results+" · Cashouts: "+report.counts.cashouts+" · Profits: "+report.counts.profits+" · نتائج مجمعة: "+report.completed.length;
   decoderResults.appendChild(summary);
   const heading=document.createElement("h3");heading.textContent="النتائج النهائية المستلمة من OnCrash / OnResult";decoderResults.appendChild(heading);
   const list=document.createElement("ol");list.className="decoder-list";
   report.completed.slice(-20).reverse().forEach(round=>{const item=document.createElement("li");item.textContent="الجولة "+round.roundId+" — "+round.finalMultiplier.toFixed(2)+"x ("+round.sources.join(" + ")+")"+(round.mismatch?" — اختلاف بين المصدرين":"");list.appendChild(item);});
   if(!report.completed.length){const item=document.createElement("li");item.textContent="لم يتم العثور على OnCrash أو OnResult يحتوي على معرّف جولة ومضاعف نهائي.";list.appendChild(item);}
   decoderResults.appendChild(list);
   const note=document.createElement("p");note.className="decoder-note";
   note.textContent="ملاحظة: OnCrash نتيجة بعد انتهاء الجولة، وليست إشارة مسبقة. هذا المحلل لا يستخرج أسرار الخادم ولا يتصل بحساب 1xBet.";
   decoderResults.appendChild(note);
 });
 $("clearDecoder").addEventListener("click",()=>{decoderInput.value="";decoderResults.replaceChildren();$("decoderStatus").textContent="تم مسح مساحة التحليل.";});

})();