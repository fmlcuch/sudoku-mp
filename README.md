# Sudoku Multiplayer

## Dev

```bash
npm install
npm run dev
```

## Production / online

The repo now contains a single-server deployment path:
- Fastify serves the built client from `client/dist`
- WebSocket is on the same origin (`/ws`)
- Vite dev server proxies `/ws` to the backend during development

### Docker

```bash
docker build -t sudoku-multiplayer .
docker run -p 3001:3001 sudoku-multiplayer
```

Then open:
- `http://localhost:3001/`
- `http://localhost:3001/health`

## Stack
- Vite + TypeScript
- Fastify + WebSocket
- PostgreSQL
- Redis
