"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, KeyRound, Loader2, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, Input } from "@/components/ui/input"
import { ApiError, changeAdminPassword, createAdminAccount } from "@/lib/api-client"
import type { AdminDto } from "@/lib/types"
import { formatDate, formatTime } from "@/lib/utils"

/**
 * Учетные записи организаторов.
 *
 * Смена пароля разлогинивает все устройства, включая текущее — это не
 * побочный эффект, а смысл операции: пароль меняют, когда подозревают, что
 * им завладели.
 */
export function AccountSettings({ admin, accounts }: { admin: AdminDto; accounts: AdminDto[] }) {
  const router = useRouter()

  const [password, setPassword] = React.useState({ current: "", next: "", repeat: "" })
  const [passwordBusy, setPasswordBusy] = React.useState(false)
  const [passwordError, setPasswordError] = React.useState<string | null>(null)

  const [draft, setDraft] = React.useState({ login: "", password: "", name: "" })
  const [createBusy, setCreateBusy] = React.useState(false)
  const [createError, setCreateError] = React.useState<string | null>(null)
  const [created, setCreated] = React.useState<string | null>(null)

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (passwordBusy) return

    if (password.next !== password.repeat) {
      setPasswordError("Новый пароль и повтор не совпадают")
      return
    }

    setPasswordBusy(true)
    setPasswordError(null)
    try {
      await changeAdminPassword(password.current, password.next)
      // Сессия уже сброшена сервером — обновление покажет форму входа.
      router.refresh()
    } catch (cause) {
      setPasswordError(cause instanceof ApiError ? cause.message : "Не удалось сменить пароль")
      setPasswordBusy(false)
    }
  }

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (createBusy) return

    setCreateBusy(true)
    setCreateError(null)
    try {
      const result = await createAdminAccount({
        login: draft.login.trim(),
        password: draft.password,
        name: draft.name.trim() || undefined,
      })
      setCreated(result.admin.login)
      setDraft({ login: "", password: "", name: "" })
      router.refresh()
    } catch (cause) {
      setCreateError(cause instanceof ApiError ? cause.message : "Не удалось создать учетку")
    } finally {
      setCreateBusy(false)
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {/* Смена пароля */}
      <form onSubmit={submitPassword} className="panel flex flex-col gap-4 rounded-xl p-6">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-white">
            <KeyRound size={15} strokeWidth={1.5} className="text-white/40" />
            Сменить пароль
          </h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/35">
            Вы войдете заново: смена пароля закрывает сессии на всех устройствах.
          </p>
        </div>

        <Field label="Текущий пароль">
          <Input
            type="password"
            autoComplete="current-password"
            value={password.current}
            onChange={(e) => setPassword((prev) => ({ ...prev, current: e.target.value }))}
            required
          />
        </Field>
        <Field label="Новый пароль" hint="Минимум 8 символов">
          <Input
            type="password"
            autoComplete="new-password"
            value={password.next}
            onChange={(e) => setPassword((prev) => ({ ...prev, next: e.target.value }))}
            required
            minLength={8}
          />
        </Field>
        <Field label="Повторите новый">
          <Input
            type="password"
            autoComplete="new-password"
            value={password.repeat}
            onChange={(e) => setPassword((prev) => ({ ...prev, repeat: e.target.value }))}
            required
            minLength={8}
          />
        </Field>

        {passwordError && <p className="text-[12.5px] text-accent-soft">{passwordError}</p>}

        <Button type="submit" variant="primary" size="md" className="self-start" disabled={passwordBusy}>
          {passwordBusy ? (
            <Loader2 strokeWidth={1.5} className="animate-spin" />
          ) : (
            <Check strokeWidth={1.5} />
          )}
          Сменить пароль
        </Button>
      </form>

      {/* Новый организатор */}
      <form onSubmit={submitCreate} className="panel flex flex-col gap-4 rounded-xl p-6">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-white">
            <UserPlus size={15} strokeWidth={1.5} className="text-white/40" />
            Добавить организатора
          </h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/35">
            У всех организаторов одинаковые права. Пароль передайте лично —
            восстановления по почте на платформе нет.
          </p>
        </div>

        <Field label="Логин">
          <Input
            value={draft.login}
            onChange={(e) => setDraft((prev) => ({ ...prev, login: e.target.value }))}
            placeholder="judge2"
            required
            minLength={3}
          />
        </Field>
        <Field label="Имя">
          <Input
            value={draft.name}
            onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Судья турниров"
          />
        </Field>
        <Field label="Пароль" hint="Минимум 8 символов">
          <Input
            type="password"
            autoComplete="new-password"
            value={draft.password}
            onChange={(e) => setDraft((prev) => ({ ...prev, password: e.target.value }))}
            required
            minLength={8}
          />
        </Field>

        {createError && <p className="text-[12.5px] text-accent-soft">{createError}</p>}
        {created && (
          <p className="text-[12.5px] text-success">Учетка «{created}» создана.</p>
        )}

        <Button type="submit" variant="outline" size="md" className="self-start" disabled={createBusy}>
          {createBusy ? (
            <Loader2 strokeWidth={1.5} className="animate-spin" />
          ) : (
            <UserPlus strokeWidth={1.5} />
          )}
          Создать
        </Button>
      </form>

      {/* Список организаторов */}
      <section className="panel overflow-hidden rounded-xl xl:col-span-2">
        <header className="border-b border-white/[0.07] px-5 py-4">
          <h2 className="font-display text-[15px] font-bold text-white">Организаторы</h2>
        </header>
        <ul className="divide-y divide-white/[0.05]">
          {accounts.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-white">
                  {item.name}
                  {item.id === admin.id && (
                    <span className="ml-2 text-[11.5px] font-normal text-accent-soft">это вы</span>
                  )}
                </p>
                <p className="mono truncate text-[11.5px] text-white/30">{item.login}</p>
              </div>
              <span className="mono shrink-0 text-[11.5px] text-white/25">
                {item.lastLoginAt
                  ? `вход ${formatDate(item.lastLoginAt)} · ${formatTime(item.lastLoginAt)}`
                  : "еще не входил"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
