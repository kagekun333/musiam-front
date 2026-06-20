# 伯爵MUSIAM デザインシステム v1 （リノベ F0）

「350の作品でできた、ひとつの奇妙で美しい国」を成立させるための視覚言語の正本。
戦略は `RENOVATION_STRATEGY_v1.md`、実装トークンは `src/styles/renovation-tokens.css`（CSS）と
`src/lib/design/tokens.ts`（TS）。**globals.css は触らない。本systemは追加専用の新token層。**

最終更新: 2026-06-21（F0で初版）

---

## 0. 原則

- **奇抜 × 品格**: ゲームのような探索の驚きと、宮廷のような品格を同居させる。占い・オカルトは排除。
- **二層視覚**: すべての装飾は「伯爵=人」層と「精=AI」層の対比から導く。これがこの国の装飾原理。
- **追加専用・復元可能**: 既存の `globals.css` / クラス / 要素セレクタは上書きしない。新規は `.rnv-*` 名前空間か別ファイル。

---

## 1. 二層視覚（装飾原理）

| 層 | 担い手 | フォント | 基調色 | 線 | 質感 |
|---|---|---|---|---|---|
| **Sovereign（伯爵=人）** | 玉座・工房の主・ロア | serif（Noto Serif JP / `--rnv-font-sovereign`） | 琥珀 amber | 琥珀の細線 | 羊皮紙・金の細線・荘厳 |
| **Spirit（精=AI）** | 無数の精・索引・放送・グリッド | sans/mono（Inter / `--rnv-font-spirit`） | 灰青 slate | 灰青グリッド | 発光・クリーン・座標 |

使い分けの目安: 章題・地名・伯爵の声 = Sovereign。データ・件数・座標・索引・放送UI = Spirit。

---

## 2. 特異色 — 灰青 ＋ 琥珀

占いの「金」から一段ずらし、夜（`#070e18`）に映える奇抜さを **一点** に宿す。

- **灰青 slate**（cool / 精層）: 標準 `--rnv-slate-300 = #7c96b8`。索引・グリッド・新着・等高線。
- **琥珀 amber**（warm / 人層）: 標準 `--rnv-amber-300 = #e0b35e`。名所・伯爵の灯・細線・CTA。
- 背景は globals.css の宇宙夜 `#070e18` を継承（不変）。領土の床は `--rnv-bg-realm = #0b1422`。

配色比率の目安: 夜 80% / 灰青 15% / 琥珀 5%。琥珀は「灯」として点で使い、面で使わない。

---

## 3. カートグラフィ（記号アイコン ＋ 等高線）

地図は写実でなく **記号的**。軽量・拡張容易（作品が増えても破綻しない）。

- **等高線** `--rnv-map-contour`: 地方の地形感を薄い同心円/レイヤで示す（`.rnv-contours`）。
- **記号アイコン** `.rnv-mark`: 名所＝代表作は琥珀リング、最近ひらかれた土地＝新着は灰青リング（`.rnv-mark--new`）。
- **巡路** `--rnv-map-route`: 土地を結ぶ細い琥珀の線。重くしない。
- 地方（territory）は **作品の moodTags/tags から自動生成**（コード改修不要・スケール前提）。

---

## 4. タイポグラフィ

スケールは Major Third（1.250）。`--rnv-text-xs … --rnv-text-4xl`。

- 章題・地名: `.rnv-realm-title`（serif ＋ 字間 `--rnv-tracking-realm: 0.18em`）で宮廷的に。
- 本文: `--rnv-leading-prose: 1.75`、`--rnv-text-soft`。
- 座標・UPC・記号: `.rnv-rune`（monospace）。

---

## 5. 余白・形・影

- 余白は 8px ベース `--rnv-space-1…9`。
- 半径 `--rnv-radius-sm/md/lg/pill`、影 `--rnv-shadow-realm`（命名は globals と非衝突）。
- パネル `.rnv-panel`（領土の床に浮く面）。Sovereign 面は `.rnv-panel--sovereign`（琥珀縁）。

---

## 6. モーション（品を保つ）

- ease `--rnv-ease`、速度 `--rnv-dur-fast/base/slow`。
- 「土地が呼吸する」ホバーは `.rnv-breathe`（+2px / scale 1.012 のみ。過剰演出を禁ずる）。
- `prefers-reduced-motion` を尊重（自動で無効化）。

---

## 7. アクセシビリティ / SEO 二層構成

- 没入レイヤ（地図・放送）の下に、`/works`・`/letters` の **指標レイヤ**（indexable・クリーン）を必ず残す。
- キーボード操作・スクリーンリーダ・低速回線フォールバックを最初から設計。地図は演出として上に被せる。

---

## 8. 使い方（実装者向け）

1. `src/app/layout.tsx` で `renovation-tokens.css` を import 済み（globals の後・追加のみ）。
2. CSS から: `var(--rnv-amber-300)` 等。ユーティリティは `.rnv-panel` `.rnv-realm-title` `.rnv-mark` など。
3. TSX から: `import { palette, layers, cartography } from "@/lib/design/tokens"`。
4. 新規コンポーネントは component co-located CSS か `.rnv-*`。**globals.css・works.json 全文置換は禁忌（AGENTS.md）。**
