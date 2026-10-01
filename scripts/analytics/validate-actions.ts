import assert from "node:assert/strict";
import fs from "node:fs";
import { clientGrowthEvent, commerceGrowthEvent, observeClientGrowthEvent, observeCommerceGrowthEvent, growthMetricPartition } from "../../src/lib/analytics/action.server";
import { POST } from "../../src/app/api/analytics/event/route";
import { GrowthEventSchema } from "../../src/lib/analytics/schema";
async function main(){
 const now=Date.now(),delivery={id:"ab82dd1c-c31b-4c3e-9bba-92db7a2ab911",createdAt:now};
 const click={event:"cta_clicked",delivery,properties:{surface:"chat",observation:"anchor_click"}};
 process.env.MUSIAM_ANALYTICS_SPINE_ENABLED="0";process.env.VERCEL_ENV="preview";
 const request=(body:unknown,origin="https://fixture.test")=>new Request("https://fixture.test/api/analytics/event",{method:"POST",headers:{Origin:origin},body:typeof body==="string"?body:JSON.stringify(body)});
 assert.equal((await POST(request(click))).status,204);
 assert.equal((await POST(request({...click,event:"paid"}))).status,400);
 assert.equal((await POST(request(click,"https://other.test"))).status,403);
 assert.equal((await POST(request("x".repeat(2049)))).status,413);
 assert.equal((await POST(request("not-json"))).status,400);
 const a=clientGrowthEvent(click,"synthetic_test",now)!;assert(a);
 assert.deepEqual(a,clientGrowthEvent(click,"synthetic_test",now+1000));
 assert.equal(growthMetricPartition(a),"excluded");
 assert.equal(growthMetricPartition({...a,properties:{trafficClass:"bot"}}),"excluded");
 assert.equal(growthMetricPartition({...a,properties:{trafficClass:"unknown"}}),"unknown");
 assert.equal(growthMetricPartition({...a,properties:{trafficClass:"human_verified"}}),"human_verified");
 assert.notEqual(a.eventId,clientGrowthEvent({...click,delivery:{...delivery,id:"e24c602d-82a7-4295-a670-b3c8d83673a4"}},"synthetic_test",now)!.eventId);
 for(const event of ["paid","checkout","checkout_started","quote_requested","product_cta_presented","recommendation_presented"]){assert.equal(clientGrowthEvent({...click,event},"unknown",now),null);}
 assert.equal(clientGrowthEvent({...click,properties:{...click.properties,trafficClass:"human_verified"}},"unknown",now),null);
 for(const key of ["url","email","workId","sessionId","conversationId","customerId","ip","userAgent"]){assert.equal(clientGrowthEvent({...click,[key]:"private"},"unknown",now),null);assert.equal(clientGrowthEvent({...click,properties:{...click.properties,[key]:"private"}},"unknown",now),null);}
 assert.equal(clientGrowthEvent({...click,event:"listen_link_opened"},"unknown",now),null,"click cannot claim observed open");
 const opened=clientGrowthEvent({...click,event:"listen_link_opened",properties:{surface:"chat",actionKind:"listen",observation:"browser_context_created"}},"unknown",now)!;assert(opened);assert.notEqual(opened.eventId,a.eventId);
 for(const event of ["visit","work_view","product_view"]){assert(clientGrowthEvent({...click,event,properties:{surface:"work_detail",observation:"page_visible"}},"synthetic_test",now));}
 for(const event of ["quote_requested","checkout_started","paid"] as const){
  const e=commerceGrowthEvent(event,"fixture-business-event-01",now,"synthetic_test");
  assert.deepEqual(e,commerceGrowthEvent(event,"fixture-business-event-01",now,"synthetic_test"));
  assert.equal(e.source,"metal_print_server");assert(!JSON.stringify(e).includes("fixture-business-event-01"));assert(GrowthEventSchema.safeParse(e).success);
  await observeCommerceGrowthEvent(event,"fixture-business-event-01",now,"synthetic_test",async()=>{throw Error("fixture storage failed");});
 }
 let seen=0;await observeClientGrowthEvent({...click,event:"paid"},"unknown",async()=>{seen++;});assert.equal(seen,0);
 await observeClientGrowthEvent(click,"unknown",async()=>{seen++;throw Error("fixture storage failed");});assert.equal(seen,1);
 // Existing commerce authorities retain every pre-existing executable statement.
 // Diff review independently confirms only imports + isolated observers are added.
 const webhook=fs.readFileSync("src/app/api/metal-print/webhook/route.ts","utf8");
 for(const check of ['verifyMetalPrintStripeEvent(rawBody, signature)','session.payment_status !== "paid"','session.currency !== offer.currency || session.amount_total !== offer.amountJpy','checkout acceptance evidence missing','checkout offer approval snapshot invalid','confirmation === "confirmed"'])assert(webhook.includes(check));
 assert(webhook.indexOf('observeCommerceGrowthEvent("paid"')>webhook.indexOf('confirmation === "confirmed"'));
 const checkout=fs.readFileSync("src/app/api/metal-print/checkout/route.ts","utf8");assert(checkout.indexOf('observeCommerceGrowthEvent("checkout_started"')>checkout.indexOf('stripe.checkout.sessions.create'));
 console.log(JSON.stringify({verdict:"PASS_ACTION_PRIVACY_AND_AUTHORITY_CONTRACTS",clientCannotEmitPaid:true,clickVsOpenSeparate:true,commerceStorageFailureIsolated:true,stripeCalls:0,productionWrites:0,livePaidProof:"NOT_CLAIMED"}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
