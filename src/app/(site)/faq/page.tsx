import type { Metadata } from "next"

import { PageHeader } from "@/components/layout/page-header"
import { FaqSection } from "@/components/marketing/faq-section"
import { JsonLd } from "@/components/seo/json-ld"
import { breadcrumbLd, faqLd } from "@/lib/seo"

export const metadata: Metadata = {
  title: "FAQ — правила турниров и регламент",
  description:
    "Ответы на вопросы о турнирах КГ: как подать заявку, сколько стоит участие, как строится турнирная сетка, когда выплачивается призовой фонд и что будет при неявке команды.",
  alternates: { canonical: "/faq" },
}

export default function FaqPage() {
  return (
    <>
      <JsonLd
        data={[faqLd(), breadcrumbLd([{ name: "Главная", path: "/" }, { name: "FAQ", path: "/faq" }])]}
      />
      <PageHeader
        crumbs={[{ label: "Главная", href: "/" }, { label: "FAQ" }]}
        title="Вопросы и регламент"
        description="Коротко о том, как устроены турниры MAJOR KG — от заявки до выплаты призовых."
      />
      <FaqSection />
    </>
  )
}
