/** Original rememberRetainedState: update on non-null targets, retain on null.
 * A visibility owner explicitly forgets this state after leaving composition. */
export class ChipRetainedContent {
  constructor(){this.value=null;}
  update(target){if(target!=null)this.value=target;return this.value;}
  forget(){this.value=null;}
}
