import fs from 'node:fs';import crypto from 'node:crypto';
const revision='a095da93f8e98dea8748ceed79ea8427aade245f';
const directory=new URL('../../test/fixtures/androidx/text-field/',import.meta.url);fs.mkdirSync(directory,{recursive:true});
const base='https://raw.githubusercontent.com/androidx/androidx/'+revision+'/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/';
const files=['TextFieldDefaults.kt','TextField.kt','OutlinedTextField.kt','internal/TextFieldImpl.kt','tokens/FilledTextFieldTokens.kt','tokens/OutlinedTextFieldTokens.kt'];
const sources=await Promise.all(files.map(async upstream=>{
 const url=base+upstream,response=await fetch(url);if(!response.ok)throw Error(url+' '+response.status);
 const bytes=Buffer.from(await response.arrayBuffer()),file=upstream.split('/').at(-1);
 fs.writeFileSync(new URL(file,directory),bytes);return {file,url,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
}));
fs.writeFileSync(new URL('sources.json',directory),JSON.stringify({revision,sources},null,2)+'\n');
console.log('Pinned '+sources.length+' original AndroidX text-field sources.');
