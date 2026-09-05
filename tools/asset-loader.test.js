import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {createAssetLoader,sha256} from '../runtime/asset-loader.js';
async function fixture(){
 const raw=new TextEncoder().encode('same source geometry and original animation '.repeat(20)),zipped=new Uint8Array(gzipSync(raw)),parts=[];
 const data=new Map();
 for(let i=0;i<zipped.length;i+=24){const b=zipped.slice(i,i+24),url='./part-'+i;parts.push({url,bytes:b.length,sha256:await sha256(b)});data.set(new URL(url,'https://fixture.invalid/').href,b);}
 const d={id:'bin',bytes:zipped.length,sha256:await sha256(zipped),decodedBytes:raw.length,decodedSha256:await sha256(raw),parts};
 return {raw,layout:{payloadSha256:d.decodedSha256,datasets:[d]},data};
}
function setup(f,extra={}){return createAssetLoader(f.layout,{baseURL:'https://fixture.invalid/',cacheStore:null,idleMs:25,partMs:300,retryMs:1,decodeMs:1000,
 fetchFn:async url=>new Response(f.data.get(url.split('?')[0])),...extra});}
test('reassembles identical source and verifies both forms',async()=>{const f=await fixture(),r=await setup(f).load();assert.deepEqual(new Uint8Array(r.bin),f.raw);});
test('received progress is emitted before all parts complete',async()=>{const f=await fixture(),states=[];await setup(f,{onProgress:s=>states.push(s)}).load();assert.ok(states.some(s=>s.receivedBytes>0&&s.completedParts<s.totalParts));assert.equal(states.at(-1).stage,'complete');});
test('bounded parallelism',async()=>{const f=await fixture();let active=0,max=0;await setup(f,{concurrency:2,fetchFn:async u=>{max=Math.max(max,++active);await new Promise(r=>setTimeout(r,5));active--;return new Response(f.data.get(u.split('?')[0]));}}).load();assert.equal(max,2);});
test('transient HTTP error retries only failed fragment',async()=>{const f=await fixture(),counts=new Map();await setup(f,{fetchFn:async u=>{const k=u.split('?')[0],n=(counts.get(k)||0)+1;counts.set(k,n);if(k.endsWith('part-0')&&n===1)return new Response('',{status:503});return new Response(f.data.get(k));}}).load();assert.equal(counts.get('https://fixture.invalid/part-0'),2);assert.ok([...counts.entries()].filter(([k])=>!k.endsWith('part-0')).every(([,n])=>n===1));});
test('never arriving response headers times out and retries finitely',async()=>{const f=await fixture();let n=0;const loader=setup(f,{concurrency:1,fetchFn:()=>{n++;return new Promise(()=>{});}});await assert.rejects(loader.load(),e=>e.code==='HEADER_TIMEOUT');assert.equal(n,3);});
test('stalled body with successful headers is still bounded',async()=>{const f=await fixture();let cancelled=0;await assert.rejects(setup(f,{concurrency:1,fetchFn:async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array([1]));},cancel(){cancelled++;}}))}).load(),e=>e.code==='BODY_TIMEOUT');assert.equal(cancelled,3);});
test('same length corrupted fragment never reaches complete',async()=>{const f=await fixture(),states=[];await assert.rejects(setup(f,{concurrency:1,onProgress:s=>states.push(s),fetchFn:async u=>{const b=f.data.get(u.split('?')[0]).slice();b[0]^=1;return new Response(b);}}).load(),e=>e.code==='INTEGRITY_MISMATCH');assert.ok(!states.some(s=>s.stage==='complete'));});
test('oversize response is rejected before copying beyond allocation',async()=>{const f=await fixture();await assert.rejects(setup(f,{fetchFn:async()=>new Response(new Uint8Array(500))}).load(),e=>e.code==='SIZE_MISMATCH');});
test('truncated response is rejected',async()=>{const f=await fixture();await assert.rejects(setup(f,{fetchFn:async()=>new Response(new Uint8Array(1))}).load(),e=>e.code==='INTEGRITY_MISMATCH');});
test('only checksum-verified cache entries are reused',async()=>{const f=await fixture(),store=new Map(),cache={match:async k=>store.get(k)?.clone(),put:async(k,r)=>{store.set(k,r.clone());},delete:async k=>store.delete(k)};await setup(f,{cacheStore:cache}).load();let calls=0;await setup(f,{cacheStore:cache,fetchFn:async()=>{calls++;throw Error('offline');}}).load();assert.equal(calls,0);assert.equal(store.size,f.data.size);});
test('corrupt cache is deleted and restored from the same source',async()=>{const f=await fixture();let deleted=0,calls=0;const cache={match:async k=>{const b=f.data.get(k).slice();b[0]^=255;return new Response(b);},delete:async()=>deleted++,put:async()=>{}};await setup(f,{cacheStore:cache,fetchFn:async u=>{calls++;return new Response(f.data.get(u.split('?')[0]));}}).load();assert.equal(deleted,f.data.size);assert.equal(calls,f.data.size);});
test('unavailable cache does not block network success',async()=>{const f=await fixture();const cache={match:async()=>{throw Error('denied');}};await setup(f,{cacheStore:cache}).load();});
test('explicit abort ends an otherwise hanging connection',async()=>{const f=await fixture(),loader=setup(f,{fetchFn:()=>new Promise(()=>{})});const promise=loader.load();setTimeout(()=>loader.cancel(),5);await assert.rejects(promise,e=>e.code==='CANCELLED');});
test('decoded hash independently prevents a wrong payload',async()=>{const f=await fixture();f.layout.datasets[0].decodedSha256='0'.repeat(64);await assert.rejects(setup(f).load(),e=>e.code==='PAYLOAD_MISMATCH');});
