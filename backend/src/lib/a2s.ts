import { createSocket } from "node:dgram"

/**
 * A2S — протокол запроса состояния Source-сервера.
 *
 * Тот самый механизм, которым игровой браузер Steam узнает карту и число
 * игроков. Реализован здесь целиком: пакет простой, а тянуть зависимость
 * ради тридцати строк разбора бинарника незачем.
 *
 * Работает по UDP на игровом порту. Valve с 2020 года отвечает на A2S_INFO
 * челленджем (0x41): нужно повторить запрос, дописав полученные четыре
 * байта, — иначе сервер молчит.
 */

const HEADER = Buffer.from([0xff, 0xff, 0xff, 0xff])
const A2S_INFO = Buffer.concat([HEADER, Buffer.from([0x54]), Buffer.from("Source Engine Query\0", "ascii")])

export interface ServerInfo {
  name: string
  map: string
  game: string
  players: number
  maxPlayers: number
  bots: number
  /** Требуется ли пароль для подключения. */
  passworded: boolean
  vac: boolean
  /** Задержка ответа, мс — грубая оценка близости сервера. */
  ping: number
}

/** Чтение строки с завершающим нулем — основной тип в ответе A2S. */
function readString(buffer: Buffer, offset: number): [string, number] {
  const end = buffer.indexOf(0, offset)
  const stop = end === -1 ? buffer.length : end
  return [buffer.toString("utf8", offset, stop), stop + 1]
}

function parseInfo(buffer: Buffer, ping: number): ServerInfo | null {
  // 4 байта заголовка + тип пакета.
  if (buffer.length < 6 || buffer.readUInt8(4) !== 0x49) return null

  let offset = 5
  offset += 1 // protocol

  const [name, afterName] = readString(buffer, offset)
  const [map, afterMap] = readString(buffer, afterName)
  const [, afterFolder] = readString(buffer, afterMap)
  const [game, afterGame] = readString(buffer, afterFolder)

  offset = afterGame + 2 // appid (int16)
  const players = buffer.readUInt8(offset)
  const maxPlayers = buffer.readUInt8(offset + 1)
  const bots = buffer.readUInt8(offset + 2)
  // server type, environment
  const visibility = buffer.readUInt8(offset + 5)
  const vac = buffer.readUInt8(offset + 6)

  return {
    name,
    map,
    game,
    players,
    maxPlayers,
    bots,
    passworded: visibility === 1,
    vac: vac === 1,
    ping,
  }
}

/**
 * Запрос состояния сервера.
 * @returns null, если сервер не ответил за отведенное время — это и есть
 * «оффлайн» в интерфейсе.
 */
export function queryServer(
  host: string,
  port: number,
  timeoutMs = 2000,
): Promise<ServerInfo | null> {
  return new Promise((resolve) => {
    const socket = createSocket("udp4")
    const started = Date.now()
    let settled = false

    const finish = (result: ServerInfo | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      socket.close()
      resolve(result)
    }

    const timer = setTimeout(() => finish(null), timeoutMs)

    socket.on("error", () => finish(null))

    socket.on("message", (message) => {
      const type = message.length > 4 ? message.readUInt8(4) : 0

      // Челлендж: повторяем запрос с полученными четырьмя байтами.
      if (type === 0x41 && message.length >= 9) {
        const challenge = message.subarray(5, 9)
        socket.send(Buffer.concat([A2S_INFO, challenge]), port, host, (error) => {
          if (error) finish(null)
        })
        return
      }

      finish(parseInfo(message, Date.now() - started))
    })

    socket.send(A2S_INFO, port, host, (error) => {
      if (error) finish(null)
    })
  })
}
