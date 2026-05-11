# Sudoku Multiplayer

## Dev (Cloudflare)

```bash
npm install
npx wrangler login
npm run build:cf
npm run dev:cf
```

## Online / free

The current online path is:
- frontend served by the Cloudflare Worker
- WebSocket on the same origin (`/ws`)
- Durable Object holds room/game state

### Local test URLs
- `http://127.0.0.1:8787/`
- `http://127.0.0.1:8787/health`

### Deploy

```bash
npm run build:cf
npm run deploy:cf
```

## Stack
- Vite + TypeScript
- Cloudflare Workers + Durable Objects
- PostgreSQL (future persistence)
- Redis (future persistence)
