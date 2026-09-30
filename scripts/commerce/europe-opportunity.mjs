#!/usr/bin/env node
// Offline page-observation desk. All monetary metrics are EUR; ratios are 0..1.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const VERSION = '1.0.0';
const CATEGORIES = new Set(['fashion-accessories', 'design-objects', 'coffee-gear', 'books-art']);
const COUNTRIES = new Set('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' '));
const STATUSES = new Set(['VERIFIED', 'ESTIMATE', 'ASSUMPTION', 'UNKNOWN']);
const COSTS = ['fees', 'shipping', 'tax', 'customs', 'packaging', 'returnReserve'];
const RATIOS = ['authenticityRisk', 'returnRisk', 'liquidity', 'availabilityConfidence', 'contentValue'];
const METRICS = ['acquisitionPrice', 'referencePrice', 'expectedGrossMargin', ...RATIOS, 'timeToSellDays'];
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const nonempty = v => typeof v === 'string' && v.trim().length > 0;
const timestamp = v => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(v) || !Number.isFinite(Date.parse(v))) return false;
  const [year, month, day] = v.slice(0, 10).split('-').map(Number);
  const date = new Date(`${v.slice(0, 10)}T00:00:00Z`);
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day && Number(v.slice(11, 13)) < 24;
};
function https(v) {
  try { const u = new URL(v); return typeof v === 'string' && u.protocol === 'https:' && !!u.hostname && !u.username && !u.password; } catch { return false; }
}

export function validateCandidate(candidate) {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  if (!object(candidate)) return { valid: false, errors: ['candidate must be an object'] };
  const c = candidate;
  check(c.schemaVersion === VERSION, 'schemaVersion must be 1.0.0');
  check(nonempty(c.id), 'id required');
  check(object(c.product) && nonempty(c.product.name), 'product.name required');
  check(CATEGORIES.has(c.product?.category), 'product.category excluded or unsupported');
  check(COUNTRIES.has(c.country), 'country must be ISO 3166-1 alpha-2');
  check(object(c.source) && https(c.source.url), 'source.url must be HTTPS without credentials');
  check(timestamp(c.source?.accessedAt), 'source.accessedAt must be ISO timestamp');
  check(c.source?.publishedAt === null || timestamp(c.source?.publishedAt), 'source.publishedAt must be ISO timestamp or null');
  check(['manufacturer', 'publisher', 'retailer'].includes(c.source?.kind), 'source.kind invalid');
  check(Array.isArray(c.facts) && c.facts.length > 0, 'facts must contain page observations');
  if (Array.isArray(c.facts)) c.facts.forEach((f, i) => {
    check(object(f) && nonempty(f.field) && f.value !== null && f.value !== undefined, `facts[${i}] field/value required`);
    check(f?.status === 'VERIFIED' && https(f.sourceUrl) && timestamp(f.accessedAt), `facts[${i}] needs VERIFIED source/time`);
  });
  function metric(m, name, range = false, money = false) {
    if (!object(m)) { errors.push(`${name} metric required`); return; }
    check(STATUSES.has(m.status), `${name}.status invalid`);
    check(nonempty(m.note), `${name}.note required`);
    check(m.sourceUrl === null || https(m.sourceUrl), `${name}.sourceUrl invalid`);
    check(m.accessedAt === null || timestamp(m.accessedAt), `${name}.accessedAt invalid`);
    if (m.status === 'UNKNOWN') {
      check(m.value === null, `${name} UNKNOWN value must be null`);
      check(m.sourceUrl === null && m.accessedAt === null, `${name} UNKNOWN provenance must be null`);
    }
    else check(typeof m.value === 'number' && Number.isFinite(m.value), `${name}.value must be finite number`);
    if (typeof m.value === 'number') {
      if (name !== 'expectedGrossMargin') check(m.value >= 0, `${name}.value must be nonnegative`);
      if (range) check(m.value <= 1, `${name}.value must be <= 1`);
    }
    if (m.status === 'VERIFIED') check(https(m.sourceUrl) && timestamp(m.accessedAt), `${name} VERIFIED needs source/time`);
    if (money && m.currency !== undefined) check(m.currency === 'EUR', `${name}.currency must be EUR`);
  }
  METRICS.forEach(k => metric(c[k], k, RATIOS.includes(k) || k === 'expectedGrossMargin', ['acquisitionPrice', 'referencePrice'].includes(k)));
  COSTS.forEach(k => metric(c.costs?.[k], `costs.${k}`, false, true));
  check(object(c.capitalRequirement), 'capitalRequirement required');
  check(c.capitalRequirement?.speculativeInventory === 0, 'speculativeInventory must be zero');
  check(c.capitalRequirement?.customerPrefundingRequired === true, 'customerPrefundingRequired must be true');
  metric(c.capitalRequirement?.purchaseExposure, 'capitalRequirement.purchaseExposure', false, true);
  check(nonempty(c.nextAction), 'nextAction required');
  for (const k of ['regulated', 'unverifiableCounterfeit', 'deceptiveClaims']) check(c.exclusion?.[k] === false, `exclusion.${k} must be false`);
  for (const k of ['editorial', 'sourcing', 'productCandidate']) check(nonempty(c.routes?.[k]), `routes.${k} required`);
  return { valid: errors.length === 0, errors };
}

export function scoreCandidate(candidate, asOf) {
  if (!timestamp(asOf)) throw new TypeError('asOf must be an ISO timestamp');
  const validation = validateCandidate(candidate);
  if (!validation.valid) return { id: candidate?.id ?? null, validation, commercialStatus: 'REJECTED', editorialScore: null, commercialScore: null, reasons: validation.errors };
  const c = candidate;
  const now = Date.parse(asOf);
  const reasons = [];
  const gates = [];
  const hold = reason => { gates.push(reason); reasons.push(reason); };
  if (c.source.publishedAt !== null && Date.parse(c.source.publishedAt) > now) hold('source: publishedAt is after asOf');
  for (const name of ['acquisitionPrice', 'referencePrice']) if (c[name].status !== 'VERIFIED') hold(`${name}: unverified commercial price (${c[name].status})`);
  for (const [k, threshold, highBad] of [['authenticityRisk', .25, true], ['returnRisk', .5, true], ['liquidity', .4, false], ['availabilityConfidence', .5, false]]) {
    const m = c[k];
    if (m.value === null) hold(`${k}: UNKNOWN`);
    else if (highBad ? m.value > threshold : m.value < threshold) hold(`${k}: fails ${highBad ? 'maximum' : 'minimum'} ${threshold}`);
  }
  const evidence = [['source', c.source], ...c.facts.map((f, i) => [`facts[${i}]`, f]), ...METRICS.map(k => [k, c[k]]), ...COSTS.map(k => [`costs.${k}`, c.costs[k]]), ['purchaseExposure', c.capitalRequirement.purchaseExposure]];
  for (const [name, m] of evidence) {
    if (!m.accessedAt) { if (name !== 'expectedGrossMargin' && m.status !== 'UNKNOWN') hold(`${name}: freshness UNKNOWN`); continue; }
    const age = now - Date.parse(m.accessedAt);
    if (age < 0) hold(`${name}: observation is after asOf`);
    else if (age > 24 * 60 * 60 * 1000) hold(`${name}: stale observation (>24h)`);
  }
  const acquisition = c.acquisitionPrice.value;
  const reference = c.referencePrice.value;
  const costBreakdown = Object.fromEntries(COSTS.map(k => [k, c.costs[k].value]));
  const totalCosts = COSTS.every(k => costBreakdown[k] !== null) ? COSTS.reduce((s, k) => s + costBreakdown[k], 0) : null;
  const grossProfit = acquisition !== null && reference !== null ? reference - acquisition : null;
  const netContribution = grossProfit !== null && totalCosts !== null ? grossProfit - totalCosts : null;
  const scenarioGrossMargin = grossProfit !== null && reference > 0 ? grossProfit / reference : null;
  const scenarioNetContributionMargin = netContribution !== null && reference > 0 ? netContribution / reference : null;
  const economics = {
    currency: 'EUR', acquisitionPrice: acquisition, referencePrice: reference, costBreakdown, totalCosts, grossProfit, scenarioGrossMargin, netContribution, scenarioNetContributionMargin,
    storedExpectedGrossMargin: c.expectedGrossMargin.value,
    derivation: ['grossProfit = referencePrice - acquisitionPrice', 'scenarioGrossMargin = grossProfit / referencePrice (positive reference only)', 'netContribution = grossProfit - fees - shipping - tax - customs - packaging - returnReserve', 'scenarioNetContributionMargin = netContribution / referencePrice (positive reference only)'],
    caveat: 'Scenario only. Reference price is not a realized sale; VERIFIED means page observation, not authentication, ownership, demand or profit proof.',
  };
  if (netContribution === null) hold('economics: UNKNOWN inputs; missing values are never zero');
  else if (netContribution <= 0) hold('economics: nonpositive net contribution');
  if (reference === 0) hold('referencePrice: zero cannot support margin');
  if (c.timeToSellDays.value === null) hold('timeToSellDays: UNKNOWN');
  else if (c.timeToSellDays.value > 30) hold('timeToSellDays: exceeds 30-day liquidity window');
  if (c.capitalRequirement.purchaseExposure.value === null) hold('purchaseExposure: UNKNOWN');
  const exposureInputs = [acquisition, ...['shipping', 'tax', 'customs', 'packaging'].map(k => costBreakdown[k])];
  const minimumPurchaseExposure = exposureInputs.every(v => v !== null) ? exposureInputs.reduce((sum, v) => sum + v, 0) : null;
  economics.minimumPurchaseExposure = minimumPurchaseExposure;
  if (minimumPurchaseExposure === null) hold('purchaseExposure: required acquisition and logistics costs UNKNOWN');
  else if (c.capitalRequirement.purchaseExposure.value !== null && c.capitalRequirement.purchaseExposure.value < minimumPurchaseExposure) hold('purchaseExposure: below acquisition + shipping + tax + customs + packaging');
  const editorialScore = c.contentValue.value === null ? null : Math.round(c.contentValue.value * 10000) / 100;
  reasons.push(c.contentValue.value === null ? 'editorial: contentValue UNKNOWN; unranked' : `editorial: contentValue ${c.contentValue.value}; independent of commercial gates`);
  const inputs = [scenarioNetContributionMargin, ...RATIOS.filter(k => k !== 'contentValue').map(k => c[k].value)];
  const commercialScore = inputs.some(v => v === null) ? null : Math.round(10000 * (.3 * Math.max(0, Math.min(1, scenarioNetContributionMargin)) + .2 * (1 - c.authenticityRisk.value) + .15 * (1 - c.returnRisk.value) + .2 * c.liquidity.value + .15 * c.availabilityConfidence.value)) / 100;
  reasons.push('commercial score weights: net contribution margin 30%, authenticity safety 20%, return safety 15%, liquidity 20%, availability 15%');
  reasons.push('All sourcing requires live recheck, customer prefunding/payment confirmation, and manual authorization. This desk cannot transact.');
  return { id: c.id, product: c.product, country: c.country, validation, commercialStatus: gates.length ? 'HOLD' : 'REVIEW_REQUIRED', gates, reasons, editorialScore, commercialScore, economics, routes: c.routes, nextAction: c.nextAction, requiredBeforePurchase: ['liveRecheck', 'customerPrefundingPaymentConfirmation', 'manualAuthorization'] };
}

export function buildDesk(candidates, asOf) {
  if (!Array.isArray(candidates)) throw new TypeError('candidates must be an array');
  if (!timestamp(asOf)) throw new TypeError('asOf must be an ISO timestamp');
  const counts = new Map();
  for (const c of candidates) if (typeof c?.id === 'string') counts.set(c.id, (counts.get(c.id) ?? 0) + 1);
  const results = candidates.map(c => {
    const result = scoreCandidate(c, asOf);
    if (counts.get(c?.id) > 1) return { id: c.id, validation: { valid: false, errors: ['duplicate id'] }, commercialStatus: 'REJECTED', editorialScore: null, commercialScore: null, reasons: ['duplicate id'] };
    return result;
  });
  const rank = field => results.filter(r => r.validation.valid && r[field] !== null && (field !== 'commercialScore' || r.commercialStatus === 'REVIEW_REQUIRED')).sort((a, b) => b[field] - a[field] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map(r => r.id);
  return { schemaVersion: VERSION, asOf, currency: 'EUR', policy: { offlineOnly: true, transactionCapability: false, speculativeInventory: 0, verifiedMeaning: 'page observation only', commercialReadiness: 'Every candidate requires live recheck, payment confirmation and manual authorization.' }, candidates: results, editorialRanking: rank('editorialScore'), commercialRanking: rank('commercialScore'), rejected: results.filter(r => !r.validation.valid).map(r => ({ id: r.id, errors: r.validation.errors })) };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(a => a !== '--write')) throw new Error('Usage: node scripts/commerce/europe-opportunity.mjs [--write]');
  const inputPath = fileURLToPath(new URL('../../ops/commerce/europe-opportunity-candidates.v1.json', import.meta.url));
  const outputPath = fileURLToPath(new URL('../../ops/commerce/europe-opportunity-desk.v1.json', import.meta.url));
  const input = JSON.parse(await readFile(inputPath, 'utf8'));
  if (!object(input) || input.schemaVersion !== VERSION) throw new Error('input schemaVersion must be 1.0.0');
  const output = `${JSON.stringify(buildDesk(input.candidates, input.asOf), null, 2)}\n`;
  if (args.includes('--write')) {
    await writeFile(outputPath, output, 'utf8');
    process.stdout.write('Wrote ops/commerce/europe-opportunity-desk.v1.json\n');
  } else process.stdout.write(output);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { process.stderr.write(`Europe Opportunity Desk: ${error.message}\n`); process.exitCode = 1; });
