import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const r = JSON.parse(readFileSync('ops/product/chat-history-preview-deployment-retry-20260925.json', 'utf8'));
const report = readFileSync('docs/AI/CHAT_HISTORY_PREVIEW_DEPLOYMENT_RETRY.md', 'utf8');
const historyRoute = readFileSync('src/pages/api/chat-history.ts', 'utf8');
const chatRoute = readFileSync('src/pages/api/chat-experience-v3.ts', 'utf8');
const candidate = process.argv.includes('--candidate');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
let checks = 0;
function check(label, fn) { fn(); checks++; console.log(`PASS ${checks}: ${label}`); }

check('starting HEAD, branch, and clean tracked State Lock', () => {
  assert.equal(r.startingHead, 'b92a3c43e223e08dcd76fcb5869dc3244f460714');
  assert.equal(r.branch, 'recovery/musiam-clean-20260920');
  assert.equal(r.trackedTreeCleanAtStart, true);
  assert.equal(git('branch', '--show-current'), r.branch);
  assert.equal(git('rev-parse', candidate ? 'HEAD' : 'HEAD^'), r.startingHead);
});
check('direct explicit retry approval is scoped to one Preview upload', () => {
  assert.equal(r.approval, 'APPROVE_CHAT_HISTORY_PREVIEW_DEPLOYMENT_RETRY');
  assert.equal(r.approvalProvenance, 'DIRECT_USER_MESSAGE_EXACT_MANIFEST_PROJECT_TEAM_ONE_PREVIEW');
  assert.equal(r.project.id, 'prj_OU4nbZIO3n3ieS99cMXY7eWigHAl');
  assert.equal(r.project.teamId, 'team_Hj7QBy2lnfpsuHXgOWKfFdZg');
});
check('exact pre-upload manifest and protected input boundary', () => {
  assert.equal(r.deployInput.sha256, 'c86dad16b2fdac9a11a08bf4daa3f0680037baa9a63e19f10f152e00f95d5284');
  assert.equal(r.deployInput.entries, 3208);
  assert.equal(r.deployInput.regularFiles, 3200);
  assert.equal(r.deployInput.directoryEntries, 8);
  assert.equal(r.deployInput.bytes, 214053118);
  assert.equal(r.deployInput.exactMatchBeforeDeployment, true);
  for (const key of ['unexpectedUntrackedFiles','protectedDescendantFiles','envFiles','secretPrivateFiles','chatFixtures','governanceAuditMaterials']) assert.equal(r.deployInput[key], 0, key);
  assert.equal(r.deployInput.protectedDirectoryMetadataOnly, true);
});
check('manifest agrees with the previous committed remediation authority', () => {
  const prior = JSON.parse(readFileSync('ops/product/chat-history-preview-deploy-input-remediation-20260925.json', 'utf8'));
  assert.equal(r.deployInput.sha256, prior.after.manifestSha256);
  assert.equal(r.deployInput.entries, prior.after.entries);
  assert.equal(r.deployInput.bytes, prior.after.totalBytes);
});
check('protected root remains present and unstaged', () => {
  assert.equal(existsSync(r.protectedUntracked), true);
  assert.equal(git('diff', '--cached', '--name-only', '--', r.protectedUntracked), '');
});
check('required local validators, catalog, exhibition, lint, and diff', () => {
  for (const key of ['typecheck','strengthening02','historyRuntimeSafety','envMetadata','previewReadiness','deployInputRemediation','r7c1','r7c2']) assert.match(r.localValidation[key], /^PASS_/);
  assert.equal(r.localValidation.catalogPrimary, 450);
  assert.equal(r.localValidation.catalogMerged, 514);
  assert.equal(r.localValidation.exhibitionDisplayed, 514);
  assert.equal(r.localValidation.exhibitionMissing, 0);
  assert.equal(r.localValidation.rootLintErrors, 0);
  assert.equal(r.localValidation.rootLintKnownWarnings, 2);
  assert.equal(r.localValidation.rootLintNewWarnings, 0);
  assert.equal(r.localValidation.gitDiffCheck, 'PASS');
  assert.equal(git('diff', '--check'), '');
});
check('Production BEFORE is recorded', () => {
  assert.equal(r.productionBefore.deploymentId, 'dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX');
  assert.equal(r.productionBefore.state, 'READY');
  assert.equal(r.productionBefore.target, 'production');
  assert.equal(r.productionBefore.wwwTargetDeploymentId, r.productionBefore.deploymentId);
});
check('exactly one Preview attempt and READY result', () => {
  assert.equal(r.deployment.attempts, 1);
  assert.equal(r.deployment.id, 'dpl_Bc9YHMTXaqgV9qnxHbrmLZRW16pT');
  assert.equal(r.deployment.state, 'READY');
  assert.equal(r.deployment.target, 'preview');
  assert.equal(r.deployment.providerTargetField, null);
  assert.deepEqual(r.deployment.aliases, []);
  assert.equal(r.deployment.downloadedDeployFiles, r.deployInput.entries);
});
check('Preview has no Production alias', () => {
  assert.deepEqual(r.deployment.aliases, []);
  assert.equal(r.deployment.providerTargetField, null);
  assert.ok(!r.deployment.url.includes('www.hakusyaku.xyz'));
});
check('Preview metadata and SHA provenance', () => {
  assert.equal(r.deployment.url, 'https://musiam-front-e2nbajn7i-hakusyakus-projects.vercel.app');
  assert.equal(r.deployment.source, 'cli');
  assert.equal(r.deployment.gitCommitSha, r.startingHead);
  assert.equal(r.deployment.gitShaVerified, true);
  assert.equal(r.deployment.framework, 'nextjs');
  assert.equal(r.deployment.nextVersion, '15.5.12');
  assert.equal(r.deployment.nodeVersion, 'UNVERIFIED_PROVIDER_METADATA_UNAVAILABLE');
  assert.equal(r.deployment.buildDurationMs, 144236);
  assert.ok(Date.parse(r.deployment.readyAt) > Date.parse(r.deployment.createdAt));
});
check('build duration is arithmetically consistent with provider timestamps', () => {
  assert.equal(Date.parse(r.deployment.readyAt) - Date.parse(r.deployment.buildingAt), r.deployment.buildDurationMs);
});
check('safe HTML GETs do not claim browser hydration', () => {
  for (const key of ['rootGet','chatGet']) {
    assert.equal(r.smoke[key].status, 200);
    assert.equal(r.smoke[key].contentType, 'text/html');
    assert.equal(r.smoke[key].html, true);
    assert.equal(r.smoke[key].unexpectedRedirect, false);
  }
  assert.equal(r.smoke.access, 'VERCEL_CLI_AUTHENTICATED_CURL_NO_BROWSER_HYDRATION');
});
check('invalid history GET rejects before storage', () => {
  assert.deepEqual(r.smoke.invalidHistoryGet, { status: 400, error: 'invalid_conversation_id', preStorage: true });
  assert.ok(historyRoute.indexOf('ConversationIdSchema.safeParse(req.query.conversationId)') < historyRoute.indexOf('await readChatHistory(parsed.data)'));
});
check('invalid history DELETE rejects before storage', () => {
  assert.deepEqual(r.smoke.invalidHistoryDelete, { status: 400, error: 'invalid_conversation_id', preStorage: true });
  assert.ok(historyRoute.indexOf('ConversationIdSchema.safeParse(req.query.conversationId ?? req.body?.conversationId)') < historyRoute.indexOf('await deleteChatHistory(parsed.data)'));
});
check('invalid history PUT rejects before storage', () => {
  assert.deepEqual(r.smoke.invalidHistoryPut, { status: 400, error: 'invalid_body', preStorage: true });
  assert.ok(historyRoute.indexOf('WriteSchema.safeParse(req.body ?? {})') < historyRoute.indexOf('await writeChatHistory('));
});
check('oversized PUT is a parser rejection without reflected body', () => {
  assert.equal(r.smoke.oversizedHistoryPut.status, 413);
  assert.ok(r.smoke.oversizedHistoryPut.syntheticBodyBytes > 512 * 1024);
  assert.equal(r.smoke.oversizedHistoryPut.preHandler, true);
  assert.equal(r.smoke.oversizedHistoryPut.rawBodyReflected, false);
  assert.match(historyRoute, /sizeLimit: "512kb"/);
});
check('unsupported Chat method rejects before provider', () => {
  assert.deepEqual(r.smoke.chatUnsupportedGet, { status: 405, error: 'method_not_allowed', preProvider: true });
  assert.ok(chatRoute.indexOf('req.method !== "POST"') < chatRoute.indexOf('BodySchema.safeParse(req.body ?? {})'));
});
check('invalid Chat body rejects before provider', () => {
  assert.deepEqual(r.smoke.chatInvalidBodyPost, { status: 400, error: 'invalid_body', preProvider: true });
  assert.ok(chatRoute.indexOf('BodySchema.safeParse(req.body ?? {})') < chatRoute.indexOf('const { messages, entryContext } = parsed.data'));
});
check('valid history operations and normal Chat POST are zero', () => {
  for (const key of ['validHistoryGets','validHistoryPuts','validHistoryDeletes','normalChatPosts']) assert.equal(r.accounting[key], 0, key);
});
check('Redis and customer-data operations are zero by bounded smoke flow', () => {
  for (const key of ['redisCustomerDataReadsBySmokeFlow','redisCustomerDataWritesBySmokeFlow','redisCustomerDataDeletesBySmokeFlow','syntheticRedisRecords']) assert.equal(r.accounting[key], 0, key);
});
check('provider, payment, entitlement, and analytics additions are zero', () => {
  for (const key of ['llmProviderCallsBySmokeFlow','paymentOperations','entitlementOperations','analyticsAdditions']) assert.equal(r.accounting[key], 0, key);
});
check('payment and entitlement independently remain zero', () => {
  assert.equal(r.accounting.paymentOperations, 0);
  assert.equal(r.accounting.entitlementOperations, 0);
  assert.equal(r.accounting.analyticsAdditions, 0);
});
check('environment and secret access remain zero', () => {
  for (const key of ['envMutations','secretValuesRead','secretValuesPrinted','secretValuesPersisted']) assert.equal(r.accounting[key], 0, key);
});
check('bounded runtime fatal and 5xx counts are zero', () => {
  assert.equal(r.runtimeLogs.errorFatalCount, 0);
  assert.equal(r.runtimeLogs.status5xxCount, 0);
  assert.match(r.runtimeLogs.scope, /CURRENT_DEPLOYMENT/);
});
check('runtime log scope excludes customer payload search', () => {
  assert.equal(r.runtimeLogs.method, 'Vercel deployment-scoped grouped counts; no customer-message query');
  assert.match(report, /no customer-message, history-payload, or secret search/);
});
check('Production AFTER is unchanged', () => {
  assert.deepEqual(r.productionAfter, r.productionBefore);
  assert.equal(r.productionMutation, 0);
});
check('connectivity and Production truth remain bounded', () => {
  assert.equal(r.runtimeReadiness, 'READY_WITH_CONNECTIVITY_UNVERIFIED');
  assert.equal(r.currentLocalHistoryContractPreviewDeployed, 'VERIFIED');
  assert.equal(r.currentLocalHistoryContractProductionDeployed, false);
  assert.match(r.truthBoundary, /not provider-side telemetry/);
  assert.match(report, /Redis connectivity and real customer-history behavior remain untested/);
});
check('no push and no promotion claim', () => {
  assert.equal(r.accounting.pushes, 0);
  assert.deepEqual(r.deployment.aliases, []);
  assert.match(r.nextGate, /SEPARATE_HUMAN_GATE/);
});
check('only the three retry artifacts are changed or committed', () => {
  const files = ['docs/AI/CHAT_HISTORY_PREVIEW_DEPLOYMENT_RETRY.md','ops/product/chat-history-preview-deployment-retry-20260925.json','scripts/validate-chat-history-preview-deployment-retry.mjs'];
  if (candidate) {
    const status = git('status', '--porcelain=v1', '--untracked-files=normal').split(/\r?\n/).filter(Boolean).map(x => x.slice(3)).sort();
    assert.deepEqual(status, [...files, r.protectedUntracked].sort());
  } else {
    assert.deepEqual(git('diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD').split(/\r?\n/).filter(Boolean).sort(), files.sort());
    assert.deepEqual(git('status', '--porcelain=v1', '--untracked-files=normal').split(/\r?\n/).filter(Boolean), [`?? ${r.protectedUntracked}`]);
    assert.equal(git('log', '-1', '--format=%s'), 'chore: validate chat history preview retry');
  }
});
check('final verdict and post-upload manifest boundary are explicit', () => {
  assert.equal(r.verdict, 'CHAT_HISTORY_PREVIEW_DEPLOYMENT = PASS_COMMITTED');
  assert.match(report, /Any later deployment needs a new deploy-input re-lock/);
  assert.equal(r.recommendedNextModel, 'gpt-6-astra/high');
});

console.log(`CHAT_HISTORY_PREVIEW_DEPLOYMENT_RETRY_VALIDATOR=PASS checks=${checks} mode=${candidate ? 'candidate' : 'committed'}`);
