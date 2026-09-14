import { BRACKET_LABEL, TOURNAMENTS, type Tournament } from "@/lib/data/tournaments"
import { GAMES } from "@/lib/data/games"

/** Домен задается через NEXT_PUBLIC_SITE_URL при деплое. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://major.kg").replace(/\/$/, "")

export const SITE = {
  name: "MAJOR KG",
  legalName: "MAJOR KG Esports",
  url: SITE_URL,
  locale: "ru_KG",
  title: "Турниры КГ — онлайн турниры по CS2 в Кыргызстане | MAJOR KG",
  description:
    "Онлайн турниры по CS2 в Кыргызстане: регистрация команды за два клика, автоматическая турнирная сетка, судейство матчей и прозрачные выплаты призовых. Расписание турниров Бишкека и всей Центральной Азии.",
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
    "призовой фонд турнира",
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

const STATUS_LD: Record<Tournament["status"], string> = {
  registration: "https://schema.org/EventScheduled",
  checkin: "https://schema.org/EventScheduled",
  live: "https://schema.org/EventScheduled",
  finished: "https://schema.org/EventScheduled",
}

export function tournamentLd(tournament: Tournament): Json {
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    "@id": canonical(`/tournaments/${tournament.slug}#event`),
    name: `${tournament.title} — ${GAMES[tournament.game].name}`,
    description: tournament.summary,
    url: canonical(`/tournaments/${tournament.slug}`),
    startDate: tournament.startDateISO,
    eventStatus: STATUS_LD[tournament.status],
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    sport: GAMES[tournament.game].name,
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
    offers: {
      "@type": "Offer",
      price: tournament.entryFee,
      priceCurrency: tournament.currency,
      availability:
        tournament.registered < tournament.slots
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      url: canonical(`/tournaments/${tournament.slug}`),
      validFrom: "2026-09-01T00:00:00+06:00",
    },
    competitor: { "@type": "SportsTeam", name: `Команды: ${tournament.registered}` },
    award: `${tournament.prizePool} ${tournament.currency}`,
  }
}

export function tournamentListLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Активные онлайн турниры по CS2 в Кыргызстане",
    numberOfItems: TOURNAMENTS.length,
    itemListElement: TOURNAMENTS.map((tournament, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: canonical(`/tournaments/${tournament.slug}`),
      name: `${tournament.title} · ${GAMES[tournament.game].name} · ${BRACKET_LABEL[tournament.bracket]}`,
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

export const FAQ = [
  {
    q: "Как попасть на онлайн турнир по CS2 в Кыргызстане?",
    a: "Выберите турнир в календаре, нажмите «Участвовать» и подтвердите состав — заявка занимает два клика. Если команды еще нет, она создается прямо в окне заявки, а состав можно добрать до check-in.",
  },
  {
    q: "Сколько стоит участие в турнирах КГ?",
    a: "Большинство открытых турниров MAJOR KG бесплатные. Для отдельных кубков указан организационный взнос — он всегда виден на карточке турнира до подтверждения заявки.",
  },
  {
    q: "Как формируется турнирная сетка?",
    a: "Сетка генерируется автоматически после закрытия слотов: Single Elimination, Double Elimination, Swiss или группы с плейофф. Посев идет по рейтингу команд, результаты матчей попадают в сетку сразу после подтверждения судьей.",
  },
  {
    q: "Когда выплачивается призовой фонд?",
    a: "После подтверждения результатов гранд-финала и закрытия апелляций. Статус выплаты команда видит в своем профиле, стандартный срок — до пяти рабочих дней.",
  },
  {
    q: "Что будет, если команда не пришла на матч?",
    a: "Действует регламент check-in: команда обязана подтвердить готовность за 30 минут до старта. При неявке или неполном составе назначается техническое поражение, а слот передается команде из листа ожидания.",
  },
]

export function faqLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  }
}
