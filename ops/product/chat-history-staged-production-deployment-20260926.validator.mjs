import assert from 'node:assert/strict';
import {readFileSync,writeSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const recordPath='ops/product/chat-history-staged-production-deployment-20260926.json';
const reportPath='docs/AI/CHAT_HISTORY_STAGED_PRODUCTION_DEPLOYMENT.md';
const self='ops/product/chat-history-staged-production-deployment-20260926.validator.mjs';
const r=JSON.parse(readFileSync(recordPath,'utf8'));
const old='dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX';
const candidate='dpl_AaEEB9oRofPq5Gjg3syuK7BTCanD';
const start='f2d228812b3e3d51f107f1872401c42c1b68edcf';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
let checks=0;
const check=(label,fn)=>{fn();checks++;writeSync(1,`PASS evidence ${checks}: ${label}\n`);};

check('State Lock, source identity, and bounded governance-only worktree',()=>{
 assert.equal(r.startingHead,start);assert.equal(r.finalHead,start);
 assert.equal(r.branch,'recovery/musiam-clean-20260920');
 assert.equal(git('branch','--show-current'),r.branch);
 assert.equal(git('merge-base','--is-ancestor',start,'HEAD'),'');
 assert.equal(git('diff','--name-only'),'');assert.equal(git('diff','--cached','--name-only'),'');
 const allowed=['.pnpm-store/','ops/market-learning/daily-20260925/','ops/market-learning/daily-20260926/',recordPath,reportPath,self];
 const rows=execFileSync('git',['status','--porcelain=v1','--untracked-files=normal'],{encoding:'utf8'}).split('\n').filter(Boolean);
 for(const line of rows)assert.ok((line.slice(0,2)==='??'||line.slice(0,2)==='A '||line.slice(0,2)===' M')&&allowed.includes(line.slice(3)),`Unexpected worktree path/status: ${line.slice(0,2)} ${line.slice(3)}`);
 const changed=git('diff','--name-only',start,'HEAD').split('\n').filter(Boolean);
 for(const p of changed)assert.ok([recordPath,reportPath,self].includes(p),`Out-of-scope committed path: ${p}`);
});

check('Original unexpected alias assignment remains preserved as historical evidence',()=>{
 assert.equal(r.historicalVerdict,'BLOCKED_UNEXPECTED_ALIAS_ASSIGNMENT');
 assert.equal(r.aliasBoundary.classification,'VERCEL_GENERATED_PROJECT_ALIAS');
 assert.deepEqual(r.aliasBoundary.observedTargetChanges,[{alias:'musiam-front-hakusyakus-projects.vercel.app',before:old,after:candidate}]);
 assert.equal(r.aliasBoundary.observedTargetChangeCount,1);
 assert.equal(r.aliasBoundary.actualUserRequestsServedByChangedAlias,'UNKNOWN_NOT_QUERIED');
});

check('Exactly one approved alias reassignment restored all four direct hostname targets',()=>{
 const a=r.recovery.aliasRepair;assert.equal(r.recovery.approval,'APPROVE_CHAT_HISTORY_STAGED_PRODUCTION_ALIAS_REPAIR');
 assert.equal(a.writeRequests,1);assert.equal(a.exitCode,0);assert.equal(a.result,'SUCCESS');
 assert.equal(a.operation,'vercel alias set dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX musiam-front-hakusyakus-projects.vercel.app');
 assert.equal(r.recovery.postRepair.oldProductionState,'READY');
 assert.deepEqual(r.recovery.postRepair.aliasTargets,{ 'www.hakusyaku.xyz':old,'hakusyaku.xyz':old,'musiam-front.vercel.app':old,'musiam-front-hakusyakus-projects.vercel.app':old });
});

check('Existing staged candidate is unchanged, READY, and directly reachable at its unique URL',()=>{
 const c=r.recovery.postRepair.candidate;assert.equal(c.id,candidate);assert.equal(c.state,'READY');assert.equal(c.target,'production');
 assert.equal(c.sourceHead,start);assert.equal(c.directLookupResolvesToCandidate,true);
 assert.equal(c.uniqueUrl,'https://musiam-front-f6obm3mpj-hakusyakus-projects.vercel.app');
 assert.equal(r.recovery.postRepair.candidateRedeployments,0);
 assert.equal(r.deployment.attempts,1);assert.equal(r.deployment.sourceHead,start);
});

check('All eight customer-data-free smoke requests passed against the existing candidate only',()=>{
 const s=r.recovery.smoke;assert.equal(s.status,'PASS');assert.equal(s.deploymentId,candidate);assert.equal(s.requestCount,8);assert.equal(s.requests.length,8);
 const expected=[['rootGet',200,null],['chatGet',200,null],['invalidHistoryGet',400,'invalid_conversation_id'],['invalidHistoryDelete',400,'invalid_conversation_id'],['invalidHistoryPut',400,'invalid_body'],['oversizedHistoryPut',413,null],['unsupportedChatGet',405,'method_not_allowed'],['invalidChatPost',400,'invalid_body']];
 for(let i=0;i<expected.length;i++){const [name,status,error]=expected[i],x=s.requests[i];assert.equal(x.name,name);assert.equal(x.status,status);assert.equal(x.error??null,error);assert.equal(x.passed,true);assert.equal(x.redirectPresent,false);}
 assert.equal(s.requests[5].requestBytes,614416);assert.equal(s.validHistoryGetPutDelete,0);assert.equal(s.normalChatPost,0);assert.equal(s.browserHydration,false);
});

check('Candidate-scoped aggregate error, fatal, application error, and unexpected 5xx counts are zero',()=>{
 const l=r.recovery.runtimeLogs;assert.equal(l.status,'QUERIED_AGGREGATE_ONLY');assert.equal(l.candidateScoped,true);
 assert.equal(l.groupedErrorFatalCount,0);assert.equal(l.applicationErrorCount,0);assert.equal(l.unexpected5xxCount,0);assert.equal(l.logBodiesRead,false);
});

check('No additional deployment, promotion, rollback, customer/provider/payment/env operation, or push',()=>{
 const o=r.recovery.operations;for(const k of ['aliasRepairWrites','additionalDeployments','promotions','rollbackCommands','redisCustomerDataOperations','normalChatProviderCalls','paymentCheckoutEntitlementOperations','environmentMutations','secretValuesRead','pushes','protectedDataExposure'])assert.equal(o[k],k==='aliasRepairWrites'?1:0,k);
 assert.equal(r.operations.deploymentCommands,1);assert.equal(r.operations.stagedProductionDeploymentsCreated,1);
 assert.equal(r.productionEnvContract,'PRESENT_METADATA_ONLY');assert.equal(r.redisConnectivity,'UNVERIFIED_WITHOUT_SECRET_ACCESS');
});

check('Protected roots remain opaque with zero recorded data exposure',()=>{
 for(const k of ['descendantFileEntries','payloadBytes','contentIds','symlinkSpecialPayload','contentsRead','descendantEnumerations'])assert.equal(r.protectedRoots[k],0,k);
 assert.equal(r.protectedRoots.modified,false);assert.equal(r.protectedRoots.staged,false);
 assert.deepEqual(r.protectedRoots.paths,['ops/market-learning/daily-20260925/','ops/market-learning/daily-20260926/']);
});

check('Final result qualifies only for the separate Production traffic promotion Human Gate',()=>{
 assert.equal(r.verdict,'READY_FOR_PRODUCTION_TRAFFIC_PROMOTION_HUMAN_GATE');
 assert.equal(r.nextGate,'CHAT_HISTORY_PRODUCTION_TRAFFIC_PROMOTION');
 assert.equal(r.futureApprovalToken,'APPROVE_CHAT_HISTORY_PRODUCTION_TRAFFIC_PROMOTION');
 assert.equal(r.futurePromotionReady,true);
 const report=readFileSync(reportPath,'utf8');assert.match(report,/Historical first Gate: `BLOCKED_UNEXPECTED_ALIAS_ASSIGNMENT`/);
 assert.match(report,/CHAT_HISTORY_STAGED_PRODUCTION_DEPLOYMENT = READY_FOR_PRODUCTION_TRAFFIC_PROMOTION_HUMAN_GATE/);
 assert.match(report,/APPROVE_CHAT_HISTORY_PRODUCTION_TRAFFIC_PROMOTION/);
});

execFileSync('git',['diff','--check']);execFileSync('git',['diff','--cached','--check']);
writeSync(1,`STAGED_PRODUCTION_RECOVERY_EVIDENCE=PASS checks=${checks}\n`);
writeSync(1,'CHAT_HISTORY_STAGED_PRODUCTION_DEPLOYMENT=READY_FOR_PRODUCTION_TRAFFIC_PROMOTION_HUMAN_GATE\n');
