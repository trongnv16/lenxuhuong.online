import { randomInt } from 'node:crypto'

// Bỏ 0/O, 1/I/L để người dùng không đọc nhầm khi ghi nội dung chuyển khoản.
export const REF_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

const PREFIX = 'LXH'
const BODY_LENGTH = 6

export function generateRefCode(): string {
  let body = ''
  for (let i = 0; i < BODY_LENGTH; i++) {
    body += REF_CODE_ALPHABET[randomInt(REF_CODE_ALPHABET.length)]
  }
  return PREFIX + body
}

export function isValidRefCode(code: string): boolean {
  if (code.length !== PREFIX.length + BODY_LENGTH) return false
  if (!code.startsWith(PREFIX)) return false
  return code
    .slice(PREFIX.length)
    .split('')
    .every((ch) => REF_CODE_ALPHABET.includes(ch))
}
