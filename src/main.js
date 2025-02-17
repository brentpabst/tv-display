import './assets/main.css'

import { createApp } from 'vue'
import router from '@/router/router'
import { createPinia } from 'pinia'
import moment from 'moment'
import VueFeather from 'vue-feather'

import App from './App.vue'

const pinia = createPinia()

const app = createApp(App)

app.use(router)
app.use(pinia)

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
  momentCalendar(date) {
    return moment(date).calendar({
      sameDay: '[Today]',
      nextDay: '[Tomorrow]',
      lastDay: '[Yesterday]',
      nextWeek: 'dddd',
      sameElse: 'dddd'
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
    return moment.duration(milliseconds).humanize(true)
  }
}

app.component(VueFeather.name, VueFeather)

app.mount('#app')
