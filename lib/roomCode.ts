import { ROOM_CODE_LENGTH } from './constants';

/** Allowed characters — excludes O, 0, I, 1 to avoid confusion */
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Generate a random N-character room code */
export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

/** Validate that a string looks like a valid room code */
export function validateRoomCode(code: string): boolean {
  if (!code || code.length !== ROOM_CODE_LENGTH) return false;
  return code.split('').every((c) => CHARS.includes(c.toUpperCase()));
}
