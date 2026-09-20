import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const fail = (message) => { throw new Error(message); };
const phase5 = 'ops/simulation-refinement/phase5-generalization-20260913/music';
const phase6 = 'ops/simulation-refinement/phase6-three-lanes-20260913/music';
const batch = readJson(`${phase5}/batch-r3/music-evidence-manifest.json`);
const machine = readJson(`${phase5}/batch-r3/music-machine-observations.json`);
const binding = readJson(`${phase5}/batch-r3/runtime-binding-validation-r3.json`);
const hashes = readJson(`${phase5}/batch-r3/music-batch-r3-hash-manifest.json`);
const asr = readJson(`${phase5}/asr-batch/asr-batch-summary.json`);
const previews = readJson(`${phase6}/public-preview-actions.json`);
const audit = readJson(`${phase6}/source-audit.json`);
const claims = readJson(`${phase5}/batch-r3/claims-matrix.json`);
const required = [
  `${phase5}/music-factory-config-batch-r3.json`, `${phase5}/music-factory-hash-manifest.json`,
  `${phase5}/batch-r3/recovery-source-manifest.json`, `${phase5}/batch-r3/runtime-binding-validation-r3.json`,
  `${phase6}/source-audit.md`, `${phase6}/public-preview-actions.md`,
  'scripts/build-musiam-music-evidence-factory.py', 'docs/AI/R4_MUSIC_EVIDENCE_RECOVERY.md'
];
for (const path of required) if (!existsSync(path)) fail(`missing recovered artifact: ${path}`);
if (batch.batchSize !== 10 || batch.sourceRecords.length !== 10) fail('batch-r3 must contain 10 source records');
const ids = batch.sourceRecords.map((r) => r.workId);
const sourceHashes = batch.sourceRecords.map((r) => r.source.sha256);
if (new Set(ids).size !== 10 || new Set(sourceHashes).size !== 10) fail('batch-r3 IDs and source SHA-256 values must be unique');
if (binding.result !== 'TEN_UNIQUELY_RUNTIME_BOUND_MEASURED_SOURCES' || binding.records.length !== 10) fail('runtime binding is not the 10-record canonical result');
if (machine.records.length !== 10 || asr.records.length !== 10 || claims.records.length !== 10) fail('machine, ASR, and claims counts must match canonical batch');
if (previews.actions.length !== 9 || !previews.actions.every((r) => r.status === 'VERIFIED_PUBLIC_METADATA')) fail('final historical public preview status is not nine verified metadata rows');
if (audit.decision.newUsableFullEvidence !== 0 || claims.fullTrackVerifiedCount !== 0) fail('full-track evidence was promoted');
if (audit.newEvidence[0]?.bindingStatus !== 'UNRESOLVED_DURATION_CONFLICT') fail('local duration ambiguity was not retained');
const pointerExpected = { [`${phase6}/source-audit.json`]: 'e56767b651ac35b27bac21ce4ebcc030962df05297a25326d927c134564287f5', [`${phase6}/public-preview-actions.json`]: 'df79a48f1405c724731a2dee5f7e873cc867ae1018bf5ef82af5fe45a5754df8' };
for (const [path, expected] of Object.entries(pointerExpected)) if (sha256(path) !== expected) fail(`R3 pointer hash mismatch: ${path}`);
for (const entry of hashes.files) if (sha256(entry.path) !== entry.sha256) fail(`batch-r3 hash mismatch: ${entry.path}`);
if (sha256('scripts/build-musiam-music-evidence-factory.py') !== 'f6926407bf2286cc338d00931034356b18f8ddb3713002f3a1d6d858ec9e72d4') fail('factory source hash mismatch');
if (claims.productionParity !== 'UNVERIFIED') fail('production parity must remain unverified');
console.log('R4_MUSIC_EVIDENCE_RECOVERY=PASS');
console.log('canonical=batch-r3 stable_identity=10 measured_sources=10 public_preview_metadata=9 local_full_candidates=2 full_track_verified=0 asr_limited=10 unresolved_or_ambiguous=2');
