import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
createServer((req, res) => {
  const file = {'/connector': 'popup.html', '/popup.js': 'popup.js', '/popup.css': 'popup.css'}[req.url];
  if (file) { res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html'); res.end(readFileSync(path.resolve('../extension-live', file))); return; }
  res.setHeader('Content-Type', 'text/html'); res.end(`<!doctype html><html><head><title>Fictional benefits</title></head><body><h1>Energy assistance demo</h1>${req.url.startsWith('/form') ? '' : '<a id="energy" href="/form?token=QUERY_CANARY" style="outline: 1px dotted red" onclick="window.clicked=true">Energy bill assistance</a>'}<label for="household">Household</label><input id="household" value="PRIVATE_CANARY" aria-describedby="help"><p id="help">For this demo, household means people living with you.</p><input type="password" aria-label="Password" value="PASSWORD_CANARY"><div hidden><button>HIDDEN_CANARY</button></div><div contenteditable="true"><button>EDITABLE_CANARY</button></div><textarea>PRIVATE_CANARY</textarea></body></html>`); }).listen(4320, '127.0.0.1');
