export default function Loading() {
  return (
    <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8">
      <div className="h-[380px] animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02]" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-[300px] animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]"
          />
        ))}
      </div>
    </div>
  )
}
