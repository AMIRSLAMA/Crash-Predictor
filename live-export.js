"use strict";
(()=>{
  const button=document.getElementById("exportLiveRounds");
  if(!button)return;
  button.addEventListener("click",()=>{
    let rounds=[];
    try{const parsed=JSON.parse(localStorage.getItem("crash-collected-rounds-v1")||"[]");if(Array.isArray(parsed))rounds=parsed;}catch(_){}
    const valid=rounds.filter(r=>r&&r.roundId!==undefined&&Number.isFinite(Number(r.finalMultiplier))&&Number(r.finalMultiplier)>=1);
    const status=document.getElementById("liveRoundsCount");
    if(!valid.length){if(status)status.textContent="لا توجد جولات محفوظة للتصدير على هذا المتصفح.";return;}
    const blob=new Blob([JSON.stringify(valid,null,2)],{type:"application/json;charset=utf-8"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="crash-live-rounds.json";document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    if(status)status.textContent="تم تصدير "+valid.length+" جولة فعلية إلى crash-live-rounds.json";
  });
})();
