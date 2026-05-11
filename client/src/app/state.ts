import type { GameSnapshot, RoomSnapshot, Screen } from '../shared/types';

export type AppState = {
  screen: Screen;
  connected: boolean;
  name: string;
  roomCode: string;
  difficulty: 'easy' | 'medium' | 'hard';
  room: RoomSnapshot | null;
  game: GameSnapshot | null;
  selfId: string | null;
  status: string;
};

export const state: AppState = {
  screen: 'start',
  connected: false,
  name: 'František',
  roomCode: '',
  difficulty: 'medium',
  room: null,
  game: null,
  selfId: null,
  status: 'Připraveno.',
};
