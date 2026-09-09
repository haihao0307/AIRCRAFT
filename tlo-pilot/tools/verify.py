from pathlib import Path,PurePosixPath
import argparse,hashlib,json
from codec import decode_profile,encode_wsd

def verify(data):
    profile,core,chunks=decode_profile(data)
    records=core['RMAP']['files'];paths=set();ids=set();ordinals=set()
    for f in records:
        p=PurePosixPath(f['path'])
        if p.is_absolute() or '\\' in f['path'] or ':' in f['path'] or any(v in ('','..','.') for v in f['path'].split('/')):raise ValueError('unsafe resource path')
        if f['path'] in paths or f['resourceId'] in ids or f['chunkOrdinal'] in ordinals:raise ValueError('duplicate resource record')
        paths.add(f['path']);ids.add(f['resourceId']);ordinals.add(f['chunkOrdinal'])
        n=f['chunkOrdinal']
        if not isinstance(n,int) or n<0 or n>=len(chunks):raise ValueError('invalid blob ordinal')
        c=chunks[n]
        if c['type']!='BLOB' or f['encoding']!='identity':raise ValueError('unsupported required blob')
        if len(c['payload'])!=f['bytes'] or hashlib.sha256(c['payload']).hexdigest()!=f['sha256']:raise ValueError('resource SHA/length mismatch')
    if ordinals!={i for i,c in enumerate(chunks) if c['type']=='BLOB'}:raise ValueError('unmapped BLOB')
    objects=core['OBJS']['objects'];obj_ids=[o['objectId'] for o in objects]
    if len(obj_ids)!=len(set(obj_ids)):raise ValueError('duplicate object identity')
    frames={f['id'] for f in core['FRAM']['frames']}
    if any(o['frameId'] not in frames for o in objects):raise ValueError('missing frame dependency')
    relation_ids=set()
    for rel in core['RELS']['relations']:
        if rel['id'] in relation_ids or rel['subject'] not in obj_ids:raise ValueError('invalid relation')
        relation_ids.add(rel['id'])
        if rel['kind']=='representationPartOf' and rel['object'] not in obj_ids:raise ValueError('missing composition target')
        if rel['kind']=='poseReferencedTo' and rel['object'] not in frames:raise ValueError('missing pose frame')
    rebuilt=encode_wsd([(c['type'],c['payload']) for c in chunks])
    if rebuilt!=data:raise ValueError('whole-container roundtrip mismatch')
    summary={'passed':True,'profile':profile['profile'],'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'chunks':len(chunks),'resourceFiles':len(records),'objects':len(objects),'name':objects[0]['name'],'objectId':objects[0]['objectId'],'worldTime':core['TIME']['worldTime'],'worldLocation':core['FRAM']['frames'][0]['worldLocation'],'lengthUnit':core['FRAM']['frames'][0]['units']['length'],'sourceCommit':core['PROV']['sourceCommit'],'nextPhase':core['DNA_']['nextPhase'],'unknownOptionalChunks':[c['type'] for c in chunks if c['type'] not in ['PROF','BLOB',*core]],'wholeContainerRoundtrip':'byte-exact','fullFileRecovery':'all RMAP SHA256 checks passed'}
    return summary,core,chunks

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('file',nargs='?',default=str(Path(__file__).resolve().parents[1]/'data/B24_Generic_Mother_01.tlo'));ap.add_argument('--extract');ap.add_argument('--output');args=ap.parse_args()
    data=Path(args.file).read_bytes();summary,core,chunks=verify(data)
    if args.extract:
        dest=Path(args.extract).resolve()
        if dest.exists():raise ValueError('extract destination must not already exist')
        for f in core['RMAP']['files']:
            target=(dest/f['path']).resolve()
            if not target.is_relative_to(dest):raise ValueError('resource escapes destination')
        dest.mkdir(parents=True)
        for f in core['RMAP']['files']:
            target=dest/f['path'];target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(chunks[f['chunkOrdinal']]['payload'])
        summary['extractedTo']=str(dest)
    text=json.dumps(summary,ensure_ascii=False,indent=2)
    if args.output:Path(args.output).write_text(text+'\n',encoding='utf8',newline='\n')
    print(text)
