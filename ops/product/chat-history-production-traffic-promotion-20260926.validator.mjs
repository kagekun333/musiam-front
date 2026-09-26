import assert from 'node:assert/strict';
import {readFileSync,writeSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import process from 'node:process';

const start='f9d065f26d384981140499611f0dfb7ae97c1ff6';
const source='f2d228812b3e3d51f107f1872401c42c1b68edcf';
const candidate='dpl_AaEEB9oRofPq5Gjg3syuK7BTCanD';
const old='dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX';
const hosts=['www.hakusyaku.xyz','hakusyaku.xyz','musiam-front.vercel.app','musiam-front-hakusyakus-projects.vercel.app'];
const record='ops/product/chat-history-production-traffic-promotion-20260926.json';
const report='docs/AI/CHAT_HISTORY_PRODUCTION_TRAFFIC_PROMOTION.md';
const self='ops/product/chat-history-production-traffic-promotion-20260926.validator.mjs';
const allowed=[report,record,self].sort();
const r=JSON.parse(readFileSync(record,'utf8'));
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
const lines=s=>s.split('\n').filter(Boolean);
let count=0;
const check=(name,f)=>{f();writeSync(1,`PASS ${++count}: ${name}\n`);};

check('Current Gate State Lock and exact governance-only change boundary',()=>{
 assert.equal(r.startingLocalHead,start);assert.equal(r.branch,git('branch','--show-current'));
 assert.equal(r.branch,'recovery/musiam-clean-20260920');
 const head=git('rev-parse','HEAD');
 if(head!==start){assert.equal(git('rev-parse','HEAD^'),start);assert.deepEqual(lines(git('diff-tree','--no-commit-id','--name-only','-r','HEAD')).sort(),allowed);}
 for(const p of lines(git('diff','--name-only',start)))assert.ok(allowed.includes(p),`Out-of-scope changed path: ${p}`);
 const status=execFileSync('git',['status','--porcelain=v1','--untracked-files=normal'],{encoding:'utf8'});
 for(const line of lines(status)){const p=line.slice(3);assert.ok([...allowed,...r.stateLock.allowedUntracked].includes(p));if(r.stateLock.allowedUntracked.includes(p))assert.equal(line.slice(0,2),'??');}
 assert.equal(r.stateLock.unknownUntracked,0);assert.equal(r.stateLock.trackedChanges,0);assert.equal(r.stateLock.staged,0);
});
check('Artifact/local commit difference is precisely historical governance; history preserved',()=>{
 assert.equal(r.artifactSourceSha,source);assert.equal(r.candidateId,candidate);assert.equal(r.oldProductionId,old);
 assert.deepEqual(lines(git('diff','--name-only',source,start)),r.priorGovernanceOnlyDelta);
 for(const p of r.priorGovernanceOnlyDelta)assert.equal(readFileSync(p,'utf8'),execFileSync('git',['show',start+':'+p],{encoding:'utf8'}));
 const history=JSON.parse(readFileSync(r.priorGovernanceOnlyDelta[1],'utf8'));
 assert.equal(history.historicalVerdict,'BLOCKED_UNEXPECTED_ALIAS_ASSIGNMENT');assert.equal(history.verdict,'READY_FOR_PRODUCTION_TRAFFIC_PROMOTION_HUMAN_GATE');
});
check('Immediate pre-promotion direct routes and immutable candidate identity',()=>{
 const s=r.prePromotion.snapshots;
 for(const h of hosts){assert.equal(s[h].id,old);assert.equal(s[h].state,'READY');}
 assert.equal(s[old].state,'READY');assert.equal(s[candidate].target,'production');assert.equal(s[candidate].sourceSha,source);
 assert.equal(s['musiam-front-f6obm3mpj-hakusyakus-projects.vercel.app'].id,candidate);
 assert.equal(r.candidatePreflight.status,'PASS');assert.deepEqual(r.candidatePreflight.requests.map(x=>x.path),['/','/chat']);
 for(const x of r.candidatePreflight.requests){assert.equal(x.status,200);assert.equal(x.exitCode,0);assert.equal(x.passed,true);}
});
check('Exactly one official promotion write; no rebuild or rolling release',()=>{
 assert.equal(r.approval,'APPROVE_CHAT_HISTORY_PRODUCTION_TRAFFIC_PROMOTION');assert.equal(r.semantics.cliVersion,'59.23.2');
 assert.equal(r.semantics.existingProductionTargetPromoteRebuilds,false);assert.equal(r.semantics.rollingReleaseConfiguration,null);
 assert.equal(r.promotion.cliExitCode,0);assert.equal(r.promotion.clientReportedSuccess,true);assert.equal(r.promotion.writeRequests.length,1);
 const w=r.promotion.writeRequests[0];assert.equal(w.method,'POST');assert.equal(w.host,'api.vercel.com');
 assert.equal(w.path,'/v10/projects/prj_OU4nbZIO3n3ieS99cMXY7eWigHAl/promote/'+candidate);
 assert.equal(r.promotion.response.status,201);assert.equal(r.promotion.otherControlPlaneMutations,0);
});
check('Four post-promotion hostname identities; artifact timestamps and old deployment retained',()=>{
 assert.equal(r.postPromotion.passed,true);const s=r.postPromotion.snapshots;
 for(const h of [...hosts,candidate]){assert.equal(s[h].id,candidate);assert.equal(s[h].state,'READY');assert.equal(s[h].target,'production');assert.equal(s[h].sourceSha,source);}
 assert.deepEqual(s[candidate],r.prePromotion.snapshots[candidate]);assert.equal(s[old].id,old);assert.equal(s[old].state,'READY');
 for(const h of [...hosts,candidate])assert.deepEqual(r.finalContinuity.snapshots[h],{id:candidate,state:'READY',target:'production',sourceSha:source});
 assert.equal(r.finalContinuity.snapshots[old].state,'READY');assert.equal(r.finalContinuity.snapshots[old].id,old);
});
check('Eight exact primary Production requests passed without customer/storage/provider calls',()=>{
 const s=r.productionSmoke;assert.equal(s.primaryAuthority,'https://www.hakusyaku.xyz');assert.equal(s.status,'PASS');assert.equal(s.count,8);assert.equal(s.requests.length,8);
 const expected=[['GET','/',200,null,0],['GET','/chat',200,null,0],['GET','/api/chat-history?conversationId=not-a-uuid',400,'invalid_conversation_id',0],['DELETE','/api/chat-history?conversationId=not-a-uuid',400,'invalid_conversation_id',0],['PUT','/api/chat-history',400,'invalid_body',2],['PUT','/api/chat-history',413,null,614416],['GET','/api/chat-experience-v3',405,'method_not_allowed',0],['POST','/api/chat-experience-v3',400,'invalid_body',22]];
 s.requests.forEach((x,i)=>{assert.equal(x.host,'www.hakusyaku.xyz');assert.deepEqual([x.method,x.path,x.status,x.error??null,x.requestBytes],expected[i]);assert.equal(x.curlExitCode,0);assert.equal(x.redirectPresent,false);assert.equal(x.passed,true);});
 assert.equal(s.requests[5].boundedUnreflectedResponse,true);assert.equal(s.browserHydration,false);assert.equal(s.credentialOrCookieSupplied,false);assert.equal(s.redirectsFollowed,0);
});
check('Supplemental redirects are transparent; generated alias authentication is not claimed as app 200',()=>{
 const s=r.supplementalHostnameChecks;assert.equal(s.count,3);assert.deepEqual(s.requests.map(x=>x.host),hosts.slice(1));
 assert.deepEqual(s.requests.map(x=>x.status),[307,200,302]);assert.equal(s.requests[0].canonicalRedirect,true);assert.equal(s.requests[1].html,true);
 assert.equal(s.requests[2].passed,false);assert.equal(s.rawHarnessExitCode,1);
 assert.deepEqual(s.generatedAliasRedirectMetadata.links,[{scheme:'https',host:'vercel.com',path:'/sso-api',queryPresent:true}]);
 assert.equal(s.authenticatedGeneratedAliasApplicationResponse,'NOT_REQUESTED');assert.equal(s.protectionSettingsChanged,false);assert.equal(s.redirectQueryValuesInspected,false);
});
check('Candidate-scoped runtime aggregate queries succeeded with positive-control traffic',()=>{
 const a=r.runtime;assert.equal(a.candidateScoped,true);assert.equal(a.logBodiesRead,false);
 for(const key of ['errorCount','fatalCount','unexpected5xxCount'])assert.equal(a[key],0);
 assert.ok(Date.parse(a.capturedAt)>=Date.parse(r.productionSmoke.finishedAt));
 const q=a.queries;for(const query of q.queries){assert.equal(query.deploymentId,candidate);assert.equal(query.since,a.since);}
 assert.deepEqual(q.queries[0].level,['error','fatal']);assert.equal(q.queries[1].statusCode,'5xx');
 q.results.forEach((result,i)=>{assert.equal(result.status,'fulfilled');assert.equal(result.value.isError,false);const text=result.value.content.find(x=>x.type==='text').text;if(i<2)assert.equal(/\|\s*(?:error|fatal|5\d\d)\s*\|\s*\d+/i.test(text),false);else for(const [code,n] of Object.entries(a.positiveControlCounts))assert.ok(text.includes(`| ${code} | ${n} |`));});
});
check('No rollback trigger, no prohibited operation or dependency mutation',()=>{
 assert.equal(r.rollback.performed,false);assert.equal(r.rollback.requests,0);assert.equal(r.rollback.triggerConfirmed,false);assert.equal(r.rollback.targetIfTriggered,old);
 for(const [key,value] of Object.entries(r.operations))assert.equal(value,key==='promotionWrites'?1:0,key);
});
check('Opaque protected roots and zero deploy-input exposure',()=>{
 const p=r.protectedRoots;assert.deepEqual(p.paths,['ops/market-learning/daily-20260925/','ops/market-learning/daily-20260926/']);assert.equal(p.rootMetadataOnly,true);
 for(const k of ['contentReads','descendantEnumerations','contentHashes','modifications','staged','deployInputDescendantEntries','deployInputPayloadBytes','deployInputContentIds','deployInputSymlinkSpecialPayload','dataExposure'])assert.equal(p[k],0,k);
});
check('Historical validators and untouched customer/payment truth boundaries',()=>{
 assert.equal(r.validation.readiness.result,'PASS');assert.equal(r.validation.readiness.checks,17);assert.equal(r.validation.readiness.originalSourceModified,false);
 assert.equal(r.validation.stagedEvidence.result,'PASS');assert.equal(r.validation.stagedEvidence.checks,9);assert.equal(r.validation.stagedEvidence.sourceUnchanged,true);
 for(const [key,value] of Object.entries(r.truthBoundary))assert.equal(value,key==='productionEnvContract'?'PRESENT_METADATA_ONLY':'UNVERIFIED');
});
check('Release is complete and the next independent intelligence audit is not started',()=>{
 assert.equal(r.verdict,'PASS');assert.equal(r.releaseCycle,'COMPLETE');assert.equal(r.nextGate,'COUNT_CHAT_INTELLIGENCE_COMPLETION_AUDIT');assert.equal(r.nextGateStarted,false);
 const doc=readFileSync(report,'utf8');assert.ok(doc.includes('CHAT_HISTORY_PRODUCTION_TRAFFIC_PROMOTION = PASS'));assert.ok(doc.includes('CHAT_HISTORY_RELEASE_CYCLE = COMPLETE'));assert.ok(doc.includes('302'));
 if(process.argv.includes('--final')){assert.equal(r.validation.promotionEvidence.result,'PASS');for(const key of ['targetedLint','nodeSyntax','jsonSyntax','diffCheck'])assert.equal(r.validation[key],'PASS');}
});
execFileSync('git',['diff','--check']);execFileSync('git',['diff','--cached','--check']);
writeSync(1,`PRODUCTION_PROMOTION_EVIDENCE=PASS checks=${count}\n`);
