import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>

const KEY_LENGTH = 64

/**
 * Пароли организаторов: scrypt из стандартной библиотеки, без внешних
 * зависимостей. Соль своя у каждого пароля, формат хранения —
 * `scrypt$<соль в hex>$<ключ в hex>`.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scryptAsync(password, salt, KEY_LENGTH)
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split("$")
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false

  try {
    const expected = Buffer.from(keyHex, "hex")
    const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length)
    // Сравнение за постоянное время — иначе по задержке подбирается префикс.
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}
