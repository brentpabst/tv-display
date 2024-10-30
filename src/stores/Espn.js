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
      if (!state.competition) {
        console.log('No Event Scheduled')
        return 3600000 // 30 minutes
      }
      if (
        state.competition.status.type.state == 'in' ||
        (moment().isSameOrAfter(state.competition.date) &&
          state.competition.status.type.state != 'post')
      ) {
        console.log('Event in Progress')
        return 15000 // 15 seconds
      } else if (state.competition.status.type.state == 'pre') {
        console.log('Event Scheduled')
        return 900000 // 15 minutes
      } else if (state.competition.status.type.state == 'post') {
        console.log('Event Complete')
        return 3600000 // 1 hour
      } else return 3600000 // 1 hour
    }
  },
  actions: {
    async getData() {
      try {
        await fetch(espn_url)
          .then((response) => response.json())
          .then((data) => {
            this.event = Object.assign(this.event, data.team.nextEvent[0])
            this.last_update = moment().unix()
          })
      } catch (error) {
        console.error(error)
        return error
      }
    }
  }
})
