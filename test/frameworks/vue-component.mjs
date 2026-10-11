import {h,onMounted,ref} from 'vue';
export default {
  setup(){
    const ready=ref(false),value=ref('Initial');
    onMounted(async()=>{
      await Promise.all([
        import('@materialwebunofficial/md3e-web/components/md-button.js'),
        import('@materialwebunofficial/md3e-web/components/md-text-field.js')
      ]);
      ready.value=true;
    });
    return()=>h('main',{'data-ready':ready.value},[
      h('md-button',{id:'toggle',toggle:true},'Vue toggle'),
      h('md-text-field',{id:'field',label:'Name',value:value.value,'single-line':true,
        onInput:event=>{value.value=event.detail.value;}}),
      h('output',{id:'value'},value.value)
    ]);
  }
};
