import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import editorial from '../../public/works/editorial-knowledge.json';
import review from '../../ops/product/owner-source-knowledge-tranche-v2.json';
import ranking from '../../ops/product/owner-source-knowledge-coverage-v1.json';
import { loadMergedWorksServer } from '../../src/lib/loadMergedWorksServer';
import { buildWorkKnowledgeEnvelope, buildLunaEvidencePack } from '../../src/lib/chat-release-knowledge';
import { getEditorialKnowledgeForWorkId } from '../../src/lib/editorial-knowledge';

(async () => {
  const works = await loadMergedWorksServer();
  let explicit = 0;
  for (const evidence of review.works) {
    const row = getEditorialKnowledgeForWorkId(evidence.workId);
    assert.ok(row);
    const work = works.find(w => String(w.id) === evidence.workId);
    assert.ok(work, evidence.workId);
    assert.equal(work.type, evidence.catalogType);
    assert.equal(row.sourceClass, 'OWNER_PUBLISHED_MEDIA');
    assert.equal(row.sourceHref, evidence.sourceHref);
    const source = fs.readFileSync(evidence.sourceFile);
    assert.equal(crypto.createHash('sha256').update(source).digest('hex'), row.sourceFileHash);
    assert.equal(row.sourceFileHash, evidence.sourceFileHash);
    assert.match(source.toString(), /\*\*ABI伯爵\*\*/);
    if (evidence.bindingEvidence === 'SAME_ASIN_B0DXL5VR8Z') {
      assert.ok(evidence.catalogIdentityHref.includes('/dp/B0DXL5VR8Z'));
      assert.ok(source.toString().includes('/dp/B0DXL5VR8Z'));
    }
    assert.equal(row.ownerIntentStatus, evidence.ownerIntentStatus);
    const isExplicit = evidence.ownerIntentStatus === 'EXPLICIT';
    explicit += Number(isExplicit);
    assert.equal(Boolean(row.ownerIntentSummaryJa), isExplicit);
    const envelope = buildWorkKnowledgeEnvelope(work!);
    assert.equal(envelope?.editorial?.ownerIntentStatus, evidence.ownerIntentStatus);
    assert.equal(envelope?.unknowns.includes('ownerProductionIntent'), !isExplicit);
    const pack = JSON.parse(buildLunaEvidencePack(work!)!);
    assert.equal(pack.editorialPolicy.ownerIntentMayBeAttributedToOwner, isExplicit);
    assert.equal(pack.editorialPolicy.biographicalFabricationForbidden, true);
    const fake = { ...work!, id: `fake-v2-${evidence.workId}`, catalogAliases: [] };
    assert.equal(buildWorkKnowledgeEnvelope(fake)?.editorial, null);
    assert.ok(!ranking.nextRecommended.some(r => r.workId === evidence.workId));
  }
  assert.equal(review.works.length, 14);
  assert.equal(explicit, 8);
  assert.equal(review.works.length - explicit, 6);
  assert.equal(editorial.items.length, 52);
  assert.equal(ranking.coverage.editorialRows, 52);
  const ids = new Set<string>();
  for (const row of editorial.items) {
    for (const id of new Set([row.workId, ...('workIds' in row ? row.workIds : [])])) {
      assert.ok(!ids.has(id), `ID shared across editorial rows: ${id}`);
      ids.add(id);
    }
  }
  for (const deferred of review.deferred) assert.equal(getEditorialKnowledgeForWorkId(deferred.workId), null);
  console.log(JSON.stringify({ verdict: 'OWNER_SOURCE_KNOWLEDGE_COVERAGE_V2=PASS_LOCAL', added: 14, explicit: 8, notExplicit: 6, sourceLetters: new Set(review.works.map(w => w.sourceFile)).size }));
})().catch(error => { console.error(error); process.exit(1); });
