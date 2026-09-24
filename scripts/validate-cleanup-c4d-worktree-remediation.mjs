import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const r = read('ops/recovery/cleanup-c4d-worktree-remediation-20260924.json');
const a = read('ops/recovery/cleanup-c4a-blocker-remediation-20260923.json');
const c4 = read('ops/recovery/cleanup-c4-decommission-review-20260923.json');
const c4c = read('ops/recovery/cleanup-c4c-private-preservation-20260924.json');
const git = (cwd, ...args) => execFileSync('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', '-C', cwd, ...args], { maxBuffer: 32 * 1024 * 1024 });
const text = (cwd, ...args) => git(cwd, ...args).toString().trim();
const split = b => b.toString().split('\0').filter(Boolean);
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
const setEqual = (x, y) => x.length === y.length && same([...x].sort(), [...y].sort());
let checks = 0;
function check(ok, label) { if (!ok) throw new Error(`FAIL: ${label}`); checks++; }
function exists(p) { try { fs.lstatSync(p); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } }
function hash(p) {
  const h = crypto.createHash('sha256'); const fd = fs.openSync(p, 'r'); const buf = Buffer.alloc(1024 * 1024);
  try { let n; while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, n)); } finally { fs.closeSync(fd); }
  return h.digest('hex');
}
function sensitive(p) {
  return p.toLowerCase().split('/').some(x => ['.git', '.local', '.claude', '.vscode', '.vercel', '.ssh', '.aws', '.azure', '.config', '.netrc', '.npmrc', '.pypirc', 'credentials', 'secrets', 'private', 'private-preservation'].includes(x) || x.startsWith('.env')) || /(^|[/_.-])(credentials?|secrets?|passwords?|passwd|auth|tokens?|api[-_]?key|private[-_]?key)([/_.-]|$)/i.test(p) || /\.(pem|p12|pfx|key|keychain|keystore)$/i.test(p);
}
function noSymlinkAncestors(p, boundary) {
  for (let q = path.dirname(p); q.startsWith(boundary + '/') || q === boundary; q = path.dirname(q)) {
    check(fs.lstatSync(q).isDirectory() && !fs.lstatSync(q).isSymbolicLink(), 'directory traversal confined');
    if (q === boundary) break;
  }
}
function state(p, authority) {
  const raw = git(p, 'status', '--porcelain=v1', '-z'); const entries = split(raw);
  check(entries.every(x => [' M', '??'].includes(x.slice(0, 2))), 'no staged/rename/conflict state');
  const observed = { head: text(p, 'rev-parse', 'HEAD'), branch: text(p, 'branch', '--show-current'), modified: entries.filter(x => x.startsWith(' M')).length, staged: 0, untracked: entries.filter(x => x.startsWith('??')).length, statusSha256: sha(raw) };
  for (const k of Object.keys(observed)) check(observed[k] === authority[k], `live ${path.basename(p)} ${k}`);
  return path.resolve(p, text(p, 'rev-parse', '--git-common-dir'));
}
const allowed = ['docs/AI/CLEANUP_C4D_WORKTREE_DEPENDENCY_REMEDIATION.md', 'ops/recovery/cleanup-c4d-worktree-remediation-20260924.json', 'scripts/validate-cleanup-c4d-worktree-remediation.mjs', 'docs/AI/RECOVERY_PLAN.md'];
check(same(r.allowedCanonicalPaths, allowed), 'exact four-record allowlist');
check(r.startingCanonicalHead === '723f14f73e00cf0b793a8dd89b7d38125eb4ac30' && text(root, 'branch', '--show-current') === r.canonicalBranch, 'canonical starting authority');
const currentHead = text(root, 'rev-parse', 'HEAD'); const committed = currentHead !== r.startingCanonicalHead;
if (committed) {
  check(text(root, 'rev-parse', 'HEAD^') === r.startingCanonicalHead && text(root, 'log', '-1', '--format=%s') === r.commitMessage, 'authorized commit parent/message');
  check(setEqual(split(git(root, 'diff-tree', '--no-commit-id', '--name-only', '-r', '-z', 'HEAD')), allowed), 'commit exact four-record scope');
  check(git(root, 'status', '--porcelain=v1', '-z').length === 0, 'committed canonical clean');
} else {
  const entries = split(git(root, 'status', '--porcelain=v1', '-z'));
  check(entries.every(x => [' M', 'M ', 'A ', '??'].includes(x.slice(0, 2))) && setEqual(entries.map(x => x.slice(3)), allowed), 'precommit exact allowed scope');
}
check(r.status === 'VERIFIED_COMPLETE' && r.c4dWorktreeRemediation === 'COMPLETE' && r.postCommitStatus === 'COMPLETE_COMMITTED', 'completion and commit truth boundary');
check(!r.worktreeStateDrift && r.resumeStartedWithExactFourUnstagedRecords && r.canonicalInitiallyClean, 'starting state history');
check(same(r.original, r.originalAfter), 'recorded Original unchanged');
check(state(r.original.path, a.originalBefore) === path.join(r.original.path, '.git'), 'Original common dir');
for (const k of ['head', 'branch', 'modified', 'staged', 'untracked', 'statusSha256']) check(r.original[k] === a.originalBefore[k], `Original record ${k}`);
const registrations = git(r.original.path, 'worktree', 'list', '--porcelain');
check(sha(registrations) === r.worktreeListPorcelainSha256, 'all worktree registrations unchanged');
const registered = registrations.toString().trim().split('\n\n').map(x => ({ path: x.split('\n')[0].slice(9), prunable: x.split('\n').some(l => l.startsWith('prunable')) }));
const live = registered.filter(x => x.path !== r.original.path && exists(x.path));
check(live.length === 3 && setEqual(live.map(x => x.path), a.worktrees.map(x => x.path)), 'exact three live dependencies');
const stale = registered.filter(x => !exists(x.path));
check(stale.length === 6 && stale.every(x => x.prunable) && setEqual(stale.map(x => x.path), a.staleMissingRegistrations.map(x => x.worktree)), 'six stale registrations retained');
check(r.worktrees.length === 3 && setEqual(r.worktrees.map(x => x.path), a.worktrees.map(x => x.path)), 'three record identities');
for (const w of r.worktrees) {
  const authority = a.worktrees.find(x => x.path === w.path);
  check(state(w.path, authority) === authority.gitCommonDir && w.gitCommonDir === authority.gitCommonDir && w.dependsOnOriginal, 'linked Git dependency retained');
  for (const k of ['head', 'branch', 'modified', 'staged', 'untracked', 'statusSha256']) check(w[k] === authority[k], `worktree record ${k}`);
  check(same(split(git(w.path, 'ls-files', '--others', '--ignored', '--exclude-standard', '--directory', '-z')), w.ignoredInventory), 'ignored metadata inventory');
}
check(r.privatePreservationRoot === c4c.preservationRoot && fs.lstatSync(r.privatePreservationRoot).isDirectory() && r.privateRetentionBlocker === 'RESOLVED_C4C_CARRIED_FORWARD_NO_PAYLOAD_RECHECK', 'private preservation present; no payload recheck');
check(r.priorAttempts.length === 2 && r.priorAttempts[1].status === 'BLOCKED_WORKTREE_RECONSTRUCTION_FAILURE', 'prior failure preserved');
const failure = r.priorAttempts[1].reconstructionFailure;
check(failure.executorDefect && failure.modeMismatchCount === 63 && failure.typeMismatchCount === 0 && failure.sizeMismatchCount === 0 && failure.cause.includes('umask 077'), 'prior mode normalization cause recorded');
check(r.permissionPolicy.regularNormalizationScope === 'FRESH_TEMPORARY_RECONSTRUCTION_ONLY' && r.permissionPolicy.sourcePermissionsChanged === 0 && r.permissionPolicy.symlinkMode === 'NON_AUTHORITATIVE_FOR_C4D' && r.permissionPolicy.symlinkChmodCount === 0, 'file-type permission policy');
check(r.sensitiveDirtyOverlap === 0 && r.sensitiveFilter.candidates.length === 0 && r.sensitiveFilter.trackedCount === 63 && r.sensitiveFilter.expandedUntrackedCount === 260, 'complete sensitive path accounting');
check(r.pathSafety.payloadReadRootEscapes === 0 && r.pathSafety.writeRootEscapes === 0 && r.pathSafety.nfcCollisions === 0, 'path confinement and NFC boundary');
check(!r.ssdRequired && r.symlinkCount === 1 && r.externalVolumeSymlinkCount === 0 && r.externalTargetContentVerificationRequiredCount === 0 && r.externalTargetContentReads === 0, 'SSD not required');
check(r.externalDependency.type === 'symlink' && r.externalDependency.targetPathKind === 'absolute' && !r.externalDependency.externalVolume && !r.externalDependency.targetExistenceRequired && !r.externalDependency.sourceOrOriginalDeletionRemovesReferent, 'external dependency classification');
const manifests = [];
for (const rec of r.independentReconstructions) {
  check(fs.lstatSync(rec.manifestPath).isFile() && hash(rec.manifestPath) === rec.manifestSha256, 'state manifest integrity');
  const m = JSON.parse(fs.readFileSync(rec.manifestPath, 'utf8')); manifests.push(m);
  const w = r.worktrees.find(x => x.path === m.originalWorktreePath);
  check(w && w.classification === 'WORKTREE_STATE_INDEPENDENTLY_PRESERVED' && rec.classification === w.classification, 'dirty final disposition');
  check(m.head === w.head && m.branch === w.branch && m.detached === (w.branch === '') && m.trackedModifiedCount === w.modified && m.stagedCount === 0 && m.untrackedStatusEntryCount === w.untracked, 'manifest Git identity/counts');
  check(setEqual(split(git(w.path, 'diff', '--name-only', '-z', 'HEAD', '--')), m.trackedDirtyPaths), 'exact tracked delta paths');
  check(same(split(git(w.path, 'ls-files', '--others', '--exclude-standard', '-z')), m.untrackedRelativePaths), 'exact expanded untracked set');
  const rows = m.fileMetadata; const paths = rows.map(x => x.path);
  check(new Set(paths).size === rows.length && new Set(paths.map(x => x.normalize('NFC'))).size === rows.length && m.normalization.collisions === 0 && m.normalization.oneToOne, 'raw/NFC one-to-one');
  check(paths.every(x => !sensitive(x) && !path.isAbsolute(x) && !x.split('/').includes('..')), 'metadata filter before payload hashing');
  check(setEqual(rows.filter(x => x.kind === 'tracked').map(x => x.path), m.trackedDirtyPaths) && setEqual(rows.filter(x => x.kind === 'untracked').map(x => x.path), m.untrackedRelativePaths), 'manifest target accounting');
  for (const row of rows) {
    const source = path.join(w.path, row.path); noSymlinkAncestors(source, w.path); const s = fs.lstatSync(source, { bigint: true });
    check(Number(s.size) === row.size && String(s.mtimeNs) === row.mtimeNs && String(s.ctimeNs) === row.ctimeNs && Number(s.ino) === row.inode && Number(s.dev) === row.device, 'source metadata stability');
    if (row.type === 'symlink') {
      check(s.isSymbolicLink() && fs.readlinkSync(source) === row.linkTarget && row.linkTarget === r.externalDependency.target && row.path === r.externalDependency.path, 'symlink exact path/type/target identity');
      check(!paths.some(x => x.startsWith(row.path + '/')), 'no preserved descendants through link');
    } else check(row.type === 'regular' && s.isFile() && Number(s.nlink) === 1 && Number(s.mode & 0o7777n) === row.mode && fs.realpathSync(source).startsWith(fs.realpathSync(w.path) + '/'), 'regular type/mode/executable bits and confinement');
  }
  const rr = m.reconstruction;
  check(same(rr, rec.reconstruction) && rr.performed && rr.freshReconstruction && !rr.priorFailedRootUsedAsEvidence && !rr.usesOriginalGit && !rr.alternates && !rr.shallow, 'fresh independent reconstruction evidence');
  check(rr.gitCommonDir === path.join(rr.repo, '.git') && rr.repo.startsWith(r.temporaryVerification.freshRoot + '/') && rr.baseObjectCount === 7549 && rr.missingBaseObjects === 0, 'standalone base/common dir');
  check(rr.patchApply && rr.trackedPathSetMatch && rr.untrackedPathSetMatch && rr.fileHashSizeTypeModeMatch && rr.regularFileModesMatch && rr.nfcMatch && rr.missing === 0 && rr.extra === 0 && rr.matchPercent === 100, 'complete reconstruction match');
  check(rr.statusSha256 === w.statusSha256 && rr.matchedTargets === rows.length && rr.fileComparisons.length === rows.length && rr.sourceMetadataStable && rr.sourceHashesStable, 'complete source/reconstruction correspondence');
  check(rr.symlinkModePolicy === 'NON_AUTHORITATIVE_FOR_C4D' && rr.symlinkTargetIdentityRequired, 'symlink mode excluded from successful identity');
  for (const row of rows) {
    const proof = rr.fileComparisons.find(x => x.path === row.path);
    check(proof && proof.type === row.type && proof.kind === row.kind && proof.nfcPath === row.path.normalize('NFC') && proof.sizeMatch && !proof.symlinkModeAuthoritative, 'per-target reconstruction proof');
    if (row.type === 'regular') check(proof.modeMatch && proof.sha256 === row.sha256, 'regular reconstruction mode/content evidence');
    else check(proof.modeMatch === null && proof.linkTargetMatch, 'symlink target evidence without mode condition');
  }
}
// The complete source allowlist passed metadata checks before any source payload hash.
for (const m of manifests) {
  const dir = path.dirname(r.independentReconstructions.find(x => x.manifestPath.endsWith(`/${m.branch ? 'stripe-fix' : 'codex-6df2'}/WORKTREE_STATE.json`)).manifestPath);
  for (const row of m.fileMetadata) if (row.type === 'regular') check(hash(path.join(m.originalWorktreePath, row.path)) === row.sha256, 'current source byte identity');
  check(sha(git(m.originalWorktreePath, 'diff', '--binary', '--full-index', '--no-ext-diff', '--no-textconv', '--no-renames', 'HEAD', '--')) === m.patchSha256 && hash(path.join(dir, m.patchFilename)) === m.patchSha256, 'binary patch matches live unchanged source');
  check(hash(path.join(dir, m.untrackedArchiveFilename)) === m.untrackedArchiveSha256 && hash(path.join(dir, m.rawPathMappingFilename)) === m.rawPathMappingSha256, 'archive/mapping digest authority');
  const mapping = JSON.parse(fs.readFileSync(path.join(dir, m.rawPathMappingFilename), 'utf8'));
  check(mapping.length === m.fileMetadata.length && same(mapping.map(x => x.rawRelativePath), m.fileMetadata.map(x => x.path)) && mapping.every(x => Buffer.from(x.rawPathUtf8Hex, 'hex').toString('utf8') === x.rawRelativePath && x.nfcRelativePath === x.rawRelativePath.normalize('NFC')), 'raw UTF-8/NFC mapping');
  check(m.normalization.reconstructedFilesystemRawPaths.every(x => x.sourceRawPath.normalize('NFC') === x.nfcPath && x.reconstructedRawPath.normalize('NFC') === x.nfcPath), 'actual reconstruction filesystem normalization');
  // No extraction: stream archive regular bytes and compare hashes, keep symlinks as strings only.
  const verified = JSON.parse(execFileSync('python3', ['-c', `import json,sys,tarfile,hashlib,unicodedata
from pathlib import Path
p=Path(sys.argv[1]);m=json.loads(p.read_text());rows={x['path']:x for x in m['fileMetadata'] if x['kind']=='untracked'}
with tarfile.open(p.parent/m['untrackedArchiveFilename'],'r:') as tf:
 members=tf.getmembers();assert [x.name for x in members]==m['untrackedRelativePaths'];assert len({unicodedata.normalize('NFC',x.name) for x in members})==len(members)
 for entry in members:
  row=rows[entry.name];assert not entry.name.startswith('/') and '..' not in entry.name.split('/')
  if row['type']=='symlink':assert entry.issym() and entry.linkname==row['linkTarget']
  else:
   assert entry.isfile() and entry.size==row['size'] and entry.mode==row['mode'];h=hashlib.sha256()
   with tf.extractfile(entry) as stream:
    for b in iter(lambda:stream.read(1024*1024),b''):h.update(b)
   assert h.hexdigest()==row['sha256']
print(json.dumps({'members':len(members),'match':True}))`, path.join(dir, 'WORKTREE_STATE.json')], { encoding: 'utf8' }));
  check(verified.match && verified.members === m.untrackedPathCount, 'archive exact member/content/type/mode identity');
}
const six = manifests.find(x => x.detached); const stripe = manifests.find(x => !x.detached);
check(manifests.length === 2 && six.trackedModifiedCount === 62 && six.untrackedStatusEntryCount === 143 && six.untrackedPathCount === 258 && six.untrackedRegularFileCount === 257 && six.untrackedSymlinkCount === 1 && six.ignoredArtifactCount === 1, '6df2 counts distinguish status/files/link/ignored');
check(stripe.trackedModifiedCount === 1 && stripe.untrackedStatusEntryCount === 2 && stripe.untrackedPathCount === 2 && stripe.untrackedRegularFileCount === 2 && stripe.untrackedSymlinkCount === 0 && stripe.ignoredArtifactCount === 0, 'stripe counts');
check(six.reconstruction.regularFilesModeNormalized === 62 && stripe.reconstruction.regularFilesModeNormalized === 1 && r.permissionPolicy.regularFilesNormalized === 63, 'verify-side permission normalization complete');
const xs = six.ignoredArtifact; const xr = six.fileMetadata.find(x => x.kind === 'ignored-artifact');
check(r.ignoredArtifactCount === 1 && r.ignoredArtifactBytes === 12058 && r.ignoredArtifactPath === path.join(six.originalWorktreePath, xr.path) && r.ignoredArtifactPreservedPath === xs.preservedPath && xs.path === 'outputs/metal-print-cost-simulation/metal-print-global-cost-simulation.xlsx', 'exact ignored XLSX accounting');
noSymlinkAncestors(xs.preservedPath, r.preservationRoot);
check(fs.lstatSync(xs.preservedPath).isFile() && fs.statSync(xs.preservedPath).size === 12058 && hash(xs.preservedPath) === xr.sha256 && xs.sourceSha256 === xr.sha256 && xs.preservedSha256 === xr.sha256, 'XLSX preserved binary identity');
check(six.reconstruction.ignoredXlsxIncluded && six.reconstruction.ignoredXlsxSha256 === xr.sha256 && r.ignoredArtifactSourceSha256 === xr.sha256 && r.ignoredArtifactPreservedSha256 === xr.sha256 && r.ignoredArtifactReconstructedSha256 === xr.sha256, 'XLSX fresh reconstruction identity');
check(r.ignoredArtifactByteMatch && !r.ignoredArtifactContentReviewed && !xs.contentReviewed && r.ignoredArtifactClassification === 'IGNORED_ARTIFACT_PRESERVED' && r.ignoredArtifactContentSemantics === 'NOT_REVIEWED' && r.ignoredArtifactRegenerability === 'NOT_REQUIRED_FOR_DECOMMISSION' && r.ignoredStateBlocker === 'RESOLVED', 'opaque XLSX truth boundary');
check(r.baseAuthority.path === c4.archives.r0Bundle.path && r.baseAuthority.sha256 === c4.archives.r0Bundle.sha256 && r.baseAuthority.selfContainedBundleVerified, 'verified independent R0 base authority');
const bs = fs.statSync(r.baseAuthority.path, { bigint: true });
check(Number(bs.size) === r.baseAuthority.logicalBytes && String(bs.mtimeNs) === r.baseMetadata.mtimeNs, 'R0 bundle continuity since full hash/verify');
check(r.preservationArtifacts.length === 10 && fs.realpathSync(r.preservationRoot) === r.preservationRoot && !r.preservationRoot.startsWith(r.original.path + '/'), 'independent preservation location');
for (const item of r.preservationArtifacts) { noSymlinkAncestors(item.path, r.preservationRoot); check(fs.lstatSync(item.path).isFile() && fs.statSync(item.path).size === item.size && hash(item.path) === item.sha256, 'retained artifact integrity'); }
check(r.artifactRegenerationCount === 0 && r.reusedPartialArtifacts.every(x => r.preservationArtifacts.some(y => y.path === x.path && y.sha256 === x.sha256)) && r.reusedIgnoredArtifact.sha256 === xs.preservedSha256, 'partial artifacts reused unchanged');
const astra = r.worktrees.find(x => x.branch === 'astra-local-clean'); const repair = r.repairCopy;
check(astra.classification === 'WORKTREE_DISPOSABLE_AFTER_PRESERVATION' && astra.uniqueWorkingTreeLocalState === 0 && astra.ignoredInventory.length === 0, 'astra final decision');
for (const branch of ['astra-local-clean', stripe.branch]) check(text(repair, 'rev-parse', `refs/heads/${branch}`) === astra.head, 'independent source branch ref retained');
const closure = text(repair, 'rev-list', '--objects', '--missing=print', 'refs/heads/astra-local-clean').split('\n');
check(closure.length === 7549 && !closure.some(x => x.startsWith('?')), 'independent Astra history closure');
check(path.resolve(repair, text(repair, 'rev-parse', '--git-common-dir')) === path.join(repair, '.git') && !exists(path.join(repair, '.git/objects/info/alternates')) && !exists(path.join(repair, '.git/objects/info/http-alternates')) && text(repair, 'rev-parse', '--is-shallow-repository') === 'false' && text(repair, 'for-each-ref', '--format=%(refname)', 'refs/replace') === '', 'R0 repair storage independent');
check(r.temporaryVerification.freshRootRemoved && r.temporaryVerification.priorFailedRootRemoved && r.temporaryVerification.cleanupAfterBothFullPasses && !r.temporaryVerification.failedCopyUsedAsSuccessEvidence && !exists(r.temporaryVerification.freshRoot) && !exists(r.temporaryVerification.priorFailedRoot), 'temporary roots removed only after fresh full PASS');
check(r.worktreesIndependentlyPreservedCount === 2 && r.worktreesDisposableCount === 1 && r.originalGitDependencyCount === 3 && r.worktreeStatePreservation === 'COMPLETE', 'final worktree counts/state');
const ready = r.worktrees.filter(x => x.classification === 'WORKTREE_STATE_INDEPENDENTLY_PRESERVED').length === 2 && astra.classification === 'WORKTREE_DISPOSABLE_AFTER_PRESERVATION' && manifests.every(x => x.reconstruction.matchPercent === 100) && r.ignoredStateBlocker === 'RESOLVED';
check(ready && r.worktreeDecommissionReady === ready && r.unpreservedUniqueSource === 0, 'decommission readiness derived from evidence');
check(r.c4Readiness === 'NOT_READY_WORKTREE_DECOMMISSION_REQUIRED' && r.nextGate === 'C4-E WORKTREE DECOMMISSION EXECUTION' && !r.c4EStarted && !r.c4DeletionStarted && !r.humanDeletionGateOpened, 'next Gate not executed; Original deletion closed');
for (const k of ['originalWrites', 'originalGitMutations', 'linkedWorktreeMutations', 'sourcePermissionChanges', 'destructiveSourceOperations', 'preservationArtifactDeletion', 'privateContentReads', 'privateHashesProduced', 'privatePreservationMutations', 'externalVolumeScans', 'externalVolumeBulkCopies', 'symlinkReferentCopies', 'symlinkChmod', 'applicationChanges', 'providerOperations', 'deployOperations', 'pushOperations', 'dependencyInstalls']) check(r.operations[k] === 0, `task-scoped zero ${k}`);
check(r.preservationOperations.patchesCreatedTotal === 2 && r.preservationOperations.untrackedArchivesCreatedTotal === 2 && r.preservationOperations.ignoredArtifactsCopiedTotal === 1 && r.preservationOperations.freshSuccessfulReconstructions === 2, 'preservation operations separate from prohibited operations');
const plan = fs.readFileSync(path.join(root, allowed[3]), 'utf8');
check(plan.startsWith(git(root, 'show', `${r.startingCanonicalHead}:docs/AI/RECOVERY_PLAN.md`).toString()) && plan.includes('CLEANUP-C4D FINAL'), 'Recovery Plan preserves history and includes final result');
check(r.truthBoundary.includes('not application behavior') && r.truthBoundary.includes('Physical Original Git dependencies remain three'), 'truth boundary');
git(root, 'diff', '--check'); git(root, 'diff', '--cached', '--check'); checks++;
console.log(`C4D_VALIDATION = PASS (${checks} checks)`);
console.log(`C4D_WORKTREE_REMEDIATION = ${committed ? 'COMPLETE_COMMITTED' : 'COMPLETE_PENDING_AUTHORIZED_LOCAL_COMMIT'}`);
console.log('6df2 = 100%; stripe-fix = 100%; astra = DISPOSABLE; SSD_REQUIRED = false');
console.log('WORKTREE_DECOMMISSION_READY = true; ORIGINAL_GIT_DEPENDENCY_COUNT = 3');
console.log('C4_READINESS = NOT_READY_WORKTREE_DECOMMISSION_REQUIRED; C4-E = NOT_STARTED');
