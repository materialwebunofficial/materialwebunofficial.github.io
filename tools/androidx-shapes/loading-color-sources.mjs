import fs from 'node:fs';import crypto from 'node:crypto';
const revision='a095da93f8e98dea8748ceed79ea8427aade245f';
const directory=new URL('../../test/fixtures/androidx/loading-colors/',import.meta.url);fs.mkdirSync(directory,{recursive:true});
const sources=await Promise.all(['LoadingIndicator.kt','tokens/LoadingIndicatorTokens.kt'].map(async location=>{
 const url=`https://raw.githubusercontent.com/androidx/androidx/${revision}/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/${location}`;
 const response=await fetch(url);if(!response.ok)throw Error(response.status);
 const bytes=Buffer.from(await response.arrayBuffer()),file=location.split('/').at(-1);fs.writeFileSync(new URL(file,directory),bytes);
 return{file,url,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
}));
fs.writeFileSync(new URL('sources.json',directory),JSON.stringify({revision,sources},null,2)+'\n');
console.log('Cached unchanged native loading color defaults.');
