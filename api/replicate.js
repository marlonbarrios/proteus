import { handleReplicateRequest } from '../replicate-handlers.js';

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
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  try {
    const body = await readJsonBody(req);
    const result = await handleReplicateRequest(body, process.env);
    res.statusCode = 200;
    return res.end(JSON.stringify(result));
  } catch (err) {
    console.error('api/replicate:', err);
    res.statusCode = 500;
    return res.end(
      JSON.stringify({
        error: err?.message || String(err),
      }),
    );
  }
}
