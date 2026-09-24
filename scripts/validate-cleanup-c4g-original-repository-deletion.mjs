import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Post-deletion validator: Original is only lstat-tested for absence. No Git,
// content, directory enumeration or historical validator is run against it.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGINAL = '/Users/kagekun/Desktop/musiam-front';
const START = '6c5ea76dee4d8d6f990d28ee1f231e546123ab85';
const branch = 'recovery/musiam-clean-20260920';
const recordPath = 'ops/recovery/cleanup-c4g-original-repository-deletion-20260925.json';
const allowed = ['docs/AI/CLEANUP_C4G_ORIGINAL_REPOSITORY_DELETION_EXECUTION.md', recordPath, 'scripts/validate-cleanup-c4g-original-repository-deletion.mjs', 'docs/AI/RECOVERY_PLAN.md'];
const read = p => JSON.parse(fs.readFileSync(path.resolve(root, p), 'utf8'));
const r = read(recordPath), f = read('ops/recovery/cleanup-c4f-final-blocker-remediation-20260924.json');
const c = read('ops/recovery/cleanup-c4c-private-preservation-20260924.json');
const d = read('ops/recovery/cleanup-c4d-worktree-remediation-20260924.json');
const a = read('ops/recovery/cleanup-c4a-blocker-remediation-20260923.json');
const v = read('ops/recovery/cleanup-c4-decommission-review-20260923.json');
const c3 = read('ops/recovery/cleanup-c3c-preservation-20260923.json');
let checks = 0;
function check(ok, label) { if (!ok) throw new Error(`FAIL: ${label}`); checks++; }
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
const setEqual = (x, y) => same([...x].sort(), [...y].sort());
const split = b => b.toString().split('\0').filter(Boolean);
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const inside = (p, base) => p === base || p.startsWith(base + '/');
function git(cwd, ...args) {
  check(!inside(path.resolve(cwd), ORIGINAL), 'never invoke Original Git');
  return execFileSync('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', '-C', cwd, ...args], { maxBuffer: 32 * 1024 * 1024 });
}
const text = (cwd, ...args) => git(cwd, ...args).toString().trim();
function absent(p) { try { fs.lstatSync(p); return false; } catch (e) { if (e.code === 'ENOENT') return true; throw e; } }
function independent(p) {
  check(path.isAbsolute(p) && !inside(p, ORIGINAL), 'independent absolute authority');
  for (let q = p; q !== path.dirname(q); q = path.dirname(q)) check(!fs.lstatSync(q).isSymbolicLink(), 'authority chain not symlink');
  check(fs.realpathSync(p) === p, 'exact independent realpath');
}
function metadata(p) {
  const s = fs.lstatSync(p, { bigint: true });
  return { path: p, type: s.isFile() ? 'regular' : s.isDirectory() ? 'directory' : 'symlink', size: Number(s.size), mtimeNs: String(s.mtimeNs), ctimeNs: String(s.ctimeNs), inode: Number(s.ino), device: Number(s.dev), mode: Number(s.mode & 0o7777n) };
}
function normalHash(p) {
  independent(p); check(!inside(p, c.preservationRoot), 'private content never hashed');
  return sha(fs.readFileSync(p));
}
check(root === '/Users/kagekun/Desktop/musiam-front-clean', 'exact Canonical root');
check(r.approval === 'APPROVE_C4G_ORIGINAL_REPOSITORY_DELETION' && r.approvalSource.includes('Explicit owner'), 'human approval recorded');
check(r.startingCanonicalHead === START && r.canonicalBranch === branch && r.canonicalBefore.clean, 'starting State Lock');
check(r.exactDeletionTarget === ORIGINAL && !['/', '/Users', '/Users/kagekun', '/Users/kagekun/Desktop', root].includes(r.exactDeletionTarget), 'exact scope excludes parents and Canonical');
const before = r.originalBefore;
check(before.path === ORIGINAL && before.realpath === ORIGINAL && before.isDirectory && !before.isSymlink, 'recorded exact Original identity');
check(before.head === '117379b6c61ab3fc072b6cd4b80ce1d406b0e175' && before.branch === 'codex/fix/stripe-metal-print-webhook-20260914', 'Original HEAD and branch');
check(before.modified === 102 && before.staged === 0 && before.untracked === 433 && before.statusSha256 === f.execution.originalAfter.statusSha256 && before.externalLinkedWorktrees === 0, 'Original pre-deletion status and worktree lock');
check(r.preDeletionValidator.includes('VERIFIED_COMPLETE_COMMITTED') && r.preDeletionValidator.includes('MEANINGFUL_UNIQUE_LOSS_COUNT = 0'), 'fresh pre-deletion C4F replay recorded');
const expectedBlockers = { meaningfulUniqueLossCount: 0, unaccountedModifiedTracked: 0, unaccountedUntrackedEntries: 0, ignoredMeaningfulStateUnresolved: 0, futureProductUnpreservedSource: 0, privateRetentionBlocker: 'RESOLVED', worktreeDependencyBlocker: 'RESOLVED', canonicalRuntimeDependencyOnOriginal: 0, canonicalGitDependencyOnOriginal: 0, externalLinkedWorktrees: 0, persistentRefsPreserved: 41, reflogOnlyCommitsPreserved: 24 };
check(same(r.preDeletionBlockers, expectedBlockers), 'all required blockers resolved');
for (const k of ['meaningfulUniqueLossCount', 'unaccountedModifiedTracked', 'unaccountedUntrackedEntries', 'ignoredMeaningfulStateUnresolved', 'externalLinkedWorktrees']) check(f[k] === 0, 'C4F blocker authority');
check(f.verdict === 'READY_FOR_HUMAN_DELETION_GATE' && f.futureProductSurvivability.every(x => x.unpreserved === 0), 'C4F READY and future source preserved');
check(absent(ORIGINAL) && r.originalExactPathAbsent, 'exact Original absent including dangling symlink');
independent(root); check(fs.lstatSync(root).isDirectory() && text(root, 'rev-parse', '--show-toplevel') === root, 'Canonical Git valid');
const head = text(root, 'rev-parse', 'HEAD'), committed = head !== START;
check(text(root, 'branch', '--show-current') === branch, 'Canonical branch unchanged');
check(!text(root, 'rev-list', '--objects', '--no-object-names', '--missing=print', 'HEAD').split('\n').some(x => x.startsWith('?')), 'Canonical current HEAD object closure intact');
check(r.canonicalImmediatelyAfter.head === START && r.canonicalImmediatelyAfter.branch === branch && r.canonicalImmediatelyAfter.clean, 'HEAD and clean tree immediately after deletion');
check(same(r.allowedCanonicalPaths, allowed) && r.commitMessage === 'recovery: complete original repo decommission', 'exact authorized records and commit');
if (committed) {
  check(text(root, 'rev-parse', 'HEAD^') === START && text(root, 'log', '-1', '--format=%s') === r.commitMessage, 'authorized direct-child commit');
  check(setEqual(split(git(root, 'diff-tree', '--no-commit-id', '--name-only', '-r', '-z', 'HEAD')), allowed), 'only four committed records');
  check(git(root, 'status', '--porcelain=v1', '-z', '--untracked-files=all').length === 0, 'committed tree clean');
} else check(setEqual(split(git(root, 'status', '--porcelain=v1', '-z', '--untracked-files=all')).map(x => x.slice(3)), allowed), 'only four pending records');
check(split(git(root, 'diff', '--name-only', START, '--', '.', ...allowed.map(p => `:(exclude)${p}`))).length === 0, 'no tracked application/runtime drift');
for (const x of r.authorities) check(sha(fs.readFileSync(path.join(root, x.path))) === x.sha256 && sha(git(root, 'show', `${START}:${x.path}`)) === x.sha256, 'historical authorities unchanged and committed');
for (const x of f.history.independence) {
  independent(x.repo); const gd = path.resolve(x.repo, text(x.repo, 'rev-parse', '--git-common-dir')); independent(gd);
  check(gd === x.commonDir && !inside(gd, ORIGINAL) && absent(path.join(gd, 'objects/info/alternates')) && text(x.repo, 'rev-parse', '--is-shallow-repository') === 'false', 'Git storage independent');
}
check(path.resolve(root, text(root, 'rev-parse', '--git-common-dir')) === path.join(root, '.git'), 'Canonical common dir itself');
const registrationText = text(root, 'worktree', 'list', '--porcelain');
const registrations = registrationText.split('\n').filter(x => x.startsWith('worktree ')).map(x => x.slice(9));
check(registrations.includes(root) && registrations.every(p => !inside(p, ORIGINAL)), 'Canonical registrations have no Original dependency');
check(same(registrations, r.canonicalPostDeleteWorktreeRegistrations), 'recorded Canonical registrations retained');
for (const p of registrations.filter(p => p !== root)) check(absent(p) && registrationText.split('\n\n').find(block => block.startsWith(`worktree ${p}\n`))?.includes('\nprunable '), 'unrelated stale Canonical registrations remain absent and prunable');
let symlinks = 0;
function scanLinks(p) { for (const x of fs.readdirSync(p, { withFileTypes: true })) { if (x.name === '.git') continue; if (x.isSymbolicLink()) symlinks++; else if (x.isDirectory()) scanLinks(path.join(p, x.name)); } }
scanLinks(root); check(symlinks === 0 && f.dependencies.canonicalRuntimeDependencyOnOriginal === 0, 'Canonical runtime has no symlink dependency, source unchanged');
const expectedCheckpoints = [...f.preservationContinuity.map(x => ({ group: x.group, metadata: x.metadata })), ...f.execution.artifacts.map(x => ({ group: 'C4F', metadata: r.preservationBefore.find(y => y.metadata.path === x.path)?.metadata }))];
check(same(r.preservationBefore, expectedCheckpoints) && same(r.preservationAfter, r.preservationBefore), 'all 46 preservation checkpoints before/after');
for (const x of r.preservationAfter) { independent(x.metadata.path); check(same(metadata(x.metadata.path), x.metadata), 'live preservation metadata continuity'); }
check(['R0', 'R0_HISTORY', 'C2', 'C3C', 'C4A', 'C4C_PRIVATE', 'C4D', 'C4F'].every(g => r.preservationAfter.some(x => x.group === g)), 'all required preservation groups');
for (const x of [...Object.values(a.uniquePreservation.artifacts), ...d.preservationArtifacts, ...v.archives.c3c, ...f.execution.artifacts]) check(normalHash(x.path) === x.sha256, 'normal archive digest continuity');
check(setEqual(f.execution.artifacts.map(x => x.sha256), ['dbdea377ee6853a6c6a9b7cb14d99e8d550dca2dc26e0b0bcbe42548affa03d9', '4715840b67db75f263cc6378bfa710d6c954628e8a188d95312a4c668b53da09', 'c982729f42caa39f5145b581492eaf3bc141e2969e0ecca2bd6a572adbfb31d3']), 'exact C4F hashes');
check(c3.actualTargetFiles === 383 && c3.contentMatchCount === 383 && a.uniquePreservation.contentMatchCount === 21 && d.preservationArtifacts.length === 10, 'historical C3C/C4A/C4D preservation');
const privateFiles = [], privateDirs = [];
function privateInventory(p) { privateDirs.push(p); for (const x of fs.readdirSync(p, { withFileTypes: true })) { const q = path.join(p, x.name); check(!x.isSymbolicLink(), 'private no symlinks'); if (x.isDirectory()) privateInventory(q); else { check(x.isFile(), 'private regular file'); privateFiles.push(q); } } }
privateInventory(c.preservationRoot);
check(setEqual(privateFiles, [...c.targetPaths.map(p => path.join(c.preservationRoot, 'files', p)), path.join(c.preservationRoot, c.metadataSidecar)]) && c.targetPaths.length === 8, 'private exact eight plus sidecar');
check(setEqual(privateDirs, c.destinationDirectories.map(p => path.join(c.preservationRoot, p))), 'private exact directories');
check(same(r.privateMetadataBefore, r.privateMetadataAfter), 'private before/after metadata unchanged');
check(setEqual(r.privateMetadataAfter.map(x => x.path), [path.dirname(c.preservationRoot), ...privateDirs, ...privateFiles]), 'complete private metadata set');
for (const x of r.privateMetadataAfter) {
  independent(x.path); const s = fs.lstatSync(x.path);
  check(same(metadata(x.path), x) && s.uid === process.getuid() && (s.mode & 0o7777) === (s.isDirectory() ? 0o700 : 0o600), 'private owner and 0700/0600 metadata');
  check(!/^\s*\d+:/m.test(execFileSync('/bin/ls', ['-lde', x.path], { encoding: 'utf8' })), 'private no ACL');
}
const repair = v.history.repairCopy, readback = v.history.readback;
for (const x of f.history.persistentRefs) check(text(repair, 'rev-parse', x.ref) === x.tip, 'independent persistent ref');
check(f.history.persistentRefs.length === 41 && f.history.reflogOnlyCommits.length === 24, '41 refs and 24 reflog commits');
const commits = new Set(text(repair, 'rev-list', '--all', '--reflog').split('\n'));
for (const oid of f.history.reflogOnlyCommits) check(commits.has(oid), 'independent reflog commit');
const closure = (repo, ...refs) => text(repo, 'rev-list', '--objects', '--no-object-names', '--missing=print', ...refs).split('\n');
const hc = closure(readback, before.head), pc = closure(repair, ...f.history.persistentRefs.map(x => x.tip));
check(hc.length === 7549 && !hc.some(x => x.startsWith('?')) && !pc.some(x => x.startsWith('?')), 'self-contained HEAD and persistent ref closures');
const repairClosure = closure(repair, '--all', '--reflog');
check(setEqual(repairClosure.filter(x => x.startsWith('?')).map(x => x.slice(1)), f.history.repairMissingObjects), 'only recorded pre-existing history gaps');
// R0 includes repaired blob A, which Original lacked: 10,894 versus 10,893.
// Full Original-to-repair membership was verified before deletion by C4F.
check(f.history.readableObjectCount === 10893 && repairClosure.filter(x => !x.startsWith('?')).length === 10894 && r.independentReadableObjectCount === 10894, 'independent readable history count includes repaired A');
check(text(repair, 'cat-file', '-t', 'ed77db6020119caae3f992b7a70d41dfd1c86b76') === 'blob', 'repaired history blob survives');
for (const [p, m] of Object.entries(r.siblingsBefore)) { const s = fs.lstatSync(p); check(s.ino === m.inode && s.dev === m.device, 'sibling root identity retained'); }
check(r.siblingIdentityContinuity && r.deletionAttempts === 1 && r.deletionMethod.includes('symlink-attack-resistant'), 'single guarded deletion and sibling continuity');
for (const [key, value] of Object.entries(r.operations)) check(value === 0, `no ${key}`);
check(setEqual(Object.keys(r.operations), ['unrelatedPathsDeleted', 'canonicalDeletion', 'preservationDeletion', 'branchRefSeparateDeletion', 'applicationRuntimeChanges', 'privatePayloadReads', 'privatePayloadHashes', 'dependencyReinstall', 'provider', 'payment', 'deploy', 'push']), 'complete operation boundaries');
check(before.allocatedBytes === 7353495552 && r.deletedOriginalAllocatedBytes === before.allocatedBytes && r.knownPreDeletionAllocatedBytes === 7353495552, 'deleted allocation recorded before removal');
check(r.filesystemBefore.device === r.filesystemAfter.device && r.observedFilesystemFreeSpaceDeltaBytes === r.filesystemAfter.availableBytes - r.filesystemBefore.availableBytes && r.reclaimBoundary.includes('not exact reclaim'), 'same filesystem delta distinguished');
check(r.originalGitPhysicalRepository === 'DELETED_BY_AUTHORIZATION' && r.meaningfulGitHistorySurvivesIndependently, 'intentional physical Git deletion with independent history');
check(r.status === 'COMPLETE' && r.originalRepository === 'DECOMMISSIONED' && r.musiamRecoveryCleanup === 'COMPLETE' && r.dependencyRestoreRequiredBeforeAppDevelopment, 'cleanup closure and dependency boundary');
check(r.historicalValidatorPolicy === 'NOT_APPLICABLE_POST_DELETION' && r.nextGate === 'POST_RECOVERY_DEVELOPMENT_BASELINE' && r.recommendedNextModel === 'GPT-6 Luna', 'historical validator and next Gate');
const report = fs.readFileSync(path.join(root, allowed[0]), 'utf8'), plan = fs.readFileSync(path.join(root, allowed[3]), 'utf8');
check(plan.startsWith(git(root, 'show', `${START}:docs/AI/RECOVERY_PLAN.md`).toString()), 'plan append-only');
for (const token of ['BLOCKED_PRODUCT_CONTRACT', 'PAID_CONTINUATION_NOT_ACTIVATED', 'ORACLE_INACTIVE_BY_DESIGN', 'R2 HOLD', 'R3 preserved', 'R5 separate scope', 'post-RC Privacy / Digital Commerce / LLM redesign']) check(r.truthBoundary.includes(token) && report.includes(token) && plan.includes(token), 'product truth boundary retained');
for (const token of ['C4G_ORIGINAL_REPOSITORY_DELETION = COMPLETE', 'ORIGINAL_REPOSITORY = DECOMMISSIONED', 'MUSIAM_RECOVERY_CLEANUP = COMPLETE', 'DEPENDENCY_RESTORE_REQUIRED_BEFORE_APP_DEVELOPMENT = true']) check(report.includes(token) && plan.includes(token), 'human closure records');
git(root, 'diff', '--check'); git(root, 'diff', '--cached', '--check');
console.log(`C4G_POST_DELETE_VALIDATOR = PASS (${checks} checks)`);
console.log(`C4G_ORIGINAL_REPOSITORY_DELETION = ${committed ? 'COMPLETE_COMMITTED' : 'COMPLETE_PENDING_AUTHORIZED_LOCAL_COMMIT'}`);
console.log('ORIGINAL_REPOSITORY = DECOMMISSIONED; MUSIAM_RECOVERY_CLEANUP = COMPLETE');
