import { JoinProvider } from "@/components/join/join-provider"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { JsonLd } from "@/components/seo/json-ld"
import { organizationLd, websiteLd } from "@/lib/seo"

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <JoinProvider>
      <JsonLd data={[organizationLd(), websiteLd()]} />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[10px] focus:bg-accent focus:px-4 focus:py-2 focus:text-base"
      >
        К основному содержимому
      </a>
      <SiteHeader />
      <main id="main" className="relative z-10">
        {children}
      </main>
      <SiteFooter />
    </JoinProvider>
  )
}
