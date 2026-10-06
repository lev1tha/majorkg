import Image from "next/image"

import { cn, initials } from "@/lib/utils"

const SIZES = {
  sm: { box: "size-7 rounded-[8px]", text: "text-[10px]", px: 28 },
  md: { box: "size-10 rounded-[10px]", text: "text-[12px]", px: 40 },
  lg: { box: "size-14 rounded-[12px]", text: "text-[15px]", px: 56 },
}

/**
 * Аватар игрока из Steam.
 *
 * Steam может не ответить при входе, и тогда картинки нет — поэтому
 * здесь всегда есть запасной вариант: монограмма из ника, не ломающая
 * верстку.
 */
export function PlayerAvatar({
  nickname,
  avatar,
  size = "md",
  className,
}: {
  nickname: string
  avatar?: string | null
  size?: keyof typeof SIZES
  className?: string
}) {
  const style = SIZES[size]

  if (!avatar) {
    return (
      <span
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center bg-accent/15 font-display font-bold text-accent-soft",
          style.box,
          style.text,
          className,
        )}
      >
        {initials(nickname)}
      </span>
    )
  }

  return (
    <Image
      src={avatar}
      alt=""
      width={style.px}
      height={style.px}
      unoptimized
      className={cn("shrink-0 border border-white/[0.08] object-cover", style.box, className)}
    />
  )
}
