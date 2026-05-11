# Technický bootstrap: Sudoku Multiplayer

## 1. Účel

Bootstrap je první reálný start projektu.
Jeho cílem je připravit:
- běžící klientskou appku
- běžící backend
- websocket spojení
- základní rooms/lobby flow
- sdílené typy
- minimal paperwhite UI

Bez zbytečné složitosti.

---

## 2. Startovní stack

### Frontend
- Vite
- TypeScript
- čisté DOM komponenty nebo velmi lehké komponenty
- CSS bez frameworku

### Backend
- Node.js
- Fastify
- WebSocket
- REST API

### Data
- PostgreSQL
- Redis

---

## 3. Bootstrapová struktura

```text
sudoku-multiplayer/
├─ client/
│  ├─ index.html
│  ├─ package.json
│  └─ src/
│     ├─ main.ts
│     ├─ app/
│     │  ├─ state.ts
│     │  ├─ screens.ts
│     │  └─ events.ts
│     ├─ components/
│     │  ├─ AppShell.ts
│     │  ├─ StartScreen.ts
│     │  ├─ LobbyScreen.ts
│     │  ├─ GameScreen.ts
│     │  ├─ SudokuBoard.ts
│     │  ├─ Keypad.ts
│     │  └─ ScoreBar.ts
│     ├─ net/
│     │  ├─ ws.ts
│     │  └─ api.ts
│     ├─ styles/
│     │  ├─ tokens.css
│     │  ├─ base.css
│     │  ├─ newspaper.css
│     │  └─ responsive.css
│     └─ shared/
│        ├─ types.ts
│        └─ events.ts
├─ server/
│  ├─ package.json
│  └─ src/
│     ├─ index.ts
│     ├─ config.ts
│     ├─ db/
│     │  ├─ client.ts
│     │  ├─ schema.sql
│     │  └─ migrations/
│     ├─ auth/
│     │  └─ session.ts
│     ├─ rooms/
│     │  ├─ room-service.ts
│     │  ├─ room-store.ts
│     │  └─ matchmaking.ts
│     ├─ games/
│     │  ├─ sudoku-generator.ts
│     │  ├─ sudoku-validator.ts
│     │  ├─ scoring-service.ts
│     │  └─ move-handler.ts
│     ├─ ws/
│     │  ├─ ws-server.ts
│     │  ├─ handlers.ts
│     │  └─ presence.ts
│     └─ shared/
│        ├─ types.ts
│        └─ events.ts
├─ shared/
│  ├─ types.ts
│  └─ events.ts
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ eslint.config.js
├─ prettier.config.cjs
├─ .env.example
├─ docker-compose.yml
└─ README.md
```

---

## 4. První soubory, které mají vzniknout

### Root
- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `docker-compose.yml`
- `.env.example`
- `README.md`

### Client
- `client/index.html`
- `client/src/main.ts`
- `client/src/app/state.ts`
- `client/src/app/screens.ts`
- `client/src/net/ws.ts`
- `client/src/styles/base.css`
- `client/src/styles/newspaper.css`

### Server
- `server/src/index.ts`
- `server/src/config.ts`
- `server/src/db/client.ts`
- `server/src/ws/ws-server.ts`
- `server/src/rooms/room-service.ts`
- `server/src/games/sudoku-generator.ts`
- `server/src/games/move-handler.ts`

### Shared
- `shared/types.ts`
- `shared/events.ts`

---

## 5. Root package scripts

```json
{
  "scripts": {
    "dev": "pnpm -r dev",
    "dev:client": "pnpm --filter client dev",
    "dev:server": "pnpm --filter server dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test"
  }
}
```

---

## 6. Client bootstrap

### `client/main.ts`
- mount app shell
- load theme
- connect to WS when user enters lobby
- render start screen first

### `client/state.ts`
- store app screen
- store room data
- store game snapshot
- store selected cell
- store keypad state

### `client/ws.ts`
- connect
- reconnect
- subscribe to messages
- dispatch into store

### UI flow
1. start screen
2. create/join room
3. lobby
4. game
5. result

---

## 7. Server bootstrap

### `server/index.ts`
- boot HTTP server
- attach WS server
- connect DB
- load config
- start room/game services

### `room-service.ts`
- create room
- join room
- leave room
- track state

### `move-handler.ts`
- validate move
- lock cell
- score point
- emit updates

### `sudoku-generator.ts`
- generate puzzle and solution
- support seed
- ensure single solution

---

## 8. DB bootstrap

### PostgreSQL
Tabulky:
- `users`
- `rooms`
- `games`
- `game_players`
- `moves`
- `cell_claims`
- `sessions`
- `results`

### Redis
Klíče:
- `room:{code}:state`
- `game:{id}:snapshot`
- `presence:{roomId}`
- `lock:cell:{gameId}:{row}:{col}`

---

## 9. Environment variables

`.env.example`:

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sudoku_mp
REDIS_URL=redis://localhost:6379
WS_ORIGIN=http://localhost:5173
SESSION_SECRET=change-me
```

---

## 10. Docker bootstrap

### `docker-compose.yml`
- PostgreSQL
- Redis

Doporučení:
- jednoduchý lokální dev stack
- backend a client běží lokálně přes pnpm
- DB služby přes Docker

---

## 11. Paperwhite design bootstrap

### Základní tokeny
- `--paper: #f5efe1`
- `--panel: #fbf7ef`
- `--ink: #2a2218`
- `--line: #cbb99c`
- `--accent: #7c5c2e`

### Layout pravidla
- desktop max 800px
- board nesmí být oříznutý
- panel a board mají jemné stíny
- mobil: board first, keypad jako vysouvací panel

---

## 12. Minimální MVP funkcionalita po bootstrapu

- start screen
- create room
- join room by code
- connected players indicator
- one shared Sudoku snapshot
- live move update
- score update
- result screen

---

## 13. Konkrétní pořadí implementace

### Krok 1
- založit workspace a package.json
- zprovoznit Vite client
- zprovoznit Fastify server

### Krok 2
- přidat shared types
- přidat WS connect/reconnect

### Krok 3
- rooms + lobby

### Krok 4
- Sudoku generator + one game snapshot

### Krok 5
- move handling + scoring

### Krok 6
- paperwhite UI polish

---

## 14. Doporučení pro první commit

První commit by měl obsahovat jen:
- init workspace
- base build/run scripts
- prázdné moduly
- první UI shell
- dummy WS endpoint

Ne implementaci celé hry najednou.

---

## 15. Shrnutí

Bootstrap = základní běh projektu s čistou strukturou.
Po bootstrapu by mělo být možné:
- spustit client
- spustit server
- připojit WS
- vytvořit room
- připravit jednu hru

To je správný první krok k multiplayeru.
