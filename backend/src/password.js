import { randomBytes, scrypt as rawScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt=promisify(rawScrypt);
export async function hashPassword(password){const salt=randomBytes(16).toString('hex');const hash=await scrypt(password,salt,64);return `scrypt:${salt}:${hash.toString('hex')}`}
export async function verifyPassword(password,stored){if(!stored?.startsWith('scrypt:'))return false;const [,salt,hex]=stored.split(':');const actual=await scrypt(password,salt,64);const expected=Buffer.from(hex,'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected)}
