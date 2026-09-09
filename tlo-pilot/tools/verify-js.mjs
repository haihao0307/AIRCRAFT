import fs from 'node:fs';
import assert from 'node:assert/strict';
import {parseTlo,verifyTlo,decodeCbor,jsonText} from '../reader-codec.js';
import {parseWsd,encodeWsd} from '../references/wsd_binary_original.mjs';
const url=new URL('../data/B24_Generic_Mother_01.tlo',import.meta.url),data=fs.readFileSync(url),parsed=parseTlo(data),summary=await verifyTlo(parsed);
assert.equal(summary.resourceFiles,102);
// Check the pre-existing WSD container implementation independently of this profile.
const legacy=parseWsd(data);assert.equal(legacy.chunks.length,112);assert.deepEqual(encodeWsd(legacy.chunks,{major:legacy.major,minor:legacy.minor,flags:legacy.flags}),data);
assert.equal(decodeCbor(Buffer.from('1bffffffffffffffff','hex')),18446744073709551615n);
assert.equal(decodeCbor(Buffer.from('3bffffffffffffffff','hex')),-18446744073709551616n);
assert.equal(decodeCbor(Buffer.from('1b0020000000000001','hex')),9007199254740993n);
assert.throws(()=>parseTlo(data.subarray(0,15)));const broken=Buffer.from(data);broken[broken.length-1]^=1;assert.throws(()=>parseTlo(broken),/CRC/);
assert.throws(()=>decodeCbor(Buffer.from('a2616101616102','hex')),/重复/);
const changed=legacy.chunks.map(c=>({type:c.type,payload:c.payload}));const prof=JSON.parse(changed[0].payload.toString());prof.requiredChunks.push('ZZZZ');changed[0].payload=Buffer.from(JSON.stringify(prof));assert.throws(()=>parseTlo(encodeWsd(changed)),/必需/);
const optional=parseTlo(encodeWsd([...legacy.chunks,{type:'ZZZZ',payload:Buffer.from([1,2,3])}]));assert.deepEqual((await verifyTlo(optional)).unknownOptionalChunks,['ZZZZ']);
summary.decoder='independent JavaScript decoder plus original WSD container roundtrip';summary.exactIntegerTests='uint64 max, negative 2^64, and 2^53+1 preserved as BigInt';
fs.writeFileSync(new URL('../data/VERIFY-JS.json',import.meta.url),jsonText(summary)+'\n');console.log(jsonText(summary));
