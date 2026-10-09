/* AndroidX DatePicker/TimePicker factories at a095da93.
 * Colors remain semantic theme references; rich-colors selects vibrantColors().
 */
import {textFieldColors} from './text-field-state.js';
const color=(role,alpha=1,copied=false)=>({role,alpha:Math.fround(alpha),copied});
export function timePickerColors(vibrant=false){
 return Object.fromEntries(Object.entries({
  clockDialColor:vibrant?'SurfaceContainerLowest':'SurfaceContainerHighest',
  clockDialSelectedContentColor:'OnPrimary',clockDialContentColor:'OnSurface',selectorColor:'Primary',
  containerColor:vibrant?'SurfaceContainer':'SurfaceContainerHigh',periodSelectorBorderColor:'Outline',
  periodSelectorSelectedContainerColor:'PrimaryContainer',periodSelectorContainerColor:'SurfaceContainerLowest',
  periodSelectorSelectedContentColor:'OnPrimaryContainer',periodSelectorContentColor:'OnSurfaceVariant',
  timeSelectorSelectedContainerColor:vibrant?'SurfaceContainerLowest':'PrimaryContainer',
  timeSelectorContainerColor:vibrant?'SurfaceContainerLowest':'SurfaceContainerHighest',
  timeSelectorSelectedContentColor:vibrant?'Primary':'OnPrimaryContainer',timeSelectorContentColor:'OnSurface',
 }).map(([key,role])=>[key,color(role)]));
}
// TimeInputDefaults uses an OutlinedTextFieldColors factory of its own. Its
// selected/unselected selector colors are getters on that same factory.
export function timeInputTextFieldColors({vibrant=false,enabled=true,error=false,focused=false}={}){
 const colors=textFieldColors({variant:'outlined',enabled,error,focused});
 if(!enabled)return colors;
 colors.container=color(error?'ErrorContainer':vibrant?'SurfaceContainerLowest':focused?'PrimaryContainer':'SurfaceContainerHighest');
 colors.indicator=color(error?'Error':vibrant?(focused?'Primary':'transparent'):'Outline',!error&&vibrant&&!focused?0:1);
 colors.text=color(error?'OnSurface':focused?(vibrant?'Primary':'OnPrimaryContainer'):'OnSurface');
 return colors;
}
export function timeInputColors(vibrant=false){
 const {clockDialColor,clockDialSelectedContentColor,clockDialContentColor,selectorColor,...colors}=timePickerColors(vibrant);
 const selected=timeInputTextFieldColors({vibrant,focused:true}),unselected=timeInputTextFieldColors({vibrant});
 return {...colors,timeSelectorSelectedContainerColor:selected.container,timeSelectorContainerColor:unselected.container,timeSelectorSelectedContentColor:selected.text,timeSelectorContentColor:unselected.text};
}
export function datePickerColors(){
 const result=Object.fromEntries(Object.entries({
  containerColor:'SurfaceContainerHigh',titleContentColor:'OnSurfaceVariant',headlineContentColor:'OnSurfaceVariant',
  weekdayContentColor:'OnSurface',subheadContentColor:'OnSurfaceVariant',navigationContentColor:'OnSurfaceVariant',
  yearContentColor:'OnSurfaceVariant',currentYearContentColor:'Primary',selectedYearContentColor:'OnPrimary',
  selectedYearContainerColor:'Primary',dayContentColor:'OnSurface',selectedDayContentColor:'OnPrimary',
  selectedDayContainerColor:'Primary',todayContentColor:'Primary',todayDateBorderColor:'Primary',
  dayInSelectionRangeContentColor:'OnSecondaryContainer',dayInSelectionRangeContainerColor:'SecondaryContainer',
  dividerColor:'OutlineVariant',
 }).map(([key,role])=>[key,color(role)]));
 for(const [disabled,key]of Object.entries({disabledYearContentColor:'yearContentColor',disabledSelectedYearContentColor:'selectedYearContentColor',disabledSelectedYearContainerColor:'selectedYearContainerColor',disabledDayContentColor:'dayContentColor',disabledSelectedDayContentColor:'selectedDayContentColor',disabledSelectedDayContainerColor:'selectedDayContainerColor'}))result[disabled]=color(result[key].role,.38,true);
 return result;
}
export function datePickerDayColors({isToday=false,selected=false,inRange=false,enabled=true,animate=true},colors=datePickerColors()){
 const content=selected?colors[enabled?'selectedDayContentColor':'disabledSelectedDayContentColor']:
  inRange?colors[enabled?'dayInSelectionRangeContentColor':'disabledDayContentColor']:
  isToday&&enabled?colors.todayContentColor:colors[enabled?'dayContentColor':'disabledDayContentColor'];
 const container=selected?colors[enabled?'selectedDayContainerColor':'disabledSelectedDayContainerColor']:color('transparent',0);
 return{content,container,animateContent:!inRange,animateContainer:animate};
}
export const pickerCssRole=role=>role==='transparent'?'transparent':'var(--md-sys-color-'+role.replace(/[A-Z]/g,(letter,index)=>(index?'-':'')+letter.toLowerCase())+')';
export function pickerCssColor(descriptor){const role=pickerCssRole(descriptor.role);return descriptor.copied?'rgb(from '+role+' r g b / '+(Math.floor(Math.fround(Math.fround(descriptor.alpha)*255)+.5)/255)+')':role;}
export const pickerPaletteStyle=(colors,prefix)=>Object.entries(colors).map(([key,value])=>'--'+prefix+'-'+key.replace(/[A-Z]/g,letter=>'-'+letter.toLowerCase())+':'+pickerCssColor(value)).join(';');
