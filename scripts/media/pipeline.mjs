import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const channels = ['letter', 'intelligence-underground', 'seo-article', 'x', 'threads', 'instagram', 'short-video', 'newsletter'];
export const hash = text => crypto.createHash('sha256').update(text).digest('hex');
export const json = value => JSON.stringify(value, null, 2) + '\n';
// Check each component before following it: no symlink traversal into other lanes/roots.
export function safe(relative, pattern) {
  assert.equal(typeof relative, 'string', 'path must be text');
  assert.match(relative, pattern, 'path outside allowlist');
  assert.ok(!/[\0-\x1f\x7f\\]/.test(relative), 'control character or non-portable path separator');
  const parts = relative.split('/');
  assert.ok(parts.every(part => part && part !== '.' && part !== '..'), 'non-canonical path');
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    try {
      assert.ok(!fs.lstatSync(current).isSymbolicLink(), 'symlink forbidden');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return current;
}
function keys(value, expected) {
  assert.deepEqual(Object.keys(value).sort(), expected.sort(), 'unexpected/missing schema fields');
}
function copyCheck(text) {
  assert.equal(typeof text, 'string');
  assert.ok(text.trim().length > 0 && text.length <= 3000, 'empty/oversized copy');
  assert.ok(!/https?:|www\.|\]\(|(?:^|\s)\/[a-z]|<[^>]+>/i.test(text), 'embedded link/markup forbidden; use CTA');
  assert.ok(!/革命的|人生を変える|必見|圧倒的|世界初|売上|完売|送料無料|\d+%/.test(text), 'unsupported promotional claim');
  assert.ok(!/(.{12,})\1/u.test(text), 'repetition');
}
export function compile(recipe) {
  keys(recipe, ['schemaVersion', 'id', 'source', 'idea', 'evidence', 'cta', 'outputs']);
  assert.equal(recipe.schemaVersion, 1);
  assert.match(recipe.id, /^[a-z0-9-]{1,80}$/);
  copyCheck(recipe.idea);
  keys(recipe.source, ['path', 'sha256']);
  const raw = fs.readFileSync(safe(recipe.source.path, /^content\/letters\/[a-z0-9-]+\.md$/), 'utf8');
  assert.equal(hash(raw), recipe.source.sha256, 'source changed: re-curate evidence');
  const parts = raw.split(/^---\s*$/m);
  assert.ok(parts.length >= 3, 'frontmatter required');
  const body = parts.slice(2).join('---');
  const title = parts[1].match(/^title: (.+)$/m)?.[1];
  const date = parts[1].match(/^date: (.+)$/m)?.[1];
  assert.ok(title && date, 'source metadata missing');
  const sourceUrl = '/letters/' + path.basename(recipe.source.path, '.md');
  const provenance = { ...recipe.source, title, date, localRoute: sourceUrl, authority: 'OWNER_SOURCE', liveStatus: 'UNVERIFIED' };
  assert.ok(Array.isArray(recipe.evidence) && recipe.evidence.length > 0);
  const evidence = new Map();
  for (const item of recipe.evidence) {
    keys(item, ['id', 'text']);
    assert.match(item.id, /^[a-z0-9-]+$/);
    assert.ok(!evidence.has(item.id), 'duplicate evidence');
    assert.ok(item.text.length >= 10 && body.includes(item.text), 'fake/non-body quote');
    evidence.set(item.id, { ...item, start: raw.indexOf(item.text), end: raw.indexOf(item.text) + item.text.length });
  }
  keys(recipe.cta, ['route', 'label', 'evidenceId', 'reason']);
  // V1 admits only return-to-source and the source's explicit works link.
  assert.ok(recipe.cta.route === sourceUrl || (recipe.cta.route === '/works' && body.includes('](/works)')), 'unverified CTA');
  assert.ok(evidence.has(recipe.cta.evidenceId), 'CTA relevance evidence missing');
  copyCheck(recipe.cta.label); copyCheck(recipe.cta.reason);
  assert.deepEqual(recipe.outputs.map(o => o.channel), channels, 'all channels required in canonical order');
  const seen = new Set();
  const sentences = new Set();
  const priorGrams = [];
  const outputs = recipe.outputs.map(output => {
    keys(output, ['channel', 'format', 'blocks']);
    copyCheck(output.format);
    assert.ok(Array.isArray(output.blocks) && output.blocks.length >= 2 && output.blocks.length <= 10);
    const blocks = output.blocks.map(block => {
      keys(block, ['kind', 'text', 'evidenceIds']);
      assert.ok(['QUOTE', 'FACT', 'INFERENCE'].includes(block.kind), 'unknown claim type');
      assert.ok(Array.isArray(block.evidenceIds) && block.evidenceIds.length > 0);
      for (const id of block.evidenceIds) assert.ok(evidence.has(id), 'missing provenance');
      copyCheck(block.text);
      if (block.kind === 'QUOTE') assert.ok(block.evidenceIds.some(id => evidence.get(id).text === block.text), 'fake quote');
      // Facts are deliberately restricted to attributed source metadata in V1.
      if (block.kind === 'FACT') assert.equal(block.text, `${date}のLetter：${title}`, 'unsupported fact');
      if (block.kind === 'INFERENCE') {
        assert.ok(!/[「」“”"]/.test(block.text), 'quotes must be separately typed');
        const normalized = block.text.replace(/[\s\p{P}]/gu, '');
        assert.ok(!sentences.has(normalized), 'repeated inference'); sentences.add(normalized);
      }
      return { ...block, review: block.kind === 'INFERENCE' ? 'EDITORIAL_REVIEW_REQUIRED' : 'SOURCE_BOUND', provenance };
    });
    const unique = blocks.filter(b => b.kind === 'INFERENCE').map(b => b.text).join('\n');
    assert.ok(unique && !seen.has(unique), 'platform copy-paste'); seen.add(unique);
    const normalized = unique.replace(/[\s\p{P}]/gu, '');
    const grams = new Set(Array.from({ length: Math.max(0, normalized.length - 2) }, (_, i) => normalized.slice(i, i + 3)));
    for (const prior of priorGrams) {
      const overlap = [...grams].filter(g => prior.has(g)).length;
      assert.ok(overlap / Math.max(1, Math.min(grams.size, prior.size)) < 0.85, 'near-identical platform copy');
    }
    priorGrams.push(grams);
    const text = blocks.map(b => b.text).join('\n\n');
    if (output.channel === 'x') assert.ok([...text].length + recipe.cta.label.length + 24 <= 280, 'X editorial budget');
    if (output.channel === 'threads') assert.ok([...text].length + recipe.cta.label.length + 24 <= 500, 'Threads editorial budget');
    return { ...output, blocks, status: 'DRAFT', provenance, cta: recipe.cta, text };
  });
  return { schemaVersion: 1, id: recipe.id, status: 'DRAFT', recipeSha256: hash(json(recipe)), idea: recipe.idea, provenance,
    evidence: [...evidence.values()], outputs, queue: outputs.map((o, index) => ({ channel: o.channel, sequence: index + 1, state: 'DRAFT', scheduledAt: null, approvedBy: null, approvedHash: null })),
    approval: { state: 'DRAFT', semanticReview: 'REQUIRED', externalPublicationPerformed: false }, metrics: { impressions: null, clicks: null, revenue: null } };
}
export function render(pack) {
  return `# DRAFT — ${pack.id}\n\nSource: ${pack.provenance.path}\nSHA256: ${pack.provenance.sha256}\nRecipe: ${pack.recipeSha256}\nLocal route (not live verified): ${pack.provenance.localRoute}\n\n` + pack.outputs.map(o => `## DRAFT — ${o.channel} / ${o.format}\n\n` + o.blocks.map(b => `[${b.kind}; ${b.evidenceIds.join(',')}] ${b.text}`).join('\n\n') + `\n\nCTA DRAFT: [${o.cta.label}](${o.cta.route})\nRelevance: ${o.cta.reason}\n`).join('\n');
}
export function load(relative) {
  return JSON.parse(fs.readFileSync(safe(relative, /^ops\/media\/sources\/[a-z0-9-]+\.json$/), 'utf8'));
}
