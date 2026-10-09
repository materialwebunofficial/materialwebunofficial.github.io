import fs from 'node:fs';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const revision='a095da93f8e98dea8748ceed79ea8427aade245f',base='https://raw.githubusercontent.com/androidx/androidx/'+revision+'/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/',directory=fileURLToPath(new URL('../../test/fixtures/androidx/chip/',import.meta.url));
fs.mkdirSync(directory,{recursive:true});
const sources=await Promise.all(['Chip.kt','tokens/AssistChipTokens.kt','tokens/FilterChipTokens.kt','tokens/InputChipTokens.kt','tokens/SuggestionChipTokens.kt','tokens/ChipsTokens.kt','tokens/ElevationTokens.kt'].map(async source=>{
 const url=base+source,response=await fetch(url);if(!response.ok)throw Error(response.status+' '+url);const bytes=Buffer.from(await response.arrayBuffer()),file=source.split('/').at(-1);if(!bytes.toString().includes('Licensed under the Apache License, Version 2.0'))throw Error('Original license missing '+file);fs.writeFileSync(directory+file,bytes);return{file,url,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
}));
fs.writeFileSync(directory+'sources.json',JSON.stringify({revision,sources},null,2)+'\n');console.log('Fetched '+sources.length+' pinned licensed chip originals.');
const layoutBase='https://raw.githubusercontent.com/androidx/androidx/'+revision+'/compose/foundation/foundation-layout/src/commonMain/kotlin/androidx/compose/foundation/layout/';
const layoutSources=await Promise.all(['Box.kt','Intrinsic.kt'].map(async file=>{
 const url=layoutBase+file,response=await fetch(url);if(!response.ok)throw Error(response.status+' '+url);const bytes=Buffer.from(await response.arrayBuffer());
 if(!bytes.toString().includes('Licensed under the Apache License, Version 2.0'))throw Error('Original license missing '+file);
 const sha256=crypto.createHash('sha256').update(bytes).digest('hex');fs.writeFileSync(directory+file,bytes);return{file,url,sha256};
}));
fs.writeFileSync(directory+'layout-sources.json',JSON.stringify({revision,sources:layoutSources},null,2)+'\n');console.log('Fetched '+layoutSources.length+' pinned licensed content layout originals.');
