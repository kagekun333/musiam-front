#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';

const repo = process.cwd();
const expectedHead = '2eb3a6379feb3e2a76db5ee472ddedd9e023ae24';
const expectedBranch = 'recovery/musiam-clean-20260920';
const archiveRoot = '/Users/kagekun/Library/Application Support/MUSIAM/archive/cleanup-c2-20260923';
const archiveFiles = ['canonical-output.tar.gz', 'dirty-output.tar.gz', 'dirty-archive.tar.gz', 'dirty-outputs.tar.gz'];
const groupIds = ['canonical-output', 'dirty-output', 'dirty-archive', 'dirty-outputs'];
const recordPath = path.join(repo, 'ops/recovery/cleanup-c2-20260923.json');
const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
const audit = JSON.parse(fs.readFileSync(path.join(repo, 'ops/recovery/cleanup-audit-20260922.json'), 'utf8'));
const sidecarPath = path.join(archiveRoot, 'SOURCE_PATH_MANIFEST.json');
const sidecarBytes = fs.readFileSync(sidecarPath);
const sidecar = JSON.parse(sidecarBytes.toString('utf8'));
const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });
const hashBytes = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const hashFile = (file) => hashBytes(fs.readFileSync(file));
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();

function listFiles(root) {
  const files = [];
  function walk(abs, relative) {
    for (const entry of fs.readdirSync(abs, { withFileTypes: true }).sort((a, b) => Buffer.from(a.name).compare(Buffer.from(b.name)))) {
      const full = path.join(abs, entry.name);
      const rawRelativePath = relative ? `${relative}/${entry.name}` : entry.name;
      const stat = fs.lstatSync(full);
      if (stat.isDirectory() && !stat.isSymbolicLink()) walk(full, rawRelativePath);
      else if (stat.isFile()) {
        const sha256 = crypto.createHash('sha256');
        const fd = fs.openSync(full, 'r');
        const buffer = Buffer.alloc(1024 * 1024);
        let read;
        try { while ((read = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) sha256.update(buffer.subarray(0, read)); }
        finally { fs.closeSync(fd); }
        files.push({ rawRelativePath, NFCRelativePath: rawRelativePath.normalize('NFC'), size: stat.size, sha256: sha256.digest('hex') });
      } else throw new Error(`Unexpected file type: ${full}`);
    }
  }
  walk(root, '');
  return files.sort((a, b) => Buffer.from(a.rawRelativePath).compare(Buffer.from(b.rawRelativePath)));
}

function nfcMap(files, getPath = (file) => file.rawRelativePath) {
  const map = new Map();
  let collisions = 0;
  for (const file of files) {
    const raw = getPath(file);
    const key = raw.normalize('NFC');
    if (map.has(key) && getPath(map.get(key)) !== raw) collisions++;
    else map.set(key, file);
  }
  return { map, collisions };
}

function archiveMembers(filename, expectedRootName) {
  const result = spawnSync('/usr/bin/tar', ['-tzf', path.join(archiveRoot, filename)], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`tar listing failed for ${filename}: ${result.stderr}`);
  const members = [];
  for (const member of result.stdout.replace(/\n$/, '').split('\n')) {
    if (!member) continue;
    if (member.includes('\n')) throw new Error('newline in archive member name is unsupported by listing parser');
    const slash = member.indexOf('/');
    if (slash < 0 || member.slice(0, slash).normalize('NFC') !== expectedRootName.normalize('NFC')) throw new Error(`unexpected archive root member: ${JSON.stringify(member)}`);
    const relative = member.slice(slash + 1);
    if (!relative || relative.endsWith('/')) continue; // directory member, not a file path
    members.push({ rawRelativePath: relative });
  }
  return members;
}

check('expected canonical HEAD and branch', git('rev-parse', 'HEAD') === expectedHead && git('branch', '--show-current') === expectedBranch && record.canonicalHead === expectedHead && record.canonicalBranch === expectedBranch);
check('exact archive root and four groups', record.archiveRoot === `${archiveRoot}${path.sep}` && record.sourceGroups.length === 4 && groupIds.every((id, i) => record.sourceGroups[i].id === id));
check('raw path sidecar exists and SHA-256 matches', fs.existsSync(sidecarPath) && record.rawSourcePathManifest.file === 'SOURCE_PATH_MANIFEST.json' && record.rawSourcePathManifest.sha256 === hashBytes(sidecarBytes));
check('sidecar is UTF-8 JSON and identifies canonical HEAD', sidecar.encoding === 'UTF-8' && sidecar.canonicalHead === expectedHead && sidecar.schemaVersion === 'cleanup-c2-source-path-manifest/v1');
check('source mutation and source deletion are false', record.sourceMutation === false && record.originalSourceDeleted === false);
check('source R0-R5, EVIDENCE_HOLD, UNKNOWN untouched', record.r0ThroughR5Touched === false && record.evidenceHoldTouched === false && record.unknownTouched === false);
check('application/provider/deploy/push operations are zero', record.applicationChanges === 0 && record.providerOperations === 0 && record.deployOperations === 0 && record.pushOperations === 0);
check('archive verification policy and final status recorded', record.verification.status === 'PASS' && record.pathPolicy.includes('NFC') && record.status === 'VERIFIED_ARCHIVES_CREATED_SOURCE_REMOVAL_NOT_AUTHORIZED');

let allExactMembers = true;
let totalFiles = 0;
let totalContentMatches = 0;
let totalExactExtracted = 0;
let totalCanonicalExtracted = 0;
let totalExactMembers = 0;
let totalCanonicalMembers = 0;
let totalSourceCollisions = 0;
let totalExtractedCollisions = 0;
let normalizedMappingOneToOne = true;

for (let index = 0; index < groupIds.length; index++) {
  const id = groupIds[index];
  const item = record.sourceGroups[index];
  const sideGroup = sidecar.groups[index];
  const auditEntry = audit.entries.find((entry) => entry.id === id && entry.category === 'ARCHIVE');
  const source = item.sourcePath;
  const archive = path.join(archiveRoot, archiveFiles[index]);
  const verifyGroup = path.join(archiveRoot, '.verify', archiveFiles[index]);
  check(`${id}: exact audit path and source root present`, Boolean(auditEntry) && source === auditEntry.path && fs.lstatSync(source).isDirectory() && !fs.lstatSync(source).isSymbolicLink());
  check(`${id}: archive exists and size/hash match`, fs.existsSync(archive) && fs.statSync(archive).size === item.archiveSize && hashFile(archive) === item.archiveSha256);

  const sourceFiles = listFiles(source);
  const sourceManifestRecords = sourceFiles.map((file) => ({ path: file.rawRelativePath, type: 'file', size: file.size, sha256: file.sha256 }));
  const sourceManifestHash = hashBytes(Buffer.from(JSON.stringify(sourceManifestRecords), 'utf8'));
  const sideFiles = sideGroup.files;
  const sourceMap = nfcMap(sourceFiles);
  const sideMap = nfcMap(sideFiles);
  totalSourceCollisions += sourceMap.collisions;
  const sidecarExact = sourceFiles.length === sideFiles.length && sourceFiles.every((file, i) => {
    const side = sideFiles[i];
    return side.group === id && side.rawRelativePath === file.rawRelativePath && side.NFCRelativePath === file.rawRelativePath.normalize('NFC') && side.size === file.size && side.sha256 === file.sha256;
  });
  check(`${id}: current source manifest unchanged and raw sidecar exact`, sourceFiles.length === item.sourceFileCount && sourceManifestHash === item.sourceManifestSha256 && sidecarExact && sourceMap.collisions === 0 && sideMap.collisions === 0);
  check(`${id}: source manifest hash recorded`, /^[a-f0-9]{64}$/.test(item.sourceManifestSha256));

  const topEntries = fs.readdirSync(verifyGroup);
  if (topEntries.length !== 1) throw new Error(`unexpected .verify entries for ${id}`);
  const extractedRoot = path.join(verifyGroup, topEntries[0]);
  const extractedFiles = listFiles(extractedRoot);
  const extractedMap = nfcMap(extractedFiles);
  totalExtractedCollisions += extractedMap.collisions;
  const mappingKeysEqual = sourceMap.map.size === extractedMap.map.size && [...sourceMap.map.keys()].every((key) => extractedMap.map.has(key));
  if (!mappingKeysEqual || sourceMap.map.size !== sourceFiles.length || extractedMap.map.size !== extractedFiles.length) normalizedMappingOneToOne = false;
  let contentMatches = 0, exactPaths = 0, canonicalPaths = 0;
  for (const file of sourceFiles) {
    const extracted = extractedMap.map.get(file.rawRelativePath.normalize('NFC'));
    if (!extracted) continue;
    canonicalPaths++;
    if (extracted.rawRelativePath === file.rawRelativePath) exactPaths++;
    if (file.size === extracted.size && file.sha256 === extracted.sha256) contentMatches++;
  }
  totalFiles += sourceFiles.length;
  totalContentMatches += contentMatches;
  totalExactExtracted += exactPaths;
  totalCanonicalExtracted += canonicalPaths;
  check(`${id}: extracted count, NFC mapping, size and SHA-256`, extractedFiles.length === sourceFiles.length && canonicalPaths === sourceFiles.length && contentMatches === sourceFiles.length && sourceMap.collisions === 0 && extractedMap.collisions === 0 && mappingKeysEqual);
  check(`${id}: extraction matches recorded evidence`, item.extractedFileCount === extractedFiles.length && item.exactRelativePathMatches === exactPaths && item.unicodeCanonicalPathMatches === canonicalPaths && item.contentMatches === contentMatches);

  const members = archiveMembers(archiveFiles[index], path.basename(source));
  const memberMap = nfcMap(members);
  let exactMembers = 0, canonicalMembers = 0;
  for (const file of sourceFiles) {
    const member = memberMap.map.get(file.rawRelativePath.normalize('NFC'));
    if (!member) continue;
    canonicalMembers++;
    if (member.rawRelativePath === file.rawRelativePath) exactMembers++;
  }
  if (memberMap.collisions || members.length !== sourceFiles.length || canonicalMembers !== sourceFiles.length) normalizedMappingOneToOne = false;
  if (exactMembers !== sourceFiles.length) allExactMembers = false;
  totalExactMembers += exactMembers;
  totalCanonicalMembers += canonicalMembers;
  check(`${id}: archive member listing one-to-one canonical mapping`, members.length === sourceFiles.length && memberMap.collisions === 0 && canonicalMembers === sourceFiles.length);
  check(`${id}: archive member classification recorded`, item.archiveMemberExactPaths === exactMembers && item.archiveMemberCanonicalPaths === canonicalMembers);
}

check('source normalization collisions = 0', totalSourceCollisions === 0 && record.verification.sourceNormalizationCollisions === 0);
check('extracted normalization collisions = 0', totalExtractedCollisions === 0 && record.verification.extractedNormalizationCollisions === 0);
check('normalized source/extracted/archive mapping is one-to-one', normalizedMappingOneToOne && record.verification.normalizedPathMapping === 'ONE_TO_ONE');
check('all 3,054 file contents and sizes verified', totalFiles === 3054 && totalContentMatches === 3054 && record.verification.allContentHashesMatch === true && record.verification.allFileSizesMatch === true);
check('all NFC paths verified and exact count retained', totalCanonicalExtracted === 3054 && totalExactExtracted === 2954 && record.verification.allUnicodeNfcPathsMatch === true && record.verification.exactRelativePathMatches === totalExactExtracted);
check('archive member raw path classification', record.archiveMemberRawPathClassification === (allExactMembers ? 'EXACT' : 'NORMALIZED_EQUIVALENT') && totalCanonicalMembers === 3054 && record.verification.archiveMemberListingReadWithoutExtraction === true);
check('duplicate relationship and truth boundary recorded', record.duplicateGroups.some((group) => group.id === 'output-subtree-20260922' && group.matchingFileCount === 1126 && !group.deduplicated) && typeof record.truthBoundary === 'string' && record.truthBoundary.includes('raw codepoint'));

const originalRepo = '/Users/kagekun/Desktop/musiam-front';
const dirtyStatus = execFileSync('git', ['status', '--short'], { cwd: originalRepo, encoding: 'utf8' }).split('\n').filter(Boolean);
const dirtyUntracked = dirtyStatus.filter((line) => line.startsWith('??')).length;
const dirtyTracked = dirtyStatus.filter((line) => !line.startsWith('??')).length;
const dirtyStaged = dirtyStatus.filter((line) => !line.startsWith('??') && line[0] !== ' ').length;
const dirtyHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: originalRepo, encoding: 'utf8' }).trim();
const dirtyBranch = execFileSync('git', ['branch', '--show-current'], { cwd: originalRepo, encoding: 'utf8' }).trim();
const before = record.dirtyRepoBefore, after = record.dirtyRepoAfter;
check('original dirty repo Git baseline unchanged', dirtyHead === before.head && dirtyHead === after.head && dirtyBranch === before.branch && dirtyBranch === after.branch && dirtyTracked === 102 && dirtyStaged === 0 && dirtyUntracked === 433 && JSON.stringify(before) === JSON.stringify(after));

const allowed = new Set(['docs/AI/CLEANUP_C2_ARCHIVE.md', 'ops/recovery/cleanup-c2-20260923.json', 'scripts/validate-cleanup-c2.mjs', 'docs/AI/RECOVERY_PLAN.md']);
const gitStatus = execFileSync('git', ['status', '--short'], { cwd: repo, encoding: 'utf8' }).split('\n').filter(Boolean);
const changedPaths = gitStatus.map((line) => line.slice(3).replace(/^.* -> /, '')).sort();
check('canonical working changes limited to C2 four files', changedPaths.length === 4 && changedPaths.every((file) => allowed.has(file)) && [...allowed].every((file) => changedPaths.includes(file)));
check('no staged changes before authorized local commit', git('diff', '--cached', '--name-only') === '');

const verifyPath = path.join(archiveRoot, '.verify');
const resolvedArchive = fs.realpathSync(archiveRoot);
const resolvedVerify = fs.realpathSync(verifyPath);
const sourceRoots = record.sourceGroups.map((group) => path.resolve(group.sourcePath));
const isNested = (parent, child) => { const rel = path.relative(parent, child); return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel)); };
const safeVerify = resolvedVerify === path.join(resolvedArchive, '.verify') && !fs.lstatSync(verifyPath).isSymbolicLink() && sourceRoots.every((source) => !isNested(source, resolvedVerify) && !isNested(resolvedVerify, source));
check('exact .verify target is under archive root and outside all sources', safeVerify && fs.lstatSync(verifyPath).isDirectory() && record.verification.verifyTempRemoved === false);

if (checks.some((result) => !result.ok)) {
  for (const result of checks) console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}`);
  console.error('C2 validator failed; .verify retained.');
  process.exitCode = 1;
} else {
  fs.rmSync(verifyPath, { recursive: true, force: false });
  record.verification.verifyTempRemoved = true;
  fs.writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  check('exact .verify removed after all verification passed', !fs.existsSync(verifyPath) && record.verification.verifyTempRemoved === true);
  for (const result of checks) console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}`);
  if (!checks.every((result) => result.ok)) {
    console.error('C2 validator failed after .verify cleanup.');
    process.exitCode = 1;
  } else console.log('C2_ARCHIVE = VERIFIED_ARCHIVES_CREATED_SOURCE_REMOVAL_NOT_AUTHORIZED');
}
