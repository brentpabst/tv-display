import { defineStore } from 'pinia'

const nws_url =
  'https://api.weather.gov/alerts/active?point=' +
  (import.meta.env.VITE_LATITUDE || '__LATITUDE__') +
  ',' +
  (import.meta.env.VITE_LONGITUDE || '__LONGITUDE__')

export const useNwsAlertStore = defineStore('alerts', {
  state: () => ({
    alerts: [],
    last_update: null
  }),
  actions: {
    async getAlerts() {
      try {
        await fetch(nws_url)
          .then((response) => response.json())
          .then((data) => {
            this.alerts = data.features.sort(
              (a, b) => Date.parse(a.properties.expires) - Date.parse(b.properties.expires)
            )
            this.last_update = data.updated
          })
      } catch (error) {
        console.error(error)
        return error
      }
    }
  }
})
