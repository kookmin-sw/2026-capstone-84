import crypto from 'crypto';

const USERNAME_PREFIX = 'user-';
const USERNAME_DIGITS = 4;
const PASSWORD_LENGTH = 8;
const PASSWORD_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const MAX_RETRIES = 10;

/**
 * "user-" 접두사 + 4자리 랜덤 숫자로 아이디 생성
 * DB에서 중복 검사를 위한 콜백을 받아 고유성 보장
 * 최대 10회 재시도 후 실패 시 에러 throw
 */
export function generateUsername(isUnique: (username: string) => boolean): string {
  for (let i = 0; i < MAX_RETRIES; i++) {
    const digits = crypto.randomInt(0, 10 ** USERNAME_DIGITS)
      .toString()
      .padStart(USERNAME_DIGITS, '0');
    const username = `${USERNAME_PREFIX}${digits}`;

    if (isUnique(username)) {
      return username;
    }
  }

  throw new Error('아이디 생성에 실패했습니다');
}

/**
 * 8자의 영문 소문자 + 숫자 조합 비밀번호 생성
 */
export function generatePassword(): string {
  let password = '';
  for (let i = 0; i < PASSWORD_LENGTH; i++) {
    const index = crypto.randomInt(0, PASSWORD_CHARS.length);
    password += PASSWORD_CHARS[index];
  }
  return password;
}
