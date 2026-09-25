import type { Lang } from "@/lib/chat-experience";

export type ChatCardJourney = {
  detailHref: string;
  detailLabel: string;
  followUpPrompts: [string, string];
};

const JOURNEY_COPY: Record<Lang, { detail: string; about: string; explore: string }> = {
  ja: { detail: "この作品を詳しく見る", about: "この作品について、もう少し聞きたい", explore: "別の作品も探したい" },
  en: { detail: "View this work", about: "Tell me more about this work", explore: "Explore another work" },
  fr: { detail: "Voir cette œuvre", about: "Parlez-moi davantage de cette œuvre", explore: "Découvrir une autre œuvre" },
  es: { detail: "Ver esta obra", about: "Cuéntame más sobre esta obra", explore: "Explorar otra obra" },
  de: { detail: "Dieses Werk ansehen", about: "Erzähl mir mehr über dieses Werk", explore: "Ein weiteres Werk entdecken" },
  ar: { detail: "عرض هذا العمل", about: "أخبرني المزيد عن هذا العمل", explore: "استكشاف عمل آخر" },
};

/** Derive only the stable, existing catalog route and neutral conversation prompts. */
export function getChatCardJourney(workId: string, lang: Lang): ChatCardJourney {
  const copy = JOURNEY_COPY[lang];
  return {
    detailHref: `/works/${encodeURIComponent(workId)}`,
    detailLabel: copy.detail,
    followUpPrompts: [copy.about, copy.explore],
  };
}
