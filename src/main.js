import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import moment from 'moment'
import VueFeather from 'vue-feather'
import { autoAnimatePlugin } from '@formkit/auto-animate/vue'
import { VOffline } from 'v-offline'

import App from './App.vue'

const pinia = createPinia()

const app = createApp(App)

app.use(pinia)
app.use(autoAnimatePlugin)

app.config.globalProperties.$filters = {
  momentUnix(date, format) {
    return moment.unix(date).format(format)
  },
  momentUnixCalendar(date) {
    return moment.unix(date).calendar({
      sameDay: '[Today]',
      nextDay: '[Tomorrow]',
      lastDay: '[Yesterday]',
      nextWeek: 'ddd',
      sameElse: 'ddd'
    })
  },
  timeagoUnix(date) {
    return moment.unix(date).fromNow()
  },
  moment(date, format) {
    return moment(date).format(format)
  },
  timeago(date) {
    return moment(date).fromNow()
  },
  duration(milliseconds) {
    return moment.duration(milliseconds).humanize()
  }
}

app.component(VueFeather.name, VueFeather)
app.component('VOffline', VOffline)

app.mount('#app')
