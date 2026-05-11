import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { createLobby, joinLobby, leaveLobby } from '../rooms/room-service.js';
import { findRoomByCode } from '../rooms/room-store.js';
import { applyMove, createGame, getGame, restartGame, snapshotGame } from '../games/game-store.js';
import type { ClientEvent, ServerEvent } from '../shared/events.js';

const sessions = new Map<string, WebSocket>();
const sessionNames = new Map<string, string>();
const sessionRooms = new Map<string, string>();

function send(socket: WebSocket, message: ServerEvent) {
  socket.send(JSON.stringify(message));
}

function roomSessions(roomCode: string) {
  return [...sessionRooms.entries()]
    .filter(([, code]) => code === roomCode)
    .map(([sessionId]) => sessionId);
}

function broadcastRoom(roomCode: string, message: ServerEvent) {
  for (const sessionId of roomSessions(roomCode)) {
    const socket = sessions.get(sessionId);
    if (socket) send(socket, message);
  }
}

function maybeStartGame(room: ReturnType<typeof createLobby>) {
  if (room.players.length < 2) return null;
  const existing = getGame(room.code);
  return existing ?? createGame(room);
}

export async function registerWs(app: FastifyInstance) {
  app.get('/ws', { websocket: true }, (connection) => {
    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, connection.socket);

    send(connection.socket, { type: 'room:error', payload: { message: 'connected' } });

    connection.socket.on('message', (raw: Buffer) => {
      let event: ClientEvent;
      try {
        event = JSON.parse(raw.toString()) as ClientEvent;
      } catch {
        send(connection.socket, { type: 'room:error', payload: { message: 'invalid_json' } });
        return;
      }

      if (event.type === 'room:create') {
        sessionNames.set(sessionId, event.payload.name);
        const room = createLobby(event.payload.name, event.payload.difficulty, sessionId);
        sessionRooms.set(sessionId, room.code);
        send(connection.socket, { type: 'room:state', payload: { room, selfId: sessionId } });
        return;
      }

      if (event.type === 'room:join') {
        sessionNames.set(sessionId, event.payload.name);
        const room = joinLobby(event.payload.code, event.payload.name, sessionId);
        if (!room) {
          send(connection.socket, { type: 'room:error', payload: { message: 'room_not_found' } });
          return;
        }
        sessionRooms.set(sessionId, room.code);
        broadcastRoom(room.code, { type: 'room:state', payload: { room, selfId: sessionId } });
        const game = maybeStartGame(room);
        if (game) {
          broadcastRoom(room.code, { type: 'game:started', payload: { room, game: snapshotGame(game) } });
        }
        return;
      }

      if (event.type === 'room:leave') {
        const room = leaveLobby(sessionId);
        sessionRooms.delete(sessionId);
        if (room) broadcastRoom(room.code, { type: 'room:state', payload: { room, selfId: sessionId } });
        return;
      }

      if (event.type === 'game:move') {
        const roomCode = sessionRooms.get(sessionId);
        if (!roomCode) {
          send(connection.socket, { type: 'room:error', payload: { message: 'not_in_room' } });
          return;
        }

        const result = applyMove(roomCode, sessionId, event.payload.row, event.payload.col, event.payload.value);
        const game = result.game;
        if (!game) {
          send(connection.socket, { type: 'room:error', payload: { message: result.reason } });
          return;
        }

        const snap = snapshotGame(game);
        if (result.ok) {
          broadcastRoom(roomCode, {
            type: 'game:moveAccepted',
            payload: { game: snap, by: sessionId, row: event.payload.row, col: event.payload.col, value: event.payload.value },
          });
          broadcastRoom(roomCode, { type: 'game:snapshot', payload: { game: snap } });
          if (game.status === 'finished') {
            const scores = Object.entries(game.scores);
            const winner = scores.sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
            broadcastRoom(roomCode, { type: 'game:finished', payload: { game: snap, winnerId: winner } });
          }
        } else {
          send(connection.socket, { type: 'game:moveRejected', payload: { reason: result.reason, game: snap } });
        }
        return;
      }

      if (event.type === 'game:ping') {
        const roomCode = sessionRooms.get(sessionId);
        const game = roomCode ? getGame(roomCode) : null;
        if (game) send(connection.socket, { type: 'game:snapshot', payload: { game: snapshotGame(game) } });
      }

      if (event.type === 'game:rematch') {
        const roomCode = sessionRooms.get(sessionId);
        if (!roomCode) {
          send(connection.socket, { type: 'room:error', payload: { message: 'not_in_room' } });
          return;
        }
        const room = findRoomByCode(roomCode);
        if (!room) {
          send(connection.socket, { type: 'room:error', payload: { message: 'room_not_found' } });
          return;
        }
        const game = restartGame(room);
        broadcastRoom(room.code, { type: 'room:state', payload: { room, selfId: sessionId } });
        broadcastRoom(room.code, { type: 'game:started', payload: { room, game: snapshotGame(game) } });
      }
    });

    connection.socket.on('close', () => {
      sessions.delete(sessionId);
      sessionNames.delete(sessionId);
      const room = leaveLobby(sessionId);
      sessionRooms.delete(sessionId);
      if (room) broadcastRoom(room.code, { type: 'room:state', payload: { room, selfId: sessionId } });
    });
  });
}
