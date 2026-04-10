import { handleReplicateTextStream } from '../replicate-handlers.js';

async function readJsonBody(req) {
  if (typeof req.body === 'object' && req.body !== null && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  const raw = await new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
  return JSON.parse(raw || '{}');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  try {
    const body = await readJsonBody(req);
    await handleReplicateTextStream(body, process.env, res);
  } catch (err) {
    console.error('api/replicate-stream:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(
        JSON.stringify({ error: err?.message || String(err) }),
      );
    }
    res.end();
  }
}
