import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as esbuild from 'esbuild';

const root=fileURLToPath(new URL('../',import.meta.url));
/** Site assets stay outside dist so npm consumers do not receive the showcase. */
export async function buildShowcaseAssets(){
 const output=path.join(root,'assets');fs.mkdirSync(output,{recursive:true});
 await esbuild.build({entryPoints:[path.join(root,'src/showcase.js')],outfile:path.join(output,'showcase.js'),bundle:true,format:'esm',target:'es2022',minify:true,external:['../dist/md3-expressive.esm.js']});
 await esbuild.build({entryPoints:[path.join(root,'styles/showcase-entry.css')],outfile:path.join(output,'showcase.css'),bundle:true,minify:true,plugins:[{name:'shared-fonts',setup(build){
  build.onResolve({filter:/\.woff2$/},args=>{
   const font=path.resolve(args.resolveDir,args.path);
   if(!fs.existsSync(font))throw new Error(`Missing showcase font: ${font}`);
   const relative=path.relative(output,font).replaceAll('\\','/');
   return {path:relative.startsWith('.')?relative:'./'+relative,external:true};
  });
 }}]});
}
