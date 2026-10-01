import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Redis} from '@upstash/redis';
import {chatResponseEvents} from '../../src/lib/analytics/chat.server';
import {GrowthEventSchema} from '../../src/lib/analytics/schema';
import {GROWTH_WRITE_LUA,growthEventWrite,writeGrowthEvents,type GrowthBackend} from '../../src/lib/analytics/store.server';
async function main(){
  assert.equal(process.env.MUSIAM_TEST_SCOPE,'preview','explicit Preview-only authority required');
  const url=process.env.KV_REST_API_URL, token=process.env.KV_REST_API_TOKEN;
  assert(url&&token,'existing Preview Redis required');
  const client=new Redis({url,token,retry:false,signal:()=>AbortSignal.timeout(10000)});
  const nonce=randomUUID(), now=Date.now();
  const row=chatResponseEvents({ok:true},0,{id:randomUUID(),createdAt:now},'synthetic_test',now)[0];
  const plan=growthEventWrite(row,'preview',now);
  const keys=plan.keys.map(k=>k.replace(':budget',`:test:${nonce}:budget`).replace(':event:',`:test:${nonce}:event:`));
  assert(keys.every(k=>k.startsWith('growth:v1:{preview:')&&k.includes(`:test:${nonce}:`)));
  const touched=new Set<string>();
  const remap=(incoming:string[])=>incoming.map(k=>{const key=k.replace(':budget',`:test:${nonce}:budget`).replace(':event:',`:test:${nonce}:event:`);assert(key.startsWith('growth:v1:{preview:')&&key.includes(`:test:${nonce}:`));touched.add(key);return key;});
  const backend:GrowthBackend={eval:async(s,k,a)=>client.eval(s,remap(k),a)};
  const evidence:Record<string,unknown>={scope:'preview',isolatedTestNonce:nonce,analyticsFlagEnabled:process.env.MUSIAM_ANALYTICS_SPINE_ENABLED==='1',sourceSha:process.env.MUSIAM_SOURCE_SHA??null};
  try{
    assert.equal(await writeGrowthEvents([row],backend,'preview',now),'stored');
    const stored=GrowthEventSchema.parse(await client.get(keys[1]));assert.deepEqual(stored,row);
    const results=await Promise.all(Array.from({length:5},()=>writeGrowthEvents([row],backend,'preview',now)));
    assert(results.every(x=>x==='stored'));assert.equal(Number(await client.get(keys[0])),1);
    const ttl=await client.ttl(keys[1]);assert(ttl>29*86400&&ttl<=31*86400);
    evidence.writeReadbackReplay='PASS';evidence.retentionTtlSeconds=ttl;
    // Test script command error after capacity accounting but before row storage.
    await client.del(...keys);
    const failing:GrowthBackend={eval:async(s,k,a)=>client.eval(s.replace("redis.call('SET', KEYS[2], ARGV[3], 'NX', 'EXAT', ARGV[1])","redis.call('MUSIAM_TEST_INVALID_COMMAND')"),remap(k),a)};
    assert.equal(await writeGrowthEvents([row],failing,'preview',now),'unavailable');
    assert.equal(await client.get(keys[1]),null);assert.equal(Number(await client.get(keys[0])),1);
    assert.equal(await writeGrowthEvents([row],backend,'preview',now),'stored');assert.deepEqual(GrowthEventSchema.parse(await client.get(keys[1])),row);
    // Lose reply after actual successful write; retry sees the authoritative row.
    await client.del(...keys);
    const lostReply:GrowthBackend={eval:async(s,k,a)=>{await client.eval(s,remap(k),a);throw Error('synthetic reply lost');}};
    assert.equal(await writeGrowthEvents([row],lostReply,'preview',now),'unavailable');
    assert.equal(await writeGrowthEvents([row],backend,'preview',now),'stored');assert.equal(Number(await client.get(keys[0])),1);
    evidence.commandFailureAndLostReply='PASS';
    for(const key of keys){await client.del(...keys);await client.lpush(key,'synthetic');assert.equal(await writeGrowthEvents([row],backend,'preview',now),'unavailable');assert.equal(await client.type(key),'list');assert.equal(await client.exists(keys.find(k=>k!==key)!),0);}
    await client.del(...keys);await client.set(keys[0],'not-number');assert.equal(await writeGrowthEvents([row],backend,'preview',now),'unavailable');assert.equal(await client.exists(keys[1]),0);
    await client.del(...keys);await client.set(keys[1],'not-json');assert.equal(await writeGrowthEvents([row],backend,'preview',now),'unavailable');assert.equal(await client.exists(keys[0]),0);
    evidence.wrongTypeAndCorruption='PASS';
    await client.del(...keys);await client.set(keys[0],'100000');assert.equal(await writeGrowthEvents([row],backend,'preview',now),'capped');assert.equal(await client.exists(keys[1]),0);evidence.cap='PASS';
    // Exact production Lua with short EXAT exercises actual expiry, isolated keys.
    await client.del(...keys);const shortArgs=[Math.floor(Date.now()/1000)+2,...plan.args.slice(1)];
    assert.equal(await client.eval(GROWTH_WRITE_LUA,remap(plan.keys),shortArgs),1);
    await new Promise(resolve=>setTimeout(resolve,2300));assert.equal(await client.exists(...keys),0);evidence.actualExpiry='PASS';
    evidence.productionNamespaceWrites=0;evidence.secretValuesStored=0;evidence.verdict='PASS_ACTUAL_PREVIEW_REDIS_ISOLATED';
    console.log(JSON.stringify(evidence));
  }finally{if(touched.size)await client.del(...touched);}
}
main().catch(()=>{console.error('PREVIEW_REDIS_VERIFICATION_FAILED (details withheld to prevent credential disclosure)');process.exitCode=1;});
