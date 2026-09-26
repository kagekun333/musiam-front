import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const START = 'd745c61f9f3817a6c32ac82716b3948c9fb95eb7';
const PREVIEW = 'b92a3c43e223e08dcd76fcb5869dc3244f460714';
const RAW_PREVIEW = 'c86dad16b2fdac9a11a08bf4daa3f0680037baa9a63e19f10f152e00f95d5284';
const RAW_PREVIOUS = 'a669040d9a05b72c5b6001dd318a2b5690bfdaed672457d2163ffa46b66cc498';
const READY = 'READY_FOR_STAGED_PRODUCTION_HUMAN_GATE';
const root = process.cwd();
const contractOnly = process.argv.includes('--contract-only');
const recordPath = 'ops/product/chat-history-production-release-readiness-20260926.json';
const reportPath = 'docs/AI/CHAT_HISTORY_PRODUCTION_RELEASE_READINESS.md';
const self = 'scripts/validate-chat-history-production-release-readiness.mjs';
const auditPaths = ['scripts/validate-chat-history-preview-deployment-retry.mjs', self];
const protectedRoots = ['ops/market-learning/daily-20260925', 'ops/market-learning/daily-20260926'];
const allowed = ['.vercelignore', reportPath, recordPath, self].sort();
const allowedUntracked = ['.pnpm-store/', ...protectedRoots.map(p => p + '/')];
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const read = p => fs.readFileSync(p, 'utf8');
const rows = s => s.split('\n').filter(Boolean);
let checks = 0;
function check(name, fn) { fn(); checks++; console.log(`PASS ${checks}: ${name}`); }
const digest = files => createHash('sha256').update(JSON.stringify(files.map(({ path, mode, sha }) => [path, mode, sha]))).digest('hex');
const summarize = files => ({ entries: files.length, regularFiles: files.filter(f => (f.mode & 0o170000) === 0o100000).length, directoryEntries: files.filter(f => (f.mode & 0o170000) === 0o040000).length, bytes: files.reduce((n, f) => n + f.size, 0), manifestSha256: digest(files) });
const head = git('rev-parse', 'HEAD');
check('expected starting HEAD, branch and bounded candidate/commit', () => {
  assert.equal(git('branch', '--show-current'), 'recovery/musiam-clean-20260920');
  if (head !== START) {
    assert.equal(git('rev-parse', 'HEAD^'), START);
    assert.deepEqual(rows(git('diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD')).sort(), allowed);
    assert.equal(git('log', '-1', '--format=%s'), 'chore: prepare staged production release');
  }
  for (const p of [...rows(git('diff', '--name-only')), ...rows(git('diff', '--cached', '--name-only'))]) assert.ok(allowed.includes(p), 'Out-of-scope change');
  const status = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=normal'], { encoding: 'utf8' });
  for (const line of rows(status)) assert.ok([...allowed, ...allowedUntracked].includes(line.slice(3)), 'Unknown worktree path');
  if (head !== START) { assert.equal(git('diff', '--name-only'), ''); assert.equal(git('diff', '--cached', '--name-only'), ''); }
});
check('Preview to starting HEAD is governance-only; application runtime drift zero', () => {
  assert.deepEqual(rows(git('diff', '--name-only', PREVIEW, START)), ['docs/AI/CHAT_HISTORY_PREVIEW_DEPLOYMENT_RETRY.md', 'ops/product/chat-history-preview-deployment-retry-20260925.json', auditPaths[0]]);
  assert.equal(git('diff', START, '--', 'src', 'app', 'pages', 'package.json', 'pnpm-lock.yaml', 'next.config.ts', 'next.config.js', 'vercel.json'), '');
});
check('audit validators have no application/build entry-point references', () => {
  for (const p of auditPaths) {
    const result = (() => { try { return git('grep', '-l', '-F', path.basename(p), '--', 'src', 'app', 'pages', 'package.json', 'next.config.*', 'vercel.json', '.github'); } catch (e) { if (e.status === 1) return ''; throw e; } })();
    assert.equal(result, '');
  }
  assert.equal(JSON.parse(read('package.json')).scripts.build, 'next build');
});
const originalControl = execFileSync('git', ['show', PREVIEW + ':.vercelignore'], { encoding: 'utf8' });
const currentControl = read('.vercelignore');
const priorControl = currentControl.replace('ops/market-learning/daily-20260925\n', '');
check('deploy-control delta consists only of four exact additive safety exclusions', () => {
  const expected = originalControl
    .replace('ops/market-learning/daily-20260925/\n', 'ops/market-learning/daily-20260925/\n' + protectedRoots.join('\n') + '\n')
    .replace('scripts/validate-chat-history-preview-deploy-input-remediation.mjs\n', 'scripts/validate-chat-history-preview-deploy-input-remediation.mjs\n' + auditPaths.join('\n') + '\n');
  assert.equal(currentControl, expected);
  assert.equal(Buffer.byteLength(originalControl), 1141);
  assert.equal(Buffer.byteLength(priorControl) - Buffer.byteLength(originalControl), 157);
  assert.equal(Buffer.byteLength(currentControl) - Buffer.byteLength(originalControl), 192);
});

// Fail closed, never return synthetic empty listings or altered collector output.
// Root lstat is permitted; enumeration/content/readlink of either real root is forbidden.
const forbidden = p => typeof p === 'string' && protectedRoots.some(r => path.resolve(p) === path.join(root, r) || path.resolve(p).startsWith(path.join(root, r) + '/'));
for (const obj of [fs, fs.promises]) for (const key of ['readdir', 'readdirSync', 'opendir', 'opendirSync', 'readFile', 'readFileSync', 'createReadStream', 'readlink', 'readlinkSync', 'open', 'openSync']) {
  if (typeof obj[key] !== 'function') continue;
  const original = obj[key];
  obj[key] = function(p, ...args) { assert.equal(forbidden(p), false, 'BLOCKED_PROTECTED_OPERATIONAL_DATA_ACCESS'); return original.call(this, p, ...args); };
}
const cli = '/Users/kagekun/.npm/_npx/89025e7ac52fe028/node_modules/vercel';
assert.equal(JSON.parse(read(cli + '/package.json')).version, '59.23.2');
const { require_dist } = await import(cli + '/dist/chunks/chunk-UUM2N6IG.js');
const { inspectDeploymentFiles, getVercelIgnore } = require_dist();
const { ig } = await getVercelIgnore(root);
check('both real protected roots are directories pruned before enumeration', () => {
  for (const p of protectedRoots) {
    const stat = fs.lstatSync(p);
    assert.ok(stat.isDirectory() && !stat.isSymbolicLink());
    assert.ok(ig.ignores(p));
  }
});
const collect = async p => (await inspectDeploymentFiles({ path: p, projectName: 'musiam-front', rootDirectory: null, debug: false })).files;
const actual = await collect(root);
const forbiddenPayload = p => protectedRoots.some(r => p === r || p.startsWith(r + '/')) || p === '.pnpm-store' || p.startsWith('.pnpm-store/') || /(^|\/)\.env[^/]*$/.test(p) || /(^|\/)(private|secrets?|credentials?)(\/|\.)/i.test(p) || p === '.claude/settings.local.json' || /^(docs\/AI|ops\/product)\//.test(p) || /fixture.*chat|chat.*fixture/i.test(p) || auditPaths.includes(p);
check('actual collector has zero protected, secret, private, fixture, governance, or store payload', () => {
  assert.deepEqual(actual.filter(f => forbiddenPayload(f.path)), []);
  assert.equal(git('ls-files', '--', '.pnpm-store'), '');
  assert.equal(git('diff', '--cached', '--name-only', '--', '.pnpm-store', ...protectedRoots), '');
  assert.ok(actual.every(f => [0o100000, 0o040000].includes(f.mode & 0o170000)), 'Unexpected symlink/special payload');
});

// Reconstruct a baseline from Preview Git blobs, using actual filesystem modes
// (Git tracks executability, but not 0600 vs 0644). It is not accepted until the
// unmodified collector reproduces the FULL historical approved raw digest.
const tree = new Map(execFileSync('git', ['ls-tree', '-rz', PREVIEW], { encoding: 'utf8' }).split('\0').filter(Boolean).map(row => {
  const split = row.indexOf('\t'); return [row.slice(split + 1), row.slice(0, split).split(' ')];
}));
const regular = actual.filter(f => f.sha !== undefined);
check('every materialized baseline blob is a safe actual payload path in Preview Git', () => {
  for (const f of regular) {
    assert.ok(tree.has(f.path), 'New payload path: ' + f.path);
    assert.equal(tree.get(f.path)[1], 'blob');
    assert.ok(['100644', '100755'].includes(tree.get(f.path)[0]));
    assert.equal(forbiddenPayload(f.path), false);
  }
});
const replay = fs.mkdtempSync(path.join(os.tmpdir(), 'musiam-readiness-source-replay-'));
const blobs = execFileSync('git', ['cat-file', '--batch'], { input: regular.map(f => tree.get(f.path)[2] + '\n').join(''), maxBuffer: 300 * 1024 * 1024 });
let offset = 0;
for (const f of regular) {
  const end = blobs.indexOf(10, offset);
  const [oid, type, rawSize] = blobs.subarray(offset, end).toString().split(' ');
  const size = Number(rawSize); offset = end + 1;
  assert.equal(type, 'blob'); assert.equal(oid, tree.get(f.path)[2]);
  const dest = path.join(replay, f.path); fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, blobs.subarray(offset, offset + size)); fs.chmodSync(dest, f.mode & 0o777); offset += size + 1;
}
for (const f of actual.filter(f => f.sha === undefined)) { const dest = path.join(replay, f.path); fs.mkdirSync(dest, { recursive: true }); fs.chmodSync(dest, f.mode & 0o777); }
// Only a new empty scratch directory reproduces the historical metadata tuple.
// No protected source directory is scanned, copied or hashed.
const emptyFixture = path.join(replay, protectedRoots[0]); fs.mkdirSync(emptyFixture, { recursive: true }); fs.chmodSync(emptyFixture, 0o755);
const baseline = await collect(replay);
check('historical reconstruction reproduces complete approved raw manifest exactly', () => {
  assert.deepEqual(summarize(baseline), { entries: 3208, regularFiles: 3200, directoryEntries: 8, bytes: 214053118, manifestSha256: RAW_PREVIEW });
});
fs.writeFileSync(path.join(replay, '.vercelignore'), priorControl);
const previous = await collect(replay);
check('previous +157-byte blocker is reproduced with only .vercelignore changed', () => {
  assert.equal(digest(previous), RAW_PREVIOUS);
  assert.equal(summarize(previous).bytes, 214053275);
  const before = new Map(baseline.map(f => [f.path, f]));
  assert.deepEqual(previous.filter(f => JSON.stringify(f) !== JSON.stringify(before.get(f.path))).map(f => f.path), ['.vercelignore']);
});
const classify = f => f.path === '.vercelignore' ? 'DEPLOY_CONTROL' : f.path === protectedRoots[0] && f.sha === undefined && f.size === 0 && (f.mode & 0o170000) === 0o040000 ? 'PROTECTED_EMPTY_DIRECTORY_METADATA' : 'PAYLOAD';
const runtimeActual = actual.filter(f => classify(f) === 'PAYLOAD');
const runtimeBaseline = baseline.filter(f => classify(f) === 'PAYLOAD');
check('runtime payload path/mode/content-ID/size equality with no unexplained exclusions', () => {
  const before = new Map(runtimeBaseline.map(f => [f.path, f]));
  const after = new Map(runtimeActual.map(f => [f.path, f]));
  const differences = [...new Set([...before.keys(), ...after.keys()])].filter(p => JSON.stringify(before.get(p)) !== JSON.stringify(after.get(p)));
  assert.deepEqual(differences, [], 'BLOCKED_RUNTIME_DEPLOY_PAYLOAD_PARITY');
  assert.deepEqual(runtimeActual, runtimeBaseline);
  assert.equal(runtimeActual.filter(f => f.sha).length, 3199);
  assert.equal(summarize(runtimeActual).bytes, 214051977);
});
const actualSummary = summarize(actual);
const runtimeSummary = summarize(runtimeActual);
check('full raw inequality is explicitly retained and bounded to reviewed control/empty metadata', () => {
  assert.notEqual(actualSummary.manifestSha256, RAW_PREVIEW);
  assert.equal(actualSummary.entries, 3207); assert.equal(actualSummary.bytes, 214053310);
  const before = new Map(baseline.map(f => [f.path, f])); const after = new Map(actual.map(f => [f.path, f]));
  const delta = [...new Set([...before.keys(), ...after.keys()])].filter(p => JSON.stringify(before.get(p)) !== JSON.stringify(after.get(p))).sort();
  assert.deepEqual(delta, ['.vercelignore', protectedRoots[0]]);
  assert.equal(before.get('.vercelignore').mode, after.get('.vercelignore').mode);
});

if (!contractOnly) {
  const record = JSON.parse(read(recordPath));
  const env = JSON.parse(read('ops/product/chat-history-env-metadata-verification-20260925.json'));
  check('machine record uses independent runtime/control/exposure contracts', () => {
    assert.equal(record.startingHead, START); assert.equal(record.branch, git('branch', '--show-current'));
    assert.equal(record.applicationRuntimeDrift, 0);
    assert.equal(record.runtimeDeployPayloadParity, 'PASS');
    assert.equal(record.deployControlDelta, 'SAFE_MINIMAL_AUDIT_ONLY');
    assert.equal(record.protectedOperationalDataExposure, 0);
    assert.equal(record.fullRawDeployInputParity, 'NOT_EQUAL_BY_REVIEWED_DEPLOY_CONTROL_DELTA');
    assert.deepEqual(record.deployInput, actualSummary); assert.deepEqual(record.runtimePayload, runtimeSummary);
    assert.equal(record.historicalObservation.verdict, 'BLOCKED_SOURCE_PARITY');
    assert.equal(record.previousRemediation.verdict, 'BLOCKED_DEPLOY_INPUT_PARITY');
  });
  check('fresh metadata continuity: Preview, Production, and www alias', () => {
    const c = record.continuity;
    assert.equal(c.source, 'Vercel MCP read-only get_deployment'); assert.ok(c.observedAt);
    assert.equal(c.preview.id, 'dpl_Bc9YHMTXaqgV9qnxHbrmLZRW16pT'); assert.equal(c.preview.state, 'READY'); assert.equal(c.preview.target, null);
    assert.equal(c.preview.meta.githubCommitSha, PREVIEW); assert.deepEqual(c.preview.alias, []);
    assert.equal(c.production.id, 'dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX'); assert.equal(c.production.state, 'READY'); assert.equal(c.production.target, 'production');
    assert.ok(c.production.alias.includes('www.hakusyaku.xyz')); assert.equal(c.www.id, c.production.id); assert.equal(c.www.state, 'READY');
    assert.equal(record.rollback.targetDeploymentId, c.production.id); assert.equal(record.rollback.executed, false);
  });
  check('environment authority remains human metadata; Redis/customer truth stays unverified', () => {
    assert.equal(env.productionEnvContract, 'PRESENT_METADATA_ONLY'); assert.equal(env.finalization.humanReviewed, true);
    for (const key of ['KV_REST_API_URL', 'KV_REST_API_TOKEN']) assert.equal(env.productionMatrix[key].dashboardTarget, 'All Environments');
    assert.equal(record.productionEnvContract, env.productionEnvContract);
    assert.equal(record.redisConnectivity, 'UNVERIFIED_WITHOUT_SECRET_ACCESS'); assert.equal(record.productionCustomerHistory, 'UNVERIFIED_NOT_TESTED');
  });
  check('required local validations passed with original historical failure retained', () => {
    for (const key of ['typecheck', 'scopedLint', 'strengthening01', 'strengthening02', 'runtimeSafetyIsolated', 'runtimeSafetyFixture', 'r7c1', 'r7c2', 'r7a', 'r7b', 'r7d1', 'diffCheck']) assert.equal(record.localValidation[key].status, 'PASS', key);
    assert.equal(record.localValidation.runtimeSafetyCanonical.status, 'BLOCKED_HISTORICAL_WORKTREE_ALLOWLIST');
    assert.equal(record.localValidation.runtimeSafetyIsolated.unchangedValidator, true);
    assert.equal(record.localValidation.runtimeSafetyFixture.customerDataOperations, 0);
    assert.equal(record.localValidation.runtimeSafetyFixture.providerCalls, 0);
  });
  check('staged Production strategy and separate future traffic gate are explicit', () => {
    assert.equal(record.releaseStrategy.method, 'STAGED_PRODUCTION_BUILD_THEN_PROMOTE');
    assert.equal(record.releaseStrategy.stagedCommand, 'vercel --prod --skip-domain');
    assert.equal(record.releaseStrategy.stagedChangesTraffic, false); assert.equal(record.releaseStrategy.futurePromotionRebuild, false);
    assert.equal(record.nextGate, 'CHAT_HISTORY_STAGED_PRODUCTION_DEPLOYMENT');
    assert.equal(record.requiredApproval, 'APPROVE_CHAT_HISTORY_STAGED_PRODUCTION_DEPLOYMENT');
    assert.equal(record.releaseStrategy.trafficGate, 'CHAT_HISTORY_PRODUCTION_TRAFFIC_PROMOTION');
    assert.equal(record.verdict, READY);
  });
  check('prohibited operations are recorded as zero and truth boundary is explicit', () => {
    for (const key of ['productionMutation', 'productionTrafficMutations', 'aliasMutations', 'customerDataOperations', 'envMutations', 'secretValuesRead', 'providerCalls', 'paymentOperations', 'deployments', 'stagedProductionDeployments', 'promotions', 'rollbacks', 'pushes', 'protectedContentReads', 'protectedContentHashes', 'protectedDescendantEnumerations', 'dependencyInstalls']) assert.equal(record.operations[key], 0, key);
    assert.match(record.truthBoundary, /not Production/); assert.match(record.truthBoundary, /Redis/);
    assert.match(read(reportPath), new RegExp(READY));
  });
}
execFileSync('git', ['diff', '--check']); execFileSync('git', ['diff', '--cached', '--check']);
const evidence = { actual: actualSummary, runtime: runtimeSummary, historical: summarize(baseline), previous: summarize(previous), applicationRuntimeDrift: 0, runtimeDeployPayloadParity: 'PASS', deployControlDelta: 'SAFE_MINIMAL_AUDIT_ONLY', protectedOperationalDataExposure: 0, fullRawDeployInputParity: 'NOT_EQUAL_BY_REVIEWED_DEPLOY_CONTROL_DELTA' };
const output = process.argv.find(x => x.startsWith('--evidence='))?.slice('--evidence='.length);
if (output) { assert.ok(path.resolve(output).startsWith('/tmp/') || path.resolve(output).startsWith('/private/tmp/')); fs.writeFileSync(output, JSON.stringify(evidence, null, 2) + '\n'); }
console.log(JSON.stringify(evidence));
console.log(`CHAT_HISTORY_PRODUCTION_RELEASE_READINESS_VALIDATOR=PASS mode=${contractOnly ? 'contract-only' : head === START ? 'candidate' : 'committed'} checks=${checks}`);
