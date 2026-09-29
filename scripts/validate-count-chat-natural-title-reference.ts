import assert from "node:assert/strict";
import { resolveCatalogIdentity } from "../src/lib/chat-recommendation-core";

const works: any[] = [
  {
    id: "apple-album-6808806776",
    title: "Sun Without a Map",
    type: "music",
    links: { appleMusic: "https://music.apple.com/us/album/sun-without-a-map-single/6808806776" },
  },
  { id: "short-me", title: "ME", type: "music" },
  { id: "love-work", title: "Love", type: "music" },
];

function exact(query: string, expectedId: string) {
  const result = resolveCatalogIdentity(query, works);
  assert.equal(result.status, "exact", query);
  if (result.status === "exact") assert.equal(String(result.work.id), expectedId, query);
}

exact("Sun Without a Map", "apple-album-6808806776");
exact("「Sun Without a Map」ってどんな曲？", "apple-album-6808806776");
exact("Sun Without a Mapってどんな曲？", "apple-album-6808806776");
exact("Sun Without a Mapについて教えて", "apple-album-6808806776");
exact("Sun Without a Mapを聴きたい", "apple-album-6808806776");
exact("Tell me about Sun Without a Map", "apple-album-6808806776");

assert.equal(resolveCatalogIdentity("MEについて教えて", works).status, "none");
exact("「ME」について教えて", "short-me");
assert.equal(resolveCatalogIdentity("recommend me something", works).status, "none");
assert.equal(resolveCatalogIdentity("I love your music", works).status, "none");

console.log("COUNT_CHAT_NATURAL_TITLE_REFERENCE=PASS");
