#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const repo = process.cwd();
const dirtyRepo = '/Users/kagekun/Desktop/musiam-front';
const archiveRoot = '/Users/kagekun/Library/Application Support/MUSIAM/archive/cleanup-c2-20260923';
const expectedHead = 'e29b6e4db3bf0ce546926d2046d0d6884b391882';
const expectedBranch = 'recovery/musiam-clean-20260920';
const incidentList = '/private/tmp/c2-canonical-deleted-paths.zlist';
const recordPath = path.join(repo, 'ops/recovery/cleanup-c2-source-removal-20260923.json');
const c2RecordPath = path.join(repo, 'ops/recovery/cleanup-c2-20260923.json');
const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
const c2 = JSON.parse(fs.readFileSync(c2RecordPath, 'utf8'));
const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });
const shaBytes = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const shaFile = (file) => {
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(file, 'r');
  const buffer = Buffer.alloc(1024 * 1024);
  let count;
  try {
    while ((count = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, count));
  } finally { fs.closeSync(fd); }
  return hash.digest('hex');
};
const git = (cwd, args, encoding = 'utf8') => execFileSync('git', args, { cwd, encoding });
const gitPaths = (cwd, args) => git(cwd, args, 'buffer').toString('utf8').split('\0').filter(Boolean);
const getGroup = (id) => c2.sourceGroups.find((group) => group.id === id);
function listFiles(root) {
  const files = [];
  function walk(directory, relative = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => Buffer.from(a.name).compare(Buffer.from(b.name)))) {
      const full = path.join(directory, entry.name);
      const rawRelativePath = relative ? relative + '/' + entry.name : entry.name;
      const stat = fs.lstatSync(full);
      if (stat.isSymbolicLink()) throw new Error('unexpected symlink in retained source');
      if (stat.isDirectory()) walk(full, rawRelativePath);
      else if (stat.isFile()) files.push({ path: rawRelativePath, type: 'file', size: stat.size, sha256: shaFile(full) });
      else throw new Error('unexpected file type in retained source');
    }
  }
  walk(root);
  return files.sort((a, b) => Buffer.from(a.path).compare(Buffer.from(b.path)));
}
function statusEntries(cwd) {
  return gitPaths(cwd, ['status', '--porcelain=v1', '-z', '--untracked-files=normal']).map((entry) => ({ code: entry.slice(0, 2), path: entry.slice(3) }));
}
function statusCounts(cwd) {
  const entries = statusEntries(cwd);
  return {
    trackedModified: entries.filter((entry) => entry.code !== '??' && (entry.code[0] !== ' ' || entry.code[1] !== ' ')).length,
    staged: entries.filter((entry) => entry.code !== '??' && entry.code[0] !== ' ').length,
    untracked: entries.filter((entry) => entry.code === '??').length,
    entries
  };
}
function underRoot(gitPath, absoluteRoot, repository) {
  const relativeRoot = path.relative(repository, absoluteRoot).split(path.sep).filter(Boolean).map((part) => part.normalize('NFC'));
  const parts = gitPath.split('/').map((part) => part.normalize('NFC'));
  return parts.length >= relativeRoot.length && relativeRoot.every((part, index) => parts[index] === part);
}

check('record status and incident fields', record.finalStatus === 'C2_SOURCE_REMOVAL = PARTIAL_COMPLETE_TRACKED_SOURCES_RETAINED' && record.canonicalIntegrity === 'RESTORED' && record.furtherSourceDeletion === 'NOT_REQUIRED' && record.incidentOccurred === true && record.accidentalTrackedDeletionCount === 1126);
check('canonical HEAD and branch', record.canonicalHead === expectedHead && record.canonicalBranch === expectedBranch && (git(repo, ['rev-parse', 'HEAD']).trim() === expectedHead || git(repo, ['rev-parse', 'HEAD^']).trim() === expectedHead) && git(repo, ['branch', '--show-current']).trim() === expectedBranch);

const allowed = new Set([
  'docs/AI/CLEANUP_C2_SOURCE_REMOVAL.md',
  'ops/recovery/cleanup-c2-source-removal-20260923.json',
  'scripts/validate-cleanup-c2-source-removal.mjs',
  'docs/AI/RECOVERY_PLAN.md'
]);
const currentHead = git(repo, ['rev-parse', 'HEAD']).trim();
const workingStatus = statusCounts(repo);
const unexpectedWorkingPaths = workingStatus.entries.filter((entry) => !allowed.has(entry.path));
check('only four authorized final record paths are changed', unexpectedWorkingPaths.length === 0 && workingStatus.entries.length <= 4);
check('canonical staging area is empty', workingStatus.staged === 0 && git(repo, ['diff', '--cached', '--name-only']).trim() === '');
const commitPaths = currentHead === expectedHead ? [] : gitPaths(repo, ['diff-tree', '--no-commit-id', '--name-only', '-r', '-z', 'HEAD']);
check('if committed, commit contains only the four final record files', currentHead === expectedHead || (git(repo, ['rev-parse', 'HEAD^']).trim() === expectedHead && commitPaths.length === 4 && commitPaths.every((file) => allowed.has(file))));
const deletedNow = gitPaths(repo, ['diff', '--name-only', '--diff-filter=D', '-z']);
check('canonical deleted tracked paths after restore = 0', deletedNow.length === 0 && record.canonicalTrackedDeletionAfter === 0);
const trackedChanges = gitPaths(repo, ['diff', '--name-only', '-z']);
const untracked = gitPaths(repo, ['ls-files', '--others', '--exclude-standard', '-z']);
const appPrefixes = ['src/', 'public/', 'package.json', 'next.config', 'vercel.json'];
const appChanges = [...trackedChanges, ...untracked].filter((file) => appPrefixes.some((prefix) => file.startsWith(prefix)));
check('canonical tracked modifications and untracked files after restore = 0', record.canonicalTrackedModificationAfter === 0 && record.canonicalStagedAfter === 0 && record.canonicalUntrackedAfter === 0 && (currentHead !== expectedHead || (appChanges.length === 0 && workingStatus.entries.every((entry) => allowed.has(entry.path)))));

const pathBytes = fs.readFileSync(incidentList);
const incidentPaths = pathBytes.toString('utf8').split('\0').filter(Boolean);
const sourceGroup = getGroup('canonical-output');
const sourcePath = sourceGroup.sourcePath;
const rootName = path.basename(sourcePath).normalize('NFC');
const headTracked = gitPaths(repo, ['ls-tree', '-r', '--name-only', '-z', expectedHead]).filter((file) => {
  const parts = file.split('/');
  return parts.length > 1 && parts[0].normalize('NFC') === rootName;
});
const expectedIncidentSet = new Set(headTracked.map((file) => file.normalize('NFC')));
const actualIncidentSet = new Set(incidentPaths.map((file) => file.normalize('NFC')));
check('restore path list exists, has 1,126 Git paths, and hash matches', incidentPaths.length === 1126 && record.restorePathList === incidentList && record.restorePathListBytes === pathBytes.length && record.restorePathListSha256 === shaBytes(pathBytes) && incidentPaths.every((file) => underRoot(file, sourcePath, repo)));
check('incident path list equals the canonical HEAD tracked set', expectedIncidentSet.size === 1126 && actualIncidentSet.size === 1126 && [...expectedIncidentSet].every((file) => actualIncidentSet.has(file)));
check('restore method is Git NUL-safe pathspec from HEAD', record.restoreMethod === 'git NUL-safe pathspec from HEAD' && record.restoredFileCount === 1126);

const canonicalRoot = fs.lstatSync(sourcePath);
const canonicalFiles = listFiles(sourcePath);
const canonicalManifestRecords = canonicalFiles.map(({ path: relative, type, size, sha256 }) => ({ path: relative, type, size, sha256 }));
const canonicalManifestHash = shaBytes(Buffer.from(JSON.stringify(canonicalManifestRecords), 'utf8'));
const rawSidecarPath = path.join(archiveRoot, 'SOURCE_PATH_MANIFEST.json');
const sidecarBytes = fs.readFileSync(rawSidecarPath);
const sidecar = JSON.parse(sidecarBytes.toString('utf8'));
const canonicalSideGroup = sidecar.groups.find((group) => group.group === 'canonical-output');
const expectedByNfc = new Map(canonicalSideGroup.files.map((file) => [file.NFCRelativePath, file]));
const canonicalNfcSet = new Set();
let normalizationCollisions = 0;
let nfcMatches = 0;
let contentMatches = 0;
for (const file of canonicalFiles) {
  const nfcPath = file.path.normalize('NFC');
  if (canonicalNfcSet.has(nfcPath)) normalizationCollisions++;
  canonicalNfcSet.add(nfcPath);
  const expected = expectedByNfc.get(nfcPath);
  if (expected) {
    nfcMatches++;
    if (expected.size === file.size && expected.sha256 === file.sha256) contentMatches++;
  }
}
check('canonical archive source root retained and has 1,126 files', canonicalRoot.isDirectory() && !canonicalRoot.isSymbolicLink() && canonicalFiles.length === 1126 && record.canonicalSource.status === 'RETAIN_TRACKED_ARCHIVE_SOURCE');
check('canonical source size and manifest equal C2 authority', canonicalFiles.reduce((sum, file) => sum + file.size, 0) === 468794580 && canonicalManifestHash === sourceGroup.sourceManifestSha256 && canonicalManifestHash === record.restoredManifestSha256 && record.restoredManifestMatch === true);
check('restored source content and NFC identity match 1,126/1,126 with zero collisions', nfcMatches === 1126 && contentMatches === 1126 && normalizationCollisions === 0 && record.normalizationCollisions === 0);
check('canonical source tracked identity retained in HEAD', headTracked.length === 1126 && expectedIncidentSet.size === headTracked.length);

const dirtyOutput = getGroup('dirty-output');
const dirtyOutputs = getGroup('dirty-outputs');
const dirtyArchive = getGroup('dirty-archive');
const dirtyTracked = gitPaths(dirtyRepo, ['ls-files', '-z']).filter((file) => underRoot(file, dirtyOutput.sourcePath, dirtyRepo));
const dirtyUntracked = gitPaths(dirtyRepo, ['ls-files', '--others', '--exclude-standard', '-z']).filter((file) => underRoot(file, dirtyOutputs.sourcePath, dirtyRepo));
check('dirty tracked archive source retained with 1,126 tracked files', fs.lstatSync(dirtyOutput.sourcePath).isDirectory() && dirtyTracked.length === 1126 && record.retainedRoots.some((root) => root.id === 'dirty-output' && root.trackedFiles === 1126));
check('dirty outputs retained and untracked baseline preserved', fs.lstatSync(dirtyOutputs.sourcePath).isDirectory() && dirtyUntracked.length === 1 && record.retainedRoots.some((root) => root.id === 'dirty-outputs' && root.untrackedFiles === 1));
check('dirty _archive root absent and recorded removed', !fs.existsSync(dirtyArchive.sourcePath) && record.removedRoots.some((root) => root.id === 'dirty-archive' && root.fileCount === 791));

const dirtyCounts = statusCounts(dirtyRepo);
const dirtyHead = git(dirtyRepo, ['rev-parse', 'HEAD']).trim();
const dirtyBranch = git(dirtyRepo, ['branch', '--show-current']).trim();
check('dirty repository HEAD and branch unchanged', dirtyHead === record.dirtyRepoHead && dirtyBranch === record.dirtyRepoBranch);
check('dirty repository counts remain 102 / 0 / 433', dirtyCounts.trackedModified === 102 && dirtyCounts.staged === 0 && dirtyCounts.untracked === 433 && record.dirtyTrackedModified === 102 && record.dirtyStaged === 0 && record.dirtyUntracked === 433);

const archiveFiles = c2.archiveFiles;
let allArchivesValid = true;
for (const filename of archiveFiles) {
  const archiveFile = path.join(archiveRoot, filename);
  if (!fs.existsSync(archiveFile) || shaFile(archiveFile) !== c2.archiveHashes[filename] || record.archiveHashes[filename] !== c2.archiveHashes[filename]) allArchivesValid = false;
}
const sidecarHash = shaBytes(sidecarBytes);
check('all four C2 archive files remain present and hashes match', allArchivesValid && record.archiveIntegrity === true);
check('raw source path manifest remains present and hash matches', sidecar.schemaVersion === 'cleanup-c2-source-path-manifest/v1' && sidecarHash === c2.rawSourcePathManifest.sha256 && sidecarHash === record.rawPathManifestSha256 && record.rawPathManifestIntegrity === true);

const currentDirtyBytes = Number(execFileSync('du', ['-sk', dirtyRepo], { encoding: 'utf8' }).split(/\s+/)[0]) * 1024;
check('final dirty repo allocation and reclaimed bytes are recorded from measured delta', currentDirtyBytes === record.dirtyRepoCurrentAllocatedBytes && record.dirtyRepoAllocatedBytesBeforeRemoval - record.dirtyRepoAllocatedBytesAfterRemoval === record.finalActualReclaimedBytes && record.finalActualReclaimedBytes === 111738880 && record.finalRemovedFileCount === 791);
check('final retained and removed root statuses are complete', record.retainedRoots.length === 3 && record.removedRoots.length === 1 && record.finalStatus.endsWith('PARTIAL_COMPLETE_TRACKED_SOURCES_RETAINED'));
check('R0-R5, EVIDENCE_HOLD, UNKNOWN, application, providers, deploy, push and C3 boundaries', record.r0ToR5Touched === false && record.evidenceHoldTouched === false && record.unknownTouched === false && record.applicationFilesChanged === 0 && record.providerOperations === 0 && record.deployOperations === 0 && record.pushOperations === 0 && record.c3Started === false);
check('truth boundary and C4 next gate recorded', typeof record.truthBoundary === 'string' && record.truthBoundary.length > 0);

for (const result of checks) console.log((result.ok ? 'PASS ' : 'FAIL ') + result.name);
if (checks.some((result) => !result.ok)) {
  console.error('C2 source removal finalization validator failed.');
  process.exitCode = 1;
} else console.log('C2_SOURCE_REMOVAL = PARTIAL_COMPLETE_TRACKED_SOURCES_RETAINED');
