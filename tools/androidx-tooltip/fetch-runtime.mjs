// Test-only coroutine runtime compatible with the repository's Kotlin 1.9.24 compiler.
import fs from 'node:fs';
import crypto from 'node:crypto';
const directory = new URL('../../research/tooltip-runtime/',import.meta.url);
fs.mkdirSync(directory,{recursive:true});
const sources=[];
for (const artifact of ['kotlinx-coroutines-core-jvm','kotlinx-coroutines-test-jvm']) {
  const file=`${artifact}.jar`, url=`https://repo.maven.apache.org/maven2/org/jetbrains/kotlinx/${artifact}/1.8.1/${artifact}-1.8.1.jar`;
  const response=await fetch(url); if (!response.ok) throw new Error(`${artifact}: ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  const digest=crypto.createHash('sha256').update(bytes).digest('hex');
  fs.writeFileSync(new URL(file,directory),bytes); sources.push({file,url,sha256:digest});
}
fs.writeFileSync(new URL('sources.json',directory),JSON.stringify({version:'1.8.1',sources},null,2)+'\n');
console.log('Prepared test-only Kotlin coroutine runtime.');
