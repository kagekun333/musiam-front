// src/lib/spec.ts
import fs from "fs";
import path from "path";

export type ExhibitionSpec = {
  route: string;
  dataSource: string;
  filters: string[];
  sorts: string[];
  card: { fields: string[]; minCta?: number; preview?: boolean };
  featured?: boolean;
  telemetry?: string[];
};

export type OracleSpec = {
  route: string;
  recommender: {
    seed: string; // "date+visitCount"
    topK: number;
    scoreTerms?: string[];
    reroll?: boolean;
  };
  explain?: boolean;
  telemetry?: string[];
};

export type CountSpec = {
  route: string;
  assistant: { mode: "rule-first"; fn: string; maxResults?: number };
  tour?: boolean;
  telemetry?: string[];
};

// --- Loader (Node サイドで .musiam/spec/*.json を読む) ---
const ROOT = process.cwd();
const SPEC_DIR = path.join(ROOT, ".musiam", "spec");

function readJSON<T>(filename: string): T {
  const p = path.join(SPEC_DIR, filename);
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw) as T;
}

export const getExhibitionSpec = () =>
  readJSON<ExhibitionSpec>("exhibition.page.json");
export const getOracleSpec = () => readJSON<OracleSpec>("oracle.page.json");
export const getCountSpec = () => readJSON<CountSpec>("count.page.json");
