(() => {
"use strict";
const $=id=>document.getElementById(id), input=$("historyInput");
const stored=localStorage.getItem("crash-history")||"";
input.value=stored;
$("toggleHistory").addEventListener("click",()=>{const panel=$("historyPanel"),open=panel.classList.toggle("hidden")===false;$("toggleHistory").setAttribute("aria-expanded",String(open));$("toggleHistory").textContent=open?"− إخفاء سجل النتائج":"＋ إدخال سجل النتائج السابقة";});
$("sampleHistory").addEventListener("click",()=>{input.value="1.12 1.45 2.08 1.01 3.62 1.78 5.24 1.20 2.31 1.04 8.70 1.66 2.05 1.33 4.10 1.09 12.40 2.70 1.51 1.02";});
$("saveHistory").addEventListener("click",()=>{const values=CrashAnalytics.parseMultipliers(input.value);if(values.length<3){$("historyMessage").textContent="أدخل 3 نتائج صحيحة على الأقل.";return;}localStorage.setItem("crash-history",input.value);$("historyMessage").textContent="تم حفظ "+values.length+" نتيجة على هذا الجهاز.";});
$("nextRound").addEventListener("click",()=>{
 const values=CrashAnalytics.parseMultipliers(input.value);
 const status=$("status"),number=$("multiplier"),btn=$("nextRound"),note=$("subnote");
 if(values.length<3){$("historyPanel").classList.remove("hidden");$("toggleHistory").setAttribute("aria-expanded","true");$("toggleHistory").textContent="− إخفاء سجل النتائج";status.textContent="أدخل 3 نتائج سابقة على الأقل أولًا";number.innerHTML='--<small>x</small>';note.textContent="المؤشر يحتاج سجلًا تاريخيًا حتى يُحسب.";return;}
 const recent=values.slice(-30),median=CrashAnalytics.median(recent),mean=recent.reduce((a,b)=>a+b,0)/recent.length;
 const signal=Math.max(1,Math.min(20,(median*.65+mean*.35)));
 number.innerHTML=signal.toFixed(2)+'<small>x</small>';
 status.textContent="مؤشر إحصائي تجريبي · ثقة غير مثبتة";
 note.textContent="مبني على "+recent.length+" نتيجة مدخلة (وسيط ومتوسط السجل)، وليس تنبؤًا بنتيجة اللعبة.";
 btn.disabled=true;btn.innerHTML="✓ تم حساب المؤشر";
 setTimeout(()=>{btn.disabled=false;btn.innerHTML="<span>✦</span> حلّل الجولة القادمة";},1400);
});
})();