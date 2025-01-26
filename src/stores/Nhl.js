import { defineStore } from 'pinia'
import moment from 'moment'

const proxy_url = (import.meta.env.VITE_CORS_PROXY_URL || '__VITE_CORS_PROXY_URL__') + '/'
const nhl_car_schedule_url = proxy_url + 'https://api-web.nhle.com/v1/club-schedule/car/week/now'
const nhl_car_game_url = proxy_url + 'https://api-web.nhle.com/v1/gamecenter/'

export const useNhlStore = defineStore('nhl', {
  state: () => ({
    currentGameId: null,
    schedule: {},
    event: {},
    last_update: null
  }),
  getters: {
    nextGame: (state) => {
      let next = state.schedule[1]
      if (next) {
        return next
      } else {
        return null
      }
    },
    currentPeriod: (state) => {
      if (!state.event.periodDescriptor) {
        return
      } else {
        const suffixes = ['th', 'st', 'nd', 'rd']

        if (state.event.periodDescriptor.number < 4) {
          const v = state.event.periodDescriptor.number % 100
          let ordinal =
            state.event.periodDescriptor.number +
            (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0])
          let period = state.event.clock.inIntermission ? ' Intermission' : ' Period'
          return ordinal + period
        } else {
          let period = state.event.periodDescriptor.number - 3
          const v = period % 100
          let ordinal = period + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0])
          return ordinal + ' Overtime'
        }
      }
    },
    refreshInterval: (state) => {
      const preGameInterval = 900000 // 15 minutes
      const preGameCloseInterval = 30000 // 30 seconds
      const inGameInterval = 15000 // 15 seconds
      const postGameInterval = 3600000 // 1 hour

      let eventTime = moment(state.event.startTimeUTC).subtract(15, 'minutes')

      if (!state.event) {
        console.log('No Event Scheduled')
        return postGameInterval
      }

      if (state.event.gameState == 'FUT' && moment().isSameOrAfter(eventTime)) {
        console.log('Event Scheduled & Starts Soon')
        return preGameCloseInterval
      } else if (state.event.gameState == 'FUT') {
        console.log('Event Scheduled')
        return preGameInterval
      } else if (state.event.gameState == 'LIVE' || state.event.gameState == 'CRIT') {
        console.log('Event in Progress')
        return inGameInterval
      } else if (state.event.gameState == 'OFF' || state.event.gameState == 'FINAL') {
        console.log('Event Complete')
        return postGameInterval
      } else return postGameInterval
    }
  },
  actions: {
    async getData() {
      try {
        await fetch(nhl_car_schedule_url)
          .then((response) => response.json())
          .then(async (data) => {
            this.schedule = data.games
            this.currentGameId = data.games[0].id
            fetch(nhl_car_game_url + this.currentGameId + '/landing')
              .then((response) => response.json())
              .then((data) => {
                this.event = data
                this.last_update = new Date()
              })
          })
      } catch (error) {
        console.error(error)
        return error
      }
    }
  }
})
