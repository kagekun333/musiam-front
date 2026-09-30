import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { compile, json, load, root, safe } from './pipeline.mjs';
const recipe = load('ops/media/sources/museum-not-label.json');
assert.equal(json(compile(recipe)), json(compile(recipe)), 'determinism');
let rejected = 0;
function reject(change) {
  const mutant = structuredClone(recipe); change(mutant);
  assert.throws(() => compile(mutant)); rejected++;
}
reject(r => r.source.sha256 = '0'.repeat(64));
reject(r => r.source.path = 'ops/continuous-operation/state.json');
reject(r => r.source.path = 'content/letters/../../secret.md');
reject(r => r.evidence[0].text = '架空の作者発言を引用する');
reject(r => r.outputs[3].blocks[0].text = '架空の引用');
reject(r => r.outputs[0].blocks[0].text = '世界初のサービス');
reject(r => r.outputs[0].blocks[1].evidenceIds = ['missing']);
reject(r => r.outputs[0].blocks[1].text = '詳細 https://fake.example');
reject(r => r.outputs[0].blocks[1].text = '架空の発言「新作が完売した」');
reject(r => r.cta.route = '/nonexistent-product');
reject(r => r.outputs[4].blocks = structuredClone(r.outputs[3].blocks));
reject(r => r.outputs[0].blocks[1].text = '同じ文章を何度も繰り返す。同じ文章を何度も繰り返す。');
reject(r => r.outputs.pop());
reject(r => r.status = 'APPROVED');
reject(r => r.outputs[3].blocks[1].text = 'あ'.repeat(400));
assert.throws(() => safe('ops/media/drafts/../../escape.json', /^ops\/media\/drafts\/[a-z0-9-]+\.json$/));
assert.throws(() => safe('ops/media/drafts/escape.json\n', /^ops\/media\/drafts\/[a-z0-9-]+\.json$/));
for (const candidate of ['/ops/media/drafts/escape.json', 'ops/media//drafts/escape.json', 'ops/media/./drafts/escape.json']) {
  assert.throws(() => safe(candidate, /^ops\/media\/drafts\/[a-z0-9-]+\.json$/));
}
const guardDir = fs.mkdtempSync(path.join(root, 'ops/media/.media-path-guard-'));
try {
  fs.symlinkSync(path.join(guardDir, 'missing-target'), path.join(guardDir, 'source'), 'dir');
  const relative = path.relative(root, path.join(guardDir, 'source', 'recipe.json')).split(path.sep).join('/');
  assert.throws(() => safe(relative, /^ops\/media\/\.media-path-guard-[^/]+\/source\/recipe\.json$/));
} finally {
  fs.rmSync(guardDir, { recursive: true, force: true });
}
console.log(`PASS: deterministic compile; ${rejected} invalid recipes rejected; traversal and symlink paths rejected. No network or persistent writes.`);
