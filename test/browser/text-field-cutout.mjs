import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
const directory=new URL('../fixtures/androidx/text-field/',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('cutout.meta.json',directory))),bytes=fs.readFileSync(new URL('cutout.json',directory));
assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),meta.sha256);
const rows=JSON.parse(bytes).filter(row=>row.startPadding===16&&row.endPadding===16);
export async function testTextFieldCutoutBinding(browser,base){
 let rectangles=0;
 for(const width of [1000,390])for(const mode of ['light','dark'])for(const dir of ['ltr','rtl']){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/test/browser/fixtures/toolbars.html');
   await page.waitForFunction(()=>customElements.get('md-text-field')&&customElements.get('md-theme'));
   await page.evaluate(({dir,mode})=>{document.documentElement.dir=dir;document.querySelector('#fixture').innerHTML=`<md-theme color-mode="${mode}" style="display:block"><md-text-field id="field" label="Label" float-label="always"></md-text-field></md-theme>`;},{dir,mode});
   const records=await page.locator('#field').evaluate((field,rows)=>rows.map(row=>{
    // Native argument inputs enter the actual retained DOM renderer through its
    // measurement cache. This does not reproduce browser/native font measurement.
    field.minimizedLabelAlignment=row.bias===-1?'start':row.bias===0?'center':'end';
    field._fieldSize={width:row.width,height:56};field._labelSize={width:row.labelWidth,height:row.labelHeight};
    field._fieldFrame={label:1,thickness:1};field._syncOutline();
    const clip=field.shadowRoot.querySelector('.cutout');return{row,actual:['x','y','width','height'].map(name=>Number(clip.getAttribute(name)))};
   }),rows.filter(row=>row.rtl===(dir==='rtl')));
   for(const {row,actual}of records){const [left,top,right,bottom]=row.clip??[0,0,0,0],expected=[left,top,Math.max(0,Math.fround(right-left)),Math.max(0,Math.fround(bottom-top))].map(value=>value===0?0:value);assert.deepEqual(actual,expected,'actual SVG mask bindings '+JSON.stringify(row));rectangles++;}
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 console.log('TextField cutout DOM binding: '+rectangles+' native argument records reached the actual retained SVG mask with start/center/end alignment at1000/390 light/dark LTR/RTL. Cached measurement injection/Float-to-SVG conversion are web adapters; font measurement and raster remain separate.');
}
