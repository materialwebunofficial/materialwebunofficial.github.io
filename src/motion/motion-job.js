export class MotionCancelled extends Error{}
export class MotionJob{
 constructor(){this.active=true;this.cancelled=false;this.completed=false;this.listeners=new Set();}
 onCancel(listener){if(this.cancelled){listener();return()=>{};}this.listeners.add(listener);return()=>this.listeners.delete(listener);}
 cancel(){if(this.completed||this.cancelled)return;this.cancelled=true;this.active=false;for(const listener of [...this.listeners])listener();this.listeners.clear();}
 complete(){this.active=false;this.completed=true;this.listeners.clear();}
 check(){if(this.cancelled)throw new MotionCancelled();}
}
