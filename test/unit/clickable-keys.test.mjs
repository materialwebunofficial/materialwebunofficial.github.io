import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {ClickableKeys,keyboardActivationKey} from '../../src/motion/clickable-keys.js';
const directory=new URL('../fixtures/androidx/ripple/',import.meta.url);
for(const entry of JSON.parse(fs.readFileSync(new URL('sources.json',directory))).sources)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(entry.file,directory))).digest('hex'),entry.sha256,entry.file);
const native=JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/button/keyboard-oracle.json.gz',import.meta.url))));
const names={23:'DirectionCenter',66:'Enter',160:'NumPadEnter',62:'Spacebar',61:'Tab',29:'A'};
const codes=Object.fromEntries(Object.entries(names).map(([code,key])=>[key,Number(code)]));let frames=0;
for(const c of native){
 const calls=[],ids=new WeakMap();let next=0,clicks=0;
 const model=new ClickableKeys({enabled:c.enabled,onClick:()=>clicks++,
  onPress:c.provided?press=>{ids.set(press,++next);calls.push(`press:${next}`);}:undefined,
  onRelease:c.provided?press=>calls.push(`release:${ids.get(press)}`):undefined,
  onCancel:c.provided?press=>calls.push(`cancel:${ids.get(press)}`):undefined});
 for(const frame of c.frames){
  let consumed=false;
  if(frame.operation==='blur')model.cancel();
  else if(frame.operation==='disable'||frame.operation==='enable')model.update(frame.operation==='enable');
  else consumed=model.handle(names[frame.key],frame.type);
  assert.deepEqual({consumed,clicks,enabled:model.enabled,pending:model.pending.map(key=>codes[key]),calls},
   {consumed:frame.consumed,clicks:frame.clicks,enabled:frame.enabled,pending:frame.pending,calls:frame.calls},JSON.stringify({c,frame}));frames++;
 }
}
assert.equal(keyboardActivationKey({key:'Enter',code:'Enter'}),'Enter');assert.equal(keyboardActivationKey({key:'Enter',code:'NumpadEnter'}),'NumPadEnter');
for(const key of [' ','Spacebar'])assert.equal(keyboardActivationKey({key}),'Spacebar');assert.equal(keyboardActivationKey({key:'Tab'}),null);
console.log(`Clickable keyboard: ${native.length} original key/ClickableNode/base handler/focus/dispose/update histories/${frames} exact pending/reference/callback/consumption frames and web Enter/numpad/Space mapping passed; collection/delegation and emission scheduling are explicit hosts.`);
