"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CircleAlert, Loader2, Lock, LogIn } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, Input } from "@/components/ui/input"
import { LogoMark } from "@/components/layout/logo"
import { ApiError, adminLogin } from "@/lib/api-client"

/**
 * Вход организатора — логин и пароль, без Steam.
 *
 * Организатор не обязан быть игроком: судейство это работа, а не игровой
 * аккаунт. Поэтому у админки свой вход и своя сессия.
 */
export function AdminLoginForm() {
  const router = useRouter()
  const [form, setForm] = React.useState({ login: "", password: "" })
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (pending) return

    setPending(true)
    setError(null)
    try {
      await adminLogin(form.login.trim(), form.password)
      router.replace("/admin")
      router.refresh()
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Не удалось войти")
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-base px-5 py-16">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <LogoMark className="size-11 rounded-[12px] text-[16px]" />
          <div>
            <h1 className="font-display text-[22px] font-extrabold tracking-[-0.03em] text-white">
              Админка MAJOR KG
            </h1>
            <p className="mt-1.5 text-[13px] text-white/40">
              Вход для организаторов и судей
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="panel flex flex-col gap-5 rounded-xl p-6">
          <Field label="Логин">
            <Input
              value={form.login}
              onChange={(event) => setForm((prev) => ({ ...prev, login: event.target.value }))}
              autoComplete="username"
              autoFocus
              required
              placeholder="admin"
            />
          </Field>

          <Field label="Пароль">
            <Input
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
          </Field>

          {error && (
            <p className="flex items-start gap-2 rounded-[10px] border border-accent/25 bg-accent/[0.07] p-3 text-[12.5px] leading-relaxed text-accent-soft">
              <CircleAlert size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 strokeWidth={1.5} className="animate-spin" />
                Входим
              </>
            ) : (
              <>
                <LogIn strokeWidth={1.5} />
                Войти
              </>
            )}
          </Button>

          <p className="flex items-start gap-2 border-t border-white/[0.07] pt-4 text-[11.5px] leading-relaxed text-white/30">
            <Lock size={12} strokeWidth={1.5} className="mt-0.5 shrink-0" />
            Логин и пароль задаются в backend/.env (ADMIN_LOGIN, ADMIN_PASSWORD) и создаются
            при первом сиде. Пароль хранится как scrypt-хеш.
          </p>
        </form>

        <p className="mt-5 text-center text-[12.5px] text-white/30">
          <Link href="/" className="transition-colors hover:text-white/60">
            ← На сайт
          </Link>
        </p>
      </div>
    </div>
  )
}
