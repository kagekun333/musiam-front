"use client";
// src/lib/use-inbound-search.ts
//
// 現在のURLのクエリ（＝流入元のUTM）をマウント後に読むフック。
//
// useSearchParams() を使うと、そのページ全体が動的レンダリングに落ちて
// 静的生成（＝SEO記事・ハブページの配信コスト）を失う。
// リンク先の合成はハイドレーション後で十分間に合うため、
// window.location.search を useEffect で読む方式にしている。
//
// 初回レンダリング（SSR/静的HTML）では null を返すので、
// 呼び出し側は「素の baseHref → マウント後に合成後 href」へ差し替わる前提で使う。

import { useEffect, useState } from "react";

export function useInboundSearch(): string | null {
  const [search, setSearch] = useState<string | null>(null);
  useEffect(() => {
    setSearch(window.location.search || null);
  }, []);
  return search;
}

export default useInboundSearch;
