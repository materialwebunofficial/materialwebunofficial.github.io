/* Copyright 2019,2023,2024 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0; obtain a copy at
 * https://www.apache.org/licenses/LICENSE-2.0 . Distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND. See the License for details.
 */
// Native TimeInputTransformation and TextFieldBuffer's plain edit range policy.
// The BMP digit sets are the pinned JVM Char digit platform boundary; filtering
// uses UTF-16 code units, as the original CharSequence.all(Char.isDigit) does.
const digitStarts=[0x30,0x660,0x6f0,0x7c0,0x966,0x9e6,0xa66,0xae6,0xb66,0xbe6,0xc66,0xce6,0xd66,0xe50,0xed0,0xf20,0x1040,0x1090,0x17e0,0x1810,0x1946,0x19d0,0x1a80,0x1a90,0x1b50,0x1bb0,0x1c40,0x1c50,0xa620,0xa8d0,0xa900,0xa9d0,0xaa50,0xabf0,0xff10];
export function pickerInputDigit(char){const code=char.charCodeAt(0);for(const start of digitStarts)if(code>=start&&code<start+10)return code-start;return null;}
export function pickerInputNumber(text){let value=0;for(let i=0;i<text.length;i++){const digit=pickerInputDigit(text[i]);if(digit===null)return null;value=value*10+digit;if(value>2147483647)return null;}return text.length?value:null;}

export function pickerInputAdjustRange(original,replaceStart,replaceEnd,insertedLength){
 let start=Math.min(original.start,original.end),end=Math.max(original.start,original.end);
 if(end<replaceStart)return {...original};
 if(start<=replaceStart&&replaceEnd<=end){const diff=insertedLength-(replaceEnd-replaceStart);if(start===end)start+=diff;end+=diff;}
 else if(start>replaceStart&&end<replaceEnd)start=end=replaceStart+insertedLength;
 else if(start>=replaceEnd){const diff=insertedLength-(replaceEnd-replaceStart);start+=diff;end+=diff;}
 else if(replaceStart<start){start=replaceStart+insertedLength;end+=insertedLength-(replaceEnd-replaceStart);}
 else end=replaceStart;
 return{start,end};
}

export function pickerInputTransform(state,unit,{before,start,end,proposed,proposedStart,proposedEnd},a11y=false,userOverride=true){
 let text=proposed,selection={start:proposedStart,end:proposedEnd},errors=0,reverted=false;
 const revert=()=>{text=before;selection={start,end};reverted=true;};
 const remove=(start,end)=>{selection=pickerInputAdjustRange(selection,start,end,0);text=text.slice(0,start)+text.slice(end);};
 if(text.length===0){
  if(unit==='Hour'){const target=state.isPm&&!state.is24hour?12:0;if(state.hour!==target)userOverride=false;state.hourInput=target;}
  else{if(state.minute!==0)userOverride=false;state.minuteInput=0;}
 }else if(pickerInputNumber(text)===null){
  // The original checks Char.isDigit before numeric parsing. Non-digits revert
  // silently; a digit-only overflow reaches the later numeric error branch.
  let digits=true;for(let i=0;i<text.length;i++)if(pickerInputDigit(text[i])===null)digits=false;
  revert();if(digits)errors++;
 }else{
  const inserted=text.length-(before.length-Math.abs(end-start))>0;
  if(start===end&&before.length===2&&text.length===3){
   if(selection.start===1)remove(1,3);
   else if(selection.start===3)remove(0,2);
   else if(selection.start===2){remove(2,3);remove(0,1);}
  }
  const value=pickerInputNumber(text);
  if(text.length>2||value===null||value>99){revert();errors++;}
  else if(unit==='Hour'){
   const target=state.is24hour?value:value===12?(state.isPm?12:0):state.isPm?value+12:value;
   if(state.isValidHour(target)&&state.hour!==target)userOverride=false;state.hourInput=target;
   if((text.length===2||inserted&&!state.is24hour&&value>=2&&value<=9)&&!a11y&&state.isHourInputValid)state.selection='Minute';
  }else{if(value>=0&&value<=59&&state.minute!==value)userOverride=false;state.minuteInput=value;}
 }
 return{text,...selection,userOverride,errors,reverted};
}
