export type Screen = 'start' | 'lobby' | 'game' | 'result';

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export type PlayerSlot = {
  sessionId: string;
  name: string;
};

export type RoomSnapshot = {
  code: string;
  status: RoomStatus;
  difficulty: 'easy' | 'medium' | 'hard';
  players: PlayerSlot[];
  createdAt: string;
};

export type GameSnapshot = {
  roomCode: string;
  status: 'playing' | 'finished';
  puzzle: number[][];
  board: number[][];
  scores: Record<string, number>;
  mistakes: Record<string, number>;
  createdAt: string;
  finishedAt: string | null;
};
