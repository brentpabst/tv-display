import { defineStore } from 'pinia'
import SunCalc from 'suncalc'
import moment from 'moment'
import configureMeasurements from 'convert-units'
import allMeasures from 'convert-units/definitions/all'

const convert = configureMeasurements(allMeasures)

const weatherflow_url =
  'wss://ws.weatherflow.com/swd/data?token=' + import.meta.env.VITE_WEATHERFLOW_TOKEN ||
  '__VITE_WEATHERFLOW_TOKEN__'

const weatherflow_forecast_url =
  'https://swd.weatherflow.com/swd/rest/better_forecast?station_id=' +
  (import.meta.env.VITE_WEATHERFLOW_STATION_ID || '__VITE_WEATHERFLOW_STATION_ID__') +
  '&token=' +
  (import.meta.env.VITE_WEATHERFLOW_TOKEN || '__VITE_WEATHERFLOW_TOKEN__') +
  '&units_temp=f&units_wind=mph&units_pressure=inhg&units_precip=in&units_distance=mi'

const condition_icons = new Map()
condition_icons.set('clear-day', 'sun')
condition_icons.set('clear-night', 'moon')
condition_icons.set('cloudy', 'cloud')
condition_icons.set('foggy', 'cloud')
condition_icons.set('partly-cloudy-day', 'cloud')
condition_icons.set('partly-cloudy-night', 'cloud')
condition_icons.set('possibly-rainy-day', 'cloud-drizzle')
condition_icons.set('possibly-rainy-night', 'cloud-drizzle')
condition_icons.set('possibly-sleet-day', 'cloud-rain')
condition_icons.set('possibly-sleet-night', 'cloud-rain')
condition_icons.set('possibly-snow-day', 'cloud-snow')
condition_icons.set('possibly-snow-night', 'cloud-snow')
condition_icons.set('possibly-thunderstorm-day', 'cloud-lightning')
condition_icons.set('possibly-thunderstorm-night', 'cloud-lightning')
condition_icons.set('rainy', 'cloud-dizzle')
condition_icons.set('sleet', 'cloud-rain')
condition_icons.set('snow', 'cloud-snow')
condition_icons.set('thunderstorm', 'cloud-lightning')
condition_icons.set('windy', 'wind')

export const useWeatherStore = defineStore('weather', {
  state: () => ({
    weather: { wind_speed: 0.0 },
    forecast: [],
    moon: null,
    sun: null,
    socket: null
  }),
  actions: {
    initialize() {
      this.startWeatherFlow()
      this.getSunCalcs(
        new Date(),
        import.meta.env.VITE_LATITUDE || '__VITE_LATITUDE__',
        import.meta.env.VITE_LONGITUDE || '__VITE_LONGITUDE__'
      )
      this.getMoonCalcs(new Date())
      this.getForecast()
    },
    refresh() {
      this.getSunCalcs(
        new Date(),
        import.meta.env.VITE_LATITUDE || '__VITE_LATITUDE__',
        import.meta.env.VITE_LONGITUDE || '__VITE_LONGITUDE__'
      )
      this.getMoonCalcs(new Date())
      this.getForecast()
    },
    startWeatherFlow() {
      this.socket = new WebSocket(weatherflow_url)
      this.socket.onmessage = this.handleMessage
      this.socket.onopen = () => {
        this.socket.send(
          JSON.stringify({
            type: 'listen_start',
            device_id:
              import.meta.env.VITE_WEATHERFLOW_DEVICE_ID || '__VITE_WEATHERFLOW_DEVICE_ID__',
            id: Math.random(1, 100000000)
          })
        )
        this.socket.send(
          JSON.stringify({
            type: 'listen_rapid_start',
            device_id:
              import.meta.env.VITE_WEATHERFLOW_DEVICE_ID || '__VITE_WEATHERFLOW_DEVICE_ID__',
            id: Math.random(1, 100000000)
          })
        )
      }
    },
    handleMessage(event) {
      const data = JSON.parse(event.data)
      if (data.type == 'obs_st') {
        this.weather = Object.assign(this.weather, parseWeather(data))
      }
      if (data.type == 'rapid_wind') {
        this.weather = Object.assign(this.weather, parseWind(data))
      }
      if (data.type == 'evt_strike') {
        this.weather = Object.assign(this.weather, parseStrike(data))
      }
    },
    getSunCalcs(date, lat, lon) {
      let today = moment(date)
      let tomorrow = moment(date).add(1, 'days')

      let todaySun = SunCalc.getTimes(today, lat, lon)
      let tomorrowSun = SunCalc.getTimes(tomorrow, lat, lon)

      this.sun = {
        today: todaySun,
        tomorrow: tomorrowSun,
        nextActivity: new Date() > todaySun.sunset ? 'sunrise' : 'sunset'
      }
    },
    getMoonCalcs(date) {
      this.moon = SunCalc.getMoonIllumination(moment(date))
    },
    getForecast() {
      fetch(weatherflow_forecast_url)
        .then((response) => response.json())
        .then((data) => {
          // Get Current Condition Icon
          this.weather.icon = condition_icons.get(data.current_conditions.icon)

          // Asign Forecast
          this.forecast = data.forecast.daily.map((f) => {
            return { ...f, icon: condition_icons.get(f.icon) }
          })
        })
    }
  },
  getters: {
    windDirection: (state) => {
      const windDir = state.weather.wind_dir
      let direction = ''

      if (windDir >= 0 && windDir < 11.25) {
        direction = 'N'
      } else if (windDir >= 11.25 && windDir < 33.75) {
        direction = 'NNE'
      } else if (windDir >= 33.75 && windDir < 56.25) {
        direction = 'NE'
      } else if (windDir >= 56.25 && windDir < 78.75) {
        direction = 'ENE'
      } else if (windDir >= 78.75 && windDir < 101.25) {
        direction = 'E'
      } else if (windDir >= 101.25 && windDir < 123.75) {
        direction = 'ESE'
      } else if (windDir >= 123.75 && windDir < 146.25) {
        direction = 'SE'
      } else if (windDir >= 146.25 && windDir < 168.75) {
        direction = 'SSE'
      } else if (windDir >= 168.75 && windDir < 191.25) {
        direction = 'S'
      } else if (windDir >= 191.25 && windDir < 213.75) {
        direction = 'SSW'
      } else if (windDir >= 213.75 && windDir < 236.25) {
        direction = 'SW'
      } else if (windDir >= 236.25 && windDir < 258.75) {
        direction = 'WSW'
      } else if (windDir >= 258.75 && windDir < 281.25) {
        direction = 'W'
      } else if (windDir >= 281.25 && windDir < 303.75) {
        direction = 'WNW'
      } else if (windDir >= 303.75 && windDir < 326.25) {
        direction = 'NW'
      } else if (windDir >= 326.25 && windDir < 348.75) {
        direction = 'NNW'
      } else if (windDir >= 348.75 && windDir <= 360) {
        direction = 'N'
      }

      return direction
    },
    moonPhase: (state) => {
      const moonPhase = state.moon.phase
      let phase = ''

      if (moonPhase >= 0 && moonPhase < 0.125) {
        phase = 'New Moon'
      } else if (moonPhase >= 0.125 && moonPhase < 0.25) {
        phase = 'First Quarter Waxing Crescent'
      } else if (moonPhase >= 0.25 && moonPhase < 0.375) {
        phase = 'First Quarter Waxing Half Moon'
      } else if (moonPhase >= 0.375 && moonPhase < 0.5) {
        phase = 'First Quarter Waxing Gibbous'
      } else if (moonPhase >= 0.5 && moonPhase < 0.625) {
        phase = 'Full Moon'
      } else if (moonPhase >= 0.625 && moonPhase < 0.75) {
        phase = 'Last Quarter Waning Gibbous'
      } else if (moonPhase >= 0.75 && moonPhase < 0.875) {
        phase = 'Last Quarter Waning Half Moon'
      } else if (moonPhase >= 0.875 && moonPhase <= 1) {
        phase = 'Last Quarter Waning Crescent'
      }

      return phase
    }
  }
})

function parseWeather(data) {
  var obs = {
    last_update: data.obs[0][0],
    wind_lull: convert(data.obs[0][1]).from('m/s').to('mph'),
    wind_avg: convert(data.obs[0][2]).from('m/s').to('mph'),
    wind_gust: convert(data.obs[0][3]).from('m/s').to('mph'),
    wind_dir: data.obs[0][4],
    pressure: convert(data.obs[0][6] / 1000)
      .from('bar')
      .to('inHg'),
    temp: convert(data.obs[0][7]).from('C').to('F').toFixed(1),
    humidity: data.obs[0][8],
    feels_like: convert(data.summary.feels_like).from('C').to('F').toFixed(1),
    illuminance: data.obs[0][9],
    uv: data.obs[0][10],
    solar_radiation: data.obs[0][11],
    rain_accumulated: convert(data.obs[0][18]).from('mm').to('in'),
    precipitation_type: data.obs[0][13],
    lightning_strike_avg_distance: convert(data.obs[0][14]).from('km').to('mi'),
    lightning_strike_count: data.obs[0][15]
  }
  return obs
}
function parseWind(data) {
  var wind = {
    last_update: data.ob[0],
    wind_speed: convert(data.ob[1]).from('m/s').to('mph').toFixed(2),
    wind_dir: data.ob[2]
  }
  return wind
}
function parseStrike(data) {
  var strike = {
    strike_last: data.evt[0],
    strike_distance: convert(data.evt[1]).from('km').to('mi'),
    strike_energy: data.evt[2]
  }
  return strike
}
