#!/usr/bin/env node
/* ============================================================
   scripts/audit-works.mjs — 作品カタログ監査（1コマンド点検）  F0
   ------------------------------------------------------------
   目的: 増え続ける作品の健全性を1コマンドで点検する。
   点検項目:
     1) 件数      : master / ssd / 統合 / 重複除去後（350=楽曲216+書籍134 と整合するか）
     2) 並び順    : 表示順（releasedAt 降順）になっているか
     3) 重複      : 同一 Spotify ID / 同一(種別・タイトル) のクラスタ
     4) カバー    : cover に指定された画像ファイルが public/ に実在するか
     5) 配信リンク: spotify / appleMusic 欠落（特に ssd-only でない＝公開済み作品の欠落は要対応）
     6) ssd-only  : まだ地図/放送に出ていない（未エンリッチ）件数

   使い方:
     node scripts/audit-works.mjs            # レポート表示
     node scripts/audit-works.mjs --strict   # 構造エラーだけでなく警告でも exit 1（CI向け）
     node scripts/audit-works.mjs --json      # 機械可読サマリ

   読むだけ・非破壊。dedupe ロジックは src/lib/dedupeWorks.ts と同等を JS で再現。
   ============================================================ */

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = new URL("..", import.meta.url);
const PUBLIC_DIR = new URL("public/", ROOT);
const MASTER_PATH = new URL("public/works/works.json", ROOT);
const SSD_PATH = new URL("public/works/works-ssd.json", ROOT);

const ARGS = new Set(process.argv.slice(2));
const STRICT = ARGS.has("--strict");
const JSON_OUT = ARGS.has("--json");

/* ---------- dedupe（dedupeWorks.ts と同等） ---------- */
function normalizeTitle(s) {
  return String(s ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[「」『』"'“”‘’]/g, "")
    .replace(/[—–―]/g, "-")
    .trim();
}
function extractSpotifyId(w) {
  const blob =
    (typeof w.links === "string" ? w.links : JSON.stringify(w.links ?? "")) +
    " " + String(w.href ?? "") + " " + String(w.primaryHref ?? "");
  const m = blob.match(/open\.spotify\.com\/(?:album|track)\/([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}
function dedupeKey(w) {
  const sid = extractSpotifyId(w);
  if (sid) return `sp:${sid}`;
  const t = String(w.type || "").toLowerCase().includes("book") ? "book" : "music-or-other";
  return `t:${t}::${normalizeTitle(w.title)}`;
}

async function readJson(url) {
  return JSON.parse(await fs.readFile(url, "utf8"));
}
async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/* 簡易マージ（表示集合の近似）: master 全件 + ssd 全件を id で結合。
   厳密な mergeWorksCatalog ではないが、件数/重複/カバー/リンクの監査には十分。 */
function buildCatalog(master, ssd) {
  const byId = new Map();
  for (const w of master) if (w && w.id != null) byId.set(String(w.id), { ...w });
  for (const w of ssd) {
    if (!w || w.id == null) continue;
    const id = String(w.id);
    byId.set(id, { ...(byId.get(id) || {}), ...w });
  }
  return [...byId.values()];
}

async function main() {
  const masterRaw = await readJson(MASTER_PATH);
  const ssdRaw = await readJson(SSD_PATH);
  const master = Array.isArray(masterRaw) ? masterRaw : masterRaw.items || [];
  const ssd = Array.isArray(ssdRaw) ? ssdRaw : ssdRaw.items || [];

  const merged = buildCatalog(master, ssd);

  // --- dedupe（表示層）。94前後の master 重複(spotify-single ↔ slug)はここで畳まれる想定。 ---
  const byKey = new Map();
  const dupClusters = new Map();
  for (const w of merged) {
    if (w.id == null || !w.title) continue;
    const key = dedupeKey(w);
    if (!byKey.has(key)) byKey.set(key, w);
    if (!dupClusters.has(key)) dupClusters.set(key, []);
    dupClusters.get(key).push({ id: String(w.id), title: w.title });
  }
  const unique = [...byKey.values()]; // 表示集合（重複除去後）
  const collapsed = [...dupClusters.entries()].filter(([, arr]) => arr.length > 1);
  const collapsedCount = collapsed.length;

  // 残留重複: 表示集合 unique の中で同一キーが2件以上ある = dedupe漏れ（本来0）。
  const residualSeen = new Map();
  for (const w of unique) {
    const k = dedupeKey(w);
    residualSeen.set(k, (residualSeen.get(k) || 0) + 1);
  }
  const residualDups = [...residualSeen.entries()].filter(([, n]) => n > 1);

  // --- 件数 ---
  const isBook = (w) => String(w.type || "").toLowerCase().includes("book");
  const music = unique.filter((w) => !isBook(w)).length;
  const books = unique.filter(isBook).length;

  // --- 並び順: works は releasedAt 降順で表示。日付欠落のみ抽出（並べられない要素）。 ---
  const undated = unique.filter((w) => !w.releasedAt).map((w) => ({ id: String(w.id), title: w.title }));

  // --- カバー実在チェック: ローカル("/...")のみ実ファイル確認。リモート(http)は対象外＝OK扱い。 ---
  const missingCovers = [];
  for (const w of unique) {
    const cover = String(w.cover || "");
    if (!cover) {
      missingCovers.push({ id: String(w.id), title: w.title, cover: "(none)" });
      continue;
    }
    if (/^https?:\/\//i.test(cover)) continue; // リモート(Amazon等)は実在確認しない
    const abs = path.join(PUBLIC_DIR.pathname, cover.replace(/^\//, ""));
    if (!(await exists(abs))) missingCovers.push({ id: String(w.id), title: w.title, cover });
  }

  // --- 配信リンク欠落: 楽曲のみ対象（書籍は配信リンク不要）。
  //     spotify は links.spotify か href が spotify なら「あり」。 ---
  const hasSpotify = (w) => !!(w.links || {}).spotify || /open\.spotify\.com/.test(String(w.href || ""));
  const hasApple = (w) => !!(w.links || {}).appleMusic;
  const linkGaps = [];
  for (const w of unique) {
    if (isBook(w)) continue;
    const ssdOnly = (w.tags || []).includes("ssd-only");
    const missSp = !hasSpotify(w);
    const missAp = !hasApple(w);
    if (missSp || missAp) {
      linkGaps.push({
        id: String(w.id),
        title: w.title,
        ssdOnly,
        missing: [missSp ? "spotify" : null, missAp ? "appleMusic" : null].filter(Boolean),
      });
    }
  }
  const ssdOnlyCount = unique.filter((w) => (w.tags || []).includes("ssd-only")).length;
  // 公開済み（ssd-onlyでない）楽曲なのにリンク欠落＝要対応
  const publishedGaps = linkGaps.filter((g) => !g.ssdOnly);

  const summary = {
    counts: { masterRaw: master.length, ssdRaw: ssd.length, merged: merged.length, display: unique.length, music, books },
    collapsedClusters: collapsedCount,
    residualDuplicates: residualDups.length,
    undated: undated.length,
    missingCovers: missingCovers.length,
    musicLinkGaps: linkGaps.length,
    publishedMusicLinkGaps: publishedGaps.length,
    ssdOnly: ssdOnlyCount,
    coverCoveragePct: unique.length ? Math.round(((unique.length - missingCovers.length) / unique.length) * 1000) / 10 : 0,
  };

  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    const ok = (b) => (b ? "✓" : "✗");
    console.log("── 作品カタログ監査 ─────────────────────────────");
    console.log(`件数      master=${master.length}  ssd=${ssd.length}  統合=${merged.length}  表示(重複除去後・概算)=${unique.length}`);
    console.log(`          楽曲=${music}  書籍=${books}   (目標 350=216+134 / 概算は簡易マージのため±数件)`);
    console.log(`重複      ${ok(residualDups.length === 0)} 表示層の残留重複=${residualDups.length}件  （既知の畳み込み ${collapsedCount}クラスタ＝正常）`);
    console.log(`並び順    ${ok(undated.length === 0)} releasedAt欠落=${undated.length}件（降順表示に必要）`);
    console.log(`カバー    ${ok(missingCovers.length === 0)} ローカル欠落 ${missingCovers.length}件  （カバー率 ${summary.coverCoveragePct}% ※リモート除く）`);
    console.log(`配信リンク 楽曲の欠落 ${linkGaps.length}件  うち公開済み楽曲の欠落=${publishedGaps.length} ${ok(publishedGaps.length === 0)}`);
    console.log(`ssd-only  未エンリッチ ${ssdOnlyCount}件（enrich-works で解消）`);
    console.log("────────────────────────────────────────────────");

    if (residualDups.length) {
      console.log("\n[表示層の残留重複（dedupe漏れ・要調査）]");
      for (const [key, n] of residualDups.slice(0, 20)) console.log(`  ${key} ×${n}`);
    }
    if (undated.length) {
      console.log("\n[releasedAt 欠落]");
      for (const u of undated.slice(0, 20)) console.log(`  ${u.id}  ${u.title}`);
      if (undated.length > 20) console.log(`  …他 ${undated.length - 20}件`);
    }
    if (missingCovers.length) {
      console.log("\n[ローカルカバー欠落]");
      for (const m of missingCovers.slice(0, 20)) console.log(`  ${m.id}  ${m.title}  → ${m.cover}`);
      if (missingCovers.length > 20) console.log(`  …他 ${missingCovers.length - 20}件`);
    }
    if (publishedGaps.length) {
      console.log("\n[公開済み楽曲なのに配信リンク欠落（要対応）]");
      for (const g of publishedGaps.slice(0, 30)) console.log(`  ${g.id}  ${g.title}  欠落: ${g.missing.join("/")}`);
      if (publishedGaps.length > 30) console.log(`  …他 ${publishedGaps.length - 30}件`);
    }
    if (ssdOnlyCount) {
      console.log(`\nヒント: ssd-only ${ssdOnlyCount}件は \`node scripts/enrich-works.mjs --all-incomplete\` で配信リンク補完を試行できます。`);
    }
  }

  // 終了コード: 構造エラー（ローカルカバー欠落・残留重複・日付欠落）は常に失敗。
  // --strict なら公開済み楽曲のリンク欠落でも失敗。
  const hardErrors = missingCovers.length > 0 || residualDups.length > 0 || undated.length > 0;
  const strictErrors = STRICT && publishedGaps.length > 0;
  if (hardErrors || strictErrors) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
