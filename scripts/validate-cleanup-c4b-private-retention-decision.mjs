import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Read-only, pre-decommission verifier. Private payloads and mixed R0 archives
// are never opened or hashed. Only the fixed Group C allowlist permits payload reads.
const root = '/Users/kagekun/Desktop/musiam-front-clean';
const original = '/Users/kagekun/Desktop/musiam-front';
const start = 'eabf76a5cb35b7b3c973c3b4b7a9dc75eb9e932c';
const branch = 'recovery/musiam-clean-20260920';
const recordPath = 'ops/recovery/cleanup-c4b-private-retention-decision-20260923.json';
const aPath = 'ops/recovery/cleanup-c4a-blocker-remediation-20260923.json';
const c4Path = 'ops/recovery/cleanup-c4-decommission-review-20260923.json';
const allowed = [
  'docs/AI/CLEANUP_C4B_PRIVATE_RETENTION_DECISION.md', recordPath,
  'scripts/validate-cleanup-c4b-private-retention-decision.mjs', 'docs/AI/RECOVERY_PLAN.md',
];
const groups = {
  A: ['.env', '.env.local', '.env.stripe-sandbox.local', '.vercel/.env.preview.local'],
  B: ['.vscode/settings.json', '.vscode/tasks.json', '.claude/settings.local.json', '.local/abi-knowledge/abi-canonical.json'],
  C: ['.env.local.example', '.env.example', 'src/lib/metal-print-consultation-token.server.ts', 'src/lib/design/tokens.ts', 'src/styles/renovation-tokens.css', 'scripts/audit-secret-hygiene.mjs', 'public/nft/token-template.json', '.husky/commit-msg'],
};
const r0Root = '/Users/kagekun/Library/Application Support/MUSIAM/recovery/20260920T-r0-completion-01a0beba';
let checks = 0;
function check(ok, label) { checks++; assert.ok(ok, label); }
function equal(a, b, label) { checks++; assert.deepEqual(a, b, label); }
function setEqual(a, b, label) { equal([...a].sort(), [...b].sort(), label); check(new Set(a).size === a.length, `${label}: no duplicates`); }
const read = p => fs.readFileSync(path.resolve(root, p), 'utf8');
const json = p => JSON.parse(read(p));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function git(repo, ...args) {
  return execFileSync('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', '-c', 'gc.auto=0', '-C', repo, ...args], { encoding: 'buffer', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 });
}
const gitText = (repo, ...args) => git(repo, ...args).toString('utf8');
function status(repo) {
  const raw = git(repo, 'status', '--porcelain=v1', '-z', '--untracked-files=normal');
  const fields = raw.toString('utf8').split('\0'); const entries = [];
  for (let i = 0; i < fields.length - 1; i++) {
    if (!fields[i]) continue;
    const xy = fields[i].slice(0, 2); const p = fields[i].slice(3);
    entries.push({ xy, path: p });
    if (/[RC]/.test(xy)) i++;
  }
  return {
    state: {
      head: gitText(repo, 'rev-parse', 'HEAD').trim(), branch: gitText(repo, 'branch', '--show-current').trim(),
      modified: entries.filter(x => x.xy !== '??' && x.xy[1] !== ' ').length,
      dirtyTracked: entries.filter(x => x.xy !== '??').length,
      staged: entries.filter(x => x.xy !== '??' && x.xy[0] !== ' ').length,
      untracked: entries.filter(x => x.xy === '??').length, statusSha256: sha(raw),
    }, entries,
  };
}
function regular(p) {
  check(fs.realpathSync(p) === p, 'exact real path, no symlink redirection');
  for (let q = p; q !== path.dirname(q); q = path.dirname(q)) check(!fs.lstatSync(q).isSymbolicLink(), 'no symlink component');
  const st = fs.lstatSync(p); check(st.isFile(), 'regular file required'); return st;
}
const r = json(recordPath), a = json(aPath), c4 = json(c4Path);
check(process.cwd() === root, 'exact canonical workspace');
equal(r.schemaVersion, 1, 'schema');
check(r.status === 'COMPLETE' && ['PENDING', 'PASS'].includes(r.validation.status), 'decision and validation lifecycle');
equal(r.startingCanonicalHead, start, 'starting HEAD correct');
equal(r.canonicalBranch, branch, 'recorded branch');
check(r.canonicalInitiallyClean && r.canonicalBefore.head === start && r.canonicalBefore.branch === branch && r.canonicalBefore.statusSha256 === sha(Buffer.alloc(0)), 'starting State Lock clean');
setEqual(r.allowedCanonicalPaths, allowed, 'four-path allowlist');
const now = status(root);
equal(now.state.branch, branch, 'current branch');
if (now.state.head !== start) {
  equal(gitText(root, 'rev-parse', 'HEAD^').trim(), start, 'only this Gate commit after start');
  equal(gitText(root, 'log', '-1', '--format=%s').trim(), 'recovery: decide C4 private retention', 'authorized commit message');
  setEqual(gitText(root, 'diff', '--name-only', '-z', `${start}..HEAD`).split('\0').filter(Boolean), allowed, 'committed paths');
}
const changed = [
  ...gitText(root, 'diff', '--name-only', '-z', start).split('\0').filter(Boolean),
  ...gitText(root, 'ls-files', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean),
];
check(changed.every(p => allowed.includes(p)), 'no application or out-of-scope changes');
check(now.entries.every(x => allowed.includes(x.path)), 'index/worktree allowlist');
const prior = a.privateRetention.files.filter(x => ['REQUIRED_PRIVATE_CONFIG_NOT_PRESERVED', 'OWNER_SECRET_RETENTION_DECISION_REQUIRED'].includes(x.classification));
const priorMap = new Map(prior.map(x => [x.path, x]));
equal(prior.length, 16, 'C4A unresolved target total');
setEqual(prior.map(x => x.path), Object.values(groups).flat(), 'fixed owner partition equals machine authority');
setEqual([...r.privateFiles, ...r.sourceFiles].map(x => x.path), prior.map(x => x.path), '16 targets exactly once, overlap and missing zero');
equal(r.counts.unresolvedTargets, 16, 'reported unresolved target total');
equal(r.counts.overlap, 0, 'reported overlap');
equal(r.counts.missing, 0, 'reported missing');
for (const group of ['A', 'B', 'C']) {
  const rows = [...r.privateFiles, ...r.sourceFiles].filter(x => x.group === group);
  setEqual(rows.map(x => x.path), groups[group], `Group ${group} exact paths`);
  equal(r.counts[`group${group}`], groups[group].length, `Group ${group} count`);
}
const live = status(original);
equal(live.state, a.originalAfter, 'Original HEAD/branch/102/0/433/status digest unchanged from C4A');
equal(r.originalBefore, live.state, 'Original before'); equal(r.originalAfter, live.state, 'Original after');
const tracked = new Set(gitText(original, 'ls-files', '-z').split('\0').filter(Boolean));
function gitCategory(item) {
  const priorRow = priorMap.get(item.path); const entry = live.entries.find(x => x.path === item.path);
  equal(item.gitStatus, priorRow.gitStatus, 'Git category matches prior authority');
  equal(item.statusXY, entry?.xy ?? null, 'fresh status category');
  equal(item.gitStatus === 'tracked', tracked.has(item.path), 'tracked membership');
  if (item.gitStatus === 'ignored') equal(gitText(original, 'check-ignore', '-q', '--', item.path), '', 'ignored membership');
}
const protectedStats = [];
for (const repo of [original, root]) {
  for (const item of a.privateRetention.files.filter(x => !groups.C.includes(x.path))) {
    const p = path.join(repo, item.path);
    if (fs.existsSync(p)) protectedStats.push(fs.statSync(p)); // metadata only
  }
}
for (const item of r.privateFiles) {
  const st = regular(path.join(original, item.path));
  equal({ exists: item.exists, type: item.type, logicalBytes: item.logicalBytes }, { exists: true, type: 'regular', logicalBytes: st.size }, 'private metadata only');
  gitCategory(item);
  equal(item.decision, 'RETAIN_CURRENT_PRIVATE_COPY_BEFORE_C4', 'fixed private decision');
  check(item.contentRead === false && item.hashProduced === false && item.copied === false, 'private no read/hash/copy attestation');
  check(!Object.keys(item).some(k => /sha|digest|content$/i.test(k)), 'no private content/hash fields');
  equal(item.knowledgeStatus, item.path === '.local/abi-knowledge/abi-canonical.json' ? 'PRIVATE_KNOWLEDGE_PRESERVE_REQUIRED' : null, 'ABI knowledge preserve required');
}
function hashSource(repo, relative) {
  check(groups.C.includes(relative) && [original, root].includes(repo), 'hash fixed Group C only');
  const p = path.join(repo, relative); const st = regular(p);
  check(!protectedStats.some(s => s.dev === st.dev && s.ino === st.ino), 'no private inode overlap before content read');
  return sha(fs.readFileSync(p));
}
function headBlob(repo, relative) {
  check(groups.C.includes(relative), 'HEAD read fixed Group C only');
  const line = gitText(repo, 'ls-tree', 'HEAD', '--', relative).trim();
  if (!line) return null;
  const [mode, type, oid] = line.split('\t')[0].split(' ');
  check(type === 'blob' && ['100644', '100755'].includes(mode), 'regular Group C HEAD blob');
  return { oid, sha256: sha(git(repo, 'cat-file', 'blob', oid)) };
}
// R0 TSVs are preservation metadata, not private payloads. Retain only Group C rows.
const manifest = new Map();
for (const name of ['source-file-manifest.tsv', 'tracked-file-manifest.tsv']) {
  const manifestPath = path.join(r0Root, 'source-preservation', name);
  for (const line of read(manifestPath).split('\n').filter(Boolean)) {
    const f = line.split('\t'); const p = f.at(-1);
    if (!groups.C.includes(p)) continue;
    check(!manifest.has(p), 'unique exact R0 manifest row');
    const shift = name.startsWith('source-') ? 0 : -1;
    manifest.set(p, { manifestPath, archivePath: priorMap.get(p).existingPreservationPath, type: f[1 + shift], logicalBytes: Number(f[2 + shift]), sha256: f[4 + shift] });
  }
}
setEqual([...manifest.keys()], groups.C, 'R0 source row coverage');
const artifactPaths = [...new Set([...manifest.values()].flatMap(x => [x.manifestPath, x.archivePath]))];
setEqual(r.r0Artifacts.map(x => x.path), artifactPaths, 'R0 metadata artifacts exactly scoped');
for (const artifact of r.r0Artifacts) {
  const st = fs.statSync(artifact.path, { bigint: true }); const old = c4.r0PreservationArtifacts.find(x => x.path === artifact.path);
  check(old && artifact.c4MetadataContinuous, 'prior C4 R0 archive/manifest authority');
  equal(st.size.toString(), String(artifact.logicalBytes), 'R0 size unchanged');
  equal(st.mtimeNs.toString(), artifact.mtimeNs, 'R0 exact mtime unchanged');
  equal(fs.realpathSync(artifact.path), artifact.realPath, 'R0 real path unchanged');
  check(artifact.realPath === artifact.path && !artifact.path.startsWith(original + '/') && !artifact.path.startsWith(root + '/'), 'independent R0 location');
  check(Number(st.size) === old.logicalBytes && Math.abs(Number(st.mtimeNs) - old.mtimeNs) <= 256, 'C4 metadata continuity (historical JSON nanosecond rounding)');
}
const verification = read(path.join(r0Root, 'diagnostics-r0-v2/archive-verification.tsv')).trim().split('\n').filter(Boolean);
check(verification.length === 8091 && verification.every(line => line.split('\t')[1] === 'MODE'), 'historical extraction issues were mode-only, no content/path/size issue');
check(read(path.join(r0Root, 'diagnostics-r0-v3-mode/mode-verification-summary.txt')).trim() === 'mode_issues=0', 'R0 separate mode-preserving extraction passed');
check(read(path.join(r0Root, 'diagnostics-r0-v3-mode/mode-verification.tsv')).trim() === '', 'no final mode issues');
equal(r.r0Evidence.verificationLevel, 'RECORDED_FULL_EXTRACTION_PLUS_LIVE_METADATA_CONTINUITY', 'historical verification truth boundary');
for (const item of r.sourceFiles) {
  equal(item.ownerClassification, 'NON_SECRET_SOURCE', 'owner non-secret classification');
  equal(item.ownerDecision, 'VERIFY_CURRENT_SOURCE_PRESERVATION', 'owner source decision');
  check(item.reviewed, 'Group C all reviewed'); gitCategory(item);
  const st = regular(path.join(original, item.path));
  equal({ exists: item.exists, type: item.type, logicalBytes: item.logicalBytes }, { exists: true, type: 'regular', logicalBytes: st.size }, 'source metadata');
  equal(item.currentSha256, hashSource(original, item.path), 'fresh current SHA-256');
  equal(item.canonicalSha256, fs.existsSync(path.join(root, item.path)) ? hashSource(root, item.path) : null, 'canonical same-path SHA or absent');
  equal(item.originalHeadBlob, headBlob(original, item.path), 'Original HEAD blob relation');
  equal(item.canonicalHeadBlob, headBlob(root, item.path), 'independent canonical HEAD blob');
  equal(item.currentMatchesOriginalHead, item.originalHeadBlob !== null && item.currentSha256 === item.originalHeadBlob.sha256, 'current vs Original HEAD');
  equal(item.modifiedTracked, item.gitStatus === 'tracked' && item.statusXY === ' M', 'current modified state');
  equal(item.r0, manifest.get(item.path), 'recorded R0 SHA provenance');
  const matches = [];
  if (item.canonicalSha256 === item.currentSha256) matches.push('CANONICAL_CURRENT');
  if (item.r0.sha256 === item.currentSha256 && item.r0.logicalBytes === st.size && item.r0.type === 'Regular File') matches.push('R0_VERIFIED_SNAPSHOT');
  if (item.canonicalHeadBlob?.sha256 === item.currentSha256) matches.push('CANONICAL_HEAD');
  equal(item.preservedBy, matches, 'independent preservation evidence');
  equal(item.decision, matches.length ? 'CURRENT_VERSION_ALREADY_PRESERVED' : 'CURRENT_VERSION_PRESERVATION_REQUIRED', 'decision derived from exact bytes');
}
const required = r.sourceFiles.filter(x => x.decision === 'CURRENT_VERSION_PRESERVATION_REQUIRED');
equal(r.counts.privatePreservationRequired, 8, 'private preservation required 8');
equal(r.counts.sourceAlreadyPreserved, r.sourceFiles.length - required.length, 'source already preserved count');
equal(r.counts.sourcePreservationRequired, required.length, 'source required count');
setEqual(r.sourcePreservationRequiredPaths, required.map(x => x.path), 'required exact paths');
equal(r.sourcePreservationRequired, required.length > 0, 'source preservation flag');
const env = r.sourceFiles.find(x => x.path === '.env.example');
check(env.modifiedTracked && env.reviewed && env.decision === r.envExampleResult, '.env.example explicitly resolved by current bytes');
equal(r.c4Readiness, 'NOT_READY_PRIVATE_PRESERVATION_REQUIRED', 'cannot become READY');
equal(r.nextGate, 'C4-C PRIVATE PRESERVATION EXECUTION', 'next Gate');
equal(r.subsequentGate, 'C4-D WORKTREE DEPENDENCY REMEDIATION', 'subsequent Gate');
equal(r.worktreeBlocker.status, 'WORKTREE_DEPENDENCY_REMEDIATION_REQUIRED', 'worktree blocker carried');
setEqual(r.worktreeBlocker.paths, a.worktrees.map(x => x.path), 'three carried-forward worktrees');
check(r.worktreeBlocker.paths.length === 3 && r.worktreeBlocker.evidence === 'C4A_CARRIED_FORWARD_NOT_REAUDITED', 'worktree evidence level');
equal(r.worktreeBlocker.count, 3, 'carried worktree count');
const opKeys = ['groupAContentReads', 'groupAHashes', 'groupBContentReads', 'groupBHashes', 'privateFilesCopied', 'originalWrites', 'originalGitMutations', 'destructiveOperations', 'worktreeMutations', 'applicationChanges', 'providerOperations', 'deployOperations', 'pushOperations', 'c4Deletion', 'sourceCopies', 'archivesCreated', 'archiveDeletion', 'paymentOperations', 'dependencyInstalls'];
setEqual(Object.keys(r.operations), opKeys, 'operation attestation coverage');
for (const key of opKeys) equal(r.operations[key], 0, `${key} zero attestation`);
const plan = r.privatePreservationPlan;
setEqual(plan.paths, [...groups.A, ...groups.B], 'private plan exact 8');
check(plan.executionAuthorizedThisGate === false && plan.executed === false, 'plan only');
check(!plan.proposedRoot.startsWith(original + '/') && !plan.proposedRoot.startsWith(root + '/') && plan.proposedRoot.startsWith('/Users/kagekun/Library/Application Support/MUSIAM/private-preservation/'), 'proposed private destination outside repos and generic archives');
for (const key of ['restrictedStorage', 'noModelOrLogContent', 'noRawFilesInGit', 'verifyBeforeOriginalDeletion', 'separateFromSourceArtifacts', 'noSecretValuesInReports']) check(plan.requirements[key] === true, `private plan ${key}`);
check(plan.steps.length >= 5 && plan.stopConditions.length >= 3, 'execution plan and stop conditions');
check(r.extraSourcePlan.separateArtifact && !r.extraSourcePlan.executed && r.extraSourcePlan.required === (required.length > 0), 'conditional distinct source artifact plan');
setEqual(r.extraSourcePlan.paths, required.map(x => x.path), 'extra-source plan exact targets');
check(!r.humanDeletionGateOpened && r.truthBoundary.includes('not deletion readiness') && r.truthBoundary.includes('production') && r.operationEvidenceBoundary.includes('not an OS-wide syscall audit'), 'truth and attestation boundaries');
for (const p of [allowed[0], 'docs/AI/RECOVERY_PLAN.md']) {
  const doc = read(p);
  check(doc.includes(r.c4Readiness) && doc.includes(r.nextGate) && doc.includes('C4-D WORKTREE DEPENDENCY REMEDIATION'), 'document/readiness/Gate consistency');
}
equal(status(original).state, live.state, 'Original state stable across validator');
console.log(`C4B_PRIVATE_RETENTION_DECISION: PASS (${checks} checks); A=4 B=4 C=8; source preserved=${8 - required.length} required=${required.length}; private required=8; ${r.c4Readiness}`);
