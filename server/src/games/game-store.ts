import type { RoomSnapshot } from '../shared/types.js';
import { generateSudoku } from './sudoku-generator.js';

type Grid = number[][];

export type GameRecord = {
  roomCode: string;
  puzzle: Grid;
  solution: Grid;
  board: Grid;
  status: 'playing' | 'finished';
  scores: Record<string, number>;
  mistakes: Record<string, number>;
  createdAt: string;
  finishedAt: string | null;
};

const games = new Map<string, GameRecord>();

function cloneGrid(grid: Grid): Grid {
  return grid.map(row => [...row]);
}

function isFull(board: Grid) {
  return board.flat().every(Boolean);
}

export function createGame(room: RoomSnapshot) {
  const { puzzle, solution } = generateSudoku(room.difficulty);
  const scores: Record<string, number> = {};
  const mistakes: Record<string, number> = {};
  for (const player of room.players) {
    scores[player.sessionId] = 0;
    mistakes[player.sessionId] = 0;
  }

  const game: GameRecord = {
    roomCode: room.code,
    puzzle: cloneGrid(puzzle),
    solution: cloneGrid(solution),
    board: cloneGrid(puzzle),
    status: 'playing',
    scores,
    mistakes,
    createdAt: new Date().toISOString(),
    finishedAt: null,
  };

  games.set(room.code, game);
  return game;
}

export function restartGame(room: RoomSnapshot) {
  games.delete(room.code);
  return createGame(room);
}

export function getGame(roomCode: string) {
  return games.get(roomCode.toUpperCase()) ?? null;
}

export function snapshotGame(game: GameRecord) {
  return {
    roomCode: game.roomCode,
    status: game.status,
    puzzle: game.puzzle,
    board: game.board,
    scores: game.scores,
    mistakes: game.mistakes,
    createdAt: game.createdAt,
    finishedAt: game.finishedAt,
  };
}

export function applyMove(roomCode: string, sessionId: string, row: number, col: number, value: number) {
  const game = games.get(roomCode.toUpperCase());
  if (!game) {
    return { ok: false as const, reason: 'no_game' as const, game: null };
  }

  if (game.status === 'finished') {
    return { ok: false as const, reason: 'game_finished' as const, game };
  }

  if (game.puzzle[row][col] !== 0) {
    return { ok: false as const, reason: 'cell_locked' as const, game };
  }

  if (game.board[row][col] !== 0) {
    return { ok: false as const, reason: 'occupied' as const, game };
  }

  if (game.solution[row][col] !== value) {
    game.mistakes[sessionId] = (game.mistakes[sessionId] || 0) + 1;
    return { ok: false as const, reason: 'wrong_value' as const, game };
  }

  game.board[row][col] = value;
  game.scores[sessionId] = (game.scores[sessionId] || 0) + 1;

  if (isFull(game.board)) {
    game.status = 'finished';
    game.finishedAt = new Date().toISOString();
  }

  return { ok: true as const, reason: 'correct' as const, game };
}
