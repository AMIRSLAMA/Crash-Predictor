(() => {
 if (window.__crashLiveHookInstalled) return;
 window.__crashLiveHookInstalled = true;
 const NativeWebSocket = window.WebSocket;
 const post = payload => window.postMessage({source:"ROHNY_CRASH_COLLECTOR",...payload}, location.origin);
 const sensor = window.CrashEarlySensor?.createSensor?.();
 let hud = null, hudBody = null, hudStatus = null, hudMetrics = null, hudCounts = null, hudHistory = null;
 const measurements = [];
 const seconds = value => value === null || value === undefined ? "غير متاح" : (value / 1000).toFixed(2) + " ثانية";
 function installHud() {
  if (hud || !document.documentElement) return;
  const host = document.createElement("div");
  host.id = "crash-early-warning-sensor";
  host.style.cssText = "all:initial;position:fixed;top:12px;right:12px;z-index:2147483647";
  const shadow = host.attachShadow({mode:"open"});
  shadow.innerHTML = `
   <style>
    :host{all:initial}
    .panel{width:290px;max-width:calc(100vw - 24px);font:12px/1.65 Arial,sans-serif;color:#f5f2e9;background:rgba(12,14,20,.96);border:1px solid #c99b43;border-radius:12px;box-shadow:0 8px 28px #0009;overflow:hidden;direction:rtl}
    header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;background:#1c1d22;color:#f2cc75;font-weight:800}
    button{border:1px solid #80652f;border-radius:6px;background:#2b2a26;color:#f5d88e;padding:3px 8px;cursor:pointer;font-weight:700}
    .body{padding:9px 11px}.status{font-weight:700;color:#f6d783;margin-bottom:5px}
    .hint{color:#b9c0cd;font-size:10px;margin-top:7px}
    .metrics{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:7px}
    .metric{background:#ffffff0b;border:1px solid #ffffff12;border-radius:7px;padding:5px}
    .metric b{display:block;color:#f3d17f;font-size:14px}
    .history{max-height:104px;overflow:auto;margin-top:7px;border-top:1px solid #ffffff20;padding-top:5px;color:#c7ced9;font-size:10px}
    .collapsed .body{display:none}.collapsed{width:auto}.collapsed header{padding:7px 9px}
   </style>
   <section class="panel">
    <header><span>◉ حساس الانفجار المبكر · تجربة</span><button id="toggle" type="button">طي</button></header>
    <div class="body">
     <div class="status" id="status">جاري تجهيز الحساس…</div>
     <div id="metrics">في انتظار رسائل الجولة.</div>
     <div class="metrics" id="counts"></div>
     <div class="history" id="history">لم تُقَس جولة بعد.</div>
     <div class="hint">الحساس يقيس الرسائل والتوقيت فقط. لا يوجد إنذار مسبق مثبت حتى الآن، وقياس الفاصل بعد OnCrash تحليل رجعي وليس تنبؤًا.</div>
    </div>
   </section>`;
  hud = shadow.querySelector(".panel");
  hudBody = shadow.querySelector(".body");
  hudStatus = shadow.getElementById("status");
  hudMetrics = shadow.getElementById("metrics");
  hudCounts = shadow.getElementById("counts");
  hudHistory = shadow.getElementById("history");
  shadow.getElementById("toggle").addEventListener("click", () => {
   const collapsed = hud.classList.toggle("collapsed");
   shadow.getElementById("toggle").textContent = collapsed ? "فتح" : "طي";
  });
  document.documentElement.appendChild(host);
 }
 function renderHud(update) {
  installHud();
  if (!hud) return;
  const counts = sensor?.snapshot?.().counts || {starts:0,stages:0,crashes:0};
  hudCounts.innerHTML = "";
  [["بدايات الجولة",counts.starts],["تحديثات المرحلة",counts.stages],["نتائج الانهيار",counts.crashes]].forEach(([label,value]) => {
   const item = document.createElement("div"); item.className = "metric";
   const small = document.createElement("span"); small.textContent = label;
   const strong = document.createElement("b"); strong.textContent = String(value);
   item.append(small,strong); hudCounts.appendChild(item);
  });
  if (update?.type === "start") {
   hudStatus.textContent = "بدأت الجولة " + (update.roundId || "الحالية") + " — الحساس يراقب.";
   hudMetrics.textContent = "في انتظار أول تحديث OnStage.";
  } else if (update?.type === "stage") {
   hudStatus.textContent = "تم رصد تحديث مرحلة رقم " + update.stageCount + ".";
   hudMetrics.textContent = "قيمة الحالة s: " + (update.stageState ?? "غير موجودة") +
    (update.candidateKeys?.length ? " · حقول زمنية محتملة: " + update.candidateKeys.join(", ") : " · لم يظهر حقل عدّ تنازلي معروف.");
  } else if (update?.type === "signal") {
   hudStatus.textContent = "حقل زمني محتمل ظهر في " + update.target + " — يحتاج تحققًا.";
   hudMetrics.textContent = "أسماء الحقول: " + update.candidateKeys.join(", ") + ". لم نثبت معناها أو وحدتها بعد.";
  } else if (update?.type === "crash") {
   const m = update.measurement;
   hudStatus.textContent = "انتهت الجولة " + (m.roundId || "") + " — تم تسجيل القياس.";
   hudMetrics.textContent = "من OnStart إلى OnCrash: " + seconds(m.startedToCrashMs) +
    " · من آخر OnStage إلى OnCrash: " + seconds(m.lastStageToCrashMs) +
    " · عدد تحديثات المرحلة: " + m.stageCount +
    (m.countdownCandidateKeys.length ? " · مفاتيح محتملة: " + m.countdownCandidateKeys.join(", ") : "");
   measurements.push(m); if (measurements.length > 8) measurements.shift();
   hudHistory.textContent = measurements.slice().reverse().map(x =>
    "الجولة " + (x.roundId || "-") + " · آخر مرحلة قبل الانهيار: " + seconds(x.lastStageToCrashMs) +
    " · تحديثات: " + x.stageCount
   ).join("\\n");
  }
 }
 function emit(data) {
  post({kind:"socket",action:"message",dataType:typeof data,dataLength:typeof data==="string"?data.length:0});
  if (typeof data !== "string") return;
  for (const frame of data.split(/[\\x1e\\n]+/)) {
   if (!frame.trim() || frame.trim() === "{}") continue;
   try {
    const msg = JSON.parse(frame);
    const list = Array.isArray(msg) ? msg : [msg];
    for (const item of list) {
     if (item && item.type === 1 && typeof item.target === "string") {
      const args = item.arguments || [];
      post({kind:"signalr",target:item.target,args});
      if (sensor) {
       const update = sensor.observe(item.target,args[0] || {},performance.now());
       if (update) renderHud(update);
      }
     } else if (item && item.type !== undefined) {
      post({kind:"socket",action:"protocol",protocolType:String(item.type)});
     }
    }
   } catch (_) {
    post({kind:"socket",action:"unparsed"});
   }
  }
 }
 if (!document.documentElement) document.addEventListener("DOMContentLoaded",installHud,{once:true});
 else installHud();
 window.WebSocket = new Proxy(NativeWebSocket, {
  construct(target,args,newTarget) {
   const ws = Reflect.construct(target,args,newTarget);
   post({kind:"socket",action:"created"});
   ws.addEventListener("open", () => post({kind:"socket",action:"opened"}));
   ws.addEventListener("error", () => post({kind:"socket",action:"error"}));
   ws.addEventListener("close", () => post({kind:"socket",action:"closed"}));
   ws.addEventListener("message", event => emit(event.data));
   return ws;
  }
 });
 Object.setPrototypeOf(window.WebSocket, NativeWebSocket);
})();