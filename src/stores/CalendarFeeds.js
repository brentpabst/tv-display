import { defineStore } from 'pinia'
import moment from 'moment'
import ical from 'ical'

export const useCalendarFeedsStore = defineStore('calendarFeeds', {
  state: () => ({
    feeds: [],
    lastUpdated: null
  }),

  actions: {
    async fetchFeeds() {
      let feeds = JSON.parse(import.meta.env.VITE_ICAL_FEED_URLS || '__ICAL_FEED_URLS__')
      let proxiedUrls = feeds.map(
        (feed) => (import.meta.env.VITE_CORS_PROXY_URL || '__CORS_PROXY_URL__') + '/' + feed
      )
      const fetchPromises = proxiedUrls.map(async (feed) => {
        const response = await fetch(feed)
        const icsData = await response.text()
        const data = ical.parseICS(icsData)
        const array = []
        for (let k in data) {
          if (Object.prototype.hasOwnProperty.call(data, k)) {
            var ev = data[k]
            if (data[k].type == 'VEVENT') {
              array.push({
                start: ev.start,
                end: ev.end,
                summary: ev.summary,
                description: ev.description,
                location: ev.location,
                duration: parseInt(moment(ev.end).format('x') - moment(ev.start).format('x'))
              })
            }
          }
        }
        return array
      })

      const icsDataArray = await Promise.all(fetchPromises)
      const data = icsDataArray.flat()
      data.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))

      const filtered = data.filter((item) => {
        let today = moment().startOf('day')
        let date = moment(item.start)
        if (date.isSameOrAfter(today)) {
          return true
        } else return false
      })

      let dates = []
      for (const item of filtered) {
        let date = moment(item.start)
        if (!dates.includes(date.format('YYYY-MM-DD'))) {
          dates.push(date.format('YYYY-MM-DD'))
        }
        if (dates.length >= 3) {
          break
        }
      }

      let events = []
      for (let i = 0; i < dates.length; i++) {
        let currentDate = moment(dates[i])
        events.push(filtered.filter((item) => moment(item.start).isSame(currentDate, 'day')))
      }
      this.feeds = events
      this.lastUpdated = moment().unix()
    }
  }
})
