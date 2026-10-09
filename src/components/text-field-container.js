/* Copyright 2016 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0; obtain a copy at
 * https://www.apache.org/licenses/LICENSE-2.0 . Distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND. See the License for details.
 */
import {AnimateAsStateMotion,AsStateColorMotion} from '../motion/animate-as-state.js';
import {SpringPhysics} from '../motion/spring-physics.js';
import {bindSelectionColors} from '../motion/selection-color.js';

// OutlinedTextFieldDefaults.Container / animateBorderStrokeAsState. Keep the
// continuously drawn thickness independent of label layout and CSS borders.
export class TextFieldContainerMotion{
 constructor(host,{scope,node=scope,enabled=true,focused=false,containerProperty,indicatorProperty,containerToken,indicatorToken,disabledIndicator,drawThickness,signal}){
  this.enabled=enabled;this.disposed=false;
  this.host=host;
  this.drawThickness=drawThickness;
  this.thickness=new AnimateAsStateMotion(enabled&&focused?2:1,{label:'DpAnimation',draw:drawThickness});
  this.media=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');this.onPreference=()=>{if(this.media.matches)this.thickness.finish();};this.media?.addEventListener('change',this.onPreference);
  this.colors=bindSelectionColors(host,[
   {scope,node,property:containerProperty,token:containerToken},
   {scope,node,property:indicatorProperty,token:indicatorToken,snapDisabled:true,directDisabled:true,disabledColor:()=>!this.enabled?disabledIndicator?.():null},
  ],{disabled:()=>!this.enabled,role:()=> 'expressiveEffectFast',signal,motionClass:AsStateColorMotion});
  signal?.addEventListener('abort',()=>this.dispose(),{once:true});
 }
 refresh({enabled=this.enabled,focused=false}={}){
  if(this.disposed||!this.host.isConnected)return;const enabledChanged=enabled!==this.enabled;this.enabled=enabled;
  if(enabledChanged){this.thickness.dispose();this.thickness=new AnimateAsStateMotion(enabled&&focused?2:1,{label:'DpAnimation',draw:this.drawThickness});}
  else if(enabled){this.thickness.set(focused?2:1,SpringPhysics.getPreset('expressiveSpatialFast',this.host));if(this.media?.matches)this.thickness.finish();}
  this.colors.refresh();
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.thickness.dispose();this.colors.dispose();this.media?.removeEventListener('change',this.onPreference);}
}
