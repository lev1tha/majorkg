import { connect } from "node:net"

/**
 * Source RCON — удаленное управление игровым сервером.
 *
 * Нужен ровно для одного: после вето выкатить на сервер конфиг матча —
 * карту, режим, пароль лобби. Вручную это значит «зайти по ssh посреди
 * турнира», а турнир идет по расписанию.
 *
 * Протокол простой: пакет `size | id | type | body\0\0`, все числа —
 * little-endian int32. Реализован здесь целиком, без зависимости.
 *
 * Пароль RCON никогда не покидает бэкенд: наружу отдаются только
 * результаты команд.
 */

const SERVERDATA_AUTH = 3
const SERVERDATA_EXECCOMMAND = 2
const SERVERDATA_AUTH_RESPONSE = 2
const SERVERDATA_RESPONSE_VALUE = 0

function encode(id: number, type: number, body: string): Buffer {
  const payload = Buffer.from(body, "utf8")
  // id + type + тело + два завершающих нуля
  const size = 4 + 4 + payload.length + 2
  const packet = Buffer.alloc(4 + size)

  packet.writeInt32LE(size, 0)
  packet.writeInt32LE(id, 4)
  packet.writeInt32LE(type, 8)
  payload.copy(packet, 12)
  packet.writeInt8(0, 12 + payload.length)
  packet.writeInt8(0, 13 + payload.length)

  return packet
}

interface Packet {
  id: number
  type: number
  body: string
}

/** Разбирает поток в пакеты: ответ может прийти склеенным или по частям. */
function decode(buffer: Buffer): { packets: Packet[]; rest: Buffer } {
  const packets: Packet[] = []
  let offset = 0

  while (buffer.length - offset >= 4) {
    const size = buffer.readInt32LE(offset)
    if (buffer.length - offset - 4 < size) break

    packets.push({
      id: buffer.readInt32LE(offset + 4),
      type: buffer.readInt32LE(offset + 8),
      body: buffer.toString("utf8", offset + 12, offset + 4 + size - 2),
    })
    offset += 4 + size
  }

  return { packets, rest: buffer.subarray(offset) }
}

export class RconError extends Error {}

/**
 * Выполняет команды одной сессией: авторизация дорогая, а после вето их
 * всегда несколько — карта, режим, пароль.
 */
export function rconExec(
  host: string,
  port: number,
  password: string,
  commands: string[],
  timeoutMs = 5000,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port })
    const results: string[] = []

    let buffer: Buffer = Buffer.alloc(0)
    let authed = false
    let index = 0
    let settled = false

    const finish = (error: Error | null, value?: string[]) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      socket.destroy()
      if (error) reject(error)
      else resolve(value ?? [])
    }

    const timer = setTimeout(
      () => finish(new RconError("Сервер не ответил за отведенное время")),
      timeoutMs,
    )

    const sendNext = () => {
      if (index >= commands.length) {
        finish(null, results)
        return
      }
      socket.write(encode(index + 10, SERVERDATA_EXECCOMMAND, commands[index]!))
    }

    socket.on("connect", () => {
      socket.write(encode(1, SERVERDATA_AUTH, password))
    })

    socket.on("data", (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]) as Buffer
      const { packets, rest } = decode(buffer)
      buffer = rest

      for (const packet of packets) {
        if (!authed) {
          if (packet.type !== SERVERDATA_AUTH_RESPONSE) continue
          // id === -1 — сервер отверг пароль.
          if (packet.id === -1) {
            finish(new RconError("Неверный пароль RCON"))
            return
          }
          authed = true
          sendNext()
          continue
        }

        if (packet.type === SERVERDATA_RESPONSE_VALUE) {
          results.push(packet.body)
          index += 1
          sendNext()
        }
      }
    })

    socket.on("error", (error) => finish(new RconError(`Не удалось подключиться: ${error.message}`)))
    socket.on("close", () => {
      if (!settled) finish(null, results)
    })
  })
}
