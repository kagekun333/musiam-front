import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const record = JSON.parse(readFileSync('ops/product/chat-history-preview-deploy-input-remediation-20260925.json', 'utf8'));
const report = readFileSync('docs/AI/CHAT_HISTORY_PREVIEW_DEPLOY_INPUT_REMEDIATION.md', 'utf8');
const vercelignore = readFileSync('.vercelignore', 'utf8').split(/\r?\n/);
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const candidateMode = process.argv.includes('--candidate');
let checks = 0;

function check(label, fn) {
  fn();
  checks++;
  console.log(`PASS ${checks}: ${label}`);
}

const huskyHelpers = [
  '.husky/_/applypatch-msg',
  '.husky/_/commit-msg',
  '.husky/_/h',
  '.husky/_/husky.sh',
  '.husky/_/post-applypatch',
  '.husky/_/post-checkout',
  '.husky/_/post-commit',
  '.husky/_/post-merge',
  '.husky/_/post-rewrite',
  '.husky/_/pre-applypatch',
  '.husky/_/pre-auto-gc',
  '.husky/_/pre-commit',
  '.husky/_/pre-merge-commit',
  '.husky/_/pre-push',
  '.husky/_/pre-rebase',
  '.husky/_/prepare-commit-msg',
];
const expectedUnexpected = [...huskyHelpers, 'next-env.d.ts'].sort();
const expectedCommitFiles = [
  '.vercelignore',
  'docs/AI/CHAT_HISTORY_PREVIEW_DEPLOY_INPUT_REMEDIATION.md',
  'ops/product/chat-history-preview-deploy-input-remediation-20260925.json',
  'scripts/validate-chat-history-preview-deploy-input-remediation.mjs',
].sort();

check('State Lock and one-commit ancestry', () => {
  assert.equal(record.startingHead, '1e47fc52cc9b230c2d087b11b676fdb021f8e66d');
  assert.equal(record.branch, 'recovery/musiam-clean-20260920');
  assert.equal(git('branch', '--show-current'), record.branch);
  if (candidateMode) {
    assert.equal(git('rev-parse', 'HEAD'), record.startingHead);
    const staged = git('diff', '--cached', '--name-only').split(/\r?\n/).filter(Boolean);
    const unstaged = git('diff', '--name-only').split(/\r?\n/).filter(Boolean);
    assert.deepEqual([...new Set([...staged, ...unstaged])].sort(), expectedCommitFiles);
  } else {
    assert.equal(git('rev-parse', 'HEAD^'), record.startingHead);
    assert.equal(git('log', '-1', '--format=%s'), 'chore: harden preview deploy input');
  }
});

check('the exact prior 17 paths and generated Husky classification are recorded', () => {
  assert.deepEqual(record.before.unexpectedUntrackedPaths.map((x) => x.path).sort(), expectedUnexpected);
  assert.deepEqual(record.classification.husky.paths.slice().sort(), huskyHelpers.slice().sort());
  assert.equal(record.classification.husky.count, 16);
  assert.equal(record.classification.husky.gitState, 'IGNORED_UNTRACKED');
  assert.equal(record.classification.husky.verdict, 'GENERATED_DEV_ONLY_NOT_DEPLOY_REQUIRED');
  assert.equal(record.classification.husky.actualTrackedHook, '.husky/commit-msg');
});

check('next-env.d.ts is generated metadata excluded by exact path', () => {
  assert.equal(record.classification.nextEnv.path, 'next-env.d.ts');
  assert.equal(record.classification.nextEnv.nextVersion, '15.5.12');
  assert.equal(record.classification.nextEnv.gitState, 'IGNORED_UNTRACKED_BY_ROOT_GITIGNORE');
  assert.equal(record.classification.nextEnv.inTsconfigInclude, true);
  assert.equal(record.classification.nextEnv.regeneratedByNextBuild, true);
  assert.equal(record.classification.nextEnv.verdict, 'GENERATED_NEXTJS_METADATA_NOT_DEPLOY_REQUIRED');
});

check('local Claude settings are excluded by exact path without reading their contents', () => {
  assert.equal(record.classification.localClaudeSettings.path, '.claude/settings.local.json');
  assert.equal(record.classification.localClaudeSettings.gitState, 'TRACKED');
  assert.equal(record.classification.localClaudeSettings.contentsInspected, false);
  assert.equal(record.classification.localClaudeSettings.deploymentRuntimeRequired, false);
  assert.equal(record.classification.localClaudeSettings.verdict, 'LOCAL_DEVELOPER_CONFIG_NOT_DEPLOY_REQUIRED');
  assert.ok(vercelignore.includes('.claude/settings.local.json'));
});

check('the exact task-generated pnpm store was authorized and removed', () => {
  assert.equal(record.taskGeneratedTemporaryStore.path, '.pnpm-store/');
  assert.equal(record.taskGeneratedTemporaryStore.explicitUserAuthorization, true);
  assert.equal(record.taskGeneratedTemporaryStore.deletionStatus, 'REMOVED_AFTER_EXPLICIT_EXACT_PATH_AUTHORIZATION');
  assert.equal(record.taskGeneratedTemporaryStore.absentAfterDeletion, true);
  assert.equal(existsSync('.pnpm-store'), false);
});

check('protected directory is a zero-byte metadata-only collector entry', () => {
  assert.equal(record.classification.protectedDirectory.path, 'ops/market-learning/daily-20260925');
  assert.equal(record.classification.protectedDirectory.mode, 16877);
  assert.equal(record.classification.protectedDirectory.bytes, 0);
  assert.equal(record.classification.protectedDirectory.hasContentId, false);
  assert.equal(record.classification.protectedDirectory.descendantFileEntries, 0);
  assert.equal(record.classification.protectedDirectory.filesystemDescendantRegularFiles, 5);
  assert.equal(record.classification.protectedDirectory.filesystemDescendantRegularBytes, 10582);
  assert.equal(record.classification.protectedDirectory.contentsInspected, false);
  assert.equal(record.classification.protectedDirectory.contentsModified, false);
  assert.equal(record.classification.protectedDirectory.isSymlink, false);
  assert.equal(record.classification.protectedDirectory.verdict, 'EMPTY_DIRECTORY_ENTRY_NO_DATA_EXPOSURE');
});

check('.vercelignore contains only the scoped generated and audit exclusions', () => {
  for (const path of [
    '.husky/_/',
    'next-env.d.ts',
    '.claude/settings.local.json',
    'scripts/validate-cleanup-c4c-private-preservation.mjs',
    'scripts/validate-chat-history-preview-deployment.mjs',
    'scripts/validate-chat-history-preview-deploy-input-remediation.mjs',
    'ops/market-learning/daily-20260925/',
    'docs/AI/',
    'ops/product/',
    'ops/recovery/',
  ]) assert.ok(vercelignore.includes(path), path);
  assert.ok(vercelignore.includes('.env.*'));
  assert.ok(!vercelignore.includes('!.env.example'));
  assert.ok(!vercelignore.includes('.husky/**'));
  assert.ok(!vercelignore.includes('ops/**'));
  assert.ok(!vercelignore.includes('src/**'));
});

check('fresh deploy-input manifest is internally consistent and safe', () => {
  const a = record.after;
  assert.equal(a.collector, 'Vercel CLI 59.23.2 inspectDeploymentFiles offline');
  assert.equal(a.entries, a.regularFiles + a.directoryEntries);
  assert.equal(a.entries, 3208);
  assert.equal(a.regularFiles, 3200);
  assert.equal(a.directoryEntries, 8);
  assert.equal(a.totalBytes, 214053118);
  assert.equal(a.manifestSha256, 'c86dad16b2fdac9a11a08bf4daa3f0680037baa9a63e19f10f152e00f95d5284');
  assert.equal(a.unexpectedUntrackedIncluded, 0);
  assert.deepEqual(a.untrackedIncludedPaths, []);
  assert.equal(a.protectedOperationalFilesIncluded, 0);
  assert.equal(a.envStarFilesIncluded, 0);
  assert.equal(a.secretPrivateConfigFilesIncluded, 0);
  assert.deepEqual(a.secretPrivateConfigExcludedPaths, ['.claude/settings.local.json']);
  assert.equal(a.privatePreservationPayloadsIncluded, 0);
  assert.equal(a.chatFixtureFilesIncluded, 0);
  assert.equal(a.governanceOnlyAuditMaterialsIncluded, 0);
  assert.equal(a.protectedDirectoryEntryIncluded, true);
  assert.equal(a.protectedDirectoryEntryBytes, 0);
  assert.equal(a.protectedDirectoryEntryHasContentId, false);
  assert.equal(a.protectedDirectoryDescendantFileEntries, 0);
  assert.equal(a.trackedCommitHookIncluded, true);
});

check('all requested local validations are recorded as complete', () => {
  const v = record.validation;
  for (const key of [
    'typecheck', 'strengthening02', 'previewReadiness', 'historyRuntimeSafety',
    'envMetadata', 'r7c1', 'r7c2', 'catalog', 'exhibition', 'diffCheck',
  ]) assert.equal(v[key], 'PASS', key);
  assert.equal(v.catalogPrimary, 450);
  assert.equal(v.catalogMerged, 514);
  assert.equal(v.exhibitionDisplayed, 514);
  assert.equal(v.exhibitionMissing, 0);
  assert.equal(v.rootLint, 'KNOWN_2_WARNINGS_0_ERRORS');
});

check('the scoped candidate or commit changes no application source and preserves the protected directory', () => {
  const changed = candidateMode
    ? [...new Set([
      ...git('diff', '--cached', '--name-only').split(/\r?\n/).filter(Boolean),
      ...git('diff', '--name-only').split(/\r?\n/).filter(Boolean),
    ])].sort()
    : git('diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD').split(/\r?\n/).filter(Boolean).sort();
  assert.deepEqual(changed, expectedCommitFiles);
  const status = git('status', '--porcelain=v1', '--untracked-files=normal').split(/\r?\n/).filter(Boolean);
  const paths = status.map((line) => line.slice(3)).sort();
  if (candidateMode) assert.deepEqual(paths, [...expectedCommitFiles, 'ops/market-learning/daily-20260925/'].sort());
  else assert.deepEqual(status, ['?? ops/market-learning/daily-20260925/']);
  assert.equal(record.protectedDirectory.modified, false);
  assert.equal(record.protectedDirectory.staged, false);
  assert.equal(record.protectedDirectory.deleted, false);
  assert.equal(record.applicationSourceChanges, 0);
  if (!candidateMode) assert.equal(record.localCommit, 'CREATED');
});

check('no Preview deploy, Production mutation, or push occurred', () => {
  assert.equal(record.deployment.previewCount, 0);
  assert.equal(record.deployment.previewDeploymentId, null);
  assert.equal(record.deployment.productionMutationCount, 0);
  assert.equal(record.deployment.pushCount, 0);
  if (candidateMode) {
    assert.equal(record.verdict, 'CHAT_HISTORY_PREVIEW_DEPLOY_INPUT = PENDING_FINAL_VALIDATION');
    assert.equal(record.nextGate, 'CHAT_HISTORY_PREVIEW_DEPLOYMENT = NOT_READY_PENDING');
  } else {
    assert.equal(record.verdict, 'CHAT_HISTORY_PREVIEW_DEPLOY_INPUT = SAFE_COMMITTED');
    assert.equal(record.nextGate, 'CHAT_HISTORY_PREVIEW_DEPLOYMENT = READY_FOR_REAPPROVAL');
  }
  assert.equal(record.recommendedNextModel, 'gpt-6-astra/high');
  if (candidateMode) assert.match(report, /CHAT_HISTORY_PREVIEW_DEPLOY_INPUT = PENDING_FINAL_VALIDATION/);
  else {
    assert.match(report, /CHAT_HISTORY_PREVIEW_DEPLOY_INPUT = SAFE_COMMITTED/);
    assert.match(report, /CHAT_HISTORY_PREVIEW_DEPLOYMENT = READY_FOR_REAPPROVAL/);
  }
  assert.match(report, /Preview deployment was not started/);
});

if (candidateMode) {
  execFileSync('git', ['diff', '--cached', '--check'], { stdio: 'inherit' });
  execFileSync('git', ['diff', '--check'], { stdio: 'inherit' });
} else execFileSync('git', ['diff', '--check', 'HEAD^', 'HEAD'], { stdio: 'inherit' });
console.log(`CHAT_HISTORY_PREVIEW_DEPLOY_INPUT_REMEDIATION_VALIDATOR=PASS mode=${candidateMode ? 'candidate' : 'committed'} checks=${checks} head=${git('rev-parse', 'HEAD')}`);
