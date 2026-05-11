import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { registerWs } from './ws/ws-server.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(websocket);

app.get('/health', async () => ({ ok: true }));
await registerWs(app);

const clientDistCandidates = [
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '..', 'client/dist'),
];
const clientDist = clientDistCandidates.find(candidate => existsSync(candidate));

if (clientDist) {
  const indexHtml = readFileSync(path.join(clientDist, 'index.html'), 'utf8');

  await app.register(fastifyStatic, {
    root: clientDist,
    prefix: '/assets/',
  });

  app.get('/', async (_req, reply) => reply.type('text/html').send(indexHtml));
  app.get('/*', async (req, reply) => {
    if (req.raw.url?.startsWith('/ws') || req.raw.url?.startsWith('/health') || req.raw.url?.startsWith('/api')) {
      return reply.code(404).send({ error: 'not_found' });
    }
    return reply.type('text/html').send(indexHtml);
  });
}

const port = Number(process.env.PORT || 3001);

try {
  await app.listen({ port, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
