// app/oracle/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Mood = "愛" | "仕事" | "未来" | "冒険" | "癒し" | "挑戦";
type FortuneTier = "大吉" | "中吉" | "小吉" | "吉" | "凶";

const MOODS: Mood[] = ["愛", "仕事", "未来", "冒険", "癒し", "挑戦"];

// 気分×運勢メッセージ（必要に応じて追記OK）
const FORTUNE_LIBRARY: Record<Mood, Record<FortuneTier, string>> = {
  愛: {
    大吉: "心の扉が同時に開く日。素直な一言が奇跡を呼ぶ。",
    中吉: "共有した景色が、距離を縮める。写真や音楽を一緒に。",
    小吉: "リズムを合わせる意識で会話を。小さな頷きが鍵。",
    吉:   "余白が魅力。結論を急がず、余韻を楽しもう。",
    凶:  "自分を減点しない。整える日にして、明日もう一歩。",
  },
  仕事: {
    大吉: "90分の全集中×2回で一気に抜ける。先延ばしは今日終わる。",
    中吉: "“先に型”で速度が出る。テンプレ→微修正→出す。",
    小吉: "TODOは3つまで。3つ超えたら別日に逃す。",
    吉:   "午前は創造、午後は運用。切り替えで燃費改善。",
    凶:  "広げず削る。やらないことリストを先に作る。",
  },
  未来: {
    大吉: "理想の未来を“現在完了形”で書くと、引力が最大化。",
    中吉: "期限のある夢は計画。週1の公開宣言で現実へ。",
    小吉: "一番小さい“勝利条件”に分解する。5分で着手。",
    吉:   "迷ったら“楽しさ＞正しさ”。熱は仲間を集める。",
    凶:  "情報断捨離。追うより、作る側へ一歩。",
  },
  冒険: {
    大吉: "未知の路地が宝の地図。いつもと逆方向へ曲がる。",
    中吉: "小さな旅支度。靴→音楽→目的地の順で整う。",
    小吉: "未体験の味を一つ。感性のチャンネルが開く。",
    吉:   "昼と夜で同じ場所に行く。二面性がヒントに。",
    凶:  "焦って遠出せず、半径1kmの深掘りで十分。",
  },
  癒し: {
    大吉: "深呼吸10回。吐く8秒、吸う4秒。世界が静まる。",
    中吉: "光と音を整える。やさしい曲と間接照明で再起動。",
    小吉: "温かい飲み物を両手で。触覚から心を温める。",
    吉:   "歩きながら空を見る。雲が流れを作ってくれる。",
    凶:  "通知を切る。世界は30分止めても大丈夫。",
  },
  挑戦: {
    大吉: "“恐い＝伸びる予感”。その一本に賭けよう。",
    中吉: "最初の1枚を世界に出す。粗くていい、公開が正義。",
    小吉: "敵は昨日の自分。比較対象を正しく選ぶ。",
    吉:   "失敗ログを宝箱に。3つ学べば勝ち扱い。",
    凶:  "完璧主義を封印。60点で走りながら上げる。",
  },
};

// 気分ごとのおすすめ遷移（導線）
const RECOMMEND_PATH: Record<Mood, { href: string; label: string }> = {
  愛:   { href: "/count-abi", label: "AI伯爵に相談する" },
  仕事: { href: "/home-legacy", label: "旧ホームでイベント/ルームへ" },
  未来: { href: "/gallery", label: "未来系展示を見る" },
  冒険: { href: "/gallery", label: "空撮/旅系の展示へ" },
  癒し: { href: "/gallery", label: "癒し系の作品へ" },
  挑戦: { href: "/count-abi", label: "伯爵の特訓メニュー" },
};

const TIERS: FortuneTier[] = ["大吉", "中吉", "小吉", "吉", "凶"];

export default function Oracle() {
  const [mood, setMood] = useState<Mood | null>(null);
  const [seed, setSeed] = useState<number | null>(null);

  // “占う”を押した瞬間のシードで結果固定（ページ内でブレない）
  const result = useMemo(() => {
    if (!mood || seed === null) return null;
    const idx = seededRandomIndex(seed, TIERS.length);
    const tier = TIERS[idx];
    const text = FORTUNE_LIBRARY[mood][tier];
    return { tier, text };
  }, [mood, seed]);

  return (
    <main className="min-h-[100dvh] bg-black text-white">
      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-14 md:py-20">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">🔮 今日の運勢</h1>
          <p className="mt-2 text-white/70">気分を選んで、扉をひらこう。</p>
        </header>

        {/* 気分ボタン */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {MOODS.map((m) => (
            <button
              key={m}
              onClick={() => setMood(m)}
              className={`px-4 py-2 rounded-full text-sm border transition ${
                mood === m
                  ? "bg-white text-black border-white"
                  : "border-white/30 text-white/90 hover:bg-white/10"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* 占うボタン */}
        <div className="mt-6 text-center">
          <button
            disabled={!mood}
            onClick={() => setSeed(Date.now())}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition ${
              mood
                ? "bg-white text-black hover:bg-white/90"
                : "bg-white/10 text-white/40 cursor-not-allowed"
            }`}
          >
            占う
          </button>
        </div>

        {/* 結果カード */}
        {result && mood && (
          <div className="mx-auto mt-8 max-w-xl overflow-hidden rounded-2xl border border-white/15 bg-white/5 p-5 ring-1 ring-white/10">
            <div className="mb-3 text-xs uppercase tracking-wider text-white/60">
              {mood} の運勢
            </div>
            <div className="mb-1 text-2xl font-bold">{result.tier}</div>
            <p className="text-white/85 leading-relaxed">{result.text}</p>

            {/* アクション */}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={RECOMMEND_PATH[mood].href}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
              >
                {RECOMMEND_PATH[mood].label}
                <span aria-hidden>→</span>
              </Link>

              {/* シェア用のコピー（将来NFT化予定） */}
              <button
                onClick={() =>
                  copyText(
                    `【MUSIAM 占い】\n気分: ${mood}\n運勢: ${result.tier}\n"${result.text}"`
                  )
                }
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
              >
                結果をコピー
              </button>

              {/* もう一度 */}
              <button
                onClick={() => setSeed(Date.now())}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
              >
                もう一度占う
              </button>
            </div>
          </div>
        )}

        {/* 補足 */}
        <p className="mt-8 text-center text-xs text-white/50">
          ※ 後日、結果をNFTとして保存できる機能を追加予定。
        </p>
      </section>
    </main>
  );
}

/** 乱数（固定シード版） */
function seededRandomIndex(seed: number, modulo: number) {
  // xorshift っぽい簡易シード
  let x = seed ^ 0x6D2B79F5;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return Math.abs(x) % modulo;
}

/** クリップボードコピー */
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    alert("占い結果をコピーしました。");
  } catch {
    alert("コピーに失敗しました。");
  }
}
