import fs from 'node:fs';
import crypto from 'node:crypto';
const revision='a095da93f8e98dea8748ceed79ea8427aade245f';
const prefix='compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/';
const directory=new URL('../../test/fixtures/androidx/toggle-button/',import.meta.url);
fs.mkdirSync(directory,{recursive:true});
const sources=[];
for(const path of [prefix+'ToggleButton.kt',prefix+'tokens/TonalButtonTokens.kt','compose/animation/animation/src/commonMain/kotlin/androidx/compose/animation/SingleValueAnimation.kt','compose/foundation/foundation/src/commonMain/kotlin/androidx/compose/foundation/Border.kt','compose/foundation/foundation-layout/src/commonMain/kotlin/androidx/compose/foundation/layout/Spacer.kt']){
  const file=path.split('/').at(-1),url=`https://raw.githubusercontent.com/androidx/androidx/${revision}/${path}`;
  const response=await fetch(url);if(!response.ok)throw new Error(`${file}: ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());fs.writeFileSync(new URL(file,directory),bytes);
  sources.push({file,url,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
fs.writeFileSync(new URL('sources.json',directory),JSON.stringify({revision,sources},null,2)+'\n');
console.log(`Cached ${sources.length} unchanged licensed ToggleButton references.`);
