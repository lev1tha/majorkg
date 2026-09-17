import type { Metadata } from "next"

import { PageHeader } from "@/components/layout/page-header"
import { FaqSection } from "@/components/marketing/faq-section"
import { JsonLd } from "@/components/seo/json-ld"
import { getFaq } from "@/lib/api"
import { breadcrumbLd, faqLd } from "@/lib/seo"

export const metadata: Metadata = {
  title: "FAQ — правила турниров и регламент",
  description:
    "Ответы на вопросы о турнирах КГ: как подать заявку без команды, сколько стоит организационный взнос, как строится верхняя сетка и что будет при неявке.",
  alternates: { canonical: "/faq" },
}

export default async function FaqPage() {
  const items = await getFaq()

  return (
    <>
      <JsonLd
        data={[faqLd(items), breadcrumbLd([{ name: "Главная", path: "/" }, { name: "FAQ", path: "/faq" }])]}
      />
      <PageHeader
        crumbs={[{ label: "Главная", href: "/" }, { label: "FAQ" }]}
        title="Вопросы и регламент"
        description="Коротко о том, как устроены турниры MAJOR KG — от заявки до финала."
      />
      <FaqSection items={items} />
    </>
  )
}
