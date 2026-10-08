import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const dir=new URL('../fixtures/androidx/selection-input/',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('sources.json',dir)));
assert.equal(manifest.revision,'a095da93f8e98dea8748ceed79ea8427aade245f');
for(const {file,sha256} of manifest.sources)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(file,dir))).digest('hex'),sha256,file);
const toggle=fs.readFileSync(new URL('Toggleable.kt',dir),'utf8'),select=fs.readFileSync(new URL('Selectable.kt',dir),'utf8');
const materialDir=new URL('../fixtures/androidx/selection/',import.meta.url);
for(const [file,{sha256}]of Object.entries(JSON.parse(fs.readFileSync(new URL('sources.json',materialDir)))))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(file.replace(/^tokens\//,''),materialDir))).digest('hex'),sha256,file);
for(const [source,name]of [[toggle,'ToggleableNode'],[toggle,'TriStateToggleableNode'],[select,'SelectableNode']]){
  assert.match(source,new RegExp(`private class ${name}\\b[\\s\\S]*?\\)\\s*:\\s*ClickableNode\\(`));
  assert.doesNotMatch(source,/override\s+fun\s+onKeyEvent\b/,'selection subclasses inherit the independently executed ClickableNode key handler');
}
assert.match(toggle,/onClick\s*=\s*\{\s*onValueChange\(!value\)\s*\}/);
// The pinned Material3 bodies choose these Foundation nodes. This is a source
// inheritance proof; the complete composables/focus tree are not executed here.
for(const [file,node,role]of [['Switch.kt','toggleable','Switch'],['Checkbox.kt','triStateToggleable','Checkbox'],['RadioButton.kt','selectable','RadioButton']]){
  const source=fs.readFileSync(new URL('../fixtures/androidx/selection/'+file,import.meta.url),'utf8');
  assert.match(source,new RegExp(`\\.${node}\\([\\s\\S]*?role = Role\\.${role}`));
}
await import('./clickable-keys.test.mjs');
console.log('Selection keyboard: SHA-verified original Toggleable/TriStateToggleable/Selectable inherit the executed ClickableNode key/focus/dispose/update flow; Material3 chooses the matching nodes and roles. Full composition and native input trees remain separate.');
