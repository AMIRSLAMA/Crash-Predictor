(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const input = $("historyInput"), output = $("results");
  const fmt = n => Number(n).toLocaleString("ar-EG",{maximumFractionDigits:2});
  const pct = n => fmt(n) + "%";
  const sample = "1.12 1.45 2.08 1.01 3.62 1.78 5.24 1.20 2.31 1.04 8.70 1.66 2.05 1.33 4.10 1.09 12.40 2.70 1.51 1.02";
  function render(values) {
    const s = CrashAnalytics.summarize(values), b = CrashAnalytics.buckets(values);
    if (!s.count) { output.innerHTML = '<div class="empty">أدخل مضاعفات صحيحة تبدأ من 1.00 أو أكثر.</div>'; return; }
    $("stats").innerHTML = [
      ["عدد الجولات",fmt(s.count)],["المتوسط",fmt(s.average)+"×"],["الوسيط",fmt(s.median)+"×"],
      ["أعلى مضاعف",fmt(s.max)+"×"],["جولات ≥ 2×",pct(s.above2)],["جولات ≥ 5×",pct(s.above5)]
    ].map(([k,v])=>'<article class="stat"><span>'+k+'</span><strong>'+v+'</strong></article>').join("");
    $("distribution").innerHTML = b.map(x=>'<div class="bar-row"><div class="bar-label"><span>'+x.label+'</span><b>'+fmt(x.count)+' · '+pct(x.percent)+'</b></div><div class="track"><i style="width:'+x.percent+'%"></i></div></div>').join("");
    $("latest").innerHTML = values.slice(-20).reverse().map(v=>'<span class="mult '+(v>=5?"high":v>=2?"mid":"low")+'">'+fmt(v)+'×</span>').join("");
    $("riskText").textContent = 'آخر '+fmt(Math.min(s.count,20))+' جولة: '+fmt(values.slice(-20).filter(v=>v<2).length)+' أقل من 2×. هذه قراءة للسجل فقط وليست توقعًا للجولة القادمة.';
    output.classList.remove("hidden");
    localStorage.setItem("crash-history",input.value);
  }
  $("analyzeBtn").addEventListener("click",()=>render(CrashAnalytics.parseMultipliers(input.value)));
  $("sampleBtn").addEventListener("click",()=>{input.value=sample;render(CrashAnalytics.parseMultipliers(sample));});
  $("clearBtn").addEventListener("click",()=>{input.value="";output.classList.add("hidden");localStorage.removeItem("crash-history");});
  input.value=localStorage.getItem("crash-history")||"";
  if(input.value) render(CrashAnalytics.parseMultipliers(input.value));
})();
