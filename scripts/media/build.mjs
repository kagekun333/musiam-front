import fs from 'node:fs';
import { compile, json, load, render, safe } from './pipeline.mjs';
const recipe = load(process.argv[2] || 'ops/media/sources/museum-not-label.json');
const pack = compile(recipe);
const files = [['json', json(pack)], ['md', render(pack)]];
// Preflight both files before any write. Never overwrite an edited draft.
for (const [ext, text] of files) {
  const target = safe(`ops/media/drafts/${pack.id}.${ext}`, /^ops\/media\/drafts\/[a-z0-9-]+\.(json|md)$/);
  if (fs.existsSync(target) && fs.readFileSync(target, 'utf8') !== text) throw new Error('Draft exists with different bytes; use a new recipe id');
}
for (const [ext, text] of files) {
  const target = safe(`ops/media/drafts/${pack.id}.${ext}`, /^ops\/media\/drafts\/[a-z0-9-]+\.(json|md)$/);
  if (!fs.existsSync(target)) fs.writeFileSync(target, text, { flag: 'wx' });
}
console.log(`DRAFT built locally: ${pack.id}; ${pack.outputs.length} channels; no publication`);
