import fs from 'node:fs';
import crypto from 'node:crypto';
const revision='a095da93f8e98dea8748ceed79ea8427aade245f';
const directory=new URL('../../test/fixtures/androidx/pointer/',import.meta.url);
const references=[
 ['compose/ui/ui/src/commonMain/kotlin/androidx/compose/ui/node/NodeCoordinator.kt','4b5e401afd4e97b546b5869dfa0e7da3fdb2ba5d5be2c325f665239dc2c23a7b'],
 ['compose/foundation/foundation/src/commonMain/kotlin/androidx/compose/foundation/gestures/TapGestureDetector.kt','428b13231ef8d2684c7338f6f59509994eb98f382eed3bcc980bddd515be497b'],
 ['compose/ui/ui/src/commonMain/kotlin/androidx/compose/ui/input/pointer/PointerEvent.kt','f60630e089f455d8d84817f1f631eaebc6e00032f508ebab04f5a298bfc4d024'],
 ['compose/ui/ui/src/commonMain/kotlin/androidx/compose/ui/platform/ShapeContainingUtil.kt','5a6194401ff4df9944b6cf1afe81579356b66a5d3e66db278ef219bfa4d75d1f'],
 ['compose/ui/ui/src/commonMain/kotlin/androidx/compose/ui/node/HitTestResult.kt','8e1b8114f236654904c692b4905f2d5b68bce1964fec9857fff5b96284bc18f4'],
];
fs.mkdirSync(directory,{recursive:true});
const sources=await Promise.all(references.map(async([path,sha256])=>{
 const file=path.split('/').at(-1),url=`https://raw.githubusercontent.com/androidx/androidx/${revision}/${path}`;
 const response=await fetch(url);if(!response.ok)throw new Error(`${file}: ${response.status}`);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(crypto.createHash('sha256').update(bytes).digest('hex')!==sha256)throw new Error(`${file}: source hash changed`);
 fs.writeFileSync(new URL(file,directory),bytes);return{file,url,sha256};
}));
fs.writeFileSync(new URL('sources.json',directory),JSON.stringify({revision,sources},null,2)+'\n');
console.log(`Cached ${sources.length} unchanged licensed pointer/outline/hit-result references.`);
