import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { createApi } from './api.js';
import { configuredService } from './config.js';
const token = process.env.LOCAL_API_TOKEN ?? randomBytes(24).toString('hex');
const port = Number(process.env.PORT ?? 4313);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
const service = configuredService();
const handle = createApi({ token, service, allowedExtensionOrigin: process.env.ALLOWED_EXTENSION_ORIGIN });
const server = createServer(async (req, res) => {
  try {
    const chunks: Buffer[] = []; let size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > 65536) { res.writeHead(413); res.end('Request too large'); return; } chunks.push(chunk); }
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) if (value) headers.set(name, Array.isArray(value) ? value.join(',') : value);
    const response = await handle(new Request(`http://127.0.0.1:${port}${req.url ?? '/'}`, { method: req.method, headers, ...(['GET', 'HEAD'].includes(req.method ?? 'GET') ? {} : { body: Buffer.concat(chunks) }) }));
    res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text());
  } catch { res.writeHead(400); res.end('Invalid request'); }
});
server.requestTimeout = 30000;
server.listen(port, '127.0.0.1', () => {
  console.log(`Workflow 3: http://127.0.0.1:${port}`);
  if (!process.env.LOCAL_API_TOKEN) console.log(`Temporary local API token: ${token}`);
  console.log(JSON.stringify(service.modes, null, 2));
});
