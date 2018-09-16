import Vue from 'vue';
import Router from 'vue-router';

import KeenUI from 'keen-ui';
import 'keen-ui/dist/keen-ui.css';

import App from './App.vue';
import Index from './components/index.vue';
import './resource/font.css';

Vue.use(KeenUI);
Vue.use(Router);

Vue.config.productionTip = false;

const router = new Router({
  routes: [
    {
      path: '/',
      name: 'Index',
      component: Index,
    },
  ],
});

// tslint:disable-next-line:no-unused-expression
new Vue({
  el: '#app',
  router,
  template: '<App/>',
  components: { App },
});
