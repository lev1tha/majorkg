"use client"

/**
 * Сигнал к бою — синтез на Web Audio, без аудиофайлов.
 *
 * Около 15 секунд: гул и редкие удары боевых барабанов, перекличка рогов,
 * барабаны ускоряются до дроби, нарастающий свист — и финальный удар с
 * аккордом рогов. Все генерируется на лету: ничего не нужно хранить,
 * лицензировать и загружать.
 *
 * Браузеры не дают играть звук без жеста пользователя, поэтому контекст
 * создается и «разблокируется» на первом клике по сайту (unlockAudio).
 */

let shared: AudioContext | null = null

function context(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!shared) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    shared = new Ctor()
  }
  return shared
}

/** Вызывается из обработчика клика: после этого звук можно играть и в фоне. */
export function unlockAudio() {
  const ctx = context()
  if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => undefined)
}

export function audioUnlocked(): boolean {
  return shared?.state === "running"
}

const SOUND_KEY = "mkg:battle-sound"

/** Игрок может выключить рог — окно все равно всплывет. */
export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off"
  } catch {
    return true
  }
}

export function setSoundEnabled(enabled: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, enabled ? "on" : "off")
  } catch {
    // Хранилище недоступно (приватный режим) — настройка просто не запомнится.
  }
}

// ──────────────────────────── Синтез ──────────────────────────────────

function noiseBuffer(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
  return buffer
}

/** Импульс «зала»: затухающий шум, у каждого канала свой — дает ширину. */
function hallImpulse(ctx: BaseAudioContext, seconds = 3.2, decay = 2.8): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
    }
  }
  return buffer
}

/** Огибающая: тишина → пик за attack → удержание → затухание. */
function envelope(
  param: AudioParam,
  t: number,
  peak: number,
  attack: number,
  hold: number,
  release: number,
) {
  param.setValueAtTime(0.0001, t)
  param.exponentialRampToValueAtTime(peak, t + attack)
  param.setValueAtTime(peak, t + attack + hold)
  param.exponentialRampToValueAtTime(0.0001, t + attack + hold + release)
}

export interface BattleSound {
  /** Длительность в секундах, без хвоста реверберации. */
  duration: number
  stop: () => void
}

/**
 * Играет сигнал. null — звук заблокирован браузером (не было жеста)
 * или Web Audio недоступен.
 */
export function playBattleSound(): BattleSound | null {
  const ctx = context()
  if (!ctx || ctx.state !== "running") return null
  return scheduleBattleSound(ctx, ctx.destination)
}

/**
 * Расписывает сигнал в любом контексте — в том числе в OfflineAudioContext,
 * чтобы отрендерить его без колонок и проверить громкость.
 */
export function scheduleBattleSound(ctx: BaseAudioContext, destination: AudioNode): BattleSound {
  const t0 = ctx.currentTime + 0.05
  const noise = noiseBuffer(ctx, 2)

  // Мастер: компрессор держит громкость в узде, когда сходится все сразу.
  // Chrome добавляет после компрессора автоусиление, поэтому на выходе еще
  // один множитель — иначе пики уходят за 0 dB и звук хрипит.
  const master = ctx.createGain()
  master.gain.value = 0.85
  const compressor = ctx.createDynamicsCompressor()
  compressor.threshold.value = -16
  compressor.ratio.value = 8
  compressor.attack.value = 0.003
  compressor.release.value = 0.25
  const output = ctx.createGain()
  output.gain.value = 0.65
  master.connect(compressor).connect(output).connect(destination)

  // Сухая шина + посыл в «зал».
  const bus = ctx.createGain()
  const hall = ctx.createConvolver()
  hall.buffer = hallImpulse(ctx)
  const wet = ctx.createGain()
  wet.gain.value = 0.32
  bus.connect(master)
  bus.connect(hall).connect(wet).connect(master)

  const sources: AudioScheduledSourceNode[] = []
  const track = <T extends AudioScheduledSourceNode>(node: T) => {
    sources.push(node)
    return node
  }

  /** Боевой барабан: низкий тон с падением высоты и щелчок кожи. */
  const drum = (t: number, strength: number, low = 46, release = 0.9) => {
    const body = track(ctx.createOscillator())
    body.type = "sine"
    body.frequency.setValueAtTime(low * 2.4, t)
    body.frequency.exponentialRampToValueAtTime(low, t + 0.28)
    const bodyGain = ctx.createGain()
    envelope(bodyGain.gain, t, strength, 0.006, 0.02, release)
    body.connect(bodyGain).connect(bus)
    body.start(t)
    body.stop(t + release + 0.2)

    const skin = track(ctx.createBufferSource())
    skin.buffer = noise
    const skinFilter = ctx.createBiquadFilter()
    skinFilter.type = "lowpass"
    skinFilter.frequency.value = 1100
    const skinGain = ctx.createGain()
    envelope(skinGain.gain, t, strength * 0.45, 0.003, 0, 0.16)
    skin.connect(skinFilter).connect(skinGain).connect(bus)
    skin.start(t, Math.random() * 1.5)
    skin.stop(t + 0.25)
  }

  /**
   * Рог: пилообразные голоса с расстройкой, фильтр «раскрывается» к середине
   * ноты — так звучит медь. Подъезд к ноте снизу и вибрато — дыхание.
   */
  const horn = (t: number, duration: number, freqs: number[], peak: number) => {
    const filter = ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.Q.value = 1.2
    filter.frequency.setValueAtTime(220, t)
    filter.frequency.exponentialRampToValueAtTime(1700, t + duration * 0.45)
    filter.frequency.exponentialRampToValueAtTime(700, t + duration)

    const gain = ctx.createGain()
    envelope(gain.gain, t, peak, 0.32, Math.max(0, duration - 0.62), 0.6)
    filter.connect(gain).connect(bus)

    const vibrato = track(ctx.createOscillator())
    vibrato.frequency.value = 4.8
    const vibratoDepth = ctx.createGain()
    vibratoDepth.gain.setValueAtTime(0, t)
    vibratoDepth.gain.linearRampToValueAtTime(14, t + duration * 0.6)
    vibrato.connect(vibratoDepth)
    vibrato.start(t)
    vibrato.stop(t + duration + 0.7)

    for (const freq of freqs) {
      for (const detune of [-8, 0, 8]) {
        const voice = track(ctx.createOscillator())
        voice.type = "sawtooth"
        voice.detune.value = detune
        voice.frequency.setValueAtTime(freq * 0.94, t)
        voice.frequency.exponentialRampToValueAtTime(freq, t + 0.22)
        vibratoDepth.connect(voice.detune)
        voice.connect(filter)
        voice.start(t)
        voice.stop(t + duration + 0.7)
      }
    }
  }

  /** Подземный гул под всем сигналом. */
  const rumble = (t: number, duration: number) => {
    const source = track(ctx.createBufferSource())
    source.buffer = noise
    source.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.value = 140
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.5, t + 3)
    gain.gain.setValueAtTime(0.5, t + duration - 3)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    source.connect(filter).connect(gain).connect(bus)
    source.start(t)
    source.stop(t + duration)
  }

  /** Нарастающий свист перед ударом. */
  const riser = (t: number, duration: number) => {
    const source = track(ctx.createBufferSource())
    source.buffer = noise
    source.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = "bandpass"
    filter.Q.value = 3
    filter.frequency.setValueAtTime(300, t)
    filter.frequency.exponentialRampToValueAtTime(5200, t + duration)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.3, t + duration)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration + 0.08)
    source.connect(filter).connect(gain).connect(bus)
    source.start(t)
    source.stop(t + duration + 0.1)
  }

  /** Финальный удар: двойной барабан, взрыв шума и аккорд рогов. */
  const impact = (t: number) => {
    drum(t, 1, 38, 1.6)
    drum(t + 0.02, 0.8, 55, 1.2)

    const blast = track(ctx.createBufferSource())
    blast.buffer = noise
    const filter = ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.setValueAtTime(4000, t)
    filter.frequency.exponentialRampToValueAtTime(200, t + 1.6)
    const gain = ctx.createGain()
    envelope(gain.gain, t, 0.7, 0.005, 0.05, 1.6)
    blast.connect(filter).connect(gain).connect(bus)
    blast.start(t)
    blast.stop(t + 1.8)

    // Квинтовый аккорд без терции — сурово и «по-боевому».
    horn(t, 3, [73.42, 110, 146.83, 220], 0.16)
  }

  // ─────────────── Партитура, секунды от начала ───────────────
  const at = (seconds: number) => t0 + seconds

  rumble(at(0), 13.2)

  // Редкие тяжелые удары.
  for (const s of [0, 1.2, 2.4]) drum(at(s), 0.75)
  // Шаг войска.
  for (let s = 3.6; s < 8.4; s += 0.6) drum(at(s), 0.6 + (s - 3.6) * 0.03)
  // Ускорение.
  for (let s = 8.4; s < 10.2; s += 0.3) drum(at(s), 0.7)
  // Дробь с крещендо: короткие удары, чтобы не слиплись в гул.
  for (let s = 10.2, i = 0; s < 11.95; s += 0.1, i += 1) drum(at(s), 0.25 + i * 0.025, 52, 0.22)

  // Перекличка рогов: ре–ля, ответ, подъем, и общий зов.
  horn(at(0.6), 1.8, [73.42, 110], 0.18)
  horn(at(3.0), 1.8, [73.42, 110], 0.18)
  horn(at(5.4), 1.2, [87.31, 130.81], 0.18)
  horn(at(6.7), 2.2, [110, 164.81], 0.2)
  horn(at(9.2), 2.6, [146.83, 220], 0.17)

  riser(at(9), 3)
  impact(at(12))

  const duration = 15.2
  let stopped = false

  return {
    duration,
    stop: () => {
      if (stopped) return
      stopped = true
      const now = ctx.currentTime
      master.gain.cancelScheduledValues(now)
      master.gain.setValueAtTime(master.gain.value, now)
      master.gain.linearRampToValueAtTime(0, now + 0.4)
      for (const source of sources) {
        try {
          source.stop(now + 0.45)
        } catch {
          // Узел уже остановлен по расписанию.
        }
      }
    },
  }
}
