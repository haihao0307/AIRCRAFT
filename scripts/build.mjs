import { access, cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();const dist=path.join(root,'dist');
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
await cp(path.join(root,'apps/production-line/index.html'),path.join(dist,'index.html'));
await cp(path.join(root,'apps/production-line/styles.css'),path.join(dist,'styles.css'));
await cp(path.join(root,'apps/production-line/app.js'),path.join(dist,'app.js'));
await cp(path.join(root,'data'),path.join(dist,'data'),{recursive:true});
await cp(path.join(root,'knowledge'),path.join(dist,'knowledge'),{recursive:true});
await writeFile(path.join(dist,'404.html'),'<!doctype html><meta charset="utf-8"><script>location.replace("./");</script>');
async function copyOptional(relativePath){const source=path.join(root,relativePath);try{await access(source);const target=path.join(dist,path.relative('public',relativePath));await mkdir(path.dirname(target),{recursive:true});await cp(source,target);console.log(`Included materialized asset: ${relativePath}`)}catch(error){if(error.code!=='ENOENT')throw error}}
await copyOptional('public/runtime/b24/v0.9.6/index.html');
await copyOptional('public/assets/models/b24-liberator/b-24_liberator.glb');
console.log('Built static production dashboard and knowledge system in dist/.');
