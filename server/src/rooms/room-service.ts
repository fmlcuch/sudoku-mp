import { createRoom, getRoom, getRoomBySession, joinRoom, leaveRoom, snapshot } from './room-store.js';

export function createLobby(name: string, difficulty: 'easy' | 'medium' | 'hard', sessionId: string) {
  return snapshot(createRoom(name, difficulty, sessionId));
}

export function joinLobby(code: string, name: string, sessionId: string) {
  const room = joinRoom(code, name, sessionId);
  return room ? snapshot(room) : null;
}

export function leaveLobby(sessionId: string) {
  const room = leaveRoom(sessionId);
  return room ? snapshot(room) : null;
}

export function findLobbyBySession(sessionId: string) {
  const room = getRoomBySession(sessionId);
  return room ? snapshot(room) : null;
}

export function lookupRoom(code: string) {
  const room = getRoom(code);
  return room ? snapshot(room) : null;
}
