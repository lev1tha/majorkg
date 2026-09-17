/**
 * Рейтинговые пояса FACEIT — словарь для интерфейса.
 *
 * Саму жеребьевку проводит бэкенд (backend/src/services/lineups.ts):
 * состав собирается из подтвержденных индивидуальных заявок, по одному
 * игроку из каждого пояса. Здесь остаются только подписи, чтобы показать
 * игроку распределение лобби до жеребьевки.
 */

export interface MixBand {
  id: string
  label: string
  hint: string
  min: number
  max: number
}

export const MIX_BANDS: MixBand[] = [
  { id: "s", label: "Пояс 1", hint: "2001+ ELO · уровень 10", min: 2001, max: Number.MAX_SAFE_INTEGER },
  { id: "a", label: "Пояс 2", hint: "до 2000 ELO · уровень 9", min: 1751, max: 2000 },
  { id: "b", label: "Пояс 3", hint: "до 1750 ELO · уровень 7–8", min: 1351, max: 1750 },
  { id: "c", label: "Пояс 4", hint: "до 1350 ELO · уровень 5–6", min: 1051, max: 1350 },
  { id: "d", label: "Пояс 5", hint: "до 1050 ELO · уровень 1–4", min: 0, max: 1050 },
]

export function bandOf(elo: number): MixBand {
  return MIX_BANDS.find((band) => elo >= band.min && elo <= band.max) ?? MIX_BANDS[MIX_BANDS.length - 1]
}
