import type { GameSnapshot, RoomSnapshot } from './types';

export type ClientEvent =
  | { type: 'room:create'; payload: { name: string; difficulty: 'easy' | 'medium' | 'hard' } }
  | { type: 'room:join'; payload: { name: string; code: string } }
  | { type: 'room:leave' }
  | { type: 'game:move'; payload: { row: number; col: number; value: number } }
  | { type: 'game:ping' }
  | { type: 'game:rematch' };

export type ServerEvent =
  | { type: 'room:state'; payload: { room: RoomSnapshot; selfId: string } }
  | { type: 'room:error'; payload: { message: string } }
  | { type: 'game:started'; payload: { room: RoomSnapshot; game: GameSnapshot } }
  | { type: 'game:snapshot'; payload: { game: GameSnapshot } }
  | { type: 'game:moveAccepted'; payload: { game: GameSnapshot; by: string; row: number; col: number; value: number } }
  | { type: 'game:moveRejected'; payload: { reason: string; game: GameSnapshot } }
  | { type: 'game:finished'; payload: { game: GameSnapshot; winnerId: string | null } };
