#!/usr/bin/env node
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
const input=resolve(process.argv[2]??'source-assets/approved-board-base64');
const output=resolve(process.argv[3]??'public/assets/livery/ubangi-bag-iii/approved-board.webp');
const parts=(await readdir(input)).filter(n=>/^part-\d+\.txt$/.test(n)).sort();
if(!parts.length) throw new Error(`No base64 parts in ${input}`);
const text=(await Promise.all(parts.map(n=>readFile(resolve(input,n),'utf8')))).join('').replace(/\s+/g,'');
const data=Buffer.from(text,'base64');
await mkdir(dirname(output),{recursive:true});
await writeFile(output,data);
console.log(`Rebuilt ${output}: ${data.length} bytes from ${parts.length} parts`);
