import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import editorial from '../../public/works/editorial-knowledge.json';
import review from '../../ops/product/owner-source-knowledge-tranche-v2.json';
import ranking from '../../ops/product/owner-source-knowledge-coverage-v1.json';
import { loadMergedWorksServer } from '../../src/lib/loadMergedWorksServer';
import { buildWorkKnowledgeEnvelope, buildLunaEvidencePack } from '../../src/lib/chat-release-knowledge';
import { getEditorialKnowledgeForWorkId, resolveEditorialKnowledgeFromQuery } from '../../src/lib/editorial-knowledge';
import { projectExhibitionWorks } from '../../src/lib/exhibition-projection';

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
    for (const id of new Set([row.workId, ...('workIds' in row ? row.workIds ?? [] : [])])) {
      assert.ok(!ids.has(id), `ID shared across editorial rows: ${id}`);
      ids.add(id);
    }
  }
  const providerDuplicateBindings = [
    { id: 'spotify-single-6Xf0QNYo1QDMSXb9zKmPxU', expectedWorkId: 'abi9pro-216', title: 'ABI9PRO' },
    { id: 'spotify-single-749Tw6EZCBlZM52tE2JVYt', expectedWorkId: 'pan-143', title: 'Pan' },
    { id: 'spotify-single-4UmMbxajVR7P6Y2PkUlWcz', expectedWorkId: 'main-character-energy-218', title: 'Main Character Energy' },
    { id: 'spotify-single-1OZ2YPhTCoARTJhDvNMGFR', expectedWorkId: 'item-215', title: '流れ往くままに！' },
    { id: 'spotify-single-4GtdD71vSh1NCycz68o3Qq', expectedWorkId: 'drey-fugen-harmonia-mundi-211', title: 'Drey Fugen: Harmonia Mundi' },
    { id: 'spotify-single-1prDtJ6sGIsTnWf7WNz01k', expectedWorkId: 'coffee-love-161', title: 'Coffee Love' },
    { id: 'engine-163', expectedWorkId: 'spotify-album-3f4tKu7hRTK4QvMglr0Vp6', title: 'ENGINE' },
    { id: 'spotify-single-75DrnUJQGstoPG5xEWXEbW', expectedWorkId: 'eagle-eye-183', title: 'Eagle Eye' },
  ] as const;

  for (const binding of providerDuplicateBindings) {
    const row = getEditorialKnowledgeForWorkId(binding.id);
    assert.ok(row, `Missing V2 provider duplicate binding: ${binding.id}`);
    assert.equal(String(row.workId), binding.expectedWorkId, `Wrong V2 provider duplicate row: ${binding.id}`);
    const work = works.find(w => String(w.id) === binding.id);
    assert.ok(work, `Missing V2 provider duplicate catalog work: ${binding.id}`);
    assert.ok(buildWorkKnowledgeEnvelope(work!)?.editorial?.summaryJa, `V2 duplicate missing envelope: ${binding.id}`);
    const projected = projectExhibitionWorks([work!], undefined, '2026-09-30').works[0];
    assert.ok(String(projected?.description ?? '').trim(), `V2 duplicate missing Exhibition description: ${binding.id}`);
  }

  const panResolved = resolveEditorialKnowledgeFromQuery('Panってどんな曲？', works);
  assert.equal(String(panResolved?.row.title), 'Pan');
  assert.equal(String(panResolved?.work.id), 'pan-143');
  const meResolved = resolveEditorialKnowledgeFromQuery('MEはなんで作ったの？', works);
  assert.equal(String(meResolved?.row.title), 'ME');
  assert.equal(String(meResolved?.work.id), 'spotify-single-1xHCXzgoJ7SLYL78n3IDrZ');
  assert.equal(resolveEditorialKnowledgeFromQuery('pandaみたいな曲ある？', works), null);
  assert.equal(resolveEditorialKnowledgeFromQuery('recommend me something', works), null);

  for (const deferred of review.deferred) assert.equal(getEditorialKnowledgeForWorkId(deferred.workId), null);
  console.log(JSON.stringify({ verdict: 'OWNER_SOURCE_KNOWLEDGE_COVERAGE_V2=PASS_LOCAL', added: 14, explicit: 8, notExplicit: 6, sourceLetters: new Set(review.works.map(w => w.sourceFile)).size, providerDuplicateBindings: providerDuplicateBindings.length, shortReviewedTitles: ['Pan','ME'] }));
})().catch(error => { console.error(error); process.exit(1); });
