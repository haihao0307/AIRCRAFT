const B85_ALPHABET='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~';
const B85_INDEX=new Map([...B85_ALPHABET].map((c,i)=>[c,i]));

export function decodePythonBase85(text){
  const clean=text.replace(/\s+/g,'');
  const out=[];
  for(let i=0;i<clean.length;i+=5){
    const part=clean.slice(i,i+5);
    const n=part.length;
    let value=0;
    for(let j=0;j<5;j++){
      const ch=j<n?part[j]:'~';
      const d=B85_INDEX.get(ch);
      if(d===undefined)throw new Error('Invalid base85 character at '+(i+j));
      value=value*85+d;
    }
    const bytes=[(value>>>24)&255,(value>>>16)&255,(value>>>8)&255,value&255];
    const keep=n===5?4:n-1;
    for(let j=0;j<keep;j++)out.push(bytes[j]);
  }
  return new Uint8Array(out);
}

async function sha256Hex(bytes){
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

export async function loadExact80DaysSource(base='./assets/80-days-port-master/'){
  const manifest=await fetch(base+'SOURCE_PAYLOAD_MANIFEST.json',{cache:'no-store'}).then(r=>{
    if(!r.ok)throw new Error('source manifest '+r.status);
    return r.json();
  });
  let encoded='';
  for(const chunk of manifest.chunks){
    const r=await fetch(base+chunk.path,{cache:'no-store'});
    if(!r.ok)throw new Error('missing exact source chunk '+chunk.path+' ('+r.status+')');
    const text=await r.text();
    if(text.length!==chunk.chars)throw new Error('chunk length mismatch '+chunk.path);
    if(await sha256Hex(new TextEncoder().encode(text))!==chunk.sha256)throw new Error('chunk hash mismatch '+chunk.path);
    encoded+=text;
  }
  if(encoded.length!==manifest.expectedEncodedChars)throw new Error('encoded source length mismatch');
  const bytes=decodePythonBase85(encoded);
  if(bytes.byteLength!==manifest.decodedBytes)throw new Error('decoded source byte length mismatch');
  if(await sha256Hex(bytes)!==manifest.decodedSha256)throw new Error('decoded source hash mismatch');
  const blob=new Blob([bytes],{type:manifest.decodedMime});
  const url=URL.createObjectURL(blob);
  return {url,bytes,manifest,revoke:()=>URL.revokeObjectURL(url)};
}
