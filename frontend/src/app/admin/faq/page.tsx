import { AdminPageTitle } from "@/components/admin/admin-shell"
import { FaqEditor } from "@/components/admin/faq-editor"
import { getAdminFaq } from "@/lib/api"

export default async function AdminFaqPage() {
  const items = await getAdminFaq()

  return (
    <>
      <AdminPageTitle
        title="Вопросы и ответы"
        description="Тексты со страницы /faq и главной. Они же уходят в разметку FAQPage для поиска, поэтому правятся здесь, а не в коде."
      />
      <FaqEditor items={items} />
    </>
  )
}
