import assert from 'node:assert/strict';
import fs from 'node:fs';

const oracle = JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/motion/spring-oracle.json', import.meta.url)));
const md3=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/selection/md3-checkbox-drawing-oracle.json',import.meta.url)),(_,v)=>typeof v==='number'?Math.fround(v):v).marks;
const checkPoints=gravity=>md3.find(c=>c.md3&&c.width===18&&c.fraction===1&&c.gravity===gravity).points;
const onPoints=checkPoints(0),mixedPoints=checkPoints(1);
const checkLength=Math.hypot(onPoints[1][0]-onPoints[0][0],onPoints[1][1]-onPoints[0][1])+Math.hypot(onPoints[2][0]-onPoints[1][0],onPoints[2][1]-onPoints[1][1]);

export async function testSelectionMotion(browser, base) {
  const page = await browser.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try {
    await page.goto(base, {waitUntil:'domcontentloaded'});
    await page.clock.install({time: new Date('2026-09-29T10:00:00Z')});
    // Playwright RAF uses16ms ticks; put each mutation on a frame boundary.
    await page.clock.pauseAt(new Date('2026-09-29T10:00:01.008Z'));
    await page.evaluate(() => {
      const host=document.createElement('div');host.id='motion-selection';
      host.setAttribute('data-motion-scheme','expressive');
      host.innerHTML='<md-checkbox id="motion-check"></md-checkbox><md-radio-button id="motion-radio"></md-radio-button>';
      document.body.append(host);
      document.getElementById('motion-check').checked=true;
      document.getElementById('motion-radio').checked=true;
    });
    const sourceRadio=oracle.find(c=>c.stiffness===800&&c.from===0&&c.to===6&&c.velocity===0);
    const sourceCheck=oracle.find(c=>c.stiffness===380&&c.dampingRatio===.8&&c.from===0&&c.to===1&&c.velocity===0);
    let previous=0;
    for (const time of [16,32,64,80]) {
      await page.clock.runFor(time-previous);previous=time;
      const result=await page.evaluate(() => {
        const radio=document.getElementById('motion-radio'),check=document.getElementById('motion-check');
        return {dot:radio.shadowRoot.querySelector('.dot').getBoundingClientRect().width,
          path:check.shadowRoot.querySelector('.mark-check').getAttribute('d')};
      });
      const radius=sourceRadio.samples.find(s=>s.time===time).position;
      assert.ok(Math.abs(result.dot-2*Math.max(0,radius-1))<.002, `radio dot at ${time}ms: ${result.dot}`);
      // The modern18dp points are independently recorded from native drawCheck.
      const numbers=result.path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g)?.map(Number)||[];
      let length=0;
      for(let i=2;i<numbers.length;i+=2) length+=Math.hypot(numbers[i]-numbers[i-2],numbers[i+1]-numbers[i-1]);
      const fraction=sourceCheck.samples.find(s=>s.time===time).position;
      assert.ok(Math.abs(length-Math.min(1,fraction)*checkLength)<.00001, `check at ${time}ms: ${JSON.stringify(result)}, length ${length}, fraction ${fraction}`);
    }
    await page.clock.runFor(512);
    await page.locator('#motion-check').evaluate(el=>{el.indeterminate=true;});
    await page.clock.runFor(80);
    const morph=await page.locator('#motion-check .mark-check').getAttribute('d');
    const gravity=sourceCheck.samples.find(s=>s.time===80).position;
    const coords=morph.match(/-?\d+(?:\.\d+)?/g).map(Number);
    const expected=onPoints.flat().map((value,i)=>value+(mixedPoints.flat()[i]-value)*gravity);
    coords.forEach((value,index)=>assert.ok(Math.abs(value-expected[index])<.00001,'continuous check/dash morph'));
    await page.clock.runFor(512);
    await page.locator('#motion-check').evaluate(el=>{el.indeterminate=false;el.checked=false;});
    await page.clock.runFor(80);
    assert.equal(await page.locator('#motion-check .mark-check').getAttribute('d'),'M 4.5 9 L 9 9 L 13.5 9','hold glyph during fade out');
    await page.clock.runFor(32);
    assert.equal(await page.locator('#motion-check .mark-check').getAttribute('d'),'','snap after100ms');

    await page.locator('#motion-radio').evaluate(el=>{el.checked=false;});
    await page.clock.runFor(64);
    const interruption=await page.locator('#motion-radio').evaluate(el=>{
      const prior=el._dotMotion.channels.radius.sample(performance.now());
      const width=el.shadowRoot.querySelector('.dot').getBoundingClientRect().width;
      el.checked=true;
      const next=el._dotMotion.channels.radius.animation;
      return {prior,from:next.from,velocity:next.velocity,width,after:el.shadowRoot.querySelector('.dot').getBoundingClientRect().width};
    });
    assert.equal(interruption.from,interruption.prior.position);
    assert.equal(interruption.velocity,interruption.prior.velocity);
    assert.ok(Math.abs(interruption.width-interruption.after)<.0001,'retarget without jump');

    await page.emulateMedia({reducedMotion:'reduce'});
    await page.clock.runFor(16);
    assert.equal(await page.locator('#motion-radio .dot').evaluate(el=>el.getBoundingClientRect().width),10);
    await page.locator('#motion-check').evaluate(el=>{el.indeterminate=true;});
    assert.equal(await page.locator('#motion-check .mark-check').getAttribute('d'),'M 4.5 9 L 9 9 L 13.5 9');
    const lifecycle=await page.locator('#motion-check').evaluate(el=>{
      const old=el._markMotion,parent=el.parentElement;el.remove();parent.append(el);
      return {disposed:old.raf===null,fresh:old!==el._markMotion,path:el.shadowRoot.querySelector('.mark-check').getAttribute('d')};
    });
    assert.deepEqual(lifecycle,{disposed:true,fresh:true,path:'M 4.5 9 L 9 9 L 13.5 9'});
    await page.emulateMedia({reducedMotion:'no-preference'});
    const standard=await page.evaluate(() => {
      document.getElementById('motion-selection').setAttribute('data-motion-scheme','standard');
      const radio=document.getElementById('motion-radio');radio.checked=false;
      return radio._dotMotion.channels.radius.animation.stiffness;
    });
    assert.equal(standard,1400,'local motion scheme');
    await page.locator('#motion-check').evaluate(el=>{el.indeterminate=false;el.checked=false;});
    await page.clock.runFor(512);
    await page.locator('#motion-check').evaluate(el=>{el.checked=true;});
    await page.clock.runFor(64);
    const interruptedCheck=await page.locator('#motion-check').evaluate(async el=>{
      const before=el.shadowRoot.querySelector('.mark-check').getAttribute('d');
      el.checked=false;await Promise.resolve();
      const motion=el._markMotion.channels.fraction.animation;
      return {before,after:el.shadowRoot.querySelector('.mark-check').getAttribute('d'),
        stiffness:motion.stiffness,damping:motion.dampingRatio,snap:motion.snap};
    });
    assert.equal(interruptedCheck.before,interruptedCheck.after);
    assert.deepEqual([interruptedCheck.stiffness,interruptedCheck.damping,interruptedCheck.snap],[1500,1,false]);
    assert.deepEqual(errors,[]);
  } finally { await page.close(); }
}
