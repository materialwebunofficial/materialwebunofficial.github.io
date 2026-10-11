import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';
const folder=path.resolve('artifacts/project-audit/lighthouse/assets-site');
fs.cpSync('artifacts/project-audit/lighthouse/baseline-site',folder,{recursive:true});
await esbuild.build({entryPoints:['src/showcase.js'],outfile:path.join(folder,'dist/showcase.js'),bundle:true,format:'esm',target:'es2022',minify:true,plugins:[{name:'shared-library',setup(build){build.onResolve({filter:/md3-expressive\.esm\.js$/},()=>({path:'./md3-expressive.esm.js',external:true}));}}]});
const css=fs.readFileSync('dist/tokens.min.css','utf8')+'\n'+fs.readFileSync('styles/showcase.css','utf8');
fs.writeFileSync(path.join(folder,'dist/showcase.css'),(await esbuild.transform(css,{loader:'css',minify:true})).code);
let html=fs.readFileSync(path.join(folder,'index.html'),'utf8').replace('<link rel="stylesheet" href="dist/tokens.min.css">\n  <link rel="stylesheet" href="styles/showcase.css">','<link rel="stylesheet" href="dist/showcase.css">');
// Working-tree HTML may use either Windows or Unix line endings.
html=html.replace(/<link rel="stylesheet" href="dist\/tokens.min.css">\r?\n  <link rel="stylesheet" href="styles\/showcase.css">/,'<link rel="stylesheet" href="dist/showcase.css">');
html=html.replace("import('./src/showcase.js')","import('./dist/showcase.js')");
html=html.replace('</head>','  <link rel="modulepreload" href="dist/md3-expressive.esm.js" fetchpriority="low">\n  <link rel="modulepreload" href="dist/showcase.js" fetchpriority="low">\n</head>');
fs.writeFileSync(path.join(folder,'index.html'),html);
console.log('Asset variant ready');
