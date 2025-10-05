// pages/oracle/omikuji-demo.tsx — Hype v2
// "やった感"を前面に：ヒーロー、カラーガイド、7ランク一括プレビュー
import { OmikujiCard } from "../../components/omikuji/OmikujiCardView";

const SAMPLE_LINES_JA = [
  { orig: "志氣勤修業", trans: "高い志を持って、熱心に学業に励んでいるが、" },
  { orig: "祿位未造逢", trans: "幸運や高い地位には、まだ巡り会えていない。" },
  { orig: "若聞金雞語", trans: "もし、金の鶏の鳴き声を聞くような吉報があれば、" },
  { orig: "乘船得便風", trans: "舟に乗れば、追い風を得るだろう。" },
];

const RANKS: { ja: Parameters<typeof OmikujiCard>[0]["rank"]; label: string }[] = [
  { ja: "大吉", label: "Great Luck" },
  { ja: "吉", label: "Good Luck" },
  { ja: "小吉", label: "Small Luck" },
  { ja: "半吉", label: "Mixed Luck" },
  { ja: "末吉", label: "Later Luck" },
  { ja: "末小吉", label: "Slight Later Luck" },
  { ja: "凶", label: "Bad Luck" },
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(120%_80%_at_0%_0%,#f7f5ef_0%,transparent_60%),radial-gradient(120%_80%_at_100%_100%,#f6f7fb_0%,transparent_60%)]">
      <div className="mx-auto max-w-[1200px] px-6 py-10">
        {/* HERO */}
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white/70 backdrop-blur">
              <span>🎴</span>
              <span>Oracle Omikuji – Design Preview</span>
              <span className="opacity-60">v2</span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white/70 backdrop-blur">
              <span>✅</span> <span>デモ稼働</span>
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">全ランク デザインデモ（JAモード）</h1>
          <p className="opacity-70">横長カード／和紙×麻の葉／ランク別アクセント。色味と模様の出方を一括確認。</p>

          {/* やった感：小さなチェックリスト */}
          <ul className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <li className="flex items-center gap-2 bg-white/70 rounded-lg border px-3 py-2"><span>✅</span>カード7種を横並び確認</li>
            <li className="flex items-center gap-2 bg-white/70 rounded-lg border px-3 py-2"><span>✅</span>麻の葉・和紙・影をランク別調整</li>
            <li className="flex items-center gap-2 bg-white/70 rounded-lg border px-3 py-2"><span>✅</span>JAモード（原文→訳）仕様で整列</li>
          </ul>
        </header>

        {/* ランクカラーガイド（簡易） */}
        <section className="mb-8 flex flex-wrap gap-2">
          {RANKS.map((r) => (
            <span key={r.ja} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white/70">
              <span className="inline-block w-3 h-3 rounded-full border bg-[--dot]" style={{
                // 表示用の簡易色（Card.tsx と近似）
                // 大吉, 吉, 小吉, 半吉, 末吉, 末小吉, 凶
                // それぞれの色は Card.tsx の RANK_STYLE を参照
                // ここでは独自の近似を使います
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                "--dot": r.ja === "大吉" ? "#CFAF4A" : r.ja === "吉" ? "#6FAF7A" : r.ja === "小吉" ? "#79A7D1" : r.ja === "半吉" ? "#9AA4B2" : r.ja === "末吉" ? "#B9A2C8" : r.ja === "末小吉" ? "#CABBA6" : "#A7A7A7",
              }} />
              <span className="font-medium">{r.ja}</span>
              <span className="opacity-60">{r.label}</span>
            </span>
          ))}
        </section>

        {/* 7ランク：カードのみ表示 */}
        <section className="grid grid-cols-1 gap-10">
          <OmikujiCard rank="大吉" header="第九十五籤　大吉" lines={SAMPLE_LINES_JA} />
          <OmikujiCard rank="吉" header="第九十五籤　吉" lines={SAMPLE_LINES_JA} />
          <OmikujiCard rank="小吉" header="第九十五籤　小吉" lines={SAMPLE_LINES_JA} />
          <OmikujiCard rank="半吉" header="第九十五籤　半吉" lines={SAMPLE_LINES_JA} />
          <OmikujiCard rank="末吉" header="第九十五籤　末吉" lines={SAMPLE_LINES_JA} />
          <OmikujiCard rank="末小吉" header="第九十五籤　末小吉" lines={SAMPLE_LINES_JA} />
          <OmikujiCard rank="凶" header="第九十五籤　凶" lines={SAMPLE_LINES_JA} />
        </section>

        <footer className="mt-12 text-xs opacity-60">MUSIAM Oracle / Omikuji Cards — Preview v2</footer>
      </div>
    </main>
  );
}
