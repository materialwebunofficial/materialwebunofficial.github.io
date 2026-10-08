/* Copyright 2019 The Android Open Source Project. Apache-2.0.
 * Foundation ClickableNode / AbstractClickableNode key, focus and disable flow.
 * Independently executed originals: tools/androidx-button/generate-keyboard.py.
 */
const enterKeys=new Set(['DirectionCenter','Enter','NumPadEnter','Spacebar']);

export function keyboardActivationKey(event) {
  if(event.key==='Enter')return event.code==='NumpadEnter'?'NumPadEnter':'Enter';
  return event.key===' '||event.key==='Spacebar'?'Spacebar':null;
}

export class ClickableKeys {
  constructor({enabled=true,onPress,onRelease,onCancel,onClick}={}) {
    this.enabled=enabled;this.presses=new Map();
    this.onPress=onPress;this.onRelease=onRelease;this.onCancel=onCancel;this.onClick=onClick;
  }
  handle(key,type,event) {
    if(!this.enabled||!enterKeys.has(key))return false;
    if(type==='KeyDown') {
      if(this.presses.has(key))return false;
      const press={key};this.presses.set(key,press);this.onPress?.(press,event);return true;
    }
    if(type==='KeyUp') {
      const press=this.presses.get(key);this.presses.delete(key);
      if(!press)return false;
      this.onRelease?.(press,event);this.onClick?.(event);return true;
    }
    return false;
  }
  cancel() { for(const press of this.presses.values())this.onCancel?.(press);this.presses.clear(); }
  update(enabled) { if(this.enabled===enabled)return;if(!enabled)this.cancel();this.enabled=enabled; }
  get pending() { return [...this.presses.keys()]; }
}
