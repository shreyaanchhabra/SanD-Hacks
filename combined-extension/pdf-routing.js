// Tab URLs are available only where existing host/activeTab permission permits.
const pdfRoutes=new Set();
async function routePdf(id,url){if(pdfRoutes.has(id))return;try{
 const u=new URL(url);if(!/^https?:$/.test(u.protocol)||! /\.pdf$/i.test(u.pathname)||u.username||u.password)return;
 if((await chrome.storage.session.get('pdf-original-'+id))['pdf-original-'+id]===url)return;
 pdfRoutes.add(id);const tab=await chrome.tabs.get(id);if(tab.url!==url&&tab.pendingUrl!==url)return;
 await chrome.tabs.update(id,{url:chrome.runtime.getURL('pdf-viewer.html')+'?url='+encodeURIComponent(url)});
 }catch{}finally{pdfRoutes.delete(id);}}
chrome.tabs.onUpdated.addListener((id,change,tab)=>{if(change.url||change.status==='complete')void routePdf(id,change.url||tab.url||'');});
chrome.tabs.onRemoved.addListener(id=>chrome.storage.session.remove('pdf-original-'+id));
