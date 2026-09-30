import fs from 'node:fs';
import assert from 'node:assert/strict';
import { compile, json, load, render, safe } from './pipeline.mjs';
const recipe = load(process.argv[2] || 'ops/media/sources/museum-not-label.json');
const expected = compile(recipe);
for (const [ext, text] of [['json', json(expected)], ['md', render(expected)]]) {
  assert.equal(fs.readFileSync(safe(`ops/media/drafts/${expected.id}.${ext}`, /^ops\/media\/drafts\/[a-z0-9-]+\.(json|md)$/), 'utf8'), text, 'draft drift/tampering');
}
console.log('PASS: source hash, evidence, claim types, links, channel distinction, DRAFT boundary, deterministic artifacts. Semantic accuracy still requires review.');
