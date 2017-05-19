// @flow
import Vue from 'vue';
import App from './App';
import router from './router';

Vue.config.productionTip = false;

// tslint:disable-next-line:no-unused-expression
new Vue({
  el: '#app',
  router,
  template: '<App/>',
  components: { App },
});
