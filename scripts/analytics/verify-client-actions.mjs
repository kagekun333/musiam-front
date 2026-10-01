import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const require=createRequire(import.meta.url);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const {build}=createRequire(require.resolve(root+'/node_modules/tsx/package.json'))('esbuild');
const puppeteer=require(root+'/node_modules/puppeteer');
const {clientGrowthEvent}=require(root+'/src/lib/analytics/action.server.ts');
const rows=[],arrivals=[];let failure=false,browser,stage='build';const mark=s=>{stage=s;console.log(JSON.stringify({stage:s}));};
const bundle=await build({entryPoints:[root+'/src/lib/analytics/client.ts'],bundle:true,format:'iife',globalName:'Growth',write:false,platform:'browser'});
const dest=createServer((req,res)=>{if(['/listen','/read','/open'].includes(req.url))arrivals.push({path:req.url,referrer:req.headers.referer??null});res.writeHead(200,{'content-type':'text/html'});res.end('<h1>Fixture destination</h1>');});
await new Promise(r=>dest.listen(0,'127.0.0.1',r));const destUrl='http://127.0.0.1:'+dest.address().port;
const main=createServer(async(req,res)=>{
 if(req.url==='/api/analytics/event'){
  let b='';for await(const c of req)b+=c;
  const row=clientGrowthEvent(JSON.parse(b),'synthetic_test');assert(row);if(!failure)rows.push(row);
  res.writeHead(failure?503:204);res.end();return;
 }
 res.writeHead(200,{'content-type':'text/html'});
 res.end('<a id="listen" target="_blank" rel="noopener noreferrer" href="'+destUrl+'/listen">Listen</a><a id="read" target="_blank" rel="noopener noreferrer" href="'+destUrl+'/read">Read</a><a id="open" target="_blank" rel="noopener noreferrer" href="'+destUrl+'/open">Open</a><script>'+bundle.outputFiles[0].text+'</script><script>for(const kind of ["listen","read","open"]){document.getElementById(kind).addEventListener("click",event=>Growth.observeGrowthWorkLink(event,kind,"work_detail"));}</script>');
});
await new Promise(r=>main.listen(0,'127.0.0.1',r));
const wait=async(predicate)=>{const start=Date.now();while(!predicate()){assert(Date.now()-start<10000,'fixture event wait timed out');await new Promise(r=>setTimeout(r,25));}};
try{
 mark('launch');browser=await puppeteer.launch({headless:true,protocolTimeout:20000,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 mark('page');const page=await browser.newPage();await page.goto('http://127.0.0.1:'+main.address().port,{waitUntil:'load'});
 mark('listen');await page.click('#listen');const target=await browser.waitForTarget(t=>t.url()===destUrl+'/listen',{timeout:10000});const popup=await target.page();assert(popup);assert.deepEqual(await popup.evaluate(()=>({opener:window.opener===null,referrer:document.referrer})),{opener:true,referrer:''});
 await wait(()=>rows.length===3);assert.deepEqual(rows.map(e=>e.event),['cta_clicked','work_action','listen_link_opened']);assert.equal(arrivals[0].referrer,null);
 assert.equal(rows[2].properties.observation,'browser_context_created');
 await popup.close();await page.bringToFront();
 mark('blocked-open-contract');await page.evaluate(()=>{const original=window.open;window.open=()=>null;let prevented=false;Growth.observeGrowthWorkLink({currentTarget:document.getElementById('read'),button:0,isTrusted:true,metaKey:false,ctrlKey:false,shiftKey:false,altKey:false,defaultPrevented:false,preventDefault:()=>{prevented=true;}},"read","work_detail");window.open=original;window.fixtureFallbackPrevented=prevented;});
 await wait(()=>rows.length===5);assert.equal(await page.evaluate(()=>window.fixtureFallbackPrevented),false);assert.deepEqual(rows.slice(3).map(e=>e.event),['cta_clicked','work_action']);
 mark('storage-failure');failure=true;await page.click('#open');const failedTarget=await browser.waitForTarget(t=>t.url()===destUrl+'/open',{timeout:10000});const failedPopup=await failedTarget.page();assert(failedPopup);await wait(()=>arrivals.length===2);assert(arrivals.every(a=>a.referrer===null));assert.deepEqual(await failedPopup.evaluate(()=>({opener:window.opener===null,referrer:document.referrer})),{opener:true,referrer:''});await failedPopup.close();
 const proof={verdict:'PASS_BROWSER_ACTION_CONTEXT_PRIVACY_ISOLATION',observedContext:true,openerNull:true,noReferrer:true,blockedOpenDoesNotClaimCompletionOrPreventNativeFallback:true,telemetryFailureDoesNotBlockNavigation:true,events:rows.map(e=>e.event),externalLoadingOrPlaybackClaimed:false,productionWrites:0,stripeCalls:0};
 writeFileSync('/tmp/musiam-client-actions-proof.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}catch(e){console.log(JSON.stringify({verdict:'FAIL_BROWSER_ACTION_FIXTURE',stage,error:String(e.message).slice(0,300),events:rows.map(e=>e.event),arrivals}));process.exitCode=1;}finally{mark('cleanup');if(browser){const timer=setTimeout(()=>browser.process()?.kill('SIGTERM'),10000);try{await browser.close();}finally{clearTimeout(timer);}}main.closeAllConnections();dest.closeAllConnections();await new Promise(r=>main.close(r));await new Promise(r=>dest.close(r));}
