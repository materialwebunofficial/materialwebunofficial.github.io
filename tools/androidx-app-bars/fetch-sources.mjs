import fs from 'node:fs';
import crypto from 'node:crypto';
const revision='a095da93f8e98dea8748ceed79ea8427aade245f';
const directory=new URL('../../test/fixtures/androidx/app-bars/',import.meta.url);
fs.mkdirSync(directory,{recursive:true});
const prefix='compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/';
const locations={
 'AppBar.kt':prefix+'AppBar.kt',
 'BottomAppBarTokens.kt':prefix+'tokens/BottomAppBarTokens.kt',
 'DockedToolbarTokens.kt':prefix+'tokens/DockedToolbarTokens.kt',
 'AppBarTokens.kt':prefix+'tokens/AppBarTokens.kt',
 'FabSecondaryContainerTokens.kt':prefix+'tokens/FabSecondaryContainerTokens.kt',
 'IconButton.kt':prefix+'IconButton.kt',
 'IconButtonDefaults.kt':prefix+'IconButtonDefaults.kt',
 'IconButtonTokens.kt':prefix+'tokens/IconButtonTokens.kt',
 'FilledIconButtonTokens.kt':prefix+'tokens/FilledIconButtonTokens.kt',
 'FilledTonalIconButtonTokens.kt':prefix+'tokens/FilledTonalIconButtonTokens.kt',
 'OutlinedIconButtonTokens.kt':prefix+'tokens/OutlinedIconButtonTokens.kt',
 'AppBarSmallTokens.kt':prefix+'tokens/AppBarSmallTokens.kt',
 'AppBarMediumTokens.kt':prefix+'tokens/AppBarMediumTokens.kt',
 'AppBarLargeTokens.kt':prefix+'tokens/AppBarLargeTokens.kt',
 'AppBarMediumFlexibleTokens.kt':prefix+'tokens/AppBarMediumFlexibleTokens.kt',
 'AppBarLargeFlexibleTokens.kt':prefix+'tokens/AppBarLargeFlexibleTokens.kt',
 'Box.kt':'compose/foundation/foundation-layout/src/commonMain/kotlin/androidx/compose/foundation/layout/Box.kt'
};
const sources=await Promise.all(Object.entries(locations).map(async([file,location])=>{
 const url=`https://raw.githubusercontent.com/androidx/androidx/${revision}/${location}`;
 const response=await fetch(url);if(!response.ok)throw Error(`${file}: ${response.status}`);
 const bytes=Buffer.from(await response.arrayBuffer());fs.writeFileSync(new URL(file,directory),bytes);
 return{file,url,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
}));
fs.writeFileSync(new URL('sources.json',directory),JSON.stringify({revision,sources},null,2)+'\n');
console.log(`Cached ${sources.length} unchanged native app-bar sources.`);
