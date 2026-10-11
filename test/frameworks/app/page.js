'use client';
import {createElement,useEffect,useState} from 'react';
export default function Page() {
  const [ready,setReady]=useState(false),[value,setValue]=useState('Initial');
  useEffect(()=>{
    let active=true;
    Promise.all([
      import('@materialwebunofficial/md3e-web/components/md-button.js'),
      import('@materialwebunofficial/md3e-web/components/md-text-field.js')
    ]).then(()=>{if(active)setReady(true);});
    return()=>{active=false;};
  },[]);
  return createElement('main',{'data-ready':ready},
    createElement('md-button',{id:'toggle',toggle:true},'React toggle'),
    createElement('md-text-field',{id:'field',label:'Name',value,'single-line':true,
      oninput:event=>setValue(event.detail.value)}),
    createElement('output',{id:'value'},value));
}
