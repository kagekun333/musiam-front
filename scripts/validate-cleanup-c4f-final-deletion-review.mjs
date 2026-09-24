import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGINAL = '/Users/kagekun/Desktop/musiam-front';
const START = '4c2ed71514eb52919626e6a1bf339e15c034f907';
const recordPath = 'ops/recovery/cleanup-c4f-final-deletion-review-20260924.json';
const allowed = ['docs/AI/CLEANUP_C4F_FINAL_DELETION_REVIEW.md', recordPath, 'scripts/validate-cleanup-c4f-final-deletion-review.mjs', 'docs/AI/RECOVERY_PLAN.md'];
const read = p => JSON.parse(fs.readFileSync(path.resolve(root, p), 'utf8'));
const authority = n => read(`ops/recovery/cleanup-${n}.json`);
const r = read(recordPath), v = authority('c4-decommission-review-20260923');
const a = authority('c4a-blocker-remediation-20260923'), b = authority('c4b-private-retention-decision-20260923');
const c = authority('c4c-private-preservation-20260924'), d = authority('c4d-worktree-remediation-20260924');
const e = authority('c4e-worktree-decommission-20260924'), c3 = authority('c3c-preservation-20260923');
const c3b = authority('c3b-semantic-review-20260923');
const git = (cwd, ...args) => execFileSync('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', '-C', cwd, ...args], { maxBuffer: 32 * 1024 * 1024 });
const text = (cwd, ...args) => git(cwd, ...args).toString().trim();
const split = b => b.toString().split('\0').filter(Boolean);
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
const setEqual = (x, y) => x.length === y.length && same([...x].sort(), [...y].sort());
const counts = rows => rows.reduce((out, x) => (out[x] = (out[x] || 0) + 1, out), {});
const sameCounts = (x, y) => setEqual(Object.keys(x), Object.keys(y)) && Object.keys(x).every(k => x[k] === y[k]);
let checks = 0;
function check(ok, label) { if (!ok) throw new Error(`FAIL: ${label}`); checks++; }
function metadata(p) {
  const s = fs.lstatSync(p, { bigint: true });
  return { path: p, type: s.isFile() ? 'regular' : s.isDirectory() ? 'directory' : 'symlink', size: Number(s.size), mtimeNs: String(s.mtimeNs), ctimeNs: String(s.ctimeNs), inode: Number(s.ino), device: Number(s.dev), mode: Number(s.mode & 0o7777n) };
}
function hash(p) {
  const h = crypto.createHash('sha256'), fd = fs.openSync(p, 'r'), buf = Buffer.alloc(1024 * 1024);
  try { let n; while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, n)); } finally { fs.closeSync(fd); }
  return h.digest('hex');
}
const inside = (p, base) => p === base || p.startsWith(base + '/');
const checkedChains = new Set();
function noSymlinkChain(p) {
  for (let q = p; q !== path.dirname(q); q = path.dirname(q)) {
    if (checkedChains.has(q)) break;
    check(!fs.lstatSync(q).isSymbolicLink(), 'no symlink path component'); checkedChains.add(q);
  }
}
function state(p) {
  const raw = git(p, 'status', '--porcelain=v1', '-z', '--untracked-files=normal');
  const entries = split(raw); check(entries.every(x => [' M', '??'].includes(x.slice(0, 2))), 'known Original status categories');
  return { path: p, head: text(p, 'rev-parse', 'HEAD'), branch: text(p, 'branch', '--show-current'), modified: entries.filter(x => x.startsWith(' M')).length, staged: 0, untracked: entries.filter(x => x.startsWith('??')).length, statusSha256: sha(raw) };
}

check(root === '/Users/kagekun/Desktop/musiam-front-clean' && r.startingCanonicalHead === START && r.canonicalInitiallyClean, 'canonical starting State Lock');
check(r.canonicalBranch === 'recovery/musiam-clean-20260920' && text(root, 'branch', '--show-current') === r.canonicalBranch, 'canonical branch');
check(same(r.allowedCanonicalPaths, allowed), 'exact four-file allowlist');
const head = text(root, 'rev-parse', 'HEAD'), committed = head !== START;
if (committed) {
  check(text(root, 'rev-parse', 'HEAD^') === START && text(root, 'log', '-1', '--format=%s') === r.commitMessage && r.commitMessage === 'recovery: finalize original repo deletion review', 'authorized commit closure');
  check(setEqual(split(git(root, 'diff-tree', '--no-commit-id', '--name-only', '-r', '-z', 'HEAD')), allowed), 'exact committed scope');
  check(git(root, 'status', '--porcelain=v1', '-z', '--untracked-files=normal').length === 0, 'canonical clean after commit');
} else {
  const changed = split(git(root, 'status', '--porcelain=v1', '-z', '--untracked-files=all')).map(x => x.slice(3));
  check(setEqual(changed, allowed), 'only four review files changed before commit');
}
for (const x of r.authorities) {
  check(x.path !== recordPath && hash(path.join(root, x.path)) === x.sha256 && sha(git(root, 'show', `${START}:${x.path}`)) === x.sha256, 'unchanged committed authority');
}
noSymlinkChain(ORIGINAL);
check(fs.lstatSync(ORIGINAL).isDirectory() && fs.realpathSync(ORIGINAL) === ORIGINAL && ORIGINAL !== root, 'exact distinct Original root');
check(same(state(ORIGINAL), r.originalBefore) && same(r.originalBefore, r.originalAfter), 'Original live identity/status digest continuity');
check(r.originalBefore.head === '117379b6c61ab3fc072b6cd4b80ce1d406b0e175' && r.originalBefore.branch === 'codex/fix/stripe-metal-print-webhook-20260914', 'Original expected HEAD/branch');
check(r.originalBefore.modified === 102 && r.originalBefore.staged === 0 && r.originalBefore.untracked === 433 && r.originalBefore.statusSha256 === v.original.statusSha256, 'Original 102/0/433 exact status');
check(git(ORIGINAL, 'worktree', 'list', '--porcelain').toString() === e.worktreeListPorcelainAfter && r.externalLinkedWorktrees === 0, 'zero external linked worktrees');

check(r.preservationContinuity.length >= e.preservationAfter.length, 'complete preservation checkpoints');
for (const old of e.preservationAfter) {
  const x = r.preservationContinuity.find(y => y.metadata.path === old.metadata.path);
  check(x && x.group === old.group && same(x.metadata, old.metadata), 'C4-E checkpoint retained');
}
for (const x of r.preservationContinuity) {
  const p = x.metadata.path; noSymlinkChain(p);
  check(x.continuous && same(metadata(p), x.metadata) && !inside(fs.realpathSync(p), ORIGINAL), 'external preservation current metadata continuity');
}
for (const x of v.r0PreservationArtifacts) {
  const current = metadata(x.path);
  check(current.size === x.logicalBytes && Number(current.mtimeNs) === x.mtimeNs, 'R0 historical artifact continuity');
}
for (const x of [...Object.values(a.uniquePreservation.artifacts), ...d.preservationArtifacts, ...v.archives.c3c]) {
  check(hash(x.path) === x.sha256, 'normal C4A/C4D/C3C artifact hash continuity');
}
for (const x of v.archives.c2) check(metadata(x.path).size === x.logicalBytes && Number(metadata(x.path).mtimeNs) === x.mtimeNs && x.sha256 === x.expectedSha256, 'C2 prior digest plus metadata authority');
check(a.uniquePreservation.contentMatchCount === 21 && a.uniquePreservation.status === 'VERIFIED_21_OF_21', 'historical C4A 21/21 preservation satisfied');
check(c3.actualTargetFiles === 383 && c3.contentMatchCount === 383 && c3.missingCount === 0, 'C3C 383/383 preservation satisfied');
check(c.byteEqualCount === 8 && c.privateRetentionBlocker === 'RESOLVED' && c.verification.every(x => x.byteEqual && x.sourceStable), 'C4C prior opaque equality 8/8');
const privateRoot = c.preservationRoot;
check(privateRoot === '/Users/kagekun/Library/Application Support/MUSIAM/private-preservation/cleanup-c4c-current-private-20260924' && !inside(privateRoot, ORIGINAL) && !inside(privateRoot, root), 'private independent root');
const privatePaths = c.targetPaths.map(p => path.join(privateRoot, 'files', p));
const allPrivateEntries = [];
function inventoryPrivate(dir) { for (const x of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, x.name); check(!x.isSymbolicLink(), 'private no symlinks'); if (x.isDirectory()) inventoryPrivate(p); else allPrivateEntries.push(p); } }
inventoryPrivate(privateRoot);
check(setEqual(allPrivateEntries, [...privatePaths, path.join(privateRoot, c.metadataSidecar)]), 'exact eight private payloads and one metadata sidecar');
for (const p of [path.dirname(privateRoot), ...c.destinationDirectories.map(x => path.join(privateRoot, x)), ...allPrivateEntries]) {
  noSymlinkChain(p); const s = fs.lstatSync(p);
  check(s.uid === process.getuid() && (s.mode & 0o7777) === (s.isDirectory() ? 0o700 : 0o600), 'private owner-only permission model');
  const acl = execFileSync('/bin/ls', ['-lde', p], { encoding: 'utf8' }); check(!/^\s*\d+:/m.test(acl), 'private no ACL entries');
}
check(r.privateSourceMetadata.length === 8, 'private source metadata count');
for (const x of r.privateSourceMetadata) {
  noSymlinkChain(path.join(ORIGINAL, x.path)); const old = c.sourceMetadataAfter.find(y => y.path === x.path);
  check(old && x.continuous && same(metadata(path.join(ORIGINAL, x.path)), x.sourceMetadata), 'private current source metadata only');
  for (const [k, z] of [['size', 'logicalSize'], ['mtimeNs', 'mtimeNs'], ['ctimeNs', 'ctimeNs'], ['inode', 'inode'], ['device', 'device']]) check(String(x.sourceMetadata[k]) === String(old[z]), 'private C4C source continuity');
}

// Reconcile exact normal-source hash authorities. Never hash private payloads.
const expected = new Map();
for (const x of v.currentNonGitReview.contentVerifiedFiles) expected.set(x.path, x.sha256);
for (const x of read(c3.sourceManifest).files) expected.set(x.originalRepoRelativePath, x.sha256);
for (const x of a.uniquePreservation.files) expected.set(x.originalRepoRelativePath, x.sha256);
for (const x of b.sourceFiles) expected.set(x.path, x.currentSha256);
const protectedPaths = new Set(a.privateRetention.files.map(x => x.path));
const approvedNormal = new Set(b.sourceFiles.map(x => x.path));
const originalExpectedSet = [...expected.keys()];
const newDaily = r.inventoryDrift.newFiles;
check(newDaily.length === 7 && newDaily.every(p => p.startsWith('ops/market-learning/daily-20260924/') && p.endsWith('.json')), 'exact new operational evidence scope');
check(setEqual(r.sourceChecks.map(x => x.path), [...originalExpectedSet, ...newDaily]), 'complete exact normal hash observation set');
for (const x of r.crossPathPreservation) {
  const matches = a.uniquePreservation.files.filter(y => y.sha256 === x.sha256);
  check(matches.length > 0 && x.independentPreservation.every(ref => matches.some(y => ref === `C4A.uniquePreservation.files:${y.originalRepoRelativePath}`)), 'new cross-path restoration binding');
  expected.set(x.path, x.sha256);
}
for (const x of r.sourceChecks) {
  const p = path.join(ORIGINAL, x.path); check(inside(p, ORIGINAL) && !x.path.includes('..') && (!protectedPaths.has(x.path) || approvedNormal.has(x.path)), 'normal hash scope excludes private/local payloads');
  noSymlinkChain(p); check(same(metadata(p), x.metadata) && x.metadata.type === 'regular', 'source hash observation metadata continuity');
  check((expected.get(x.path) ?? null) === x.expectedSha256 && x.matched === (x.sha256 === x.expectedSha256), 'source match derived from prior digest');
}
const liveSets = {
  tracked: split(git(ORIGINAL, 'ls-files', '-z', '--cached')),
  untracked: split(git(ORIGINAL, 'ls-files', '-z', '--others', '--exclude-standard')),
  ignored: split(git(ORIGINAL, 'ls-files', '-z', '--others', '--ignored', '--exclude-standard')),
};
for (const [kind, paths] of Object.entries(liveSets)) {
  check(setEqual(paths, r.inventory.filter(x => x.gitCategory === kind).map(x => x.path)), 'exact live expanded file inventory');
  check(paths.length === r.inventoryCounts[kind], 'file counts distinct from status entries');
}
check(liveSets.untracked.length === 2926 && liveSets.ignored.length === 796 && setEqual(liveSets.ignored, v.ignoredAccounting.files.map(x => x.path)), 'untracked growth and unchanged ignored set');
const sourceMap = new Map(r.sourceChecks.map(x => [x.path, x]));
const c2Map = new Map(r.c2SourceMetadata.map(x => [x.path, x]));
const c2Manifest = read(v.archives.c2.at(-1).path);
const c2Expected = c2Manifest.groups.filter(g => ['dirty-output', 'dirty-outputs'].includes(g.group)).flatMap(g => g.files.map(x => ({ path: path.relative(ORIGINAL, path.join(g.sourcePath, x.rawRelativePath)), size: x.size, sha256: x.sha256 })));
check(setEqual([...c2Map.keys()], c2Expected.map(x => x.path)), 'C2 exact 1137 current source paths');
for (const x of c2Expected) { const y = c2Map.get(x.path); check(y.sizeMatches && y.metadata.size === x.size && y.authoritySha256 === x.sha256 && same(metadata(path.join(ORIGINAL, x.path)), y.metadata), 'C2 retained source metadata/manifest continuity'); }
const statusRows = split(git(ORIGINAL, 'status', '--porcelain=v1', '-z', '--untracked-files=normal'));
const modified = statusRows.filter(x => x.startsWith(' M')).map(x => x.slice(3));
for (const x of r.inventory) {
  let accounted = false;
  if (sourceMap.has(x.path)) accounted = sourceMap.get(x.path).matched;
  else if (c2Map.has(x.path)) accounted = c2Map.get(x.path).sizeMatches;
  else if (c.targetPaths.includes(x.path)) accounted = true;
  else if (a.privateRetention.files.some(y => y.path === x.path && y.classification === 'LOCAL_MACHINE_ONLY_RECREATABLE')) accounted = true;
  else if (c3b.finalDecisions.some(y => y.path === x.path && ['RECOVERY_SUPERSEDES_CONFIRMED', 'REGENERABLE_NO_PRESERVATION_REQUIRED'].includes(y.decision))) accounted = true;
  else if (v.ignoredAccounting.files.some(y => y.path === x.path && y.disposition === 'REGENERABLE_NONESSENTIAL')) accounted = true;
  else if (x.gitCategory === 'tracked' && !modified.includes(x.path)) accounted = true;
  check(x.accounted === accounted, 'per-file preservation derived from authorities');
}
for (const [kind, prefix] of [['modified', ' M'], ['untracked', '??']]) {
  check(setEqual(r.statusAccounting[kind].map(x => x.path), statusRows.filter(x => x.startsWith(prefix)).map(x => x.slice(3).replace(/\/$/, ''))), 'exact 102/433 entry paths');
  for (const entry of r.statusAccounting[kind]) {
    const files = r.inventory.filter(x => x.path === entry.path || (kind === 'untracked' && x.path.startsWith(entry.path + '/')));
    check(entry.currentFileCount === files.length && entry.restorationAccounted === (files.length > 0 && files.every(x => x.accounted)), 'entry expanded survivability');
    check(setEqual(entry.unresolvedPaths, files.filter(x => !x.accounted).map(x => x.path)) && sameCounts(entry.dispositions, counts(files.map(x => x.disposition))), 'entry dispositions and exact unresolved paths');
  }
}
const um = r.statusAccounting.modified.filter(x => !x.restorationAccounted).length;
const uu = r.statusAccounting.untracked.filter(x => !x.restorationAccounted).length;
const ui = r.inventory.filter(x => x.gitCategory === 'ignored' && !x.accounted).length;
check(r.unaccountedModifiedTracked === um && r.unaccountedUntrackedEntries === uu && r.ignoredMeaningfulStateUnresolved === ui, 'unaccounted counts derived; unknown is not zero');
check(um === 0 && uu === 2 && ui === 0, 'observed modified 0/untracked 2/ignored 0 unresolved');

const repair = v.history.repairCopy, readback = v.history.readback;
const refs = text(ORIGINAL, 'for-each-ref', '--format=%(refname) %(objectname)').split('\n').map(line => { const [ref, tip] = line.split(' '); return { ref, tip }; });
check(refs.length === 41 && r.history.refCount === 41 && r.history.preservedRefCount === 41 && setEqual(refs.map(x => `${x.ref} ${x.tip}`), v.history.persistentRefs.map(x => `${x.ref} ${x.tip}`)), '41 stable persistent refs');
for (const x of refs) check(text(repair, 'rev-parse', x.ref) === x.tip && r.history.persistentRefs.some(y => y.ref === x.ref && y.tip === x.tip && y.preserved), 'independently preserved ref tip');
function closure(repo, ...spec) { const lines = text(repo, 'rev-list', '--objects', '--no-object-names', '--missing=print', ...spec).split('\n'); return { objects: lines.filter(x => !x.startsWith('?')), missing: lines.filter(x => x.startsWith('?')).map(x => x.slice(1)) }; }
const oc = closure(ORIGINAL, '--all', '--reflog'), rc = closure(repair, '--all', '--reflog');
const hc = closure(readback, r.originalBefore.head), pc = closure(repair, ...refs.map(x => x.tip));
check(setEqual(oc.missing, r.history.originalMissingObjects) && setEqual(rc.missing, r.history.repairMissingObjects), 'explicit current missing-object observations');
check(oc.objects.every(x => rc.objects.includes(x)) && hc.objects.length === 7549 && hc.missing.length === 0 && pc.missing.length === 0, 'all readable history plus HEAD and persistent closure survive');
const allCommits = new Set(text(ORIGINAL, 'rev-list', '--all').split('\n'));
const reflogOnly = text(ORIGINAL, 'rev-list', '--all', '--reflog').split('\n').filter(x => !allCommits.has(x));
const repairCommits = new Set(text(repair, 'rev-list', '--all', '--reflog').split('\n'));
check(reflogOnly.length === 24 && setEqual(reflogOnly, r.history.reflogOnlyCommits) && reflogOnly.every(x => repairCommits.has(x)), '24 reflog-only commits independently preserved');
check(r.history.additionalMeaningfulLossCount === 0 && r.history.readableObjectsMissingFromRepair.length === 0 && r.history.unpreservedReflogOnlyCommits.length === 0 && r.history.knownMissingBlob.additionalLossOnDeletion === false, 'zero additional meaningful Git loss; pre-existing missing B retained');
check(text(repair, 'cat-file', '-t', 'ed77db6020119caae3f992b7a70d41dfd1c86b76') === 'blob', 'R0 repaired A exists independently');
for (const x of r.history.independence) {
  const gd = path.resolve(x.repo, text(x.repo, 'rev-parse', '--git-common-dir')); noSymlinkChain(gd);
  check(gd === x.commonDir && !inside(gd, ORIGINAL) && !fs.existsSync(path.join(gd, 'objects/info/alternates')) && text(x.repo, 'rev-parse', '--is-shallow-repository') === 'false', 'independent Git storage and no alternates');
}
let symlinks = 0;
function scan(dir) { for (const x of fs.readdirSync(dir, { withFileTypes: true })) { if (x.name === '.git') continue; if (x.isSymbolicLink()) symlinks++; else if (x.isDirectory()) scan(path.join(dir, x.name)); } }
scan(root); check(symlinks === 0 && r.dependencies.canonicalSymlinks === 0, 'no canonical worktree symlink dependency');
const sourceFiles = split(git(root, 'ls-files', '-z')).filter(p => /^(src\/|scripts\/|package\.json$|next\.config|tsconfig|vercel\.json$)/.test(p) && /\.(?:[cm]?[jt]sx?|json|py|sh)$/.test(p));
const originalPattern = /(?:\/Users\/kagekun\/Desktop\/musiam-front|\.\.\/musiam-front)(?=\/|[\s'"`]|$)/;
for (const p of sourceFiles) if (originalPattern.test(fs.readFileSync(path.join(root, p), 'utf8'))) check(r.dependencies.historicalSourceValidators.includes(p), 'Original path mentions limited to classified historical validators');
check(!fs.readFileSync(path.join(root, 'package.json'), 'utf8').includes('validate-cleanup-') && !originalPattern.test(fs.readFileSync(path.join(root, 'scripts/validate-recovery-final-integration.ts'), 'utf8')), 'active package and final integration independent');
check(r.dependencies.canonicalRuntimeDependencyOnOriginal === 0 && r.dependencies.canonicalGitDependencyOnOriginal === 0, 'canonical dependency conclusion');

const r5 = r.sourceChecks.filter(x => x.path.startsWith('SHA_collection_999_unique/'));
check(r5.length === 1000 && r5.every(x => x.matched) && r.r5.currentHashMatches === 1000 && r.r5.result === 'PASS' && r.r5.status === 'PRESERVE_HOLD / SEPARATE_BUSINESS_SCOPE', 'R5 1000/1000 independent source preserved; HOLD unchanged');
for (const p of r.r5.provenanceAuthority) check(fs.existsSync(path.resolve(root, p)) && !inside(path.resolve(root, p), ORIGINAL), 'R5 independent provenance/evidence authority');
check(r.futureProductSurvivability.length === 7, 'seven roadmap areas explicitly reviewed');
for (const x of r.futureProductSurvivability) {
  const paths = r.inventory.filter(y => new RegExp(x.pathPattern, 'i').test(y.path));
  check(paths.length > 0 && setEqual(paths.map(y => y.path), x.matchedPaths) && paths.every(y => y.accounted) && x.unpreserved === 0 && x.result === 'PASS', 'future product source survives independently');
}
check(d.worktrees.filter(x => x.classification === 'WORKTREE_STATE_INDEPENDENTLY_PRESERVED').length === 2 && d.worktrees.filter(x => x.classification === 'WORKTREE_DISPOSABLE_AFTER_PRESERVATION').length === 1 && d.preservationArtifacts.length === 10 && r.worktreePreservation.result === 'PASS', 'C4D worktree preservation independent');
check(r.privatePreservation.result === 'PASS' && r.privatePreservation.payloadFiles === 8 && r.privatePreservation.payloadReads === 0 && r.privatePreservation.payloadHashes === 0, 'metadata-only private independence');
check(r.preservationAuthoritiesOutsideOriginal === 'PASS' && Object.values(r.continuitySummary).every(x => x === 'PASS'), 'all independent preservation continuity groups');
const losses = r.inventory.filter(x => !x.accounted);
check(setEqual(losses.map(x => x.path), r.uniqueLossIfOriginalDeletedFinal.map(x => x.path)) && r.meaningfulUniqueLossCount === losses.length && r.reviewBlockerCount === losses.length, 'unique-loss list explicit and deduplicated');
const independentDigests = new Set([...expected.values(), ...c2Manifest.groups.flatMap(g => g.files.map(x => x.sha256))]);
for (const name of ['source-file-manifest.tsv', 'tracked-file-manifest.tsv']) {
  const manifest = path.join(path.dirname(v.r0PreservationArtifacts[0].path), name);
  for (const line of fs.readFileSync(manifest, 'utf8').trim().split('\n')) {
    const fields = line.split('\t');
    if (!protectedPaths.has(fields.at(-1))) independentDigests.add(fields[name.startsWith('source') ? 4 : 3]);
  }
}
function collectRecordedHashes(value) {
  if (Array.isArray(value)) value.forEach(collectRecordedHashes);
  else if (value && typeof value === 'object') {
    if (typeof value.sha256 === 'string') independentDigests.add(value.sha256);
    Object.values(value).forEach(collectRecordedHashes);
  }
}
for (const w of d.worktrees) if (w.manifestPath) collectRecordedHashes(read(w.manifestPath));
for (const x of r.uniqueLossIfOriginalDeletedFinal) {
  const y = sourceMap.get(x.path);
  check(x.blocker && x.category === 'R6_OPERATIONAL_EVIDENCE' && x.significance && x.independentPreservation === null && x.recoverability === 'CURRENT_BYTES_NOT_FOUND_IN_DECLARED_INDEPENDENT_AUTHORITIES' && y && !y.matched && x.sha256 === y.sha256 && x.logicalBytes === y.metadata.size, 'unique-loss significance, current identity and recoverability');
  check(hash(path.join(ORIGINAL, x.path)) === x.sha256, 'seven unresolved current normal sources unchanged');
  check(!independentDigests.has(x.sha256), 'no cross-path match in declared normal-source preservation digests');
  const canonical = path.join(root, x.path);
  check(!fs.existsSync(canonical) || hash(canonical) !== x.sha256, 'no exact canonical counterpart match');
}
check(r.meaningfulUniqueLossLogicalBytes === r.uniqueLossIfOriginalDeletedFinal.reduce((n, x) => n + x.logicalBytes, 0), 'unique-loss byte sum');
check(r.exactDeletionScope.candidate === ORIGINAL && r.exactDeletionScope.realPath === ORIGINAL && r.exactDeletionScope.exists && !r.exactDeletionScope.isSymlink && !r.exactDeletionScope.siblingsIncluded && !r.exactDeletionScope.parentIncluded && !r.exactDeletionScope.executionAuthorized, 'exact future deletion scope, no current authority');
const allocation = Number(execFileSync('du', ['-sk', ORIGINAL], { encoding: 'utf8' }).split(/\s/)[0]) * 1024;
check(allocation === r.originalAllocatedBytes && r.allocatedDeltaBytes === allocation - r.previousAllocatedBytes && r.reclaimBasis.includes('ESTIMATE'), 'current allocated reclaim estimate and delta');
check(Object.values(r.operations).every(x => x === 0), 'Original/ref/history/archive/application/provider/deploy/push operations zero');
const derivedVerdict = r.history.additionalMeaningfulLossCount > 0 ? 'BLOCKED_UNPRESERVED_HISTORY' : losses.length > 0 ? 'BLOCKED_UNPRESERVED_DATA' : r.privatePreservation.result !== 'PASS' ? 'BLOCKED_PRIVATE_STATE' : r.dependencies.canonicalRuntimeDependencyOnOriginal || r.dependencies.canonicalGitDependencyOnOriginal || r.externalLinkedWorktrees ? 'BLOCKED_DEPENDENCY' : um || uu || ui ? 'BLOCKED_OTHER' : 'READY_FOR_HUMAN_DELETION_GATE';
check(r.verdict === derivedVerdict && !r.humanDeletionGateOpen && r.verdict === 'BLOCKED_UNPRESERVED_DATA', 'verdict derived from unresolved data');
check(r.nextHumanGate === 'C4-G ORIGINAL REPOSITORY DELETION EXECUTION' && r.deletionApprovalRequired === 'APPROVE_C4G_ORIGINAL_REPOSITORY_DELETION' && r.finalDeletionExecutionPlan.status === 'NOT_READY_NOT_EXECUTABLE', 'Human Gate explicit and closed');
check(r.truthBoundary.includes('Validator PASS') && r.truthBoundary.includes('Private payloads') && r.truthBoundary.includes('not deletion readiness') && r.truthBoundary.includes('Not production parity'), 'truth boundary');
const report = fs.readFileSync(path.join(root, allowed[0]), 'utf8'), plan = fs.readFileSync(path.join(root, allowed[3]), 'utf8');
check(report.includes(r.verdict) && report.includes('35,049') && report.includes(r.deletionApprovalRequired), 'human report agrees with blocked record');
check(plan.startsWith(git(root, 'show', `${START}:docs/AI/RECOVERY_PLAN.md`).toString()) && plan.includes('CLEANUP-C4F FINAL DELETION REVIEW'), 'Recovery Plan append-only');
git(root, 'diff', '--check'); git(root, 'diff', '--cached', '--check'); checks++;
console.log(`C4F_VALIDATION = PASS (${checks} checks)`);
console.log(`C4F_FINAL_DELETION_REVIEW = ${r.verdict}`);
console.log(`MEANINGFUL_UNIQUE_LOSS_COUNT = ${losses.length}; UNACCOUNTED_MODIFIED_TRACKED = ${um}; UNACCOUNTED_UNTRACKED_ENTRIES = ${uu}`);
console.log(`ORIGINAL_DELETION = 0; HUMAN_DELETION_GATE = CLOSED; RECORD = ${committed ? 'COMPLETE_COMMITTED' : 'COMPLETE_PENDING_AUTHORIZED_LOCAL_COMMIT'}`);
