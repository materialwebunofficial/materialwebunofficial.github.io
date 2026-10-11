import {createSSRApp} from 'vue';
import Page from './vue-component.mjs';
createSSRApp(Page).mount('#app');
