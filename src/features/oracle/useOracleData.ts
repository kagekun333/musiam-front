import { useEffect, useState } from "react";
import type { Work } from "./types";

type WorksJson = { items: Work[] } | { items?: unknown } | unknown;

export function useOracleData() {
  const [all, setAll] = useState<Work[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch("/works/works.json", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as WorksJson;
        const items = (j as { items?: unknown }).items;
        const arr = Array.isArray(items) ? (items as Work[]) : [];
        if (!alive) return;
        setAll(arr);
        setError(null);
      } catch (e) {
        if (!alive) return;
        setAll([]);
        setError((e as Error).message ?? "failed");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { all, error, loading };
}
