import { defineStore } from 'pinia'
import moment from 'moment'

const espn_url = 'https://site.web.api.espn.com/apis/site/v2/sports/hockey/nhl/teams/CAR'

export const useEspnStore = defineStore('espn', {
  state: () => ({
    event: {},
    last_update: null
  }),
  getters: {
    competition: (state) => {
      if (!state.event.competitions) return null
      else return state.event.competitions[0]
    },
    homeTeam: (state) => {
      if (!state.event.competitions && state.event.competitions.competitors.length == 0) return null
      else
        return state.event.competitions[0].competitors.find(
          (competitor) => competitor.homeAway == 'home'
        )
    },
    awayTeam: (state) => {
      if (!state.event.competitions && state.event.competitions.competitors.length == 0) return null
      else
        return state.event.competitions[0].competitors.find(
          (competitor) => competitor.homeAway == 'away'
        )
    },
    refreshInterval: (state) => {
      const preGameInterval = 900000 // 15 minutes
      const preGameCloseInterval = 30000 // 30 seconds
      const inGameInterval = 15000 // 15 seconds
      const postGameInterval = 3600000 // 1 hour

      let eventTime = moment(state.event.date).subtract(15, 'minutes')

      if (!state.competition) {
        console.log('No Event Scheduled')
        return postGameInterval
      }

      if (state.competition.status.type.state == 'pre' && moment().isSameOrAfter(eventTime)) {
        console.log('Event Scheduled & Starts Soon')
        return preGameCloseInterval
      } else if (state.competition.status.type.state == 'pre') {
        console.log('Event Scheduled')
        return preGameInterval
      } else if (
        state.competition.status.type.state == 'in' ||
        (moment().isSameOrAfter(state.competition.date) &&
          state.competition.status.type.state != 'post')
      ) {
        console.log('Event in Progress')
        return inGameInterval
      } else if (state.competition.status.type.state == 'post') {
        console.log('Event Complete')
        return postGameInterval
      } else return postGameInterval
    }
  },
  actions: {
    async getData() {
      try {
        await fetch(espn_url)
          .then((response) => response.json())
          .then((data) => {
            this.event = Object.assign(this.event, data.team.nextEvent[0])
            this.last_update = new Date()
          })
      } catch (error) {
        console.error(error)
        return error
      }
    }
  }
})
