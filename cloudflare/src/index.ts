import { generateSudoku } from './sudoku';

type Grid = number[][];
type RoomStatus = 'waiting' | 'playing' | 'finished';
type Difficulty = 'easy' | 'medium' | 'hard';

type Player = {
  sessionId: string;
  name: string;
};

type RoomState = {
  code: string;
  status: RoomStatus;
  difficulty: Difficulty;
  players: Player[];
  createdAt: string;
  puzzle: Grid | null;
  solution: Grid | null;
  board: Grid | null;
  scores: Record<string, number>;
  mistakes: Record<string, number>;
  finishedAt: string | null;
};

type ClientEvent =
  | { type: 'room:create'; payload: { name: string; difficulty: Difficulty } }
  | { type: 'room:join'; payload: { name: string; code: string } }
  | { type: 'room:leave'; payload: { roomCode?: string } }
  | { type: 'game:move'; payload: { roomCode?: string; row: number; col: number; value: number } }
  | { type: 'game:ping'; payload?: { roomCode?: string } }
  | { type: 'game:rematch'; payload?: { roomCode?: string } };

type GameSnapshot = {
  roomCode: string;
  status: 'playing' | 'finished';
  puzzle: Grid | null;
  board: Grid | null;
  scores: Record<string, number>;
  mistakes: Record<string, number>;
  createdAt: string;
  finishedAt: string | null;
};

type ServerEvent =
  | { type: 'room:state'; payload: { room: RoomState; selfId: string } }
  | { type: 'room:error'; payload: { message: string } }
  | { type: 'game:started'; payload: { room: RoomState; game: GameSnapshot } }
  | { type: 'game:snapshot'; payload: { game: GameSnapshot } }
  | { type: 'game:moveAccepted'; payload: { game: GameSnapshot; by: string; row: number; col: number; value: number } }
  | { type: 'game:moveRejected'; payload: { reason: string; game: GameSnapshot } }
  | { type: 'game:finished'; payload: { game: GameSnapshot; winnerId: string | null } };

type Env = {
  LOBBY: DurableObjectNamespace;
  ASSETS: Fetcher;
};

const removals = {
  easy: 40,
  medium: 50,
  hard: 58,
} satisfies Record<Difficulty, number>;

function emptyGrid(fill = 0): Grid {
  return Array.from({ length: 9 }, () => Array(9).fill(fill));
}

function cloneGrid(grid: Grid): Grid {
  return grid.map(row => [...row]);
}

function makeCode(length = 5) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function createRoom(code: string, difficulty: Difficulty, sessionId: string, name: string): RoomState {
  return {
    code,
    status: 'waiting',
    difficulty,
    players: [{ sessionId, name }],
    createdAt: new Date().toISOString(),
    puzzle: null,
    solution: null,
    board: null,
    scores: { [sessionId]: 0 },
    mistakes: { [sessionId]: 0 },
    finishedAt: null,
  };
}

function startGame(room: RoomState) {
  const { puzzle, solution } = generateSudoku(room.difficulty);
  room.puzzle = cloneGrid(puzzle);
  room.solution = cloneGrid(solution);
  room.board = cloneGrid(puzzle);
  room.scores = Object.fromEntries(room.players.map(player => [player.sessionId, 0]));
  room.mistakes = Object.fromEntries(room.players.map(player => [player.sessionId, 0]));
  room.status = 'playing';
  room.finishedAt = null;
}

function isFull(board: Grid) {
  return board.flat().every(Boolean);
}

function snapshot(room: RoomState) {
  return JSON.parse(JSON.stringify(room)) as RoomState;
}

function gameSnapshot(room: RoomState): GameSnapshot {
  return {
    roomCode: room.code,
    status: room.status === 'finished' ? 'finished' : 'playing',
    puzzle: room.puzzle ? cloneGrid(room.puzzle) : null,
    board: room.board ? cloneGrid(room.board) : null,
    scores: { ...room.scores },
    mistakes: { ...room.mistakes },
    createdAt: room.createdAt,
    finishedAt: room.finishedAt,
  };
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

export class LobbyDO implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private rooms = new Map<string, RoomState>();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  private async load() {
    const stored = (await this.state.storage.get('rooms')) as RoomState[] | undefined;
    if (stored) this.rooms = new Map(stored.map(room => [room.code, room]));
  }

  private async save() {
    await this.state.storage.put('rooms', [...this.rooms.values()]);
  }

  private send(socket: WebSocket, message: ServerEvent) {
    socket.send(JSON.stringify(message));
  }

  private broadcast(roomCode: string, message: ServerEvent) {
    for (const socket of this.state.getWebSockets()) {
      const attachment = (socket.deserializeAttachment() ?? {}) as { roomCode?: string };
      if (attachment.roomCode === roomCode) this.send(socket, message);
    }
  }

  private roomForSession(sessionId: string) {
    for (const room of this.rooms.values()) {
      if (room.players.some(player => player.sessionId === sessionId)) return room;
    }
    return null;
  }

  async fetch(request: Request) {
    await this.load();
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.state.acceptWebSocket(server);
      const roomCode = normalizeCode(url.searchParams.get('room') || '');
      const name = url.searchParams.get('name')?.trim() || 'Hráč';
      const sessionId = crypto.randomUUID();
      server.serializeAttachment({ sessionId, roomCode: roomCode || undefined, name });
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === '/rooms/create' && request.method === 'POST') {
      const body = (await request.json()) as { name: string; difficulty: Difficulty };
      let code = makeCode();
      while (this.rooms.has(code)) code = makeCode();
      const room = createRoom(code, body.difficulty, crypto.randomUUID(), body.name);
      this.rooms.set(code, room);
      await this.save();
      return Response.json({ code });
    }

    return new Response('Not found', { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const text = typeof message === 'string' ? message : new TextDecoder().decode(message);
    let event: ClientEvent;
    try {
      event = JSON.parse(text) as ClientEvent;
    } catch {
      this.send(ws, { type: 'room:error', payload: { message: 'invalid_json' } });
      return;
    }

    const attachment = (ws.deserializeAttachment() ?? {}) as { sessionId?: string; roomCode?: string; name?: string };
    const sessionId = attachment.sessionId || crypto.randomUUID();
    if (!attachment.sessionId) ws.serializeAttachment({ ...attachment, sessionId });

    if (event.type === 'room:create') {
      let code = makeCode();
      while (this.rooms.has(code)) code = makeCode();
      const room = createRoom(code, event.payload.difficulty, sessionId, event.payload.name);
      this.rooms.set(code, room);
      ws.serializeAttachment({ sessionId, roomCode: code, name: event.payload.name });
      await this.save();
      this.send(ws, { type: 'room:state', payload: { room: snapshot(room), selfId: sessionId } });
      return;
    }

    if (event.type === 'room:join') {
      const code = normalizeCode(event.payload.code);
      const room = this.rooms.get(code);
      if (!room) {
        this.send(ws, { type: 'room:error', payload: { message: 'room_not_found' } });
        return;
      }
      if (!room.players.some(player => player.sessionId === sessionId)) {
        room.players.push({ sessionId, name: event.payload.name });
        room.scores[sessionId] = 0;
        room.mistakes[sessionId] = 0;
      }
      ws.serializeAttachment({ sessionId, roomCode: code, name: event.payload.name });
      if (room.players.length >= 2 && room.status !== 'playing') startGame(room);
      await this.save();
      this.broadcast(code, { type: 'room:state', payload: { room: snapshot(room), selfId: sessionId } });
      if (room.status === 'playing' && room.board) {
        this.broadcast(code, { type: 'game:started', payload: { room: snapshot(room), game: gameSnapshot(room) } });
      }
      return;
    }

    const roomCode = event.type === 'room:leave' || event.type === 'game:move' || event.type === 'game:rematch' || event.type === 'game:ping'
      ? (event.payload?.roomCode || attachment.roomCode)
      : attachment.roomCode;
    const room = roomCode ? this.rooms.get(normalizeCode(roomCode)) : this.roomForSession(sessionId);
    if (!room) {
      this.send(ws, { type: 'room:error', payload: { message: 'not_in_room' } });
      return;
    }

    if (event.type === 'room:leave') {
      room.players = room.players.filter(player => player.sessionId !== sessionId);
      if (room.players.length === 0) this.rooms.delete(room.code);
      else if (room.players.length < 2) room.status = 'waiting';
      await this.save();
      this.broadcast(room.code, { type: 'room:state', payload: { room: snapshot(room), selfId: sessionId } });
      return;
    }

    if (event.type === 'game:ping') {
      this.send(ws, { type: 'game:snapshot', payload: { game: gameSnapshot(room) } });
      return;
    }

    if (event.type === 'game:rematch') {
      startGame(room);
      await this.save();
      this.broadcast(room.code, { type: 'game:started', payload: { room: snapshot(room), game: gameSnapshot(room) } });
      return;
    }

    if (event.type === 'game:move') {
      if (!room.board || !room.solution || !room.puzzle) {
        this.send(ws, { type: 'game:moveRejected', payload: { reason: 'no_game', game: gameSnapshot(room) } });
        return;
      }

      const { row, col, value } = event.payload;
      if (room.puzzle[row][col] !== 0) {
        this.send(ws, { type: 'game:moveRejected', payload: { reason: 'cell_locked', game: gameSnapshot(room) } });
        return;
      }
      if (room.board[row][col] !== 0) {
        this.send(ws, { type: 'game:moveRejected', payload: { reason: 'occupied', game: gameSnapshot(room) } });
        return;
      }
      if (room.solution[row][col] !== value) {
        room.mistakes[sessionId] = (room.mistakes[sessionId] || 0) + 1;
        room.scores[sessionId] = Math.max(0, (room.scores[sessionId] || 0) - 1);
        await this.save();
        this.send(ws, { type: 'game:moveRejected', payload: { reason: 'wrong_value', game: gameSnapshot(room) } });
        this.broadcast(room.code, { type: 'game:snapshot', payload: { game: gameSnapshot(room) } });
        return;
      }

      room.board[row][col] = value;
      room.scores[sessionId] = (room.scores[sessionId] || 0) + 1;

      const snap = snapshot(room);
      const game = gameSnapshot(room);
      this.broadcast(room.code, { type: 'game:moveAccepted', payload: { game, by: sessionId, row, col, value } });
      this.broadcast(room.code, { type: 'game:snapshot', payload: { game } });

      if (isFull(room.board)) {
        room.status = 'finished';
        room.finishedAt = new Date().toISOString();
        const scores = Object.entries(room.scores);
        const winnerId = scores.sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        const finished = snapshot(room);
        const game = gameSnapshot(room);
        this.broadcast(room.code, { type: 'game:finished', payload: { game, winnerId } });
      }

      await this.save();
    }
  }

  async webSocketClose(ws: WebSocket) {
    const attachment = (ws.deserializeAttachment() ?? {}) as { sessionId?: string; roomCode?: string; name?: string };
    if (!attachment.roomCode) return;
    const room = this.rooms.get(attachment.roomCode);
    if (!room) return;
    room.players = room.players.filter(player => player.sessionId !== attachment.sessionId);
    if (room.players.length === 0) this.rooms.delete(room.code);
    else if (room.players.length < 2) room.status = 'waiting';
    await this.save();
    this.broadcast(room.code, { type: 'room:state', payload: { room: snapshot(room), selfId: attachment.sessionId || crypto.randomUUID() } });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({ ok: true });
    }

    if (url.pathname === '/ws') {
      const id = env.LOBBY.idFromName('global');
      return env.LOBBY.get(id).fetch(request);
    }

    return env.ASSETS.fetch(request);
  },
};
