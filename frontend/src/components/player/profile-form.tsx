"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { BadgeCheck, CircleAlert, Gamepad2, KeyRound, Loader2, Save, UserPen } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, Input, Select } from "@/components/ui/input"
import { ApiError, setMyPassword, updateMyProfile } from "@/lib/api-client"
import type { ViewerDto } from "@/lib/types"

const ROLES = ["IGL", "AWP", "Entry", "Lurk", "Rifler", "Support"]
const NICKNAME_PATTERN = "[\\p{L}\\p{N}_.\\-]{2,24}"

function Notice({ tone, children }: { tone: "error" | "ok"; children: React.ReactNode }) {
  return tone === "error" ? (
    <p className="flex items-start gap-2 rounded-[10px] border border-accent/25 bg-accent/[0.07] p-3 text-[12.5px] leading-relaxed text-accent-soft">
      <CircleAlert size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
      {children}
    </p>
  ) : (
    <p className="text-[12.5px] text-success">{children}</p>
  )
}

/**
 * Данные профиля, которые игрок заполняет сам.
 *
 * Steam можно сменить, только пока он не подтвержден входом через Steam:
 * подтвержденный SteamID доказан Valve, и менять его руками незачем.
 * Контакты видит только организатор — чтобы связаться перед матчем.
 */
export function ProfileForm({ viewer }: { viewer: ViewerDto }) {
  const router = useRouter()
  const initial = React.useMemo(
    () => ({
      nickname: viewer.nickname,
      steam: `https://steamcommunity.com/profiles/${viewer.steamId}`,
      role: viewer.role,
      city: viewer.city ?? "",
      telegram: viewer.telegram ?? "",
      discord: viewer.discord ?? "",
    }),
    [viewer],
  )
  const [form, setForm] = React.useState(initial)
  const [pending, setPending] = React.useState(false)
  const [notice, setNotice] = React.useState<{ tone: "error" | "ok"; text: string } | null>(null)

  React.useEffect(() => setForm(initial), [initial])

  const update =
    (key: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const dirty = (Object.keys(form) as (keyof typeof form)[]).some((key) => form[key] !== initial[key])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (pending || !dirty) return

    // Отправляем только измененное: так бэкенд не перепроверяет Steam зря.
    const changes = Object.fromEntries(
      (Object.keys(form) as (keyof typeof form)[])
        .filter((key) => form[key] !== initial[key])
        .map((key) => [key, form[key].trim()]),
    )

    setPending(true)
    setNotice(null)
    try {
      await updateMyProfile(changes)
      setNotice({ tone: "ok", text: "Сохранено" })
      router.refresh()
    } catch (cause) {
      setNotice({
        tone: "error",
        text: cause instanceof ApiError ? cause.message : "Не удалось сохранить профиль",
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="glass flex flex-col gap-5 rounded-xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-[16px] font-bold text-white">
          <UserPen size={16} strokeWidth={1.5} className="text-white/40" />
          Данные профиля
        </h2>
        {viewer.steamVerified ? (
          <Badge variant="success" size="sm">
            <BadgeCheck strokeWidth={1.5} />
            Steam подтвержден
          </Badge>
        ) : (
          <Badge variant="prize" size="sm">
            Steam не подтвержден
          </Badge>
        )}
      </div>

      {!viewer.steamVerified && (
        <div className="flex flex-col gap-3 rounded-[10px] border border-prize/20 bg-prize/[0.06] p-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-[12.5px] leading-relaxed text-prize/85">
            Ссылку на Steam вы указали вручную, поэтому судья видит ее как неподтвержденную.
            Войдите один раз через Steam — пометка снимется.
          </p>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <a href="/api/auth/steam" rel="nofollow">
              <Gamepad2 strokeWidth={1.5} />
              Подтвердить
            </a>
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ник" hint={viewer.hasPassword ? "Им же вы входите по паролю" : undefined}>
          <Input
            value={form.nickname}
            onChange={update("nickname")}
            required
            pattern={NICKNAME_PATTERN}
            title="2–24 символа: буквы, цифры, точка, дефис и _ — без пробелов"
          />
        </Field>

        <Field label="Роль">
          <Select value={form.role} onChange={update("role")}>
            {/* Старые значения не из списка тоже показываем, чтобы не потерять. */}
            {[...new Set([...ROLES, viewer.role])].map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Профиль Steam"
          className="sm:col-span-2"
          hint={
            viewer.steamVerified
              ? "Подтвержден входом через Steam — сменить нельзя."
              : "Ссылка /profiles/… или /id/… По ней подтягиваются аватар и FACEIT."
          }
        >
          <Input
            value={form.steam}
            onChange={update("steam")}
            readOnly={viewer.steamVerified}
            inputMode="url"
            className={viewer.steamVerified ? "text-white/45" : undefined}
          />
        </Field>

        <Field label="Город">
          <Input value={form.city} onChange={update("city")} maxLength={40} placeholder="Бишкек" />
        </Field>

        <div className="hidden sm:block" />

        <Field label="Telegram" hint="Видит только организатор">
          <Input
            value={form.telegram}
            onChange={update("telegram")}
            maxLength={80}
            placeholder="@username"
          />
        </Field>

        <Field label="Discord" hint="Видит только организатор">
          <Input
            value={form.discord}
            onChange={update("discord")}
            maxLength={40}
            placeholder="username"
          />
        </Field>
      </div>

      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

      <div className="flex justify-end border-t border-white/[0.07] pt-4">
        <Button type="submit" variant="primary" size="md" disabled={pending || !dirty}>
          {pending ? (
            <Loader2 strokeWidth={1.5} className="animate-spin" />
          ) : (
            <Save strokeWidth={1.5} />
          )}
          Сохранить
        </Button>
      </div>
    </form>
  )
}

/** Пароль для входа без Steam: задать впервые или сменить. */
export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter()
  const [current, setCurrent] = React.useState("")
  const [next, setNext] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const [notice, setNotice] = React.useState<{ tone: "error" | "ok"; text: string } | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (pending) return

    setPending(true)
    setNotice(null)
    try {
      await setMyPassword(next, hasPassword ? current : undefined)
      setCurrent("")
      setNext("")
      setNotice({ tone: "ok", text: "Пароль сохранен. Другие устройства разлогинены." })
      router.refresh()
    } catch (cause) {
      setNotice({
        tone: "error",
        text: cause instanceof ApiError ? cause.message : "Не удалось сохранить пароль",
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="glass flex flex-col gap-5 rounded-xl p-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="flex items-center gap-2 font-display text-[16px] font-bold text-white">
          <KeyRound size={16} strokeWidth={1.5} className="text-white/40" />
          Пароль
        </h2>
        <p className="text-[12.5px] leading-relaxed text-white/40">
          {hasPassword
            ? "Можно входить по нику и паролю, без Steam."
            : "Пароля нет — входите через Steam. Задайте пароль, чтобы входить по нику."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {hasPassword && (
          <Field label="Текущий пароль">
            <Input
              type="password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
        )}
        <Field label={hasPassword ? "Новый пароль" : "Пароль"} hint="Минимум 8 символов">
          <Input
            type="password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
      </div>

      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

      <div className="flex justify-end border-t border-white/[0.07] pt-4">
        <Button type="submit" variant="outline" size="md" disabled={pending || next.length === 0}>
          {pending ? (
            <Loader2 strokeWidth={1.5} className="animate-spin" />
          ) : (
            <KeyRound strokeWidth={1.5} />
          )}
          {hasPassword ? "Сменить пароль" : "Задать пароль"}
        </Button>
      </div>
    </form>
  )
}
