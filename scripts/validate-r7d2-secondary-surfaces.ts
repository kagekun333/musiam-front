import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { dedupeWorks } from "../src/lib/dedupeWorks";
import { getLetters, groupLettersByMonth } from "../src/lib/letters";
import { loadMergedWorksServer } from "../src/lib/loadMergedWorksServer";
import { getPrimaryPublicHref } from "../src/lib/work-links";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");
let checks = 0;

function check(condition: unknown, message: string): asserts condition {
  checks++;
  assert.ok(condition, message);
}

async function main() {
  const dedupeSource = read("src/lib/dedupeWorks.ts");
  const home = read("src/app/page.tsx");
  const realmPage = read("src/app/realm/[region]/page.tsx");
  const realmHome = read("src/components/realm/RealmHome.tsx");
  const lettersSource = read("src/lib/letters.ts");
  const lettersList = read("src/app/letters/page.tsx");
  const lettersDetail = read("src/app/letters/[slug]/page.tsx");
  const scrollFx = read("src/components/letters/LettersScrollFx.tsx");
  const rootLayout = read("src/app/layout.tsx");
  const broadcast = read("src/components/broadcast/BroadcastBar.tsx");
  const nowPlaying = read("src/app/api/now-playing/route.ts");
  const todaysPick = read("src/app/api/todays-pick/route.ts");
  const oraclePage = read("src/app/oracle/page.tsx");
  const vercel = read("vercel.json");

  const titleFixture = dedupeWorks([
    { id: "letter-a", title: "Same title", type: "music" },
    { id: "letter-b", title: "Same title", type: "music" },
  ]);
  check(titleFixture.length === 2, "same-title works without an explicit shared provider ID must remain distinct");
  const spotifyFixture = dedupeWorks([
    { id: "spotify-single-a", title: "One", type: "music", links: { spotify: "https://open.spotify.com/album/abc123" } },
    { id: "canonical-a", title: "Different display name", type: "music", links: { spotify: "https://open.spotify.com/album/abc123" } },
  ]);
  check(spotifyFixture.length === 1, "the same recorded Spotify release ID may dedupe a display duplicate");
  check(spotifyFixture[0].id === "canonical-a", "the existing canonical-looking ID preference remains deterministic");
  check(dedupeSource.includes('return sid ? `sp:${sid}` : `id:${String(w.id ?? "")}`;'), "display dedupe must fall back to stable work ID, not title");
  check(!dedupeSource.includes('return `t:${t}::${normalizeTitle(w.title)}`;'), "title equality must not be a display identity key");

  const canonical = await loadMergedWorksServer();
  const canonicalIds = canonical.map((work) => String(work.id ?? "").trim());
  check(canonical.length > 0, "canonical server projection must be non-empty");
  check(canonicalIds.every(Boolean), "canonical server projection must have stable work IDs");
  check(new Set(canonicalIds).size === canonicalIds.length, "canonical server projection must not duplicate stable work IDs");
  check(home.includes('loadMergedWorksServer'), "Home must use the canonical server projection");
  check(home.includes('`/works/${encodeURIComponent(String(w.id))}`'), "Home atlas work routes must be stable-ID routes");
  check(realmPage.includes('loadMergedWorksServer') && realmPage.includes('assignRegionId(w)'), "Realm regions must derive from canonical works and region rules");
  check(realmPage.includes('href: `/works/${encodeURIComponent(String(w.id))}`'), "Realm work routes must be stable-ID routes");
  check(fs.existsSync(path.join(root, "src/app/classic/page.tsx")), "/classic fallback must remain present");
  check(realmHome.includes('sessionStorage.getItem("realm:entered")') && realmHome.includes('sessionStorage.setItem("realm:entered", "1")'), "Realm entered state must remain session-scoped experience state");
  check(realmHome.includes('try {') && realmHome.includes('setMutedState(isMuted())'), "Realm preference/storage failures must remain fail-safe");
  check(realmHome.includes('aria-label="伯爵MUSIAM 領土天球図"') && realmHome.includes('onPointerCancel={onUp}'), "Realm keeps its basic accessible navigation and safe pointer cleanup");

  const letters = await getLetters();
  check(letters.length === fs.readdirSync(path.join(root, "content/letters")).filter((file) => file.endsWith(".md")).length, "Letters loader must parse every current Markdown letter");
  check(letters.length > 0 && new Set(letters.map((letter) => letter.slug)).size === letters.length, "Letters need unique current slugs");
  check(letters.every((letter, index) => index === 0 || letters[index - 1].date >= letter.date), "Letters must remain newest-first chronologically");
  check(lettersSource.includes('title: meta.title || f') && lettersSource.includes('date: meta.date || ""'), "invalid or partial Letter metadata must remain fail-safe");
  check(lettersSource.includes('hasSponsored: detectSponsored(body)') && lettersList.includes('{l.hasSponsored && ('), "PR labels must be metadata/body-marker driven");
  check(lettersDetail.includes('getAdjacentLetters(slug)') && lettersDetail.includes('href={`/letters/${prev.slug}`}'), "Letter detail must retain adjacent revisit navigation");
  check(groupLettersByMonth(letters).every((group) => group.letters.length > 0), "Letter month navigation must be built from current letters");
  check(scrollFx.includes('Number.isFinite(y) && y > 0') && scrollFx.includes('catch {'), "scroll restoration must reject invalid storage and tolerate storage failure");
  check(scrollFx.includes('window.location.pathname === "/letters"') && scrollFx.includes('history.scrollRestoration = "manual"'), "scroll restoration must constrain restores to the list route and avoid browser-race ambiguity");
  check(!/loadMergedWorks|mergeWorksCatalog|dedupeWorks/.test(lettersSource), "Letters do not infer catalog identity from title similarity");
  const letterWorkIds = letters.flatMap((letter) =>
    Array.from(letter.body.matchAll(/\]\(\/works\/([^\s)]+)\)|href="\/works\/([^"]+)"/g), (match) => {
      const encoded = match[1] || match[2];
      try {
        return decodeURIComponent(encoded);
      } catch {
        return encoded;
      }
    }),
  );
  check(letterWorkIds.every((id) => canonicalIds.includes(id)), "every explicit Letters /works/<id> link must resolve by current stable work ID");

  check(rootLayout.includes('<BroadcastBar />'), "BroadcastBar must remain mounted by the root layout");
  check(nowPlaying.includes('loadMergedWorksServer') && nowPlaying.includes('const id = String(w.id ?? "").trim()'), "Now Playing must use the canonical server projection and stable work IDs");
  check(nowPlaying.includes('getPrimaryPublicHref') && nowPlaying.includes('getMusicStreamingLinks'), "Now Playing must use recorded public/streaming link adapters");
  check(!nowPlaying.includes('https://open.spotify.com/${') && !nowPlaying.includes('https://music.apple.com/${'), "Now Playing must not fabricate streaming URLs");
  const streamableCanonical = canonical.filter((work) => {
    const type = String(work.type ?? "").toLowerCase();
    const music = type === "music" || /album|track|song/.test(type) || (!type.includes("book") && type !== "");
    return music && Boolean(String(work.id ?? "").trim()) && Boolean(String(work.title ?? "").trim()) && Boolean(String(work.cover ?? "").trim()) && Boolean(getPrimaryPublicHref(work));
  });
  check(streamableCanonical.length > 0, "Now Playing has canonical stable-ID candidates with recorded public links");
  check(broadcast.includes('playback_update') && broadcast.includes('!event.data.isPaused && !event.data.isBuffering'), "player-visible state must not be reported as playback without an actual playback update");
  check(broadcast.includes('NOW FEATURED') && broadcast.includes('PLAYER READY') && broadcast.includes('NOW PLAYING'), "Broadcast labels must distinguish featured, player-ready, and actual playback states");
  check(!broadcast.includes('.play(') && broadcast.includes('onClick={() => (isPlayerOpen ? setPlayerOpenFor(null) : openInlinePlayer())}'), "Broadcast must not autoplay on page load and only opens the player from user gesture");
  check(broadcast.includes('localStorage.getItem(STORAGE_KEY)') && broadcast.includes('localStorage.setItem(STORAGE_KEY'), "Broadcast collapsed state remains a local UI preference");

  check(todaysPick.includes('loadMergedWorksServer') && todaysPick.includes('getPrimaryPublicHref'), "TodaysPick remains on the canonical server projection with recorded public links");
  check(canonicalIds.every(Boolean), "TodaysPick's current canonical input has no title-as-ID fallback requirement");
  check(oraclePage.includes('redirect("/")') && !vercel.includes('/api/cron/daily-oracle'), "daily Oracle remains inactive and unscheduled");
  check(fs.existsSync(path.join(root, "src/app/api/subscribe/route.ts")) && fs.existsSync(path.join(root, "src/app/api/push/subscribe/route.ts")) && fs.existsSync(path.join(root, "src/app/api/push/send/route.ts")), "subscription and push routes are inventory-only filesystem surfaces");

  console.log(JSON.stringify({
    status: "PASS",
    checksPassed: checks,
    canonicalRuntimeWorks: canonical.length,
    lettersCurrentFilesystemCount: letters.length,
    explicitLettersWorkLinks: letterWorkIds.length,
    streamableCanonicalCandidates: streamableCanonical.length,
    subscriptionStatus: "AVAILABLE_BUT_UNVERIFIED",
    pushStatus: "AVAILABLE_BUT_UNVERIFIED",
    dailyOracleStatus: "DISABLED",
    networkRequests: 0,
    productionParity: "UNVERIFIED",
  }, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack || error.message : "R7D2_VALIDATION_FAILED");
  process.exitCode = 1;
});
