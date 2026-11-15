document.getElementById('origin').textContent = `ALLOWED_EXTENSION_ORIGIN=chrome-extension://${chrome.runtime.id}`;
chrome.storage.session.get('localToken').then(({ localToken }) => { document.getElementById('token').value = localToken || ''; });
document.getElementById('save').addEventListener('click', async () => {
 const token = document.getElementById('token').value.trim();
 if (!token) { document.getElementById('status').textContent = 'Enter the token printed by your backend.'; return; }
 await chrome.storage.session.set({ localToken: token });
 document.getElementById('status').textContent = 'Saved for this browser session. Open your guide on a website.';
});

document.getElementById('allow-follow').addEventListener('click',async()=>{
 try{
  const allowed=await chrome.permissions.request({origins:['http://*/*','https://*/*']});
  await chrome.storage.local.set({autoFollowApproved:allowed});
  document.getElementById('follow-status').textContent=allowed?'Enabled. Return to your task and turn on Follow this task, or start a new task.':'Permission was not granted. Manual guidance still works.';
 }catch{document.getElementById('follow-status').textContent='Unable to enable automatic guidance.';}
});
document.getElementById('stop-follow').addEventListener('click',async()=>{
 await chrome.storage.local.set({autoFollowApproved:false});
 await chrome.permissions.remove({origins:['http://*/*','https://*/*']});
 document.getElementById('follow-status').textContent='Automatic guidance off. No new pages will be sent automatically.';
});
