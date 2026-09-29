import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadMergedWorksServer } from "../src/lib/loadMergedWorksServer";
import {
  buildRecallCatalogCandidates,
  fuzzyRecallWork,
  isWorkRecallRequest,
  parseRecallModelDecision,
  recallReplyText,
} from "../src/lib/chat-work-recall";

(async () => {
  const repo = process.cwd();
  const worksPage = fs.readFileSync(path.join(repo, "src/app/works/page.tsx"), "utf8");
  const workDetail = fs.readFileSync(path.join(repo, "src/app/works/[id]/page.tsx"), "utf8");

  assert.match(worksPage, /loadLiveMergedWorksServer/);
  assert.doesNotMatch(worksPage, /loadMergedWorksServer/);
  assert.match(worksPage, /dynamic = "force-dynamic"/);
  assert.match(workDetail, /loadLiveMergedWorksServer/);
  assert.doesNotMatch(workDetail, /loadMergedWorksServer/);
  assert.match(workDetail, /dynamic = "force-dynamic"/);
  assert.doesNotMatch(workDetail, /dynamicParams = false/);
  assert.doesNotMatch(workDetail, /generateStaticParams/);
  assert.match(workDetail, /function publicCoverUrl/);

  const works = await loadMergedWorksServer();
  const sesoko = works.find((work) => String(work.title) === "Sesoko Island");
  assert.ok(sesoko, "Sesoko Island must exist in the static canonical catalog");
  assert.equal(String(sesoko?.id), "apple-album-6800129451");

  const query = "伯爵の瀬底島の曲なんだっけ？";
  assert.equal(isWorkRecallRequest(query), true);

  const candidates = buildRecallCatalogCandidates(works, query);
  assert.ok(candidates.some((item) => item.workId === "apple-album-6800129451" && item.title === "Sesoko Island"));

  const valid = parseRecallModelDecision(
    '{"workId":"apple-album-6800129451","confidence":"high"}',
    candidates,
  );
  assert.deepEqual(valid, { workId: "apple-album-6800129451", confidence: "high" });

  const invented = parseRecallModelDecision(
    '{"workId":"invented-work","confidence":"high"}',
    candidates,
  );
  assert.deepEqual(invented, { workId: null, confidence: "none" });

  const typo = fuzzyRecallWork("Sesoko Islanの曲なんだっけ？", works);
  assert.equal(typo.status, "exact");
  if (typo.status === "exact") assert.equal(String(typo.work.id), "apple-album-6800129451");

  const generic = fuzzyRecallWork("島の曲なんだっけ？", works);
  assert.notEqual(generic.status, "exact");

  assert.equal(
    recallReplyText("ja", "Sesoko Island", "high", true),
    "それは「Sesoko Island」ですね。聴きますか？",
  );

  console.log(JSON.stringify({
    verdict: "COUNT_CHAT_RECALL_AND_LIVE_WORKS=PASS",
    staticCatalogCount: works.length,
    recallCandidateCount: candidates.length,
    sesokoWorkId: String(sesoko?.id),
  }));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
