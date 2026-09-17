/**
 * Инжект структурированных данных. Значения формируются на сервере из
 * собственных данных, поэтому безопасно сериализуются в <script>.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const payload = JSON.stringify(data).replace(/</g, "\u003c")
  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: payload }}
    />
  )
}
