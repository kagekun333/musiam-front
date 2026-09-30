import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateCandidate, scoreCandidate, buildDesk } from './europe-opportunity.mjs';

const AS_OF = '2026-09-30T12:00:00Z';
const metric = (value, status = 'ESTIMATE') => ({ value, status, note: 'Offline test scenario, not demand proof', sourceUrl: 'https://example.com/item', accessedAt: AS_OF });
const unknown = () => ({ value: null, status: 'UNKNOWN', note: 'No evidence', sourceUrl: null, accessedAt: null });
function fixture(id = 'book-1') {
  return {
    schemaVersion: '1.0.0', id, product: { name: 'Art book', category: 'books-art' }, country: 'FR',
    source: { url: 'https://example.com/item', accessedAt: AS_OF, publishedAt: null, kind: 'publisher' },
    facts: [{ field: 'listedTitle', value: 'Art book', status: 'VERIFIED', sourceUrl: 'https://example.com/item', accessedAt: AS_OF }],
    acquisitionPrice: metric(20, 'VERIFIED'), referencePrice: metric(100, 'VERIFIED'),
    costs: { fees: metric(5), shipping: metric(8), tax: metric(6), customs: metric(2), packaging: metric(3), returnReserve: metric(4) },
    expectedGrossMargin: metric(.99), authenticityRisk: metric(.1), returnRisk: metric(.2), liquidity: metric(.8), availabilityConfidence: metric(.9), contentValue: metric(.95), timeToSellDays: metric(30),
    capitalRequirement: { speculativeInventory: 0, customerPrefundingRequired: true, purchaseExposure: metric(48) },
    nextAction: 'Recheck the source before a manual decision',
    exclusion: { regulated: false, unverifiableCounterfeit: false, deceptiveClaims: false },
    routes: { editorial: 'Draft a book note', sourcing: 'Manual sourcing review', productCandidate: 'Candidate only' },
  };
}

test('derives gross margin and contribution from all EUR costs, ignoring supplied margin', () => {
  const result = scoreCandidate(fixture(), AS_OF);
  assert.equal(result.validation.valid, true);
  assert.equal(result.commercialStatus, 'REVIEW_REQUIRED');
  assert.equal(result.economics.grossProfit, 80);
  assert.equal(result.economics.totalCosts, 28);
  assert.equal(result.economics.netContribution, 52);
  assert.equal(result.economics.scenarioGrossMargin, .8);
  assert.equal(result.economics.scenarioNetContributionMargin, .52);
  assert.equal(result.economics.storedExpectedGrossMargin, .99);
  assert.deepEqual(result.requiredBeforePurchase, ['liveRecheck', 'customerPrefundingPaymentConfirmation', 'manualAuthorization']);
});

test('unknown reference and every unknown cost propagate, never becoming zero', () => {
  for (const name of ['referencePrice', ...Object.keys(fixture().costs)]) {
    const c = fixture();
    if (name === 'referencePrice') c.referencePrice = unknown(); else c.costs[name] = unknown();
    const r = scoreCandidate(c, AS_OF);
    assert.equal(r.commercialStatus, 'HOLD', name);
    assert.equal(r.economics.netContribution, null, name);
    assert.equal(r.economics.scenarioNetContributionMargin, null, name);
    if (name === 'referencePrice') assert.equal(r.economics.grossProfit, null);
    else assert.equal(r.economics.totalCosts, null);
  }
});

test('high margin cannot override risk, liquidity or availability gates', () => {
  for (const [name, value] of [['authenticityRisk', .26], ['returnRisk', .51], ['liquidity', .39], ['availabilityConfidence', .49]]) {
    const c = fixture(); c[name] = metric(value);
    const r = scoreCandidate(c, AS_OF);
    assert.equal(r.commercialStatus, 'HOLD', name);
    assert.equal(r.economics.scenarioGrossMargin, .8);
    assert.equal(r.editorialScore, 95);
    assert.ok(r.gates.some(g => g.startsWith(name)));
  }
});

test('unknown gate inputs hold and threshold equality passes', () => {
  for (const name of ['authenticityRisk', 'returnRisk', 'liquidity', 'availabilityConfidence']) {
    const c = fixture(); c[name] = unknown();
    assert.equal(scoreCandidate(c, AS_OF).commercialStatus, 'HOLD');
  }
  const c = fixture();
  c.authenticityRisk.value = .25; c.returnRisk.value = .5; c.liquidity.value = .4; c.availabilityConfidence.value = .5;
  assert.equal(scoreCandidate(c, AS_OF).commercialStatus, 'REVIEW_REQUIRED');
});

test('freshness gate uses explicit asOf and covers facts and economic evidence', () => {
  const boundary = fixture(); boundary.source.accessedAt = '2026-09-29T12:00:00Z';
  assert.equal(scoreCandidate(boundary, AS_OF).commercialStatus, 'REVIEW_REQUIRED');
  for (const target of ['source', 'fact', 'cost']) {
    const c = fixture();
    (target === 'source' ? c.source : target === 'fact' ? c.facts[0] : c.costs.returnReserve).accessedAt = '2026-09-29T11:59:59Z';
    assert.equal(scoreCandidate(c, AS_OF).commercialStatus, 'HOLD', target);
  }
  const future = fixture(); future.source.accessedAt = '2026-09-30T12:00:01Z';
  assert.equal(scoreCandidate(future, AS_OF).commercialStatus, 'HOLD');
  const futurePublication = fixture(); futurePublication.source.publishedAt = '2026-10-01T12:00:00Z';
  assert.equal(scoreCandidate(futurePublication, AS_OF).commercialStatus, 'HOLD');
});

test('nonpositive contribution and zero reference hold without division by zero', () => {
  const c = fixture(); c.referencePrice.value = 25;
  assert.equal(scoreCandidate(c, AS_OF).commercialStatus, 'HOLD');
  c.referencePrice.value = 0;
  const r = scoreCandidate(c, AS_OF);
  assert.equal(r.economics.scenarioGrossMargin, null);
  assert.equal(r.economics.scenarioNetContributionMargin, null);
});

test('zero inventory, prefunding and exclusions are hard validation boundaries', () => {
  const mutations = [c => c.capitalRequirement.speculativeInventory = 1, c => c.capitalRequirement.customerPrefundingRequired = false,
    ...['regulated', 'unverifiableCounterfeit', 'deceptiveClaims'].map(k => c => c.exclusion[k] = true),
    c => c.product.category = 'alcohol', c => c.product.category = 'cosmetics'];
  for (const mutate of mutations) {
    const c = fixture(); mutate(c);
    assert.equal(validateCandidate(c).valid, false);
    assert.equal(scoreCandidate(c, AS_OF).commercialStatus, 'REJECTED');
  }
});

test('malformed metrics and evidence fail closed', () => {
  const mutations = [c => c.country = 'ZZ', c => c.source.url = 'http://example.com', c => c.source.url = 'https://secret@example.com',
    c => c.source.accessedAt = 'yesterday', c => c.acquisitionPrice.value = NaN, c => c.authenticityRisk.value = 1.1,
    c => c.costs.tax.value = -1, c => { c.costs.fees = unknown(); c.costs.fees.value = 0; }, c => c.facts[0].status = 'ASSUMPTION',
    c => { c.referencePrice = metric(100, 'VERIFIED'); c.referencePrice.sourceUrl = null; }, c => c.capitalRequirement.purchaseExposure = null,
    c => { c.costs.fees = unknown(); c.costs.fees.sourceUrl = 'https://example.com'; }, c => c.source.accessedAt = '2026-02-30T12:00:00Z'];
  for (const mutate of mutations) { const c = fixture(); mutate(c); assert.equal(validateCandidate(c).valid, false); }
  for (const c of [null, [], {}, 'item']) assert.equal(validateCandidate(c).valid, false);
  assert.throws(() => buildDesk([], 'bad-date'), /asOf/);
});

test('money is EUR; mixed explicit currencies are rejected', () => {
  const c = fixture(); c.acquisitionPrice.currency = 'EUR';
  assert.equal(validateCandidate(c).valid, true);
  for (const m of [c.acquisitionPrice, c.costs.shipping, c.capitalRequirement.purchaseExposure]) {
    m.currency = 'USD'; assert.equal(validateCandidate(c).valid, false); m.currency = 'EUR';
  }
});

test('unverified commercial prices hold, and signed expected margins validate', () => {
  for (const name of ['acquisitionPrice', 'referencePrice']) {
    for (const status of ['ESTIMATE', 'ASSUMPTION']) {
      const c = fixture(); c[name].status = status;
      assert.equal(scoreCandidate(c, AS_OF).commercialStatus, 'HOLD');
    }
  }
  const c = fixture(); c.expectedGrossMargin.value = -.5;
  assert.equal(validateCandidate(c).valid, true);
  assert.equal(scoreCandidate(c, AS_OF).economics.scenarioGrossMargin, .8);
});

test('slow liquidation and underfunded purchase exposure hold', () => {
  const slow = fixture(); slow.timeToSellDays.value = 31;
  assert.equal(scoreCandidate(slow, AS_OF).commercialStatus, 'HOLD');
  const insufficient = fixture(); insufficient.capitalRequirement.purchaseExposure.value = 38;
  const r = scoreCandidate(insufficient, AS_OF);
  assert.equal(r.economics.minimumPurchaseExposure, 39);
  assert.equal(r.commercialStatus, 'HOLD');
  insufficient.capitalRequirement.purchaseExposure.value = 39;
  assert.equal(scoreCandidate(insufficient, AS_OF).commercialStatus, 'REVIEW_REQUIRED');
  const noNote = fixture(); noNote.referencePrice.note = ' ';
  assert.equal(validateCandidate(noNote).valid, false);
});

test('rankings are deterministic, editorial is independent, unknown is unranked', () => {
  const a = fixture('a'), b = fixture('b'), held = fixture('held'), unranked = fixture('unknown');
  held.authenticityRisk.value = .9; held.contentValue.value = 1;
  unranked.contentValue = unknown();
  const desk = buildDesk([b, held, unranked, a], AS_OF);
  assert.deepEqual(desk.editorialRanking, ['held', 'a', 'b']);
  assert.deepEqual(desk.commercialRanking, ['a', 'b', 'unknown']);
  assert.deepEqual(desk, buildDesk([b, held, unranked, a], AS_OF));
  assert.equal(desk.policy.transactionCapability, false);
  assert.equal(buildDesk([a, a], AS_OF).rejected.length, 2);
  assert.deepEqual(buildDesk([a, a], AS_OF).commercialRanking, []);
});

test('repository candidate snapshot validates and remains HOLD with deterministic output', async () => {
  const input = JSON.parse(await readFile(new URL('../../ops/commerce/europe-opportunity-candidates.v1.json', import.meta.url), 'utf8'));
  const desk = buildDesk(input.candidates, input.asOf);
  assert.deepEqual(desk.rejected, []);
  assert.equal(desk.candidates.length, 3);
  assert.ok(desk.candidates.every(c => c.commercialStatus === 'HOLD' && c.economics.netContribution === null));
  assert.deepEqual(desk, buildDesk(input.candidates, input.asOf));
});
