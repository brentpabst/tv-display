import { defineStore } from 'pinia'
import moment from 'moment'

const proxy_url = (import.meta.env.VITE_CORS_PROXY_URL || '__VITE_CORS_PROXY_URL__') + '/'
const nhl_car_schedule_url = proxy_url + 'https://api-web.nhle.com/v1/club-schedule/car/week/now'
const nhl_car_game_url = proxy_url + 'https://api-web.nhle.com/v1/gamecenter/'

export const useNhlStore = defineStore('nhl', {
  state: () => ({
    cur_gameId: null,
    event: {},
    last_update: null
  }),
  getters: {
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
      } else if (
        state.event.gameState == 'LIVE' ||
        (moment().isSameOrAfter(eventTime) && state.event.gameState != 'OFF')
      ) {
        console.log('Event in Progress')
        return inGameInterval
      } else if (state.event.gameState == 'OFF') {
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
            this.cur_gameId = data.games[0].id
            fetch(nhl_car_game_url + this.cur_gameId + '/landing')
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
