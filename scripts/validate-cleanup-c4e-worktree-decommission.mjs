import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const recordPath = 'ops/recovery/cleanup-c4e-worktree-decommission-20260924.json';
const r = read(recordPath);
const dPath = 'ops/recovery/cleanup-c4d-worktree-remediation-20260924.json';
const d = read(dPath);
const a = read('ops/recovery/cleanup-c4a-blocker-remediation-20260923.json');
const c = read('ops/recovery/cleanup-c4c-private-preservation-20260924.json');
const v = read('ops/recovery/cleanup-c4-decommission-review-20260923.json');
const START = '7de25dd7fc9b9d9730073ef374214e641ed96b6e';
const ORIGINAL = '/Users/kagekun/Desktop/musiam-front';
const allowed = ['docs/AI/CLEANUP_C4E_WORKTREE_DECOMMISSION_EXECUTION.md', recordPath, 'scripts/validate-cleanup-c4e-worktree-decommission.mjs', 'docs/AI/RECOVERY_PLAN.md'];
const exact = ['/Users/kagekun/Desktop/musiam-front-astra', '/Users/kagekun/Desktop/musiam-front-stripe-fix', '/Users/kagekun/.codex/worktrees/6df2/musiam-front'];
const git = (cwd, ...args) => execFileSync('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', '-C', cwd, ...args], { maxBuffer: 16 * 1024 * 1024 });
const text = (cwd, ...args) => git(cwd, ...args).toString().trim();
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
const setEqual = (x, y) => x.length === y.length && same([...x].sort(), [...y].sort());
const split = b => b.toString().split('\0').filter(Boolean);
let checks = 0;
function check(ok, label) { if (!ok) throw new Error(`FAIL: ${label}`); checks++; }
function exists(p) { try { fs.lstatSync(p); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } }
function hash(p) {
  const h = crypto.createHash('sha256'); const fd = fs.openSync(p, 'r'); const buf = Buffer.alloc(1024 * 1024);
  try { let n; while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, n)); } finally { fs.closeSync(fd); }
  return h.digest('hex');
}
function metadata(p) {
  const s = fs.lstatSync(p, { bigint: true });
  return { path: p, type: s.isFile() ? 'regular' : s.isDirectory() ? 'directory' : 'symlink', size: Number(s.size), mtimeNs: String(s.mtimeNs), ctimeNs: String(s.ctimeNs), inode: Number(s.ino), device: Number(s.dev), mode: Number(s.mode & 0o7777n) };
}
function state(p) {
  const raw = git(p, 'status', '--porcelain=v1', '-z', '--untracked-files=normal'); const entries = split(raw);
  check(entries.every(x => [' M', '??'].includes(x.slice(0, 2))), 'known status categories only');
  return { path: p, head: text(p, 'rev-parse', 'HEAD'), branch: text(p, 'branch', '--show-current'), modified: entries.filter(x => x.startsWith(' M')).length, staged: 0, untracked: entries.filter(x => x.startsWith('??')).length, statusSha256: sha(raw), gitCommonDir: path.resolve(p, text(p, 'rev-parse', '--git-common-dir')) };
}
function registrations(raw) {
  return raw.trim().split('\n\n').map(block => Object.fromEntries(block.split('\n').map(line => { const i = line.indexOf(' '); return i < 0 ? [line, true] : [line.slice(0, i), line.slice(i + 1)]; })));
}

check(r.startingHead === START && r.canonicalInitiallyClean && r.canonicalBranch === 'recovery/musiam-clean-20260920', 'canonical starting State Lock');
check(text(root, 'branch', '--show-current') === r.canonicalBranch && same(r.allowedCanonicalPaths, allowed), 'canonical branch and exact allowlist');
const currentHead = text(root, 'rev-parse', 'HEAD'); const committed = currentHead !== START;
if (committed) {
  check(text(root, 'rev-parse', 'HEAD^') === START && text(root, 'log', '-1', '--format=%s') === 'recovery: decommission linked worktrees', 'commit parent/message');
  check(setEqual(split(git(root, 'diff-tree', '--no-commit-id', '--name-only', '-r', '-z', 'HEAD')), allowed), 'exact four-file commit');
  check(git(root, 'status', '--porcelain=v1', '-z', '--untracked-files=normal').length === 0, 'committed canonical clean');
} else {
  const dirty = split(git(root, 'status', '--porcelain=v1', '-z', '--untracked-files=normal'));
  check(dirty.every(x => [' M', 'M ', 'A ', '??'].includes(x.slice(0, 2))) && setEqual(dirty.map(x => x.slice(3)), allowed), 'precommit exact four-file scope');
}
check(r.approval === 'APPROVE_C4E_WORKTREE_DECOMMISSION', 'explicit approval');
check(r.originalRepo === ORIGINAL && same(r.removalOrder, exact) && same(r.eachWorktree.map(x => x.path), exact), 'exact removal paths/order');
check(setEqual(d.worktrees.map(x => x.path), exact) && setEqual(a.worktrees.map(x => x.path), exact), 'machine authority target set');
check(sha(git(root, 'show', `${START}:${dPath}`)) === r.c4dAuthoritySha256 && hash(path.join(root, dPath)) === r.c4dAuthoritySha256, 'immutable C4-D machine authority');
check(text(root, 'show', '-s', '--format=%P', START) === d.startingCanonicalHead && text(root, 'show', '-s', '--format=%s', START) === d.commitMessage, 'C4-D committed authority parent/message');
check(setEqual(split(git(root, 'diff-tree', '--no-commit-id', '--name-only', '-r', '-z', START)), d.allowedCanonicalPaths), 'C4-D committed exact scope');
check(r.c4dPreflightValidation.status === 'PASS' && r.c4dPreflightValidation.checks === 2906 && r.c4dPreflightValidation.closure === 'COMPLETE_COMMITTED', 'recorded live pre-removal C4-D validator PASS');
check(d.worktreeDecommissionReady && d.worktreeStatePreservation === 'COMPLETE' && d.ignoredStateBlocker === 'RESOLVED', 'C4-D eligibility');
check(d.independentReconstructions.length === 2, 'two dirty preservation reconstructions');
for (const rec of d.independentReconstructions) {
  const q = rec.reconstruction;
  check(hash(rec.manifestPath) === rec.manifestSha256 && rec.classification === 'WORKTREE_STATE_INDEPENDENTLY_PRESERVED', 'retained dirty reconstruction manifest');
  check(q.performed && q.freshReconstruction && !q.priorFailedRootUsedAsEvidence && !q.usesOriginalGit && !q.alternates && !q.shallow && q.missingBaseObjects === 0, 'independent fresh reconstruction');
  check(q.matchPercent === 100 && q.missing === 0 && q.extra === 0 && q.trackedPathSetMatch && q.untrackedPathSetMatch && q.fileHashSizeTypeModeMatch && q.nfcMatch && [321, 3].includes(q.matchedTargets), 'exact reconstruction result');
}
check(d.ignoredArtifactByteMatch && d.ignoredArtifactPreservedSha256 === d.ignoredArtifactReconstructedSha256 && d.ignoredArtifactBytes === 12058 && !d.ignoredArtifactContentReviewed, 'opaque XLSX preserved');
const astra = d.worktrees.find(x => x.path === exact[0]);
check(astra.uniqueWorkingTreeLocalState === 0 && astra.classification === 'WORKTREE_DISPOSABLE_AFTER_PRESERVATION' && astra.historyAudit.missingObjects === 0, 'Astra disposable history decision');
check(same(r.worktreesBefore, registrations(r.worktreeListPorcelainBefore)) && sha(Buffer.from(r.worktreeListPorcelainBefore)) === d.worktreeListPorcelainSha256, 'full before registration authority');
let remaining = r.worktreesBefore.map(x => x.worktree);
for (const [i, w] of r.eachWorktree.entries()) {
  const authority = d.worktrees.find(x => x.path === w.path);
  for (const k of ['path', 'head', 'branch', 'modified', 'staged', 'untracked', 'statusSha256', 'gitCommonDir']) check(w.stateBefore[k] === authority[k], `before source ${i} ${k}`);
  check(w.head === authority.head && w.branch === authority.branch && w.c4dDisposition === authority.classification, 'disposition and identity');
  check(w.preservationVerified && w.finalLiveStateMatched && w.preservedSourceMetadataMatchedBeforeRemoval && same(w.finalLiveStateBeforeRemoval, w.stateBefore), 'final live state matched before removal');
  check(w.removalMethod === (i === 0 ? 'git worktree remove' : 'git worktree remove --force') && w.removalExitCode === 0 && w.removalSuccess && w.pathAbsentAfter && w.registrationAbsentAfter, 'authorized exact removal confirmed');
  check(!exists(w.path) && w.branchRefsAndPreservationIntactAfter, 'removed path absent and immediate invariants checked');
  check(Number.isSafeInteger(w.allocatedBytesBefore) && w.allocatedBytesBefore > 0, 'before allocation measured');
  remaining = remaining.filter(x => x !== w.path);
  check(setEqual(w.registrationsAfterRemoval.map(x => x.worktree), remaining), 'only selected worktree registration removed');
}
check(!r.stateDriftBeforeRemoval && !r.partialFailure && !r.failure, 'no drift or partial failure');
check(same(r.staleRegistrationsAuthority, d.staleMissingRegistrations) && same(d.staleMissingRegistrations, a.staleMissingRegistrations), 'known stale authority');
const dry = r.staleRegistrationsDryRun; const stale = d.staleMissingRegistrations.map(x => x.worktree);
check(dry.exactKnownMissingSet && setEqual(dry.mapped.map(x => x.path), stale) && dry.mapped.length === 6, 'exact six approved missing registrations');
check(setEqual(dry.worktreesBeforePrune.map(x => x.worktree), [ORIGINAL, ...stale]) && r.unexpectedRegistrations.length === 0, 'prune pre-state accounted');
for (const x of dry.mapped) {
  check(!exists(x.path) && x.gitdirMetadataPath === path.join(ORIGINAL, '.git/worktrees', x.registration, 'gitdir') && !exists(x.gitdirMetadataPath), 'stale path and pruned metadata absent');
  check(x.dryRunLine === `Removing worktrees/${x.registration}: gitdir file points to non-existent location`, 'dry-run mapping reason');
}
check(setEqual(dry.output.trim().split('\n'), dry.mapped.map(x => x.dryRunLine)), 'every dry-run line mapped');
check(r.prunePerformed && r.pruneExitCode === 0 && same(r.prunedRegistrations, dry.mapped) && setEqual(r.pruneOutput.trim().split('\n'), dry.output.trim().split('\n')), 'prune exactly approved dry-run set');
const afterRaw = git(ORIGINAL, 'worktree', 'list', '--porcelain').toString();
check(afterRaw === r.worktreeListPorcelainAfter && same(registrations(afterRaw), r.worktreesAfter), 'live final registration snapshot');
check(r.worktreesAfter.length === 1 && r.worktreesAfter[0].worktree === ORIGINAL && r.externalWorktreeDependencyCountAfter === 0, 'Original only; zero external dependencies');
check(fs.lstatSync(ORIGINAL).isDirectory() && r.originalMainStillExists, 'Original still present');
check(same(r.originalStateBefore, d.originalAfter) && same(r.originalStateBefore, r.originalStateAfter) && same(state(ORIGINAL), r.originalStateAfter), 'Original HEAD branch status digest unchanged');
check(r.originalStateAfter.modified === 102 && r.originalStateAfter.staged === 0 && r.originalStateAfter.untracked === 433, 'Original 102/0/433');
check(r.allPersistentRefsBefore === r.allPersistentRefsAfter && text(ORIGINAL, 'for-each-ref', '--format=%(refname) %(objectname)') === r.allPersistentRefsBefore, 'all persistent refs unchanged');
check(setEqual(r.preservedBranchRefs.map(x => x.ref), ['refs/heads/astra-local-clean', 'refs/heads/fix/stripe-metal-print-webhook-20260914']), 'required branch refs');
for (const x of r.preservedBranchRefs) {
  check(x.preserved && x.independentRepository === d.repairCopy && [x.tipAfter, x.independentTipBefore, x.independentTipAfter, text(ORIGINAL, 'rev-parse', x.ref), text(d.repairCopy, 'rev-parse', x.ref)].every(t => t === x.tipBefore) && x.tipBefore === d.original.head, 'branch tip retained live and independently');
}
check(path.resolve(d.repairCopy, text(d.repairCopy, 'rev-parse', '--git-common-dir')) === path.join(d.repairCopy, '.git'), 'independent history storage');
check(!exists(path.join(d.repairCopy, '.git/objects/info/alternates')) && !exists(path.join(d.repairCopy, '.git/objects/info/http-alternates')) && text(d.repairCopy, 'rev-parse', '--is-shallow-repository') === 'false', 'no borrowed or shallow history storage');
const expectedArtifacts = [
  ...d.preservationArtifacts.map(x => ({ group: 'C4D', path: x.path, size: x.size, sha256: x.sha256 })),
  ...Object.values(a.uniquePreservation.artifacts).map(x => ({ group: 'C4A', path: x.path, size: x.logicalBytes, sha256: x.sha256 })),
  ...v.archives.c3c.map(x => ({ group: 'C3C', path: x.path, size: x.logicalBytes, mtimeNs: x.mtimeNs })),
  ...v.archives.c2.map(x => ({ group: 'C2', path: x.path, size: x.logicalBytes, mtimeNs: x.mtimeNs })),
  { group: 'R0_HISTORY', path: v.archives.r0Bundle.path, size: v.archives.r0Bundle.logicalBytes, mtimeNs: v.archives.r0Bundle.mtimeNs },
  ...v.r0PreservationArtifacts.map(x => ({ group: 'R0', path: x.path, size: x.logicalBytes, mtimeNs: x.mtimeNs })),
  ...c.verification.map(x => ({ group: 'C4C_PRIVATE', path: path.join(c.preservationRoot, 'files', x.path), size: x.logicalSize, mode: 0o600 })),
  { group: 'C4C_PRIVATE', path: c.preservationRoot }, { group: 'C4C_PRIVATE', path: path.join(c.preservationRoot, c.metadataSidecar) }, { group: 'R0_HISTORY', path: d.repairCopy },
];
check(setEqual(r.preservationBefore.map(x => x.metadata.path), expectedArtifacts.map(x => x.path)) && r.preservationAfter.length === expectedArtifacts.length, 'complete preservation authority set');
for (const x of expectedArtifacts) {
  const before = r.preservationBefore.find(y => y.metadata.path === x.path); const after = r.preservationAfter.find(y => y.metadata.path === x.path);
  check(before.group === x.group && after.group === x.group && same(before.metadata, after.metadata) && same(metadata(x.path), after.metadata), 'preservation metadata continuity');
  if (x.size !== undefined) check(before.metadata.type === 'regular' && before.metadata.size === x.size, 'artifact recorded type/size');
  if (x.mtimeNs !== undefined) check(Number(before.metadata.mtimeNs) === x.mtimeNs, 'historical artifact mtime continuity');
  if (x.mode !== undefined) check(before.metadata.mode === x.mode, 'private expected mode without payload read');
  if (x.sha256) check(hash(x.path) === x.sha256 && before.expectedSha256 === x.sha256, 'normal C4D/C4A artifact hash integrity');
}
check(c.privateRetentionBlocker === 'RESOLVED' && c.byteEqualCount === 8 && c.verification.every(x => x.byteEqual && x.sourceStable) && a.uniquePreservation.status === 'VERIFIED_21_OF_21' && d.unpreservedUniqueSource === 0, 'private and unique source blockers resolved by prior authorities');
check(r.preservationAuthoritiesIntact && r.privateRetentionBlocker === 'RESOLVED_C4C_CARRIED_FORWARD' && r.uniqueSourceBlocker === 'RESOLVED_C4A_C4B_CARRIED_FORWARD', 'blocker carry-forward boundaries');
check(r.worktreeDecommissionReclaimBytes === r.eachWorktree.reduce((n, w) => n + w.allocatedBytesBefore, 0) && r.reclaimBasis === 'SUM_REMOVED_WORKTREE_BEFORE_DU_SK_BYTES_NOT_ORIGINAL_RECLAIM', 'allocated worktree reclaim only');
check(!r.ssdConclusionCarryForward.ssdRequired && r.ssdConclusionCarryForward.symlinkCount === d.symlinkCount && r.ssdConclusionCarryForward.externalVolumeSymlinkCount === 0 && r.ssdConclusionCarryForward.externalTargetContentVerificationRequiredCount === 0, 'SSD/symlink authority carried forward');
for (const k of ['originalRepositoryDeleted', 'branchDeleted', 'c4fStarted']) check(r[k] === false, `false ${k}`);
for (const k of ['applicationChanges', 'providerOperations', 'deployOperations', 'pushOperations', 'privatePayloadReads', 'privatePayloadHashes', 'archiveDeletions', 'branchDeletionCount']) check(r[k] === 0, `scoped zero ${k}`);
const ready = r.eachWorktree.every(w => w.removalSuccess && !exists(w.path)) && r.externalWorktreeDependencyCountAfter === 0 && r.preservationAuthoritiesIntact && r.preservedBranchRefs.every(x => x.preserved) && same(r.originalStateBefore, r.originalStateAfter) && r.unexpectedRegistrations.length === 0 && r.prunedRegistrations.length === stale.length;
check(ready && r.status === 'COMPLETE' && r.c4eWorktreeDecommission === 'COMPLETE' && r.postCommitStatus === 'COMPLETE_COMMITTED' && r.worktreeDependencyBlocker === 'RESOLVED' && r.c4Readiness === 'READY_FOR_ORIGINAL_REPOSITORY_DELETION_REVIEW', 'readiness derived from completed conditions');
check(r.nextGate === 'C4-F ORIGINAL REPOSITORY FINAL DELETION REVIEW' && !r.c4fStarted && r.truthBoundary.includes('does not authorize Original deletion') && r.truthBoundary.includes('not production parity'), 'truth boundary and unstarted next Gate');
const plan = fs.readFileSync(path.join(root, allowed[3]), 'utf8');
check(plan.startsWith(git(root, 'show', `${START}:docs/AI/RECOVERY_PLAN.md`).toString()) && plan.includes('CLEANUP-C4E WORKTREE DECOMMISSION'), 'Recovery Plan append-only');
git(root, 'diff', '--check'); git(root, 'diff', '--cached', '--check'); checks++;
console.log(`C4E_VALIDATION = PASS (${checks} checks)`);
console.log(`C4E_WORKTREE_DECOMMISSION = ${committed ? 'COMPLETE_COMMITTED' : 'COMPLETE_PENDING_AUTHORIZED_LOCAL_COMMIT'}`);
console.log('WORKTREE_DEPENDENCY_BLOCKER = RESOLVED; ORIGINAL_GIT_EXTERNAL_WORKTREE_DEPENDENCY_COUNT = 0');
console.log(`WORKTREE_DECOMMISSION_RECLAIM_BYTES = ${r.worktreeDecommissionReclaimBytes}`);
console.log('C4_READINESS = READY_FOR_ORIGINAL_REPOSITORY_DELETION_REVIEW; C4-F = NOT_STARTED');
