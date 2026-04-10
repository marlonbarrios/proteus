import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    resolve: {
      alias: {
        'p5': 'p5/lib/p5.min.js'
      }
    },
    plugins: [
      {
        name: 'replicate-api',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const path = req.url?.split('?')[0];
            if (req.method !== 'POST') {
              return next();
            }

            if (path === '/api/replicate-stream') {
              const chunks = [];
              req.on('data', (c) => chunks.push(c));
              req.on('end', async () => {
                try {
                  const raw = Buffer.concat(chunks).toString('utf8');
                  const body = JSON.parse(raw || '{}');
                  const { handleReplicateTextStream } = await import(
                    './replicate-handlers.js'
                  );
                  await handleReplicateTextStream(body, env, res);
                } catch (e) {
                  if (!res.headersSent) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: e.message || String(e) }));
                  } else {
                    res.end();
                  }
                }
              });
              req.on('error', (e) => {
                if (!res.headersSent) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: e.message || String(e) }));
                }
              });
              return;
            }

            if (path !== '/api/replicate') {
              return next();
            }

            const chunks = [];
            req.on('data', (c) => chunks.push(c));
            req.on('end', async () => {
              try {
                const raw = Buffer.concat(chunks).toString('utf8');
                const body = JSON.parse(raw || '{}');
                const { handleReplicateRequest } = await import('./replicate-handlers.js');
                const result = await handleReplicateRequest(body, env);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result));
              } catch (e) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: e.message || String(e) }));
              }
            });
            req.on('error', (e) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: e.message || String(e) }));
            });
          });
        }
      }
    ]
  };
});