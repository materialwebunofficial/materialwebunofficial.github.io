/**
 * Observe one component's latest queued visibility state. IntersectionObserver
 * appends records before asynchronous delivery, so one batch may contain both
 * hidden and visible records for the same element.
 * https://www.w3.org/TR/intersection-observer/#queue-intersection-observer-entry-algo
 *
 * Callers start visible when the browser has no observer implementation.
 */
export function observeElementVisibility(element,onChange){
  if(typeof IntersectionObserver==='undefined')return null;
  let active=true,visible;
  const observer=new IntersectionObserver(entries=>{
    if(!active)return;
    for(let index=entries.length-1;index>=0;index--){
      const entry=entries[index];
      if(entry.target!==element)continue;
      if(visible!==entry.isIntersecting){visible=entry.isIntersecting;onChange(visible);}
      return;
    }
  });
  observer.observe(element);
  return {disconnect(){active=false;observer.disconnect();}};
}
