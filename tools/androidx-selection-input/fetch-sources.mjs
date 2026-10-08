import fs from 'node:fs';
import crypto from 'node:crypto';
const revision='a095da93f8e98dea8748ceed79ea8427aade245f';
const directory=new URL('../../test/fixtures/androidx/selection-input/',import.meta.url);
fs.mkdirSync(directory,{recursive:true});
const sources=[];
for(const file of ['Toggleable.kt','Selectable.kt']){
  const url=`https://raw.githubusercontent.com/androidx/androidx/${revision}/compose/foundation/foundation/src/commonMain/kotlin/androidx/compose/foundation/selection/${file}`;
  const response=await fetch(url);if(!response.ok)throw Error(`${response.status}: ${url}`);
  const bytes=Buffer.from(await response.arrayBuffer());fs.writeFileSync(new URL(file,directory),bytes);
  sources.push({file,url,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
fs.writeFileSync(new URL('sources.json',directory),JSON.stringify({revision,sources},null,2)+'\n');
console.log('Pinned unchanged Foundation selection source references:',sources.map(s=>`${s.file} ${s.sha256}`).join('\n'));
