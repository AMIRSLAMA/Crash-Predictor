const status=document.getElementById("status");
const start=document.getElementById("start");
let actionMessage="";
const diagnostics=document.createElement("div");
diagnostics.style.cssText="margin-top:10px;padding-top:9px;border-top:1px solid #444;line-height:1.9;color:#f0c45c;white-space:pre-line";
status.after(diagnostics);
async function unregisterGameScripts(){
 const wanted=new Set(["crash-game-hook","crash-game-bridge"]);
 const registered=await chrome.scripting.getRegisteredContentScripts();
 const ids=registered.filter(script=>wanted.has(script.id)).map(script=>script.id);
 if(ids.length)await chrome.scripting.unregisterContentScripts({ids});
}
async function renderDiagnostics(){
 const data=await chrome.storage.local.get(["collectorDiagnostics","recentRounds","collectorEnabled","gameOrigin","gameTabId","predictorBridge"]);
 const d=data.collectorDiagnostics||{},total=Array.isArray(data.recentRounds)?data.recentRounds.length:0;
 let tabAlive=false;
 if(data.gameTabId){try{await chrome.tabs.get(data.gameTabId);tabAlive=true;}catch(_){}}
 const active=!!data.collectorEnabled&&tabAlive;
 if(!actionMessage) status.textContent=active
  ?"الجامع مرتبط ويعمل في الخلفية. لا تحتاج إلى الضغط على ربط مرة أخرى. اترك صفحة اللعبة مفتوحة."
  :data.collectorEnabled
   ?"الجامع مفعّل لكن تبويب اللعبة غير موجود. افتح اللعبة واضغط إعادة الربط."
   :"الجامع غير مرتبط حاليًا. افتح صفحة اللعبة واضغط ربط.";
 start.textContent=active?"الجامع مرتبط بالفعل":"ربط / إعادة ربط صفحة اللعبة";
 start.disabled=active;
 start.style.opacity=active?".55":"1";
 diagnostics.textContent=[
  "تشخيص الالتقاط:",
  "حالة جسر صفحة البرنامج: "+(data.predictorBridge?.lastSendAt?("الصفحة "+(data.predictorBridge.pageReady?"متصلة":"لم تؤكد الاتصال")+" — أرسل "+(data.predictorBridge.sent||0)+" سجل — استقبل البرنامج "+(data.predictorBridge.received||0)+" جولة — "+data.predictorBridge.lastSendAt):data.predictorBridge?.lastError||"لم يسجل إرسالًا بعد"),
  "حالة الجامع: "+(active?"مرتبط ويعمل":data.collectorEnabled?"مفعّل — التبويب غير موجود":"غير مرتبط"),
  "اتصالات WebSocket: "+(d.wsCreated||0)+" · اتصالات مفتوحة: "+(d.wsOpened||0),
  "رسائل WebSocket: "+(d.wsFrames||0)+" · أحداث SignalR: "+(d.wsMessages||0),
  "نتائج جولات ملتقطة: "+(d.roundsCaptured||0)+" · إجمالي محفوظ: "+total,
  "آخر حدث: "+(d.lastTarget||d.lastProtocolType||d.lastDataType||"لا يوجد"),
  "آخر نشاط: "+(d.lastSeenAt||"لا يوجد"),
  "أخطاء الاتصال: "+(d.wsErrors||0)+" · إطارات غير مقروءة: "+(d.unparsedFrames||0),
  d.lastError?"خطأ: "+d.lastError:"",
  "نطاق اللعبة: "+(data.gameOrigin||"غير محدد"),
  "عنوان الصفحة المحقونة: "+(d.pageUrl||"لم يتم حقن الجسر"),
  "إطارات اللعبة داخل الصفحة: "+((d.iframeUrls||[]).join(" | ")||"لا توجد إطارات ظاهرة")
 ].filter(Boolean).join("\n");
}
renderDiagnostics();
chrome.storage.onChanged.addListener((changes,area)=>{if(area==="local")renderDiagnostics();});
start.addEventListener("click",async()=>{
 try{
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id||!tab.url||!/^https?:/.test(tab.url))throw new Error("افتح صفحة اللعبة في التبويب الحالي أولًا.");
  const origin=new URL(tab.url).origin;
  const granted=await chrome.permissions.request({origins:[origin+"/*"]});
  if(!granted)throw new Error("لم يتم منح إذن نطاق اللعبة.");
  await chrome.storage.local.set({collectorEnabled:true,gameOrigin:origin,gameTabId:tab.id,collectorDiagnostics:{wsCreated:0,wsOpened:0,wsFrames:0,wsMessages:0,roundsCaptured:0}});
  await unregisterGameScripts();
  await chrome.scripting.registerContentScripts([
   {id:"crash-game-hook",matches:[origin+"/*"],js:["game-hook.js"],runAt:"document_start",world:"MAIN",allFrames:true,persistAcrossSessions:true},
   {id:"crash-game-bridge",matches:[origin+"/*"],js:["game-bridge.js"],runAt:"document_start",world:"ISOLATED",allFrames:true,persistAcrossSessions:true}
  ]);
  status.textContent="تم الربط. جاري إعادة تحميل صفحة اللعبة لبدء الالتقاط من اتصال WebSocket.";
  await chrome.tabs.reload(tab.id);
  renderDiagnostics();
 }catch(e){actionMessage="تعذر ربط صفحة Predictor: "+(e.message||String(e));status.textContent=actionMessage;}
});
document.getElementById("stop").addEventListener("click",async()=>{
 try{await unregisterGameScripts();await chrome.storage.local.set({collectorEnabled:false});renderDiagnostics();}catch(e){status.textContent=e.message||String(e);}
});
document.getElementById("connectPredictor").addEventListener("click",async()=>{
 try{
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id||!tab.url)throw new Error("افتح صفحة Predictor أولًا.");
  const url=new URL(tab.url);
  if(url.hostname!=="amirslama.github.io"||!url.pathname.startsWith("/Crash-Predictor"))throw new Error("التبويب الحالي ليس صفحة Crash Predictor. افتح صفحة البرنامج ثم اضغط الزر.");
  await chrome.scripting.executeScript({target:{tabId:tab.id},files:["predictor-bridge.js"],world:"ISOLATED"});
  actionMessage="تم حقن جسر Predictor في الصفحة الحالية. انتظر لحظات ثم راجع التشخيص؛ لا يلزم إيقاف جامع اللعبة.";
  status.textContent=actionMessage;
  await chrome.storage.local.set({predictorBridge:{...(await chrome.storage.local.get("predictorBridge")).predictorBridge,pageInjected:true,manualInjectAt:new Date().toISOString(),pageUrl:tab.url}});
  renderDiagnostics();
 }catch(e){status.textContent=e.message||String(e);}
});
