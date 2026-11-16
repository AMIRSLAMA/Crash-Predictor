const status=document.getElementById("status");
const diagnostics=document.createElement("div");
diagnostics.style.cssText="margin-top:10px;padding-top:9px;border-top:1px solid #444;line-height:1.9;color:#f0c45c;white-space:pre-line";
status.after(diagnostics);
async function renderDiagnostics(){
 const data=await chrome.storage.local.get(["collectorDiagnostics","recentRounds","collectorEnabled","gameOrigin"]);
 const d=data.collectorDiagnostics||{},total=Array.isArray(data.recentRounds)?data.recentRounds.length:0;
 diagnostics.textContent=[
  "تشخيص الالتقاط:",
  "حالة الجامع: "+(data.collectorEnabled?"مفعّل":"متوقف"),
  "اتصالات WebSocket: "+(d.wsCreated||0)+" · اتصالات مفتوحة: "+(d.wsOpened||0),
  "رسائل WebSocket: "+(d.wsFrames||0)+" · أحداث SignalR: "+(d.wsMessages||0),
  "نتائج جولات ملتقطة: "+(d.roundsCaptured||0)+" · إجمالي محفوظ: "+total,
  "آخر حدث: "+(d.lastTarget||d.lastProtocolType||d.lastDataType||"لا يوجد"),
  "آخر نشاط: "+(d.lastSeenAt||"لا يوجد"),
  "أخطاء الاتصال: "+(d.wsErrors||0)+" · إطارات غير مقروءة: "+(d.unparsedFrames||0),
  d.lastError?"خطأ: "+d.lastError:"",
  "نطاق اللعبة: "+(data.gameOrigin||"غير محدد")
 ].filter(Boolean).join("\n");
}
renderDiagnostics();
chrome.storage.onChanged.addListener((changes,area)=>{if(area==="local")renderDiagnostics();});
document.getElementById("start").addEventListener("click",async()=>{
 try{
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id||!tab.url||!/^https?:/.test(tab.url))throw new Error("افتح صفحة اللعبة في التبويب الحالي أولًا.");
  const origin=new URL(tab.url).origin;
  const granted=await chrome.permissions.request({origins:[origin+"/*"]});
  if(!granted)throw new Error("لم يتم منح إذن نطاق اللعبة.");
  await chrome.storage.local.set({collectorEnabled:true,gameOrigin:origin,gameTabId:tab.id,collectorDiagnostics:{wsCreated:0,wsOpened:0,wsFrames:0,wsMessages:0,roundsCaptured:0}});
  await chrome.scripting.unregisterContentScripts({ids:["crash-game-hook","crash-game-bridge"]}).catch(()=>{});
  await chrome.scripting.registerContentScripts([
   {id:"crash-game-hook",matches:[origin+"/*"],js:["game-hook.js"],runAt:"document_start",world:"MAIN",persistAcrossSessions:false},
   {id:"crash-game-bridge",matches:[origin+"/*"],js:["game-bridge.js"],runAt:"document_start",world:"ISOLATED",persistAcrossSessions:false}
  ]);
  status.textContent="تم الربط وإعادة تحميل اللعبة. افتح الإضافة مرة أخرى لمتابعة عدادات الاتصال والالتقاط.";
  await chrome.tabs.reload(tab.id);
 }catch(e){status.textContent=e.message||String(e);}
});
document.getElementById("stop").addEventListener("click",async()=>{
 try{await chrome.scripting.unregisterContentScripts({ids:["crash-game-hook","crash-game-bridge"]});await chrome.storage.local.set({collectorEnabled:false});status.textContent="تم إيقاف الالتقاط.";}catch(e){status.textContent=e.message||String(e);}
});