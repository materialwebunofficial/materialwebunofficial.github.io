import fs from 'node:fs';import path from 'node:path';import{fileURLToPath}from'node:url';import{chromium}from'playwright';
import{serve}from'./server.mjs';import{tap,route}from'../../../test/browser/mobile.mjs';
const out=path.dirname(fileURLToPath(import.meta.url));
const servers={before:await serve(path.join(out,'baseline-site')),after:await serve()},browser=await chromium.launch();
const report={context:{viewport:'384x853 CSS px',dpr:2.8125,browser:browser.version(),cpuRates:[1,4],cycles:2,baseline:'f145527',method:'trusted touch; rAF delivery intervals, Long Tasks/Event Timing, CDP main-thread/layout counters; local emulation, not physical-device FPS or field INP'},samples:[],traces:[],errors:[]};
const cases=[['dialogs','#open-dialog-btn','#sample-dialog'],['bottom-sheet','#open-bottom-sheet-btn','#sample-bottom-sheet'],['side-sheet','#open-side-sheet-btn','#sample-side-sheet'],['date-pickers','#open-date-picker-btn','#sample-date-picker'],['time-pickers','#open-time-picker-btn','#sample-time-picker'],['nav-drawer','[data-open-drawer="modal-drawer-demo"]','#modal-drawer-demo'],['nav-rail','[data-open-rail="modal-rail-demo"]','#modal-rail-demo'],['search','md-search-bar[full-screen] input','md-search-bar[full-screen]']];
const percentile=(data,q)=>{const values=[...data].sort((a,b)=>a-b);return values.length?values[Math.floor((values.length-1)*q)]:0};
try{
 for(const cpu of [1,4])for(const version of cpu===1?['before','after']:['after','before']){
  const page=await browser.newPage({viewport:{width:384,height:853},deviceScaleFactor:2.8125,isMobile:true,hasTouch:true});
  page.on('pageerror',e=>report.errors.push({version,cpu,message:e.message}));
  page.on('response',r=>{if(r.status()>=400)report.errors.push({version,cpu,url:r.url(),status:r.status()});});
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});await cdp.send('Performance.enable');
  await page.goto(servers[version].url);await page.waitForFunction(()=>document.documentElement.hasAttribute('data-showcase-ready'));await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1200);
  await page.evaluate(()=>{
   window.mobilePerf={long:[],events:[]};
   for(const type of ['longtask','event'])try{new PerformanceObserver(list=>{mobilePerf[type==='longtask'?'long':'events'].push(...list.getEntries().map(e=>e.toJSON()))}).observe({type,buffered:true,durationThreshold:16})}catch{}
   window.startMobileFrames=()=>{mobilePerf.start=performance.now();mobilePerf.frames=[];mobilePerf.last=null;mobilePerf.running=true;const frame=t=>{if(!mobilePerf.running)return;if(mobilePerf.last!==null)mobilePerf.frames.push(t-mobilePerf.last);mobilePerf.last=t;requestAnimationFrame(frame)};requestAnimationFrame(frame)};
  });
  const capture=async(id,cycle,phase,action)=>{
   const initial=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));await page.evaluate(()=>startMobileFrames());
   await action();await page.waitForTimeout(1100);
   const final=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
   const data=await page.evaluate(()=>{mobilePerf.running=false;const start=mobilePerf.start;return{frames:mobilePerf.frames,long:mobilePerf.long.filter(e=>e.startTime>=start),events:mobilePerf.events.filter(e=>e.startTime>=start)}});
   const sample={version,cpu,id,cycle,phase,frames:data.frames.length,p50FrameMs:percentile(data.frames,.5),p95FrameMs:percentile(data.frames,.95),maxFrameMs:Math.max(0,...data.frames),gapsOver25ms:data.frames.filter(t=>t>25).length,longTasks:data.long.map(e=>({start:e.startTime,duration:e.duration})),events:data.events.map(e=>({name:e.name,duration:e.duration,interactionId:e.interactionId})),layoutCount:final.LayoutCount-initial.LayoutCount,styleCount:final.RecalcStyleCount-initial.RecalcStyleCount,taskMs:(final.TaskDuration-initial.TaskDuration)*1000,layoutMs:(final.LayoutDuration-initial.LayoutDuration)*1000,styleMs:(final.RecalcStyleDuration-initial.RecalcStyleDuration)*1000};
   report.samples.push(sample);fs.writeFileSync(path.join(out,'performance.json'),JSON.stringify(report,null,2));
  };
  for(const[id,opener,target]of cases){
   await route(page,id);await page.locator(opener).evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForTimeout(600);
   for(let cycle=0;cycle<2;cycle++){
    await capture(id,cycle,'open',()=>tap(page.locator(opener)));
    if(!await page.locator(target+' dialog[open]').count())throw Error(`${version} ${id} failed to open`);
    await capture(id,cycle,'close',()=>page.keyboard.press('Escape'));
    if(await page.locator(target+' dialog[open]').count()){await page.keyboard.press('Escape');await page.waitForTimeout(1000)}
   }
   console.log(`${version} CPU ${cpu}x: ${id} measured`);
  }
  if(cpu===4&&version==='after'){
   const events=[];cdp.on('Tracing.dataCollected',e=>events.push(...e.value));
   await cdp.send('Tracing.start',{categories:'devtools.timeline',options:'record-as-much-as-possible',transferMode:'ReportEvents'});
   for(const[id,opener]of cases.filter(c=>['bottom-sheet','nav-drawer','nav-rail'].includes(c[0]))){await route(page,id);await tap(page.locator(opener));await page.waitForTimeout(1000);await page.keyboard.press('Escape');await page.waitForTimeout(1000)}
   const done=new Promise(r=>cdp.once('Tracing.tracingComplete',r));await cdp.send('Tracing.end');await done;
   const filtered=events.filter(e=>e.ph==='X'&&['Layout','UpdateLayoutTree','FunctionCall','RunTask','Paint'].includes(e.name)&&e.dur>1000);
   fs.writeFileSync(path.join(out,'performance-trace.json'),JSON.stringify({traceEvents:filtered}));report.traces.push({file:'performance-trace.json',events:filtered.length,layoutEvents:filtered.filter(e=>e.name==='Layout').length,longRuns:filtered.filter(e=>e.name==='RunTask'&&e.dur>50000).length});
  }
  await page.close();
 }
 fs.writeFileSync(path.join(out,'performance.json'),JSON.stringify(report,null,2));
 if(report.errors.length)throw Error('Performance run contains page or HTTP errors; inspect performance.json');
}finally{await browser.close();await Promise.all(Object.values(servers).map(s=>s.close()))}
