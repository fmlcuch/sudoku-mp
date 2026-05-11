import type { PlayerSlot, RoomSnapshot } from '../shared/types.js';

export type RoomRecord = RoomSnapshot & {
  hostSessionId: string;
};

const rooms = new Map<string, RoomRecord>();

function makeCode(length = 5) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function createRoom(name: string, difficulty: RoomSnapshot['difficulty'], sessionId: string) {
  let code = makeCode();
  while (rooms.has(code)) code = makeCode();

  const room: RoomRecord = {
    code,
    status: 'waiting',
    difficulty,
    players: [{ sessionId, name }],
    createdAt: new Date().toISOString(),
    hostSessionId: sessionId,
  };

  rooms.set(code, room);
  return room;
}

export function joinRoom(code: string, name: string, sessionId: string) {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;
  if (!room.players.some(player => player.sessionId === sessionId)) {
    room.players.push({ sessionId, name });
  }
  if (room.players.length >= 2) room.status = 'playing';
  return room;
}

export function leaveRoom(sessionId: string) {
  for (const [code, room] of rooms) {
    const index = room.players.findIndex(player => player.sessionId === sessionId);
    if (index === -1) continue;
    room.players.splice(index, 1);
    if (room.players.length === 0) rooms.delete(code);
    else if (room.hostSessionId === sessionId) room.hostSessionId = room.players[0].sessionId;
    room.status = room.players.length >= 2 ? 'playing' : 'waiting';
    return room;
  }
  return null;
}

export function getRoom(code: string) {
  return rooms.get(code.toUpperCase()) ?? null;
}

export function getRoomBySession(sessionId: string) {
  for (const room of rooms.values()) {
    if (room.players.some(player => player.sessionId === sessionId)) return room;
  }
  return null;
}

export function snapshot(room: RoomRecord): RoomSnapshot {
  return {
    code: room.code,
    status: room.status,
    difficulty: room.difficulty,
    players: room.players,
    createdAt: room.createdAt,
  };
}

export function findRoomByCode(code: string) {
  return rooms.get(code.toUpperCase()) ?? null;
}
