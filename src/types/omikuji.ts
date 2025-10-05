export type Lang = "ja" | "en" | "orig";

export type OmikujiLine = {
  orig: string;
  ja: string;
  en: string;
};

export type OmikujiItem = {
  id: number;
  rank_ja: string;
  rank_en: string;
  header_ja: string;
  header_en: string;
  lines: OmikujiLine[];
};

export type WorkItem = {
  id: string | number;
  title: string;
  type?: "book" | "music" | "art" | "other";
  cover?: string;
  tags?: string[];
  moodTags?: string[];
  href?: string;
};
