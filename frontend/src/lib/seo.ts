import type { FaqItemDto, TournamentDto } from "@/lib/types"

/** Домен задается через NEXT_PUBLIC_SITE_URL при деплое. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://major.kg").replace(/\/$/, "")

export const SITE = {
  name: "MAJOR KG",
  legalName: "MAJOR KG Esports",
  url: SITE_URL,
  locale: "ru_KG",
  game: "Counter-Strike 2",
  title: "Турниры КГ — онлайн турниры по CS2 в Кыргызстане | MAJOR KG",
  description:
    "Онлайн турниры по CS2 в Кыргызстане: индивидуальная регистрация без команды, жеребьевка составов по рейтингу FACEIT, автоматическая турнирная сетка и судейство матчей. Расписание турниров Бишкека и всей Центральной Азии.",
  keywords: [
    "турниры кг",
    "онлайн турниры",
    "кыргызстан турниры",
    "турниры кыргызстан",
    "турниры бишкек",
    "cs2 турниры",
    "кс2 турниры",
    "киберспорт кыргызстан",
    "турнирная сетка онлайн",
    "counter-strike 2 турнир",
    "esports kyrgyzstan",
    "регистрация на турнир",
    "турнир без команды",
    "турниры по кс2 онлайн",
  ],
  twitter: "@majorkg",
} as const

export function canonical(path = "/") {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`
}

type Json = Record<string, unknown>

export function organizationLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE_URL,
    sport: "Esports",
    areaServed: [
      { "@type": "Country", name: "Кыргызстан" },
      { "@type": "Place", name: "Центральная Азия" },
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Бишкек",
      addressCountry: "KG",
    },
    knowsLanguage: ["ru", "ky"],
  }
}

export function websiteLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE.name,
    description: SITE.description,
    inLanguage: "ru-KG",
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/?q={search_term_string}#tournaments`,
      },
      "query-input": "required name=search_term_string",
    },
  }
}

export function tournamentLd(tournament: TournamentDto): Json {
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    "@id": canonical(`/tournaments/${tournament.slug}#event`),
    name: `${tournament.title} — ${SITE.game}`,
    description: tournament.summary,
    url: canonical(`/tournaments/${tournament.slug}`),
    startDate: tournament.startsAt,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    sport: SITE.game,
    inLanguage: "ru-KG",
    maximumAttendeeCapacity: tournament.slots,
    remainingAttendeeCapacity: Math.max(0, tournament.slots - tournament.registered),
    location: {
      "@type": "VirtualLocation",
      url: canonical(`/tournaments/${tournament.slug}`),
    },
    organizer: {
      "@type": "Organization",
      name: tournament.organizer,
      url: SITE_URL,
    },
    // Цена оффера — организационный взнос за участие.
    offers: {
      "@type": "Offer",
      price: tournament.entryFee,
      priceCurrency: "KGS",
      availability:
        tournament.registered < tournament.slots
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      url: canonical(`/tournaments/${tournament.slug}`),
    },
  }
}

export function tournamentListLd(tournaments: TournamentDto[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Активные онлайн турниры по CS2 в Кыргызстане",
    numberOfItems: tournaments.length,
    itemListElement: tournaments.map((tournament, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: canonical(`/tournaments/${tournament.slug}`),
      name: `${tournament.title} · ${SITE.game} · ${tournament.teamSizeLabel}`,
    })),
  }
}

export function breadcrumbLd(items: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonical(item.path),
    })),
  }
}

/** Разметка FAQPage строится из тех же вопросов, что видит читатель. */
export function faqLd(items: FaqItemDto[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  }
}
