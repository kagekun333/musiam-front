import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// C4A is a read-only verifier.  It never extracts or alters the preservation
// archive and deliberately never reads, hashes, or copies private payloads.
const root = process.cwd();
const original = '/Users/kagekun/Desktop/musiam-front';
const recordPath = 'ops/recovery/cleanup-c4a-blocker-remediation-20260923.json';
const c4Path = 'ops/recovery/cleanup-c4-decommission-review-20260923.json';
const start = 'b53a49d52498c7f56f57d737bdcdb613bc6d2798';
const branch = 'recovery/musiam-clean-20260920';
const allowed = new Set([
  'docs/AI/CLEANUP_C4A_BLOCKER_REMEDIATION.md', recordPath,
  'scripts/validate-cleanup-c4a-blocker-remediation.mjs', 'docs/AI/RECOVERY_PLAN.md',
]);
let checks = 0;
const check = (condition, label) => { checks++; assert.ok(condition, label); };
const readJson = (p) => JSON.parse(fs.readFileSync(path.resolve(root, p), 'utf8'));
const nfc = (value) => value.normalize('NFC').replace(/\/$/, '');
const sha = (file) => {
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(file, 'r');
  try { const b = Buffer.alloc(1024 * 1024); let got;
    while ((got = fs.readSync(fd, b, 0, b.length, null))) hash.update(b.subarray(0, got));
  } finally { fs.closeSync(fd); }
  return hash.digest('hex');
};
function git(repo, ...args) {
  return execFileSync('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', '-c', 'gc.auto=0', '-C', repo, ...args], {
    encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024,
  });
}
function status(repo) {
  const raw = git(repo, 'status', '--porcelain=v1', '-z', '--untracked-files=normal');
  const fields = raw.split('\0'); const entries = [];
  for (let i = 0; i < fields.length - 1; i++) {
    const field = fields[i]; if (!field) continue;
    const xy = field.slice(0, 2); const item = { xy, path: field.slice(3) };
    if ((xy[0] === 'R' || xy[0] === 'C' || xy[1] === 'R' || xy[1] === 'C') && i + 1 < fields.length) item.originalPath = fields[++i];
    entries.push(item);
  }
  return {
    raw, digest: crypto.createHash('sha256').update(raw).digest('hex'), entries,
    modified: entries.filter(x => x.xy !== '??' && x.xy[1] !== ' ').length,
    dirtyTracked: entries.filter(x => x.xy !== '??').length,
    staged: entries.filter(x => x.xy !== '??' && x.xy[0] !== ' ').length,
    untracked: entries.filter(x => x.xy === '??').length,
  };
}
function sameSet(a, b) { return a.length === b.length && new Set(a).size === a.length && a.every(x => new Set(b).has(x)); }
function isSafeRelative(name) {
  return typeof name === 'string' && name && !path.isAbsolute(name) && !name.split('/').includes('..') && !name.split('/').includes('.git');
}
function tarString(buffer, start, length) { return buffer.subarray(start, start + length).toString('utf8').replace(/\0.*$/, ''); }
function tarNumber(buffer, start, length) {
  const field = buffer.subarray(start, start + length);
  if (field[0] & 0x80) throw new Error('USTAR base-256 numeric field is prohibited');
  const text = field.toString('ascii').replace(/\0.*$/, '').trim();
  const value = text ? Number.parseInt(text, 8) : 0;
  check(Number.isSafeInteger(value) && value >= 0, 'USTAR numeric field is a safe nonnegative integer');
  return value;
}
function tarChecksum(block) {
  let sum = 0;
  for (let i = 0; i < 512; i++) sum += i >= 148 && i < 156 ? 32 : block[i];
  return sum;
}
function parseUstar(file) {
  const bytes = fs.readFileSync(file); // archive is the explicitly authorized non-private preservation artifact
  check(bytes.length % 512 === 0, 'tar has whole 512-byte blocks');
  const members = []; let offset = 0; let zeroBlocks = 0;
  while (offset < bytes.length) {
    const block = bytes.subarray(offset, offset + 512);
    if (block.every(x => x === 0)) { zeroBlocks++; offset += 512; continue; }
    check(zeroBlocks === 0, 'no member follows tar terminator');
    check(tarString(block, 257, 6) === 'ustar', 'USTAR header magic');
    check(tarChecksum(block) === tarNumber(block, 148, 8), 'USTAR header checksum');
    const prefix = tarString(block, 345, 155); const leaf = tarString(block, 0, 100);
    const name = prefix ? `${prefix}/${leaf}` : leaf;
    const size = tarNumber(block, 124, 12); const type = String.fromCharCode(block[156] || 0);
    check(isSafeRelative(name), `safe tar member path: ${name}`);
    check(type === '0' || type === '\0', `regular tar member: ${name}`);
    const dataStart = offset + 512; const padded = Math.ceil(size / 512) * 512;
    check(dataStart + padded <= bytes.length, `tar member bounds: ${name}`);
    members.push({ name, size, hash: crypto.createHash('sha256').update(bytes.subarray(dataStart, dataStart + size)).digest('hex') });
    offset = dataStart + padded;
  }
  check(zeroBlocks >= 2, 'tar has two zero terminating blocks');
  return members;
}

const r = readJson(recordPath);
const c4 = readJson(c4Path);
check(root === '/Users/kagekun/Desktop/musiam-front-clean', 'exact canonical workspace');
check(r.schemaVersion === 1 && ['PENDING', 'PASS'].includes(r.validation?.status), 'C4A record schema and pre/post validation status');
check(r.startingCanonicalHead === start && r.canonicalBranch === branch && r.canonicalInitiallyClean, 'C4A canonical start authority');
check(sameSet(r.allowedCanonicalPaths, [...allowed]), 'exact C4A four-path allowlist');
check(git(root, 'branch', '--show-current').trim() === branch, 'canonical branch unchanged');
const head = git(root, 'rev-parse', 'HEAD').trim();
check(head === start || git(root, 'merge-base', '--is-ancestor', start, 'HEAD') === '', 'starting HEAD remains ancestor');
const committed = git(root, 'diff', '--name-only', '-z', `${start}..HEAD`).split('\0').filter(Boolean);
const unstaged = git(root, 'diff', '--name-only', '-z').split('\0').filter(Boolean);
const staged = git(root, 'diff', '--cached', '--name-only', '-z').split('\0').filter(Boolean);
const untracked = git(root, 'ls-files', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean);
check([...committed, ...unstaged, ...staged, ...untracked].every(x => allowed.has(x)), 'only four allowlisted canonical paths changed since start, including unstaged/staged/untracked/committed');

check(c4.startingCanonicalHead === '233abd0cc6ef938ca5856ca646aaf7547b4beef6', 'C4 authority start');
const losses = c4.uniqueLossIfOriginalDeleted.filter(x => x.confirmedMeaningfulLoss);
check(losses.length === 21 && new Set(losses.map(x => x.pathOrRef)).size === 21 && c4.meaningfulUniqueLossLogicalBytes === 105417, 'C4 exact unique 21 authority');
const c4Private = new Set(c4.secretRetention.files.map(x => nfc(x.path)));
const privatePaths = new Set(r.privateRetention.files.map(x => nfc(x.path)));
check(privatePaths.size === 35 && c4Private.size === 35 && sameSet([...privatePaths], [...c4Private]) && r.privateRetention.metadataOnly && r.envExampleRelationship.inPrivateSet && !r.envExampleRelationship.inUniquePreservationSet, 'private set is exactly C4 35 and metadata-only');
const privateEnums = ['INDEPENDENTLY_PRESERVED_PRIVATE', 'LOCAL_MACHINE_ONLY_RECREATABLE', 'REQUIRED_PRIVATE_CONFIG_NOT_PRESERVED', 'OWNER_SECRET_RETENTION_DECISION_REQUIRED'];
check(r.privateRetention.files.length === 35 && r.privateRetention.files.every(x => privateEnums.includes(x.classification)), '35 private rows without duplicate or unclassified rows');
check(sameSet(Object.keys(r.privateRetention.counts), privateEnums), 'private classification enum is fixed');
const privateCounts = Object.fromEntries(privateEnums.map(key => [key, r.privateRetention.files.filter(x => x.classification === key).length]));
check(privateEnums.every(key => privateCounts[key] === r.privateRetention.counts[key]) && JSON.stringify(r.privateRetention.counts) === JSON.stringify({ INDEPENDENTLY_PRESERVED_PRIVATE: 0, LOCAL_MACHINE_ONLY_RECREATABLE: 19, REQUIRED_PRIVATE_CONFIG_NOT_PRESERVED: 4, OWNER_SECRET_RETENTION_DECISION_REQUIRED: 12 }), 'each private file is classified once and fixed enum counts reconcile');
const lossPaths = losses.map(x => nfc(x.pathOrRef));
check(lossPaths.every(p => !privatePaths.has(p) && isSafeRelative(p)), 'unique preservation excludes private, Git, and traversal paths');
const source = new Map(r.uniquePreservation.files.map(x => [nfc(x.originalRepoRelativePath), x]));
check(r.uniquePreservation.status === 'VERIFIED_21_OF_21' && r.uniquePreservation.sourceCount === 21 && r.uniquePreservation.files.length === 21 && source.size === 21 && sameSet(r.uniquePreservation.files.map(x => x.originalRepoRelativePath), losses.map(x => x.pathOrRef)) && sameSet([...source.keys()], lossPaths), 'C4A source files exactly match C4 raw confirmed loss without duplicates before hashing');
check([...source.entries()].every(([p, item]) => { const loss = losses.find(x => nfc(x.pathOrRef) === p); return loss && item.logicalBytes === loss.logicalBytes && item.sha256 === loss.sha256 && item.exactSourcePath === path.join(original, item.originalRepoRelativePath); }), 'C4A source declarations bind exactly to C4 losses before hashing');
for (const item of r.privateRetention.files) {
  const candidate = path.join(original, item.path);
  const st = fs.lstatSync(candidate); // expressly metadata only: no read/hash
  check(!st.isSymbolicLink() && st.isFile() && isSafeRelative(item.path) && st.size === item.logicalBytes && item.filesystemType === 'regular' && !Object.keys(item).some(key => /hash/i.test(key)), `private metadata safe: ${item.path}`);
  check(['ignored', 'tracked', 'modified', 'untracked'].includes(item.gitStatus) && (item.classification === 'LOCAL_MACHINE_ONLY_RECREATABLE' || item.decisionQuestion.length > 0), `private status and unresolved decision: ${item.path}`);
}
const sourceStats = new Map();
for (const item of source.values()) {
  const candidate = path.join(original, item.originalRepoRelativePath);
  const st = fs.lstatSync(candidate);
  check(st.isFile() && !st.isSymbolicLink() && st.size === item.logicalBytes && fs.realpathSync(candidate) === candidate && item.exactSourcePath === candidate, `unique source metadata: ${item.originalRepoRelativePath}`);
  check(![...sourceStats.values()].some(x => x.dev === st.dev && x.ino === st.ino), `unique source inode distinct: ${item.originalRepoRelativePath}`);
  sourceStats.set(item.originalRepoRelativePath, st);
}
const privateStats = r.privateRetention.files.map(x => fs.lstatSync(path.join(original, x.path)));
check(![...sourceStats.values()].some(s => privateStats.some(p => p.dev === s.dev && p.ino === s.ino)), 'unique sources do not inode-overlap private files');

const originalStatus = status(original);
check(git(original, 'rev-parse', 'HEAD').trim() === r.originalAuthority.head && git(original, 'branch', '--show-current').trim() === r.originalAuthority.branch, 'Original head and branch authority');
check(originalStatus.digest === r.originalAuthority.statusSha256 && originalStatus.modified === 102 && originalStatus.staged === 0 && originalStatus.untracked === 433, 'Original 102/0/433 status digest unchanged');
check(JSON.stringify(r.originalAuthority) === JSON.stringify(c4.original) && JSON.stringify(r.originalAfter) === JSON.stringify(r.originalBefore) && r.originalAfter.head === r.originalAuthority.head && r.originalAfter.branch === r.originalAuthority.branch && r.originalAfter.modified === originalStatus.modified && r.originalAfter.dirtyTracked === originalStatus.dirtyTracked && r.originalAfter.staged === originalStatus.staged && r.originalAfter.untracked === originalStatus.untracked && r.originalAfter.statusSha256 === originalStatus.digest, 'Original C4 authority and after-state exactly match fresh before-state');
const trackedPaths = new Set(git(original, 'ls-files', '-z').split('\0').filter(Boolean));
for (const item of r.privateRetention.files) {
  const entry = originalStatus.entries.find(x => x.path === item.path || x.originalPath === item.path);
  check((item.gitStatus === 'tracked') === trackedPaths.has(item.path), `private tracked membership: ${item.path}`);
  check(item.role === c4.secretRetention.files.find(x => x.path === item.path)?.role, `private role remains C4 authority: ${item.path}`);
  if (item.gitStatus === 'ignored') check(git(original, 'check-ignore', '-q', '--', item.path) === '' && item.statusXY === null, `private ignored status accounted: ${item.path}`);
  else check(item.statusXY === null ? !entry : entry && entry.xy === item.statusXY, `private Git status accounted: ${item.path}`);
}
const envExample = r.privateRetention.files.find(x => x.path === '.env.example');
check(envExample?.role === 'SECRET_OR_ENV_HOLD' && envExample.classification === 'OWNER_SECRET_RETENTION_DECISION_REQUIRED' && envExample.statusXY === ' M' && r.envExampleRelationship.path === envExample.path && r.envExampleRelationship.c4Category === envExample.role && r.envExampleRelationship.classification === envExample.classification && r.envExampleRelationship.trackedModified === true && !source.has('.env.example'), '.env.example relationship and classification explicitly resolve to private hold');

const artifacts = r.uniquePreservation.artifacts;
const archiveRoot = '/Users/kagekun/Library/Application Support/MUSIAM/archive/cleanup-c4a-unique-source-20260923';
const artifactNames = ['preserved-source.tar', 'SOURCE_MANIFEST.json', 'RAW_PATH_MANIFEST.json'];
check(sameSet(Object.keys(artifacts), artifactNames) && r.uniquePreservation.preservationRoot === archiveRoot && fs.realpathSync(archiveRoot) === archiveRoot && [original, root].every(p => path.relative(p, archiveRoot).startsWith('..' + path.sep)), 'fixed archive root is real and outside Original/canonical');
const artifactStats = new Map();
for (const [name, artifact] of Object.entries(artifacts)) {
  const st = fs.lstatSync(artifact.path);
  check(artifact.path === path.join(archiveRoot, name) && st.isFile() && !st.isSymbolicLink() && fs.realpathSync(artifact.path) === artifact.path && st.size === artifact.logicalBytes, `archive artifact metadata and exact path: ${name}`);
  artifactStats.set(name, st);
}
check([...artifactStats.values()].every(s => !privateStats.some(p => p.dev === s.dev && p.ino === s.ino)), 'archive artifacts do not inode-overlap private files before hashing');
for (const [name, artifact] of Object.entries(artifacts)) check(sha(artifact.path) === artifact.sha256, `archive artifact hash: ${name}`);
const sourceManifest = JSON.parse(fs.readFileSync(artifacts['SOURCE_MANIFEST.json'].path, 'utf8'));
const rawManifest = JSON.parse(fs.readFileSync(artifacts['RAW_PATH_MANIFEST.json'].path, 'utf8'));
check(sourceManifest.files.length === 21 && rawManifest.oneToOne && rawManifest.sourceNormalizationCollisions === 0 && rawManifest.archiveMemberNormalizationCollisions === 0 && rawManifest.mappings.length === 21, 'manifest raw/NFC uniqueness and bijection');
const manifest = new Map(sourceManifest.files.map(x => [nfc(x.originalRepoRelativePath), x]));
check(manifest.size === 21 && sameSet([...manifest.keys()], [...source.keys()]), 'source manifest exact source set');
check(sameSet(rawManifest.mappings.map(x => nfc(x.originalRepoRelativePath)), [...source.keys()]) && sameSet(rawManifest.mappings.map(x => nfc(x.archiveMemberPath)), [...source.keys()]) && sameSet(rawManifest.mappings.map(x => nfc(x.nfcPath)), [...source.keys()]) && rawManifest.mappings.every(x => x.exactOriginalPathSpelling === path.join(original, x.originalRepoRelativePath) && x.archiveMemberPath === x.originalRepoRelativePath && nfc(x.originalRepoRelativePath) === x.nfcPath), 'raw manifest maps every source path bijectively to exact archive and NFC spellings');
const tar = parseUstar(artifacts['preserved-source.tar'].path);
check(tar.length === 21 && new Set(tar.map(x => nfc(x.name))).size === 21, 'archive exactly 21 unique regular members');
const tarByPath = new Map(tar.map(x => [nfc(x.name), x]));
check(sameSet([...tarByPath.keys()], [...source.keys()]), 'archive has no missing or extra members');
for (const [p, item] of source) {
  const m = manifest.get(p); const t = tarByPath.get(p); const loss = losses.find(x => nfc(x.pathOrRef) === p);
  check(m.logicalBytes === item.logicalBytes && m.sha256 === item.sha256 && loss.logicalBytes === item.logicalBytes && loss.sha256 === item.sha256, `C4/C4A/source manifest consistency: ${p}`);
  check(JSON.stringify(m) === JSON.stringify(item) && m.fileType === 'regular' && m.c4LossCategory === loss.category && m.c4Rationale === loss.whyUnique && m.subsystem && m.existingEvidenceRelation.recoverability === loss.recoverability, `source manifest provenance and exact path fields: ${p}`);
  check(t.size === item.logicalBytes && t.hash === item.sha256, `archive content and size: ${p}`);
  check(sha(path.join(original, item.originalRepoRelativePath)) === item.sha256, `fresh source hash unchanged: ${p}`);
}
check(r.uniquePreservation.extractedCount === 21 && r.uniquePreservation.contentMatchCount === 21 && r.uniquePreservation.sizeMatchCount === 21 && r.uniquePreservation.nfcPathMatchCount === 21 && r.uniquePreservation.missingCount === 0 && r.uniquePreservation.extraCount === 0 && r.uniquePreservation.sourceDriftCount === 0 && r.uniquePreservation.sensitiveIntersection === 0 && r.uniquePreservation.temporaryVerificationDeleted === true && !fs.existsSync(path.join(archiveRoot, '.verify')), 'recorded extraction evidence is complete and temporary verifier is absent');

const listedWorktrees = git(original, 'worktree', 'list', '--porcelain').split('\n\n').filter(Boolean).map(block => {
  const values = Object.fromEntries(block.split('\n').map(line => { const i = line.indexOf(' '); return [i < 0 ? line : line.slice(0, i), i < 0 ? '' : line.slice(i + 1)]; }));
  return { path: values.worktree, head: values.HEAD, branch: values.branch || '', locked: Object.hasOwn(values, 'locked'), prunable: Object.hasOwn(values, 'prunable') };
});
const expectedLive = r.worktrees.map(x => x.path);
check(sameSet(listedWorktrees.filter(x => fs.existsSync(x.path)).map(x => x.path), [original, ...expectedLive]), 'discovered live worktrees exactly C4A set plus Original');
check(sameSet(expectedLive, c4.dependencies.linkedWorktrees.map(x => x.path)) && r.worktrees.length === 3, 'C4A worktrees are exactly C4 linked dependencies');
check(r.staleMissingRegistrations.length === 6 && r.staleMissingRegistrations.every(x => !fs.existsSync(x.worktree)), 'six stale registrations are separate from live worktrees');
for (const stale of r.staleMissingRegistrations) {
  const listed = listedWorktrees.find(x => x.path === stale.worktree);
  check(listed && listed.head === stale.HEAD && listed.prunable && !listed.locked, `stale registration captured as prunable: ${stale.worktree}`);
}
for (const wt of r.worktrees) {
  const live = listedWorktrees.find(x => x.path === wt.path); const actual = status(wt.path);
  check(live && live.locked === wt.locked && live.prunable === wt.prunable, `worktree locked/prunable state: ${wt.path}`);
  const common = git(wt.path, 'rev-parse', '--path-format=absolute', '--git-common-dir').trim(); const liveBranch = git(wt.path, 'branch', '--show-current').trim();
  check(common === original + '/.git' && fs.realpathSync(common) === fs.realpathSync(original + '/.git') && wt.gitCommonDir === common && wt.dependsOnOriginal, `worktree commonDir dependency: ${wt.path}`);
  check(git(wt.path, 'rev-parse', 'HEAD').trim() === wt.head && actual.digest === wt.statusSha256 && actual.modified === wt.modified && actual.dirtyTracked === wt.dirtyTracked && actual.staged === wt.staged && actual.untracked === wt.untracked, `worktree state/status: ${wt.path}`);
  check(wt.detached === (liveBranch === '') && (wt.detached ? wt.branch === '' && live.branch === '' : wt.branch === liveBranch && live.branch === `refs/heads/${liveBranch}`), `worktree branch/detached state: ${wt.path}`);
  check(wt.postReviewStateUnchanged === true, `worktree post-review state remained unchanged: ${wt.path}`);
  check(wt.plan?.executionAuthorized === false && wt.plan.steps.length >= 7 && wt.plan.stopConditions.length > 0 && [wt.plan.proposedPreservationRoot, wt.plan.proposedStandaloneRepository].every(p => path.relative(original, p).startsWith('..' + path.sep) && path.isAbsolute(p)), `worktree migration plan remains unauthorized and outside Original: ${wt.path}`);
}
const worktreeEnums = ['WORKTREE_DISPOSABLE_AFTER_PRESERVATION', 'WORKTREE_REQUIRES_PRESERVATION', 'WORKTREE_MUST_REMAIN_ACTIVE', 'WORKTREE_SEMANTIC_DECISION_REQUIRED'];
const actualWorktreeCounts = Object.fromEntries(worktreeEnums.map(key => [key, r.worktrees.filter(x => x.classification === key).length]));
check(sameSet(Object.keys(r.worktreeCounts), worktreeEnums) && worktreeEnums.every(key => r.worktreeCounts[key] === actualWorktreeCounts[key]) && JSON.stringify(r.worktreeCounts) === JSON.stringify({ WORKTREE_DISPOSABLE_AFTER_PRESERVATION: 0, WORKTREE_REQUIRES_PRESERVATION: 2, WORKTREE_MUST_REMAIN_ACTIVE: 0, WORKTREE_SEMANTIC_DECISION_REQUIRED: 1 }), 'worktree classifications and counts reconcile from rows');
const actualDependencies = r.worktrees.filter(wt => wt.dependsOnOriginal && wt.gitCommonDir === original + '/.git').length;
check(r.blockers.worktreePreservationRequired === actualWorktreeCounts.WORKTREE_REQUIRES_PRESERVATION && r.blockers.worktreeSemanticDecisionRequired === actualWorktreeCounts.WORKTREE_SEMANTIC_DECISION_REQUIRED && r.blockers.worktreeOriginalDependencies === actualDependencies, 'worktree blocker counts derive from actual states');
const zeroOperationKeys = ['originalWrites', 'originalGitMutations', 'originalDeletion', 'sourceDeletion', 'sourceMove', 'privateContentReads', 'privateHashesProduced', 'privateArchiveCopies', 'worktreeMutations', 'destructiveOperations', 'archiveDeletion', 'applicationChanges', 'providerOperations', 'paymentOperations', 'dataOperations', 'deployOperations', 'pushOperations', 'dependencyInstalls'];
check(zeroOperationKeys.every(key => Object.hasOwn(r.operations, key) && r.operations[key] === 0), 'all required zero-operation keys are explicitly present and zero');
check(r.operations.uniqueFilesCopied === 21 && r.operations.archivesCreated === 1 && r.operations.verificationDirectoriesRemoved === 1, 'authorized preservation operation counts are exact');
check(r.operationEvidenceBoundary.includes('not an OS-wide syscall audit') && r.operationEvidenceBoundary.includes('private zero-read'), 'zero-operation evidence boundary is explicitly scoped');
check(r.blockers.unpreservedUniqueSource === 0, 'all C4 source blockers are remediated');
const privateUnresolved = privateCounts.REQUIRED_PRIVATE_CONFIG_NOT_PRESERVED + privateCounts.OWNER_SECRET_RETENTION_DECISION_REQUIRED;
const requiresPreservation = actualWorktreeCounts.WORKTREE_REQUIRES_PRESERVATION;
const semanticUnresolved = actualWorktreeCounts.WORKTREE_SEMANTIC_DECISION_REQUIRED;
const expectedReadiness = privateUnresolved > 0 ? 'NOT_READY_PRIVATE_RETENTION_DECISION' : requiresPreservation > 0 ? 'NOT_READY_WORKTREE_PRESERVATION_REQUIRED' : actualDependencies > 0 ? 'NOT_READY_WORKTREE_MIGRATION_REQUIRED' : semanticUnresolved > 0 ? 'NOT_READY_WORKTREE_SEMANTIC_DECISION_REQUIRED' : 'READY_FOR_HUMAN_DELETION_GATE';
check(r.blockers.privateUnresolved === privateUnresolved && r.c4Readiness === expectedReadiness, 'readiness derives in exact private, preservation, dependency priority and fails closed for semantic uncertainty');
check(r.nextGate === 'C4-B PRIVATE RETENTION DECISION' && r.truthBoundary.includes('does not authorize deletion') && !r.humanDeletionGateOpened, 'next gate and truth boundary remain fail-closed');
console.log(`C4A_BLOCKER_REMEDIATION_VALIDATOR=PASS (${checks} checks); readiness=${r.c4Readiness}; archive=21/21; private=35 metadata-only; original deletion authorized=false`);
