import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const r = JSON.parse(readFileSync('ops/product/chat-history-preview-deployment-20260925.json', 'utf8'));
const report = readFileSync('docs/AI/CHAT_HISTORY_PREVIEW_DEPLOYMENT.md', 'utf8');
let checks = 0;
function check(label, fn) { fn(); checks++; console.log(`PASS ${checks}: ${label}`); }

check('exact starting authority and approval', () => {
  assert.equal(r.startingHead, 'e5c9b089aaf5cfc3e57c3c17a36c75888f530aea');
  assert.equal(r.branch, 'recovery/musiam-clean-20260920');
  assert.equal(r.approval, 'APPROVE_CHAT_HISTORY_PREVIEW_DEPLOYMENT');
  assert.equal(r.trackedTreeCleanAtStart, true);
});
check('Vercel collector snapshot is explicit', () => {
  assert.match(r.deployInput.collector, /Vercel CLI 59\.23\.2 offline inspectDeploymentFiles/);
  assert.equal(r.deployInput.entries, r.deployInput.regularFiles + r.deployInput.directoryEntries);
  assert.equal(r.deployInput.entries, 3226);
  assert.equal(r.deployInput.totalBytes, 214071775);
  assert.match(r.deployInput.manifestSha256, /^[a-f0-9]{64}$/);
  assert.equal(r.deployInput.cliDryRunManifestUsable, false);
});
check('protected payload and secret material are absent', () => {
  assert.equal(r.deployInput.protectedPayloadFilesIncluded, 0);
  assert.equal(r.deployInput.envOrCredentialFilesIncluded, 0);
  assert.equal(r.deployInput.privatePreservationPayloadFilesIncluded, 0);
  assert.equal(r.deployInput.recoveryArchivePayloadFilesIncluded, 0);
  assert.equal(r.deployInput.namedAuditOrFixturePayloadFilesIncluded, 0);
});
check('deploy-input risk is fail closed', () => {
  assert.equal(r.deployInput.protectedDirectoryEntryIncluded, true);
  assert.equal(r.deployInput.protectedPathDirectoryEntry, r.protectedUntracked.slice(0, -1));
  assert.equal(r.deployInput.unexpectedUntrackedRegularFilesIncluded, 17);
  assert.deepEqual(r.deployInput.unexpectedUntrackedGroups, [{path: '.husky/_/', files: 16}, {path: 'next-env.d.ts', files: 1}]);
  assert.equal(r.deployInput.safe, false);
  assert.equal(r.verdict, 'BLOCKED_DEPLOY_INPUT_RISK');
});
check('local validation is bounded', () => {
  assert.equal(r.localValidation.typecheck, 'PASS_DIRECT_TSC');
  assert.equal(r.localValidation.strengthening02, 'PASS_16_OF_16');
  assert.equal(r.localValidation.runtimeSafety, 'PASS_28_OF_28');
  assert.equal(r.localValidation.envMetadata, 'PASS_12_OF_12');
  assert.equal(r.localValidation.previewReadiness, 'PASS_9_OF_9');
  assert.equal(r.localValidation.r7c1, 'PASS_24_OF_24');
  assert.equal(r.localValidation.r7c2, 'PASS_20_OF_20');
  assert.equal(r.localValidation.catalogPrimary, 450);
  assert.equal(r.localValidation.catalogMerged, 514);
  assert.equal(r.localValidation.exhibitionDisplayed, 514);
  assert.equal(r.localValidation.exhibitionMissing, 0);
  assert.equal(r.localValidation.rootLint, 'FAIL_2_KNOWN_WARNINGS_0_ERRORS');
});
check('no deployment or unsafe operation occurred', () => {
  assert.equal(r.deployCount, 0);
  assert.equal(r.previewDeploymentId, null);
  assert.equal(r.previewUrl, null);
  assert.equal(r.previewBuild, 'NOT_RUN');
  assert.equal(r.safeSmoke, 'NOT_RUN');
  assert.equal(r.historyNegativeTests, 'NOT_RUN');
  assert.equal(r.chatNegativeTests, 'NOT_RUN');
  for (const key of ['normalHistoryRequests', 'normalChatPosts', 'redisCustomerDataOperations', 'providerCalls', 'paymentOperations', 'envMutations', 'productionMutationsByThisGate', 'pushes']) assert.equal(r[key], 0, key);
});
check('truth boundary and next Gate are recorded', () => {
  assert.equal(r.productionBefore, 'NOT_SNAPSHOTTED_GATE_STOPPED_BEFORE_STEP_8');
  assert.equal(r.runtimeReadiness, 'READY_WITH_CONNECTIVITY_UNVERIFIED');
  assert.equal(r.currentLocalHistoryContractPreviewDeployed, false);
  assert.equal(r.currentLocalHistoryContractProductionDeployed, false);
  assert.match(r.nextGate, /REAUTHORIZE_ONE_PREVIEW/);
  assert.match(r.truthBoundary, /no Preview build/);
  assert.match(report, /BLOCKED_DEPLOY_INPUT_RISK/);
  assert.match(report, /17 unexpected untracked regular files/);
});
console.log(`CHAT_HISTORY_PREVIEW_DEPLOYMENT_VALIDATOR=PASS checks=${checks} verdict=${r.verdict}`);
