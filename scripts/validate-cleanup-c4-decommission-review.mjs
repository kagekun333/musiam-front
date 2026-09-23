import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

// Review validator only. It intentionally requires the still-present Original.
// It cannot authorize deletion and does not run any application/provider action.
const root = process.cwd();
const recordPath = 'ops/recovery/cleanup-c4-decommission-review-20260923.json';
const reportPath = 'docs/AI/CLEANUP_C4_DECOMMISSION_REVIEW.md';
const read = (p) => JSON.parse(fs.readFileSync(path.resolve(root, p), 'utf8'));
const r = read(recordPath);
const a = read('ops/recovery/cleanup-c3-unknown-triage-20260923.json');
const b = read('ops/recovery/cleanup-c3b-semantic-review-20260923.json');
const c = read('ops/recovery/cleanup-c3c-preservation-20260923.json');
const c2 = read('ops/recovery/cleanup-c2-20260923.json');
const start = '233abd0cc6ef938ca5856ca646aaf7547b4beef6';
const original = '/Users/kagekun/Desktop/musiam-front';
const allowed = new Set([reportPath, recordPath, 'scripts/validate-cleanup-c4-decommission-review.mjs', 'docs/AI/RECOVERY_PLAN.md']);
const norm = (s) => s.normalize('NFC').replace(/\/$/, '');
let checks = 0;
function check(condition, label) { checks++; assert.ok(condition, label); }
function git(repo, ...args) {
  return execFileSync('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', '-c', 'gc.auto=0', '-C', repo, ...args], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
}
function sha(file) {
  const h = crypto.createHash('sha256');
  const fd = fs.openSync(file, 'r');
  try { const buffer = Buffer.alloc(1024 * 1024); let n;
    while ((n = fs.readSync(fd, buffer, 0, buffer.length, null))) h.update(buffer.subarray(0, n));
  } finally { fs.closeSync(fd); }
  return h.digest('hex');
}
const sameSet = (x, y) => x.length === y.length && new Set(x).size === x.length && x.every(v => new Set(y).has(v));
function outside(p) { const rel = path.relative(fs.realpathSync(original), fs.realpathSync(p)); return rel.startsWith('..' + path.sep) || path.isAbsolute(rel); }
function objects(repo, refs) {
  const lines = git(repo, 'rev-list', '--objects', '--no-object-names', '--missing=print', ...refs).trim().split('\n').filter(Boolean);
  return { readable: new Set(lines.filter(x => !x.startsWith('?'))), missing: lines.filter(x => x.startsWith('?')).map(x => x.slice(1)).sort() };
}
check(r.schemaVersion === 'cleanup-c4-decommission-review/v1' && r.reviewStatus === 'COMPLETE', 'review schema/status');
check(r.startingCanonicalHead === start && r.canonicalInitiallyClean, 'locked canonical start');
check(git(root, 'branch', '--show-current').trim() === r.canonicalBranch && r.canonicalBranch === 'recovery/musiam-clean-20260920', 'canonical branch');
const head = git(root, 'rev-parse', 'HEAD').trim();
check(head === start || (git(root, 'rev-parse', 'HEAD^').trim() === start && git(root, 'log', '-1', '--format=%s').trim() === 'recovery: review original repo decommission'), 'start or authorized local review commit');
check(sameSet(r.allowedCanonicalPaths, [...allowed]), 'exact four-file allowlist');
const changed = git(root, 'diff', '--name-only', '-z', start).split('\0').filter(Boolean);
const canonicalStatus = git(root, 'status', '--porcelain=v1', '-z', '--untracked-files=all').split('\0').filter(Boolean);
check([...changed, ...canonicalStatus.map(x => x.slice(3))].every(x => allowed.has(x)), 'no out-of-scope canonical changes');
if (head !== start) check(sameSet(git(root, 'diff-tree', '--no-commit-id', '--name-only', '-r', '-z', 'HEAD').split('\0').filter(Boolean), [...allowed]), 'committed exact four files');
check(git(original, 'rev-parse', 'HEAD').trim() === r.original.head && r.original.head === '117379b6c61ab3fc072b6cd4b80ce1d406b0e175', 'Original HEAD');
check(git(original, 'branch', '--show-current').trim() === r.original.branch && r.original.branch === 'codex/fix/stripe-metal-print-webhook-20260914', 'Original branch');
const statusRaw = git(original, 'status', '--porcelain=v1', '-z', '--untracked-files=normal');
const status = statusRaw.split('\0').filter(Boolean);
check(crypto.createHash('sha256').update(statusRaw).digest('hex') === r.original.statusSha256, 'Original exact Git status unchanged');
const modified = status.filter(x => x.slice(0, 2) !== '??' && x[1] !== ' ').map(x => norm(x.slice(3)));
const staged = status.filter(x => x.slice(0, 2) !== '??' && x[0] !== ' ');
const untracked = status.filter(x => x.startsWith('??')).map(x => norm(x.slice(3)));
check(modified.length === 102 && staged.length === 0 && untracked.length === 433, 'Original 102/0/433 status entries');
check(r.original.modified === 102 && r.original.staged === 0 && r.original.untrackedStatusEntries === 433, 'recorded original counts');
check(r.original.allocatedBytes === 7357771776 && r.estimatedDecommissionReclaimBytes === r.original.allocatedBytes, 'allocated measurement/reclaim estimate, not reclaimed');
for (const [key, live, previous] of [['modified', modified, a.modifiedTrackedStatusEntries], ['untracked', untracked, a.untrackedStatusEntries]]) {
  const accounting = r.statusAccounting[key];
  check(sameSet(accounting.entries.map(x => norm(x.path)), live) && sameSet(previous.map(x => norm(x.path)), live), `${key} exact path accounting`);
  check(accounting.entries.every(x => Object.values(x.dispositions).reduce((s, n) => s + n, 0) === x.currentFileCount), `${key} descendant counts reconcile`);
  check(accounting.inventoryUnaccounted === 0 && accounting.entries.every(x => Object.keys(x.dispositions).length), `${key} zero unclassified entries`);
  check(accounting.preservationUnaccounted === accounting.entries.filter(x => !x.restorationAccounted).length, `${key} unresolved restoration not hidden`);
  check(accounting.entries.every(x => x.restorationAccounted === (x.unresolvedPaths.length === 0)), `${key} unresolved paths must block`);
}
check(r.statusAccounting.modified.preservationUnaccounted === 1 && r.statusAccounting.untracked.preservationUnaccounted === 3, 'preservation-unaccounted 1/3 explicitly blocks');
const ignored = git(original, 'ls-files', '--others', '--ignored', '--exclude-standard', '-z').split('\0').filter(Boolean).map(norm);
check(sameSet(r.ignoredAccounting.files.map(x => norm(x.path)), ignored) && ignored.length === 796 && r.ignoredAccounting.unaccounted === 0, 'ignored non-Git inventory accounted');
check(r.categorySurvivability.length >= 14 && new Set(r.categorySurvivability.map(x => x.category)).size === r.categorySurvivability.length, 'survivability matrix complete and unique');
check(r.categorySurvivability.every(x => ['original','independentPreservation','preservationAuthority','verificationLevel','recoverabilityAfterDeletion','unresolvedUniqueness','c4Blocker'].every(k => Object.hasOwn(x, k))), 'matrix required fields');
const refs = git(original, 'for-each-ref', '--format=%(refname) %(objectname) %(objecttype)').trim().split('\n');
const repairRefs = git(r.history.repairCopy, 'for-each-ref', '--format=%(refname) %(objectname) %(objecttype)').trim().split('\n');
check(sameSet(refs, r.history.persistentRefs.map(x => `${x.ref} ${x.tip} ${x.type}`)) && sameSet(refs, repairRefs), '41 persistent refs match independent copy');
check(r.history.refCount === 41 && r.history.independentPreservedRefCount === 41 && r.history.unpreservedPersistentRefCount === 0, 'all persistent refs accounted');
for (const ref of r.history.persistentRefs) {
  const source = objects(original, [ref.ref]); const saved = objects(r.history.repairCopy, [ref.ref]);
  check([...source.readable].every(x => saved.readable.has(x)) && saved.missing.length === 0 && ref.originalReadableObjectsMissingFromRepair.length === 0 && ref.repairMissingObjects.length === 0 && ref.repairTipMatches && ref.status === 'PRESERVED_IN_R0_REPAIR_COPY', `ref reachable closure preserved: ${ref.ref}`);
}
const sourceObjects = objects(original, ['--all','--reflog']); const savedObjects = objects(r.history.repairCopy, ['--all','--reflog']);
check([...sourceObjects.readable].every(x => savedObjects.readable.has(x)) && sourceObjects.readable.size === 10893, 'all readable original ref/reflog objects preserved');
const reflog = git(original, 'rev-list', '--reflog', '--not', '--all').trim().split('\n');
const repairReflog = new Set(git(r.history.repairCopy, 'rev-list', '--reflog').trim().split('\n'));
check(sameSet(reflog, r.history.reflogOnlyCommits) && reflog.length === 24 && reflog.every(x => repairReflog.has(x)), '24 reflog-only commits independently preserved');
check(sameSet(savedObjects.missing, ['445c5df9b9533971eb4d21810d70219b8d59955a']) && sourceObjects.missing.includes(savedObjects.missing[0]) && r.history.preexistingMissingBlob.additionalLossOnDeletion === false, 'pre-existing missing B is not new deletion loss');
check(r.history.otherRefsStatus === 'ALL_CURRENT_PERSISTENT_REFS_INDEPENDENTLY_PRESERVED' && r.history.meaningfulUniqueHistoryLossCount === 0, 'OTHER_REFS explicitly resolved for current scope');
for (const repo of [root, r.history.repairCopy, r.history.readback]) {
  const common = git(repo, 'rev-parse', '--path-format=absolute', '--git-common-dir').trim();
  const storage = git(repo, 'count-objects', '-v');
  check(outside(common) && !storage.split('\n').some(x => x.startsWith('alternate:')), 'canonical/repair/readback Git storage independent of Original');
  check(git(repo, 'rev-parse', '--is-shallow-repository').trim() === 'false' && git(repo, 'for-each-ref', '--format=%(refname)', 'refs/replace').trim() === '', 'independent Git history is not shallow or replaced');
}
check(objects(r.history.readback, [r.original.head]).missing.length === 0 && r.archives.r0Bundle.sha256 === '40e1c86b7cc580e82882318b1dfa4b52ab6b58c89e51f671eb79573de21b20b5', 'R0 HEAD self-contained history sufficiency');
for (const artifact of [...r.archives.c2, ...r.archives.c3c, r.archives.r0Bundle]) {
  const s = fs.statSync(artifact.path);
  check(outside(artifact.path) && !fs.lstatSync(artifact.path).isSymbolicLink() && s.size === artifact.logicalBytes && Math.abs(s.mtimeMs * 1e6 - artifact.mtimeNs) < 2048, 'independent artifact remains present/unchanged metadata');
  check(artifact.sha256 === artifact.expectedSha256, 'recorded live artifact digest matches authority');
}
for (const [name, hash] of Object.entries(c2.archiveHashes)) check(r.archives.c2.some(x => path.basename(x.path) === name && x.sha256 === hash), 'C2 archive SHA authority');
for (const artifact of r.r0PreservationArtifacts) check(outside(artifact.path) && fs.statSync(artifact.path).size === artifact.logicalBytes, 'R0 fixed preservation exists outside Original');
check(c.actualTargetFiles === 383 && c.contentMatchCount === 383 && c.missingCount === 0 && c.sensitiveOverlapCount === 0 && c.gitMetadataOverlapCount === 0, 'C3-C verified authority');
check(sha(c.archiveFile) === c.archiveSha256 && c.archiveSha256 === '38312634a65edd12e54a3ba7493dfe285971147878db1bfe19041ec2631fd167', 'C3-C current archive digest');
check(sha(c.sourceManifest) === c.sourceManifestSha256 && sha(c.rawPathManifest) === c.rawPathManifestSha256, 'C3-C manifest digests');
check(b.finalDecisions.length === 1091 && r.c3bAccounting.targets === 1091 && JSON.stringify(r.c3bAccounting.decisions) === JSON.stringify(b.decisionCounts), 'C3-B 1091 targets retained');
for (const [decision, count] of [['PRESERVE_REQUIRED_BEFORE_C4',383],['ALREADY_PRESERVED_NO_EXTRA_ACTION',702],['RECOVERY_SUPERSEDES_CONFIRMED',5],['REGENERABLE_NO_PRESERVATION_REQUIRED',1]]) check(b.finalDecisions.filter(x => x.decision === decision).length === count, `C3-B ${decision}`);
const protectedPaths = new Set(a.fileManifest.filter(x => x.sensitive || x.localConfig || x.envPattern).map(x => norm(x.path)));
check(protectedPaths.size === 35 && sameSet(r.secretRetention.files.map(x => norm(x.path)), [...protectedPaths]) && r.secretRetention.secretOrEnvHoldCount === 13 && r.secretRetention.localConfigHoldCount === 22, '35 metadata-only private/local roles');
check(r.secretRetention.ownerDecisionRequired && !r.secretRetention.currentEqualityVerified && r.secretRetention.originalSensitiveContentReads === 0 && r.secretRetention.originalSensitiveHashesProduced === 0, 'secret retention decision retained, no current read/hash');
const proof = r.currentNonGitReview.contentVerifiedFiles;
check(proof.every(x => !protectedPaths.has(norm(x.path))) && new Set(proof.map(x => norm(x.path))).size === proof.length, 'current content proofs exclude protected paths and duplicates');
// Compare existing safe hashes, without rehashing multi-gigabyte Original assets.
const r0 = new Map();
const r0Root = path.dirname(r.r0PreservationArtifacts[0].path);
for (const name of ['source-file-manifest.tsv','tracked-file-manifest.tsv']) {
  const offset = name.startsWith('source') ? 1 : 0;
  for (const line of fs.readFileSync(path.join(r0Root, name), 'utf8').trimEnd().split('\n')) {
    const cols = line.split('\t'); const p = norm(cols.at(-1));
    if (!protectedPaths.has(p)) r0.set(p, { size: Number(cols[offset + 1]), hash: cols[offset + 3] });
  }
}
check(proof.filter(x => x.disposition === 'R0_CURRENT_MATCH').every(x => r0.get(norm(x.path))?.hash === x.sha256 && r0.get(norm(x.path))?.size === x.logicalBytes), 'recorded current file hashes match verified R0 manifest');
check(proof.length === 3363 && r.currentNonGitReview.fileCount === Object.values(r.currentNonGitReview.dispositionCounts).reduce((s,n) => s+n,0), 'current source proof and full category counts reconcile');
for (const item of proof.filter(x => x.disposition === 'CANONICAL_CURRENT_MATCH')) check(sha(path.join(root, item.path)) === item.sha256, 'canonical copy remains content-identical');
for (const item of r.currentNonGitReview.crossPathPreserved) {
  check(item.crossPathIndependentMatches.some(x => x.startsWith('R0:') && r0.get(norm(x.slice(3)))?.hash === item.sha256), 'cross-path duplicate has exact independent R0 hash');
}
const r5 = proof.filter(x => x.path.startsWith('SHA_collection_999_unique/'));
check(r5.length === 1000 && r.r5.currentContentMatches === 1000 && r.r5.status === 'PRESERVE_HOLD / SEPARATE_BUSINESS_SCOPE', 'R5 source/provenance survives independently');
check(r.r6.currentFiles === r.r6.samePathR0Matches + r.r6.headBundleFiles + r.r6.crossPathR0Matches + r.r6.uniqueUnpreservedFiles, 'R6 complete current descendant accounting');
check(r.dependencies.canonicalRuntimeBuildOriginalDependencies === 0 && r.dependencies.canonicalSymlinks === 0 && !r.dependencies.activeRecoveryFinalValidatorOriginalDependency, 'canonical runtime/build/recovery independence recorded');
check(r.dependencies.historicalSourceValidators.length === 4, 'live-source historical validator boundary explicit');
for (const wt of r.dependencies.linkedWorktrees) check(fs.existsSync(wt.path) && git(wt.path, 'rev-parse', '--path-format=absolute', '--git-common-dir').trim() === original + '/.git' && wt.blocked, 'surviving linked checkout dependency explicit');
check(r.dependencies.blockingDependencies === r.dependencies.linkedWorktrees.length && r.dependencies.blockingDependencies === 3, 'three linked checkout dependencies block');
const losses = r.uniqueLossIfOriginalDeleted.filter(x => x.confirmedMeaningfulLoss);
const unknown = r.uniqueLossIfOriginalDeleted.filter(x => !x.confirmedMeaningfulLoss);
check(losses.length === r.meaningfulUniqueLossCount && losses.length === 21 && new Set(losses.map(x => x.pathOrRef)).size === losses.length, '21 confirmed meaningful unique losses');
check(unknown.length === 35 && r.unresolvedPotentialMeaningfulLossCount === 35, 'unknown protected loss not promoted to zero');
check(r.uniqueLossIfOriginalDeleted.every(x => ['category','pathOrRef','description','whyUnique','existingPreservation','recoverability','severity','requiredAction'].every(k => Object.hasOwn(x, k))), 'unique-loss required fields');
check(losses.reduce((s,x) => s+x.logicalBytes, 0) === r.meaningfulUniqueLossLogicalBytes && r.meaningfulUniqueLossLogicalBytes === 105417, 'confirmed unique bytes');
for (const loss of losses) check(!protectedPaths.has(norm(loss.pathOrRef)) && sha(path.join(original, loss.pathOrRef)) === loss.sha256, 'small unpreserved evidence remains unchanged and present');
check(r.blockers.some(x => x.type === 'SOURCE' && x.count === losses.length) && r.blockers.some(x => x.type === 'SECRET' && x.count === unknown.length) && r.blockers.some(x => x.type === 'DEPENDENCY' && x.count === 3), 'all source/secret/dependency blockers represented');
const verdicts = { HISTORY:'BLOCKED_UNPRESERVED_HISTORY', SOURCE:'BLOCKED_UNPRESERVED_SOURCE', SECRET:'BLOCKED_SECRET_RETENTION_DECISION', DEPENDENCY:'BLOCKED_DEPENDENCY' };
const first = ['HISTORY','SOURCE','SECRET','DEPENDENCY'].find(t => r.blockers.some(x => x.type === t && x.count > 0));
check(r.verdict === (first ? verdicts[first] : 'READY_FOR_HUMAN_DELETION_GATE'), 'verdict derived from blockers');
if (!first) check(r.meaningfulUniqueLossCount === 0 && r.unresolvedPotentialMeaningfulLossCount === 0 && r.statusAccounting.modified.preservationUnaccounted === 0 && r.statusAccounting.untracked.preservationUnaccounted === 0, 'READY requires no known or unknown loss');
for (const k of ['originalWrites','originalGitMutations','destructiveOperations','originalDeletion','archiveDeletion','sourceMoves','sourceCopies','archiveCreation','applicationChanges','sensitiveContentReads','sensitiveHashesProduced','providerOperations','paymentOperations','deployOperations','pushOperations','dependencyInstalls']) check(r.operations[k] === 0, `zero operation declaration: ${k}`);
const report = fs.readFileSync(reportPath, 'utf8'); const plan = fs.readFileSync('docs/AI/RECOVERY_PLAN.md','utf8');
check(r.truthBoundary.includes('never deletion readiness') && report.includes('Truth boundary') && plan.includes('CLEANUP-C4'), 'truth boundary in all governance records');
check(report.includes(r.verdict) && plan.includes(r.verdict), 'report/plan verdict consistency');
check(!r.humanDeletionGateOpened && r.deletionApprovalRequired === 'APPROVE_C4_ORIGINAL_REPOSITORY_DELETION', 'deletion gate stays closed');
console.log(`C4_REVIEW_VALIDATOR=PASS (${checks} checks); C4_DECOMMISSION_REVIEW=${r.verdict}; meaningful unique loss=${losses.length}; private unknown=${unknown.length}; deletion authorized=false`);
