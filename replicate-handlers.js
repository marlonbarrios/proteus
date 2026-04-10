import Replicate from 'replicate';

/**
 * Shared by Vite dev middleware and Vercel serverless.
 * @param {Record<string, string>} env - Loaded env (Vite loadEnv) or process.env on Vercel
 */
export async function handleReplicateRequest(body, env) {
  const token = env.REPLICATE_API_TOKEN || env.VITE_REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error('Missing REPLICATE_API_TOKEN in environment');
  }

  const replicate = new Replicate({ auth: token });
  const action = body?.action;

  if (action === 'ping') {
    await replicate.models.get('black-forest-labs', 'flux-2-pro');
    return { ok: true };
  }

  if (action === 'text') {
    const prompt = body?.prompt;
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('text action requires prompt string');
    }
    const model =
      body.textModel ||
      env.REPLICATE_TEXT_MODEL ||
      'meta/meta-llama-3-8b-instruct';
    const input =
      body.textInput ??
      buildDefaultTextInput(prompt);
    const text = await streamToText(replicate, model, input);
    return { text };
  }

  if (action === 'image') {
    const prompt = body?.prompt;
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('image action requires prompt string');
    }
    const model =
      body.imageModel ||
      env.REPLICATE_IMAGE_MODEL ||
      'black-forest-labs/flux-2-pro';
    const input =
      body.imageInput ??
      buildDefaultImageInput(prompt);
    const output = await replicate.run(model, { input });
    const url = await extractImageUrl(output);
    return { url };
  }

  throw new Error(`Unknown action: ${action}`);
}

function buildDefaultTextInput(prompt) {
  return {
    prompt,
    max_tokens: 1600,
    temperature: 0.9,
    top_p: 0.92,
  };
}

/** FLUX.2 [pro] on Replicate — prompt only unless body.imageInput overrides */
function buildDefaultImageInput(prompt) {
  return { prompt };
}

function normalizeTextOutput(output) {
  if (output == null) return '';
  if (typeof output === 'string') return output;
  if (Array.isArray(output)) {
    return output.map((x) => (typeof x === 'string' ? x : String(x))).join('');
  }
  if (typeof output === 'object' && typeof output.text === 'string') {
    return output.text;
  }
  return String(output);
}

/**
 * Stream tokens to the browser as SSE (data: JSON lines).
 * @param {object} body - { prompt, textModel?, textInput? }
 * @param {Record<string, string>} env
 * @param {import('http').ServerResponse} res - Node / Connect response
 */
export async function handleReplicateTextStream(body, env, res) {
  const token = env.REPLICATE_API_TOKEN || env.VITE_REPLICATE_API_TOKEN;
  if (!token) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing REPLICATE_API_TOKEN in environment' }));
    return;
  }

  const prompt = body?.prompt;
  if (!prompt || typeof prompt !== 'string') {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'prompt string required' }));
    return;
  }

  const replicate = new Replicate({ auth: token });
  const model =
    body.textModel ||
    env.REPLICATE_TEXT_MODEL ||
    'meta/meta-llama-3-8b-instruct';
  const input =
    body.textInput ??
    buildDefaultTextInput(prompt);

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const writeSse = (obj) => {
    res.write(`data: ${JSON.stringify(obj)}\n\n`);
  };

  try {
    for await (const event of replicate.stream(model, { input })) {
      const chunk =
        typeof event?.toString === 'function' ? event.toString() : String(event);
      if (chunk) writeSse({ chunk });
    }
    writeSse({ done: true });
  } catch (streamErr) {
    try {
      const output = await replicate.run(model, { input });
      const full = normalizeTextOutput(output);
      if (full) writeSse({ chunk: full });
      writeSse({ done: true });
    } catch (runErr) {
      writeSse({
        error:
          runErr?.message ||
          String(runErr) ||
          streamErr?.message ||
          String(streamErr),
      });
    }
  }
  res.end();
}

/** Prefer streaming; fall back to run() if the model/API rejects streaming. */
async function streamToText(replicate, model, input) {
  try {
    let text = '';
    for await (const event of replicate.stream(model, { input })) {
      text +=
        typeof event?.toString === 'function' ? event.toString() : String(event);
    }
    return text;
  } catch {
    const output = await replicate.run(model, { input });
    return normalizeTextOutput(output);
  }
}

async function extractImageUrl(output) {
  if (output == null) throw new Error('Empty image output');

  if (typeof output === 'string') {
    if (output.startsWith('http')) return output;
    throw new Error('Unexpected image output string');
  }

  if (Array.isArray(output)) {
    if (output.length === 0) throw new Error('Empty image output array');
    return extractImageUrl(output[0]);
  }

  if (typeof output === 'object') {
    if (typeof output.url === 'function') {
      const u = output.url();
      return u && typeof u.then === 'function' ? await u : u;
    }
    if (typeof output.url === 'string') return output.url;
  }

  throw new Error('Could not parse image output from Replicate');
}
