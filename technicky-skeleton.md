# Technický skeleton: Sudoku Multiplayer

## 1. Cíl skeletonu

Základ pro MVP multiplayer Sudoku pro 2 hráče.
Skeleton má být:
- jednoduchý
- server-authoritative
- rozšiřitelný
- připravený na realtime
- vizuálně paperwhite / newspaper

---

## 2. Doporučený stack

### Frontend
- Vite
- TypeScript
- lehký state management (prostý store / event bus)
- CSS bez těžkého frameworku

### Backend
- Node.js
- Fastify nebo Express
- WebSocket server
- REST API pro lobby, auth a výsledky

### Data
- PostgreSQL
- Redis pro presence, room state a krátkodobé locky

### Deploy
- Frontend: GitHub Pages nebo vlastní hosting
- Backend: Render / Fly.io / Railway / VPS
- DB: managed PostgreSQL
- Redis: managed Redis

---

## 3. Architektura

### Vrstva klienta
- render boardu
- ovládání
- lobby
- skóre
- realtime sync
- reconnect

### Vrstva serveru
- autentizace session
- rooms
- game state
- validace tahů
- scoring
- persistence

### Sdílené typy
- event payloady
- room state
- game state
- user/player modely

---

## 4. Doporučená struktura repa

```text
sudoku-multiplayer/
├─ client/
│  ├─ index.html
│  ├─ src/
│  │  ├─ main.ts
│  │  ├─ app/
│  │  │  ├─ store.ts
│  │  │  ├─ router.ts
│  │  │  └─ ui-state.ts
│  │  ├─ components/
│  │  │  ├─ StartScreen.ts
│  │  │  ├─ LobbyScreen.ts
│  │  │  ├─ GameScreen.ts
│  │  │  ├─ SudokuBoard.ts
│  │  │  ├─ Keypad.ts
│  │  │  ├─ ScoreBar.ts
│  │  │  └─ TopBar.ts
│  │  ├─ game/
│  │  │  ├─ sudoku.ts
│  │  │  ├─ scoring.ts
│  │  │  ├─ validation.ts
│  │  │  └─ board-helpers.ts
│  │  ├─ net/
│  │  │  ├─ ws.ts
│  │  │  ├─ api.ts
│  │  │  └─ reconnect.ts
│  │  ├─ styles/
│  │  │  ├─ tokens.css
│  │  │  ├─ base.css
│  │  │  ├─ newspaper.css
│  │  │  └─ responsive.css
│  │  └─ shared/
│  │     ├─ types.ts
│  │     └─ events.ts
│  └─ public/
│     ├─ favicon.svg
│     └─ manifest.json
├─ server/
│  ├─ src/
│  │  ├─ index.ts
│  │  ├─ config.ts
│  │  ├─ auth/
│  │  │  ├─ session.ts
│  │  │  └─ users.ts
│  │  ├─ rooms/
│  │  │  ├─ room-service.ts
│  │  │  ├─ room-store.ts
│  │  │  └─ matchmaking.ts
│  │  ├─ games/
│  │  │  ├─ game-service.ts
│  │  │  ├─ sudoku-generator.ts
│  │  │  ├─ sudoku-validator.ts
│  │  │  ├─ scoring-service.ts
│  │  │  └─ move-handler.ts
│  │  ├─ ws/
│  │  │  ├─ ws-server.ts
│  │  │  ├─ handlers.ts
│  │  │  └─ presence.ts
│  │  ├─ db/
│  │  │  ├─ client.ts
│  │  │  ├─ schema.sql
│  │  │  └─ repositories/
│  │  └─ shared/
│  │     ├─ types.ts
│  │     └─ events.ts
│  └─ migrations/
└─ README.md
```

---

## 5. Core data models

### User
- id
- displayName
- avatarUrl
- createdAt
- lastSeenAt

### Room
- id
- code
- hostUserId
- status
- difficulty
- createdAt
- startedAt
- finishedAt

### Game
- id
- roomId
- seed
- puzzle
- solution
- currentGrid
- status
- createdAt
- updatedAt

### PlayerState
- id
- gameId
- userId
- score
- mistakes
- connected
- lastActionAt

### MoveEvent
- id
- gameId
- userId
- row
- col
- value
- result
- createdAt

### CellClaim
- id
- gameId
- row
- col
- value
- claimedByUserId
- correct
- createdAt

---

## 6. Realtime event skeleton

### Client → Server
- `room:create`
- `room:join`
- `room:leave`
- `game:start`
- `game:move`
- `game:ping`
- `game:ready`

### Server → Client
- `room:state`
- `room:error`
- `game:snapshot`
- `game:moveAccepted`
- `game:moveRejected`
- `game:score`
- `game:finished`
- `player:joined`
- `player:left`
- `game:reconnectSnapshot`

---

## 7. API skeleton

### REST
- `POST /api/rooms`
- `POST /api/rooms/join`
- `GET /api/rooms/:code`
- `POST /api/games/:id/start`
- `GET /api/games/:id`
- `GET /api/results/:gameId`
- `GET /api/me`

### WebSocket
- single socket connection per client
- room-specific channels inside one socket
- server is authoritative for board and score

---

## 8. DB skeleton

### PostgreSQL tables
- `users`
- `rooms`
- `games`
- `game_players`
- `moves`
- `cell_claims`
- `sessions`
- `results`

### Redis keys
- `room:{code}:state`
- `game:{id}:snapshot`
- `presence:{roomId}`
- `lock:cell:{gameId}:{row}:{col}`
- `session:{sessionId}`

### Persistence rule
- PostgreSQL = historie a výsledky
- Redis = live stav
- po skončení hry se stav persistuje do PostgreSQL

---

## 9. Client state skeleton

### App state
- screen: `start | lobby | game | result`
- currentRoom
- currentGame
- me
- opponent
- connectionState
- showNotes
- selectedCell
- keypadOpen
- scoreboard
- toast messages

### UI state
- board focus
- mobile keypad visibility
- menu open/close
- error highlight toggle
- loading / reconnect banner

---

## 10. Game flow skeleton

1. user opens start screen
2. create or join room
3. both players ready
4. server generates puzzle
5. board snapshot broadcast
6. moves stream in realtime
7. score updates live
8. end condition triggers result screen
9. rematch or return to lobby

---

## 11. Validation skeleton

Server validates:
- room exists
- player belongs to room
- cell is not locked
- number is within 1..9
- move matches solution
- move is not duplicate
- game is active

Rejected move reasons:
- `invalid_room`
- `not_in_room`
- `cell_locked`
- `occupied`
- `wrong_value`
- `game_finished`
- `rate_limited`

---

## 12. UI skeleton

### Desktop
- max content width 800 px
- clear board area
- side panel for numbers and info
- no clipping on low-height windows

### Mobile
- board-first layout
- keypad opens on cell tap
- start screen scrollable
- action panel collapsible

### Visual design
- paper background
- serif headlines
- ink-like text
- soft borders
- muted shadows

---

## 13. Implementation order

### Phase 1
- repo scaffold
- shared types
- basic UI screens
- local puzzle generator

### Phase 2
- backend rooms
- websocket connection
- single game snapshot

### Phase 3
- move validation
- scoring
- claim logic
- reconnect handling

### Phase 4
- polish newspaper design
- mobile optimization
- results screen
- rematch

---

## 14. MVP recommendation

Začít takto:
- Vite + TypeScript frontend
- Fastify backend
- WebSocket
- PostgreSQL
- Redis
- bez frameworku pro heavy UI, pokud chceme rychlejší start

---

## 15. Poznámka k první verzi

První verze nemusí mít:
- chat
- avatary
- ranked systém
- spectate mód
- seasons

Tyhle věci až po funkčním realtime jádru.
