import { Crosshair, Hexagon, Shield, Swords, Target, Zap, type LucideIcon } from "lucide-react"

export type GameId = "cs2" | "valorant" | "dota2" | "mlbb" | "pubgm" | "eafc"

export interface Game {
  id: GameId
  name: string
  abbr: string
  icon: LucideIcon
  /** Two-stop gradient used for banners and micro-art. */
  tint: [string, string]
  primary?: boolean
}

/** CS2 — основная дисциплина платформы, остальное идет вторым эшелоном. */
export const GAMES: Record<GameId, Game> = {
  cs2: { id: "cs2", name: "CS2", abbr: "CS", icon: Crosshair, tint: ["#D08C2C", "#1B1D24"], primary: true },
  valorant: { id: "valorant", name: "Valorant", abbr: "VL", icon: Zap, tint: ["#D2384E", "#211519"] },
  dota2: { id: "dota2", name: "Dota 2", abbr: "D2", icon: Swords, tint: ["#B4442A", "#2B1616"] },
  mlbb: { id: "mlbb", name: "Mobile Legends", abbr: "ML", icon: Shield, tint: ["#3F6BD6", "#161C2E"] },
  pubgm: { id: "pubgm", name: "PUBG Mobile", abbr: "PB", icon: Target, tint: ["#C7A03B", "#1B1A17"] },
  eafc: { id: "eafc", name: "EA FC", abbr: "FC", icon: Hexagon, tint: ["#2E9E77", "#13211C"] },
}

export const GAME_LIST: Game[] = Object.values(GAMES)
