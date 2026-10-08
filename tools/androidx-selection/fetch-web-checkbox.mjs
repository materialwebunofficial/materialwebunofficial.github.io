// Supplemental official web M3 references; not an AndroidX Expressive oracle.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const revision='47adb655bd7a88c4d62e8faac2873084eed555dc';
const dir=fileURLToPath(new URL('../../test/fixtures/material-web/checkbox/',import.meta.url));
fs.mkdirSync(dir,{recursive:true});const sources=[];
for(const [file,path]of [['checkbox-tokens.scss','tokens/_md-comp-checkbox.scss'],['checkbox-v0_192.scss','tokens/versions/v0_192/_md-comp-checkbox.scss']]){
  const url=`https://raw.githubusercontent.com/material-components/material-web/${revision}/${path}`;
  const r=await fetch(url);if(!r.ok)throw Error(r.status+' '+url);
  const bytes=Buffer.from(await r.arrayBuffer());fs.writeFileSync(dir+file,bytes);
  sources.push({file,url,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
fs.writeFileSync(dir+'sources.json',JSON.stringify({revision,profile:'Google Material 3 Web v0.192 supplemental reference; not current AndroidX Expressive state-color authority',sources},null,2)+'\n');
console.log('Supplemental official web Checkbox sources pinned:',revision);
