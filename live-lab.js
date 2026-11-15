(()=>{"use strict";
const $=id=>document.getElementById(id),KEY="crash-live-lab-v1";
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch(_){return[]}};
const write=a=>localStorage.setItem(KEY,JSON.stringify(a));
const pct=x=>(100*x).toFixed(1)+"%";
function render(){const a=read(),box=$("labHistory"),score=$("labScore");box.replaceChildren();
 if(!a.length){box.textContent="لم تسجل اختبارات بعد.";score.textContent="";return}
 const settled=a.filter(x=>x.actual!==null),mean=settled.length?settled.reduce((s,x)=>s+(x.p-(x.actual>=x.threshold?1:0))**2,0)/settled.length:null;
 score.textContent="اختبارات محسومة: "+settled.length+" · Brier Score: "+(mean===null?"—":mean.toFixed(4))+" (الأقل أفضل؛ 0 مثالي)";
 const ol=document.createElement("ol");a.slice(-12).reverse().forEach(x=>{const li=document.createElement("li");li.textContent=new Date(x.time).toLocaleString("ar-EG")+" · توقع "+pct(x.p)+" لعتبة "+x.threshold+"x+ · "+(x.actual===null?"بانتظار النتيجة":"النتيجة "+x.actual+"x — "+(x.actual>=x.threshold?"نجاح":"عدم نجاح"));ol.appendChild(li)});box.appendChild(ol)}
$("labAnalyze").addEventListener("click",()=>{const vals=CrashAnalytics.parseMultipliers($("historyInput").value);if(vals.length<30){$("labOutput").textContent="محتاج 30 نتيجة صحيحة على الأقل في سجل النتائج بالأعلى.";return}
 const t=Number($("labThreshold").value),base=vals.filter(x=>x>=t).length/vals.length,tail=vals.slice(-100),recent=tail.filter(x=>x>=t).length,smoothed=(recent+base*20)/(tail.length+20),p=.7*base+.3*smoothed;
 const item={id:Date.now(),time:new Date().toISOString(),threshold:t,p,actual:null,n:vals.length,base,recent:smoothed};
 const a=read();a.push(item);write(a);
 $("labOutput").textContent="احتمال تاريخي تقديري: "+pct(p)+" لنتيجة "+t+"x+ · المعدل العام "+pct(base)+" · آخر 100 جولة (بتنعيم إحصائي) "+pct(smoothed)+". تم تسجيل الاحتمال الآن قبل إدخال النتيجة؛ ليس توقعًا مضمونًا.";
 render()});
$("labSettle").addEventListener("click",()=>{const x=Number($("labActual").value);if(!Number.isFinite(x)||x<1){$("labScore").textContent="اكتب مضاعف الجولة الفعلي (1 أو أكبر).";return}
 const a=read(),i=a.findLastIndex(z=>z.actual===null);if(i<0){$("labScore").textContent="احسب الاحتمال أولًا قبل تسجيل نتيجة الجولة.";return}
 a[i].actual=x;a[i].settledAt=new Date().toISOString();write(a);$("labActual").value="";render()});
$("labClear").addEventListener("click",()=>{if(confirm("مسح سجل اختبار الاحتمالات المحلي؟")){localStorage.removeItem(KEY);render()}});
render();
})();