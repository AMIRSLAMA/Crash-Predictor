const status=document.getElementById("status");
document.getElementById("start").addEventListener("click",async()=>{
 try{
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id||!tab.url||!/^https?:/.test(tab.url))throw new Error("افتح صفحة اللعبة في التبويب الحالي أولًا.");
  const origin=new URL(tab.url).origin;
  const granted=await chrome.permissions.request({origins:[origin+"/*"]});
  if(!granted)throw new Error("لم يتم منح إذن نطاق اللعبة.");
  await chrome.storage.local.set({collectorEnabled:true,gameOrigin:origin,gameTabId:tab.id});
  await chrome.scripting.registerContentScripts([{
   id:"crash-game-hook",matches:[origin+"/*"],js:["game-hook.js"],runAt:"document_start",world:"MAIN",persistAcrossSessions:false
  },{
   id:"crash-game-bridge",matches:[origin+"/*"],js:["game-bridge.js"],runAt:"document_start",world:"ISOLATED",persistAcrossSessions:false
  }]).catch(async e=>{if(!String(e).includes("Duplicate"))throw e;});
  status.textContent="تم الربط. سأعيد تحميل صفحة اللعبة لالتقاط اتصال WebSocket من بدايته…";
  await chrome.tabs.reload(tab.id);
  setTimeout(()=>{status.textContent="تم تفعيل الجامع. اترك اللعبة مفتوحة؛ عند وصول OnCrash أو OnResult ستُضاف الجولة تلقائيًا إلى الموقع.";},1200);
 }catch(e){status.textContent=e.message||String(e);}
});
document.getElementById("stop").addEventListener("click",async()=>{
 try{await chrome.scripting.unregisterContentScripts({ids:["crash-game-hook","crash-game-bridge"]});await chrome.storage.local.set({collectorEnabled:false});status.textContent="تم إيقاف الالتقاط.";}catch(e){status.textContent=e.message||String(e);}
});