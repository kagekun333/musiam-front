import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';

// Read-only metadata verifier. Never opens private payloads, invokes cmp, or hashes
// file contents. The only digest below is of Git status path/category metadata.
const root = '/Users/kagekun/Desktop/musiam-front-clean';
const original = '/Users/kagekun/Desktop/musiam-front';
const start = '53f93addbb208667b08cd35980fc628a6b85fd57';
const branch = 'recovery/musiam-clean-20260920';
const destination = '/Users/kagekun/Library/Application Support/MUSIAM/private-preservation/cleanup-c4c-current-private-20260924';
const recordPath = 'ops/recovery/cleanup-c4c-private-preservation-20260924.json';
const authorityPath = 'ops/recovery/cleanup-c4b-private-retention-decision-20260923.json';
const aPath = 'ops/recovery/cleanup-c4a-blocker-remediation-20260923.json';
const docPath = 'docs/AI/CLEANUP_C4C_PRIVATE_PRESERVATION_EXECUTION.md';
const planPath = 'docs/AI/RECOVERY_PLAN.md';
const allowed = [docPath, recordPath, 'scripts/validate-cleanup-c4c-private-preservation.mjs', planPath];
const groups = {
  A: ['.env', '.env.local', '.env.stripe-sandbox.local', '.vercel/.env.preview.local'],
  B: ['.vscode/settings.json', '.vscode/tasks.json', '.claude/settings.local.json', '.local/abi-knowledge/abi-canonical.json'],
};
let checks = 0;
function check(value, label) { checks++; if (!value) throw new Error(label); }
function equal(a, b, label) { check(isDeepStrictEqual(a, b), label); }
function setEqual(a, b, label) {
  equal([...a].sort(), [...b].sort(), label);
  equal(new Set(a).size, a.length, `${label}: no duplicates`);
}
function git(repo, ...args) {
  return execFileSync('/usr/bin/git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', '-c', 'gc.auto=0', '-C', repo, ...args], {
    stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024,
  });
}
const gitText = (repo, ...args) => git(repo, ...args).toString('utf8');
function status(repo) {
  const raw = git(repo, 'status', '--porcelain=v1', '-z', '--untracked-files=normal');
  const fields = raw.toString('utf8').split('\0'), entries = [];
  for (let i = 0; i < fields.length - 1; i++) {
    if (!fields[i]) continue;
    const xy = fields[i].slice(0, 2);
    entries.push({ xy, path: fields[i].slice(3) });
    if (/[RC]/.test(xy)) i++;
  }
  return { state: {
    head: gitText(repo, 'rev-parse', 'HEAD').trim(), branch: gitText(repo, 'branch', '--show-current').trim(),
    modified: entries.filter(x => x.xy !== '??' && x.xy[1] !== ' ').length,
    dirtyTracked: entries.filter(x => x.xy !== '??').length,
    staged: entries.filter(x => x.xy !== '??' && x.xy[0] !== ' ').length,
    untracked: entries.filter(x => x.xy === '??').length,
    statusSha256: crypto.createHash('sha256').update(raw).digest('hex'),
  }, entries };
}
const readRecord = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
function safeChain(p) {
  for (let q = p; q !== path.dirname(q); q = path.dirname(q)) check(!fs.lstatSync(q).isSymbolicLink(), 'no symlink component');
  equal(fs.realpathSync(p), p, 'exact real path');
}
function metadata(item) {
  const p = path.resolve(original, item.path);
  check(p.startsWith(original + '/') && p === original + '/' + item.path, 'source stays inside Original');
  safeChain(p);
  const s = fs.lstatSync(p, { bigint: true });
  check(s.isFile(), 'source exists and is regular');
  return { path: item.path, regularFile: true, logicalSize: Number(s.size), mtimeNs: s.mtimeNs.toString(), gitCategory: item.gitStatus,
    device: s.dev.toString(), inode: s.ino.toString(), ctimeNs: s.ctimeNs.toString() };
}
function permission(p, mode, directory) {
  safeChain(p);
  const s = fs.lstatSync(p);
  check(directory ? s.isDirectory() : s.isFile(), 'destination expected type');
  equal(s.mode & 0o7777, mode, 'exact destination mode');
  equal(s.uid, process.getuid(), 'destination owned by current user');
  const acl = execFileSync('/bin/ls', ['-lde', p], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  check(!/^\s*\d+:/m.test(acl), 'no destination ACL entries');
  return s;
}
try {
  equal(process.cwd(), root, 'exact canonical workspace');
  const r = readRecord(recordPath), b = readRecord(authorityPath), a = readRecord(aPath);
  equal(r.schemaVersion, 1, 'schema');
  equal(r.status, 'VERIFIED_COMPLETE', 'preservation completed');
  equal(r.startingHead, start, 'starting HEAD');
  equal(r.c4bCommit, start, 'C4B commit');
  equal(r.canonicalBranch, branch, 'recorded branch');
  check(r.canonicalInitiallyClean, 'initially clean attestation');
  equal(r.canonicalBefore, { head: start, branch, modified: 0, dirtyTracked: 0, staged: 0, untracked: 0,
    statusSha256: crypto.createHash('sha256').update(Buffer.alloc(0)).digest('hex') }, 'initial State Lock');
  setEqual(r.allowedCanonicalPaths, allowed, 'four-path allowlist');
  // Verify the authority is still the exact committed non-secret C4B record.
  equal(gitText(root, 'show', `${start}:${authorityPath}`), fs.readFileSync(path.join(root, authorityPath), 'utf8'), 'committed C4B authority');
  equal(gitText(root, 'show', `${start}:${aPath}`), fs.readFileSync(path.join(root, aPath), 'utf8'), 'unchanged C4A authority');
  const canonical = status(root);
  equal(canonical.state.branch, branch, 'live canonical branch');
  if (canonical.state.head !== start) {
    equal(gitText(root, 'rev-parse', 'HEAD^').trim(), start, 'single authorized commit after start');
    equal(gitText(root, 'log', '-1', '--format=%s').trim(), 'recovery: preserve C4 private state', 'authorized commit message');
    setEqual(gitText(root, 'diff', '--name-only', '-z', `${start}..HEAD`).split('\0').filter(Boolean), allowed, 'committed exact scope');
    equal(canonical.entries.length, 0, 'clean after commit');
  }
  const changed = [...gitText(root, 'diff', '--name-only', '-z', start).split('\0').filter(Boolean),
    ...gitText(root, 'ls-files', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean)];
  setEqual(changed, allowed, 'only the four governance artifacts changed');
  check(canonical.entries.every(x => allowed.includes(x.path)), 'no private or application paths in status');
  equal(r.authorityRecord, authorityPath, 'authority path');
  equal(r.sourceRepo, original, 'source root');
  equal(r.preservationRoot, destination, 'destination exact path');
  equal(b.privatePreservationPlan.proposedRoot, destination, 'destination matches C4B');
  equal(b.status, 'COMPLETE', 'C4B completed');
  equal(b.c4Readiness, 'NOT_READY_PRIVATE_PRESERVATION_REQUIRED', 'C4B readiness');
  const rows = b.privateFiles, paths = rows.map(x => x.path);
  equal(rows.length, 8, 'authority count');
  for (const group of ['A', 'B']) {
    setEqual(rows.filter(x => x.group === group).map(x => x.path), groups[group], `exact Group ${group}`);
    equal(r[`group${group}Count`], 4, `Group ${group} count`);
  }
  setEqual(paths, Object.values(groups).flat(), 'exact owner approved private set');
  setEqual(b.privatePreservationPlan.paths, paths, 'C4B plan set');
  setEqual(r.targetPaths, paths, 'record targets match machine authority');
  for (const row of rows) equal(row.decision, 'RETAIN_CURRENT_PRIVATE_COPY_BEFORE_C4', 'owner retention decision');
  equal(rows.find(x => x.path === '.local/abi-knowledge/abi-canonical.json').knowledgeStatus,
    'PRIVATE_KNOWLEDGE_PRESERVE_REQUIRED', 'ABI retention');
  for (const key of ['targetCount', 'copiedCount', 'byteEqualCount', 'sourceStableCount', 'destinationFileCount']) equal(r[key], 8, key);
  for (const key of ['missingCount', 'extraCount', 'duplicateCount', 'symlinkCount', 'sourceRootEscapeCount']) equal(r[key], 0, key);
  equal(r.fileModeExpected, '0600', 'file permission model');
  equal(r.directoryModeExpected, '0700', 'directory permission model');
  equal(r.umask, '0077', 'execution umask');
  check(r.permissionCheckPass, 'recorded permission verification');
  equal(r.unexpectedAclCount, 0, 'recorded ACL count');
  permission(path.dirname(destination), 0o700, true);
  const files = [], directories = [''];
  permission(destination, 0o700, true);
  function walk(p, rel = '') {
    for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
      const relative = rel ? `${rel}/${entry.name}` : entry.name, full = path.join(p, entry.name);
      check(!entry.isSymbolicLink(), 'destination has no symlinks');
      if (entry.isDirectory()) { directories.push(relative); permission(full, 0o700, true); walk(full, relative); }
      else { check(entry.isFile(), 'destination has only regular files'); permission(full, 0o600, false); files.push(relative); }
    }
  }
  walk(destination);
  const expectedDirs = new Set(['', 'files']);
  for (const p of paths) { let q = path.posix.dirname(`files/${p}`); while (q !== '.') { expectedDirs.add(q); q = path.posix.dirname(q); } }
  setEqual(directories, [...expectedDirs], 'exact directory structure');
  setEqual(r.destinationDirectories, directories, 'recorded directory structure');
  // Eight payload files plus one explicitly authorized non-secret status sidecar.
  setEqual(files, [...paths.map(p => `files/${p}`), 'PRESERVATION_STATUS.json'], 'no missing or extra destination entries');
  equal(files.filter(p => p.startsWith('files/')).length, 8, 'private destination file count');
  equal(r.metadataSidecar, 'PRESERVATION_STATUS.json', 'metadata exception');
  equal(r.metadataSidecarCount, 1, 'one metadata sidecar');
  for (const list of [r.sourceMetadataBefore, r.sourceMetadataAfter, r.verification]) setEqual(list.map(x => x.path), paths, 'complete per-path evidence');
  equal(r.sourceMetadataBefore, r.sourceMetadataAfter, 'recorded stability');
  for (const item of rows) {
    const before = r.sourceMetadataBefore.find(x => x.path === item.path), after = r.sourceMetadataAfter.find(x => x.path === item.path);
    equal(metadata(item), after, 'live source metadata still matches post-copy snapshot');
    equal(before, after, 'per-path source stability');
    setEqual(Object.keys(before), ['path', 'regularFile', 'logicalSize', 'mtimeNs', 'gitCategory', 'device', 'inode', 'ctimeNs'], 'metadata-only source fields');
    const dst = fs.lstatSync(path.join(destination, 'files', item.path), { bigint: true });
    equal(Number(dst.size), before.logicalSize, 'source/destination sizes match');
    check(dst.dev.toString() !== before.device || dst.ino.toString() !== before.inode, 'independent destination inode');
    const v = r.verification.find(x => x.path === item.path);
    equal(v, { path: item.path, group: item.group, byteEqual: true, sourceStable: true, logicalSize: before.logicalSize, fileMode: '0600' }, 'recorded silent byte equality and stability');
  }
  const sidecar = JSON.parse(fs.readFileSync(path.join(destination, 'PRESERVATION_STATUS.json'), 'utf8'));
  equal(sidecar, { status: 'VERIFIED_COMPLETE', createdAt: r.createdAt, targetCount: 8, files: r.verification,
    directories: r.destinationDirectories.map(p => ({ path: p, mode: '0700' })), sourceRepo: original, c4bCommit: start }, 'exact non-secret status sidecar');
  const originalNow = status(original).state;
  equal(originalNow, b.originalBefore, 'Original matches C4B before including status digest');
  equal(originalNow, b.originalAfter, 'Original matches C4B after including status digest');
  equal(originalNow, a.originalAfter, 'Original matches C4A');
  equal(originalNow, r.originalBefore, 'Original before unchanged');
  equal(originalNow, r.originalAfter, 'Original after unchanged');
  equal(originalNow.head, '117379b6c61ab3fc072b6cd4b80ce1d406b0e175', 'Original HEAD');
  equal(originalNow.branch, 'codex/fix/stripe-metal-print-webhook-20260914', 'Original branch');
  equal([originalNow.modified, originalNow.staged, originalNow.untracked], [102, 0, 433], 'Original counts');
  check(r.originalStatusDigestMatchesC4B, 'Original digest match recorded');
  check(r.privateBytesCopiedOpaquely, 'opaque copying truth');
  for (const key of ['privatePayloadExposedToModel', 'privatePayloadPrintedOrLogged', 'privateHashProduced', 'c4DeletionStarted', 'humanDeletionGateOpened']) equal(r[key], false, key);
  for (const key of ['externalTransferCount', 'originalWrites', 'originalDeletes', 'originalMoves', 'worktreeMutations', 'applicationChanges',
    'providerOperations', 'deployOperations', 'pushOperations', 'groupCAdditionalPreservationCount']) equal(r[key], 0, key);
  equal(r.privateRetentionBlocker, 'RESOLVED', 'private blocker resolved');
  equal(r.worktreeBlocker, b.worktreeBlocker, 'worktree evidence carried forward without re-audit');
  equal(r.worktreeBlocker.status, 'WORKTREE_DEPENDENCY_REMEDIATION_REQUIRED', 'worktree blocker retained');
  equal(r.worktreeBlocker.count, 3, 'three worktree dependencies');
  equal(a.blockers.worktreeOriginalDependencies, 3, 'C4A dependencies');
  equal(r.worktreeBlocker.preservationRequired, a.worktreeCounts.WORKTREE_REQUIRES_PRESERVATION, 'two preservation requirements');
  equal(r.worktreeBlocker.semanticDecisionRequired, a.worktreeCounts.WORKTREE_SEMANTIC_DECISION_REQUIRED, 'one semantic decision');
  equal([r.worktreeBlocker.preservationRequired, r.worktreeBlocker.semanticDecisionRequired], [2, 1], 'worktree classification counts');
  equal(a.blockers.unpreservedUniqueSource, 0, 'unique source blocker historically resolved');
  equal(b.sourcePreservationRequired, false, 'Group C source requirement resolved');
  equal(b.sourcePreservationRequiredPaths, [], 'no additional Group C paths');
  equal(r.uniqueSourceBlocker, 'RESOLVED_C4A_CARRIED_FORWARD', 'unique source carry-forward');
  equal(r.c4Readiness, 'NOT_READY_WORKTREE_MIGRATION_REQUIRED', 'C4 readiness');
  equal(r.nextGate, 'C4-D WORKTREE DEPENDENCY REMEDIATION', 'next gate');
  check(typeof r.truthBoundary === 'string' && r.truthBoundary.includes('OS/local processes read private bytes') &&
    r.truthBoundary.includes('metadata-only validator does not re-prove byte identity') && r.truthBoundary.includes('not deletion authority'), 'truth boundary');
  const doc = fs.readFileSync(path.join(root, docPath), 'utf8'), plan = fs.readFileSync(path.join(root, planPath), 'utf8');
  check(plan.startsWith(gitText(root, 'show', `${start}:${planPath}`)), 'historical Recovery Plan remains unchanged');
  for (const token of ['C4C_PRIVATE_PRESERVATION = VERIFIED_COMPLETE', 'PRIVATE_RETENTION_BLOCKER = RESOLVED',
    'C4_READINESS = NOT_READY_WORKTREE_MIGRATION_REQUIRED', 'NEXT_GATE = C4-D WORKTREE DEPENDENCY REMEDIATION']) {
    check(doc.includes(token), 'human record status'); check(plan.includes(token), 'Recovery Plan status');
  }
  for (const heading of ['Executive Result', 'Authority', 'Exact Scope', 'Opaque Copy Boundary', 'Destination', 'Permission Model',
    'Byte Equality Verification', 'Source Stability', 'Original Integrity', 'Canonical Integrity', 'Remaining Worktree Blocker', 'C4 Readiness', 'Truth Boundary']) check(doc.includes(`## ${heading}`), 'human record required section');
  check(['PENDING', 'PASS'].includes(r.validation.status), 'validation lifecycle');
  equal(r.validation.command, 'node scripts/validate-cleanup-c4c-private-preservation.mjs', 'validation command');
  console.log(`C4-C private preservation validator: PASS (${checks} checks; private contents not read; recorded equality only).`);
} catch (error) {
  // Do not serialize child-process output, assertion operands or arbitrary objects.
  console.error(`C4-C private preservation validator: FAIL after ${checks} checks (${error.code ?? 'CHECK_FAILED'}).`);
  if (!error.code) console.error(String(error.message).slice(0, 180));
  process.exitCode = 1;
}
