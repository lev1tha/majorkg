"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CircleAlert, Loader2, LogIn, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApiError, loginPlayer, registerPlayer } from "@/lib/api-client"

/** Тот же формат, что проверяет бэкенд: без пробелов, им же входят. */
const NICKNAME_PATTERN = "[\\p{L}\\p{N}_.\\-]{2,24}"

/**
 * Запасной вход без Steam: ник и пароль, ссылка на Steam — руками.
 *
 * Такой аккаунт помечается как неподтвержденный: ссылку может вставить
 * кто угодно. Один вход через Steam позже снимает пометку.
 */
export function PasswordAuth() {
  const router = useRouter()
  const [mode, setMode] = React.useState<"login" | "register">("login")
  const [form, setForm] = React.useState({ nickname: "", password: "", steam: "" })
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (pending) return

    setPending(true)
    setError(null)
    try {
      if (mode === "login") {
        await loginPlayer(form.nickname.trim(), form.password)
      } else {
        await registerPlayer({
          nickname: form.nickname.trim(),
          password: form.password,
          steam: form.steam.trim(),
        })
      }
      router.replace("/profile")
      router.refresh()
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Не удалось войти")
      setPending(false)
    }
  }

  return (
    <Tabs
      value={mode}
      onValueChange={(value) => {
        setMode(value as typeof mode)
        setError(null)
      }}
      className="flex flex-col gap-5"
    >
      <TabsList className="w-full">
        <TabsTrigger value="login" className="flex-1">
          Вход по нику
        </TabsTrigger>
        <TabsTrigger value="register" className="flex-1">
          Регистрация
        </TabsTrigger>
      </TabsList>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Ник">
          <Input
            value={form.nickname}
            onChange={update("nickname")}
            autoComplete="username"
            required
            pattern={mode === "register" ? NICKNAME_PATTERN : undefined}
            title="2–24 символа: буквы, цифры, точка, дефис и _ — без пробелов"
            placeholder="s1mple_kg"
          />
        </Field>

        <Field label="Пароль" hint={mode === "register" ? "Минимум 8 символов" : undefined}>
          <Input
            type="password"
            value={form.password}
            onChange={update("password")}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            required
            minLength={mode === "register" ? 8 : undefined}
            placeholder="••••••••"
          />
        </Field>

        <TabsContent value="register" className="mt-0">
          <Field
            label="Профиль Steam"
            hint="Ссылка на ваш профиль: steamcommunity.com/profiles/… или /id/… По ней подтянется аватар и FACEIT."
          >
            <Input
              value={form.steam}
              onChange={update("steam")}
              required={mode === "register"}
              inputMode="url"
              placeholder="https://steamcommunity.com/id/…"
            />
          </Field>
        </TabsContent>

        {error && (
          <p className="flex items-start gap-2 rounded-[10px] border border-accent/25 bg-accent/[0.07] p-3 text-[12.5px] leading-relaxed text-accent-soft">
            <CircleAlert size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        <Button type="submit" variant="outline" size="lg" className="w-full" disabled={pending}>
          {pending ? (
            <Loader2 strokeWidth={1.5} className="animate-spin" />
          ) : mode === "login" ? (
            <LogIn strokeWidth={1.5} />
          ) : (
            <UserPlus strokeWidth={1.5} />
          )}
          {mode === "login" ? "Войти" : "Создать аккаунт"}
        </Button>

        {mode === "register" && (
          <p className="text-[11.5px] leading-relaxed text-white/30">
            Steam, указанный вручную, судья видит как неподтвержденный. Чтобы снять пометку,
            один раз войдите через Steam — пароль после этого сбросится, входите через Steam или
            задайте новый в профиле.
          </p>
        )}
      </form>
    </Tabs>
  )
}
