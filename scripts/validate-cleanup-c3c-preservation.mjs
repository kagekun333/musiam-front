import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const canonical = process.cwd();
const original = '/Users/kagekun/Desktop/musiam-front';
const preservationRoot = '/Users/kagekun/Library/Application Support/MUSIAM/archive/cleanup-c3c-preservation-20260923';
const c3bCommit = '370d2525862ae6232be2eba0189282ba150daf14';
const originalHead = '117379b6c61ab3fc072b6cd4b80ce1d406b0e175';
const originalBranch = 'codex/fix/stripe-metal-print-webhook-20260914';
const allowedCanonicalPaths = new Set([
  'docs/AI/CLEANUP_C3C_PRESERVATION_EXECUTION.md',
  'ops/recovery/cleanup-c3c-preservation-20260923.json',
  'scripts/validate-cleanup-c3c-preservation.mjs',
  'docs/AI/RECOVERY_PLAN.md',
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sha256(file) {
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(file, 'r');
  try {
    const buffer = Buffer.alloc(1024 * 1024);
    let read;
    while ((read = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) {
      hash.update(buffer.subarray(0, read));
    }
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest('hex');
}

function git(repo, ...args) {
  return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();
}

function gitStatusCounts(repo) {
  const raw = execFileSync('git', ['-C', repo, 'status', '--porcelain=v1', '-z']);
  const rows = raw.toString('utf8').split('\0').filter(Boolean);
  let modified = 0;
  let staged = 0;
  let untracked = 0;
  for (const row of rows) {
    const xy = row.slice(0, 2);
    if (xy === '??') untracked += 1;
    else {
      if (xy[0] !== ' ') staged += 1;
      if (xy[1] !== ' ') modified += 1;
    }
  }
  return { modified, staged, untracked };
}

const recordPath = path.join(canonical, 'ops/recovery/cleanup-c3c-preservation-20260923.json');
const record = readJson(recordPath);
const c3b = readJson(path.join(canonical, 'ops/recovery/cleanup-c3b-semantic-review-20260923.json'));
const c3a = readJson(path.join(canonical, 'ops/recovery/cleanup-c3-unknown-triage-20260923.json'));
const sourceManifestPath = path.join(preservationRoot, 'SOURCE_MANIFEST.json');
const rawManifestPath = path.join(preservationRoot, 'RAW_PATH_MANIFEST.json');
const archivePath = path.join(preservationRoot, 'preserved-source.tar');
const sourceManifest = readJson(sourceManifestPath);
const rawManifest = readJson(rawManifestPath);
const targets = c3b.preserveRequiredFiles.paths;
const decisions = new Map(c3b.finalDecisions.map((entry) => [entry.path, entry]));
const triage = new Map(c3a.fileManifest.map((entry) => [entry.path, entry]));
const files = sourceManifest.files;
const mappings = rawManifest.mappings;

assert(record.status === 'C3C_PRESERVATION=VERIFIED_COMPLETE', 'machine status');
assert(record.startingHead === c3bCommit && record.c3bCommit === c3bCommit, 'C3-B commit authority');
assert(c3b.preserveRequiredFiles.files === 383 && targets.length === 383, 'C3-B target count');
assert(new Set(targets).size === 383, 'duplicate C3-B target');
assert(files.length === 383 && new Set(files.map((entry) => entry.originalRepoRelativePath)).size === 383, 'manifest target count or duplicates');
assert(targets.every((target) => decisions.get(target)?.decision === 'PRESERVE_REQUIRED_BEFORE_C4'), 'C3-B final decisions');
assert(targets.every((target) => {
  const entry = triage.get(target);
  return entry && !entry.sensitive && !entry.localConfig && !entry.envPattern;
}), 'sensitive/local-config overlap');
assert(targets.every((target) => target !== '.git' && !target.startsWith('.git/')), 'Original .git overlap');
assert(record.sensitiveOverlapCount === 0 && record.gitMetadataOverlapCount === 0, 'recorded boundary checks');
assert(record.regularFileCount === 383 && record.specialFileCount === 0, 'file type counts');
assert(record.normalizationCollisions === 0 && rawManifest.sourceNormalizationCollisions === 0, 'source NFC collision');
assert(rawManifest.archiveMemberNormalizationCollisions === 0 && rawManifest.oneToOne === true, 'archive NFC/mapping');
assert(mappings.length === 383 && new Set(mappings.map((entry) => entry.exactOriginalPathSpelling)).size === 383, 'raw path mapping count');
assert(new Set(mappings.map((entry) => entry.archiveMemberPath)).size === 383, 'archive member mapping uniqueness');
assert(fs.statSync(archivePath).isFile(), 'archive missing');
assert(sha256(archivePath) === record.archiveSha256, 'archive SHA-256');
assert(sha256(sourceManifestPath) === record.sourceManifestSha256, 'source manifest SHA-256');
assert(sha256(rawManifestPath) === record.rawPathManifestSha256, 'raw path manifest SHA-256');
assert(record.actualTargetFiles === 383 && record.extractedFileCount === 383, 'source/extracted count');
assert(record.contentMatchCount === 383 && record.sizeMatchCount === 383 && record.nfcPathMatchCount === 383, 'extraction verification counts');
assert(record.missingCount === 0, 'missing preserved targets');
assert(record.sourceDriftCount === 0 && record.priorHashAuthorityCount === 0, 'source drift accounting');
assert(record.expectedAllocatedBytes === 17010688 && record.actualAllocatedBytes === 17010688, 'allocated bytes');
assert(record.originalStateBefore.modified === 102 && record.originalStateBefore.staged === 0 && record.originalStateBefore.untracked === 433, 'Original before state');
assert(git(original, 'rev-parse', 'HEAD') === originalHead, 'Original HEAD changed');
assert(git(original, 'branch', '--show-current') === originalBranch, 'Original branch changed');
const after = gitStatusCounts(original);
assert(JSON.stringify(after) === JSON.stringify({ modified: 102, staged: 0, untracked: 433 }), 'Original status changed');
for (const entry of files) {
  const absolute = path.join(original, entry.originalRepoRelativePath);
  const stat = fs.lstatSync(absolute);
  assert(stat.isFile() && !stat.isSymbolicLink(), `source missing or special: ${entry.originalRepoRelativePath}`);
  assert(stat.size === entry.logicalBytes && sha256(absolute) === entry.sha256, `source changed: ${entry.originalRepoRelativePath}`);
}
assert(record.originalStateAfter.modified === 102 && record.originalStateAfter.staged === 0 && record.originalStateAfter.untracked === 433, 'recorded Original after state');
assert(record.originalWrites === 0 && record.destructiveSourceOperations === 0, 'Original mutation');
assert(record.applicationChanges === 0 && record.c4Started === false, 'application change or C4 start');
assert(record.temporaryVerificationDeleted === true && !fs.existsSync(path.join(preservationRoot, '.verify')), 'verification directory remains');
assert(record.providerOperations === 0 && record.deployOperations === 0 && record.pushOperations === 0, 'external operations');

const statusRaw = execFileSync('git', ['-C', canonical, 'status', '--porcelain=v1', '-z']).toString('utf8').split('\0').filter(Boolean);
for (const row of statusRaw) {
  const itemPath = row.slice(3).replace(/^"|"$/g, '');
  assert(allowedCanonicalPaths.has(itemPath), `out-of-scope canonical change: ${itemPath}`);
}
const committedPaths = git(canonical, 'diff', '--name-only', `${c3bCommit}..HEAD`).split('\n').filter(Boolean);
for (const itemPath of committedPaths) assert(allowedCanonicalPaths.has(itemPath), `out-of-scope committed path: ${itemPath}`);
assert(record.c4Readiness === 'READY_FOR_C4_REVIEW', 'C4 readiness');
assert(record.truthBoundary.includes('does not authorize') && record.truthBoundary.includes('adoption'), 'truth boundary');

console.log('PASS validate-cleanup-c3c-preservation');
console.log('targets=383 archive=verified source=unchanged c4=READY_FOR_C4_REVIEW');
