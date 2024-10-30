import { defineStore } from 'pinia'
import moment from 'moment'

const apiUrl = 'https://site.web.api.espn.com/apis/site/v2/sports/hockey/nhl/teams/CAR'

export const useEspnStore = defineStore('espn', {
  state: () => ({
    event: {},
    lastUpdate: null
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
      if (!state.competition) return 3600000 // 1 hour
      if (
        state.competition.status.type.state == 'in' ||
        (moment().isSameOrAfter(state.competition.date) &&
          state.competition.status.type.state != 'post')
      )
        return 15000 // 15 seconds
      else if (state.competition.status.type.state == 'pre')
        return 900000 // 15 minutes
      else if (state.competition.status.type.state == 'post')
        return 3600000 // 1 hour
      else return 3600000 // 1 hour
    }
  },
  actions: {
    async initialize() {
      this.getData()
    },
    async refresh() {
      this.getData()
    },
    async getData() {
      await fetch(apiUrl)
        .then((response) => response.json())
        .then((data) => {
          this.event = Object.assign(this.event, data.team.nextEvent[0])
          this.lastUpdate = new Date()
        })
    }
  }
})
