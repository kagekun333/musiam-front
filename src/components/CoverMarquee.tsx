// src/components/CoverMarquee.tsx
// ホームhero下: 307作品のカバーが静かに流れるコラージュ。「巨大な館」の物量を一目で伝える。
// Server Component — works.json をビルド時に読み、カバー付き作品から抽出する。
import Image from "next/image";
import Link from "next/link";
import { loadMergedWorksServer } from "@/lib/loadMergedWorksServer";
import "./cover-marquee.css";

const ROW_SIZE = 14;

export default async function CoverMarquee() {
  let covers: { id: string; title: string; cover: string }[] = [];
  try {
    const works = await loadMergedWorksServer();
    covers = works
      .filter((w) => w.cover && w.id != null && w.title)
      .map((w) => ({ id: String(w.id), title: String(w.title), cover: String(w.cover) }));
  } catch {
    return null;
  }
  if (covers.length < ROW_SIZE) return null;

  // 決定的シャッフル(ビルドごとに固定): id でソートしてから間引く
  const sorted = [...covers].sort((a, b) => a.id.localeCompare(b.id));
  const step = Math.max(1, Math.floor(sorted.length / (ROW_SIZE * 2)));
  const row1 = sorted.filter((_, i) => i % step === 0).slice(0, ROW_SIZE);
  const row2 = sorted.filter((_, i) => i % step === Math.floor(step / 2)).slice(0, ROW_SIZE);

  const renderRow = (items: typeof covers, reverse: boolean, rowKey: string) => (
    <div className={`marquee-row${reverse ? " marquee-row--reverse" : ""}`} aria-hidden={reverse}>
      <div className="marquee-track">
        {/* シームレスループのため2周分描画 */}
        {[0, 1].map((dup) =>
          items.map((c) => (
            <Link
              key={`${rowKey}-${dup}-${c.id}`}
              href={`/works/${encodeURIComponent(c.id)}`}
              className="marquee-item"
              tabIndex={dup === 1 || reverse ? -1 : 0}
              aria-label={dup === 0 && !reverse ? c.title : undefined}
            >
              <Image src={c.cover} alt={dup === 0 && !reverse ? `${c.title} カバー` : ""} fill sizes="96px" style={{ objectFit: "cover" }} />
            </Link>
          ))
        )}
      </div>
    </div>
  );

  return (
    <section className="marquee-wrap" aria-label="作品コレクション">
      <p className="marquee-caption">— 館内収蔵 350作品より —</p>
      {renderRow(row1, false, "r1")}
      {renderRow(row2, true, "r2")}
    </section>
  );
}
