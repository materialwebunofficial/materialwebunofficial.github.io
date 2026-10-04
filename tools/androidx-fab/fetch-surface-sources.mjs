import fs from 'node:fs';
import crypto from 'node:crypto';
const revision='a095da93f8e98dea8748ceed79ea8427aade245f';
const directory=new URL('../../test/fixtures/androidx/fab-surface/',import.meta.url);
fs.mkdirSync(directory,{recursive:true});
const locations={
 'ColorScheme.kt':'compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/ColorScheme.kt',
 'Color.kt':'compose/ui/ui-graphics/src/commonMain/kotlin/androidx/compose/ui/graphics/Color.kt',
 'Surface.kt':'compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/Surface.kt',
 'InteractiveComponentSize.kt':'compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/InteractiveComponentSize.kt'
};
const sources=await Promise.all(Object.entries(locations).map(async([file,location])=>{
 const url=`https://raw.githubusercontent.com/androidx/androidx/${revision}/${location}`;
 const response=await fetch(url);if(!response.ok)throw Error(`${file}: ${response.status}`);
 const bytes=Buffer.from(await response.arrayBuffer());fs.writeFileSync(new URL(file,directory),bytes);
 return{file,url,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
}));
fs.writeFileSync(new URL('sources.json',directory),JSON.stringify({revision,sources},null,2)+'\n');
console.log(`Cached ${sources.length} unchanged native Surface sources.`);
