// Current Weather API service for real-time weather data
import { getWeatherflowConfig } from '../config'
import { convertDistance } from '../utils/simplifiedUtils'
import { createLogger } from '../utils/logger'
import { BaseResilientService } from './baseResilientService'

const logger = createLogger('CurrentWeatherApi', { network: true })

class CurrentWeatherApiService extends BaseResilientService {
  constructor() {
    super('CurrentWeather')
    const config = getWeatherflowConfig()
    this.baseUrl = 'https://swd.weatherflow.com/swd/rest'
    this.websocketUrl = 'wss://ws.weatherflow.com/swd/data'
    this.deviceId = null
    this.stationId = null
    this.websocket = null
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = config.websocket.reconnectAttempts
  }

  // Initialize with device/station ID and access token
  async initialize(deviceId, stationId, accessToken) {
    logger.info('Initializing CurrentWeatherApiService with:', {
      deviceId,
      stationId,
      hasToken: !!accessToken,
    })

    this.deviceId = deviceId
    this.stationId = stationId
    this.accessToken = accessToken

    logger.info('Service initialized with:', {
      deviceId: this.deviceId,
      stationId: this.stationId,
      hasToken: !!this.accessToken,
    })

    if (this.deviceId && this.stationId) {
      await this.connectWebSocket()
    }
  }

  // Connect to Weatherflow WebSocket
  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      try {
        // Add access token to WebSocket URL if available
        const wsUrl = this.accessToken
          ? `${this.websocketUrl}?token=${this.accessToken}`
          : this.websocketUrl

        this.websocket = new WebSocket(wsUrl)

        this.websocket.onopen = () => {
          logger.network('Weatherflow WebSocket connected')
          this.isConnected = true
          this.reconnectAttempts = 0

          // Subscribe to device observations
          this.subscribeToDevice()

          // Resolve the promise once connected and subscribed
          resolve()
        }

        this.websocket.onmessage = event => {
          try {
            const data = JSON.parse(event.data)
            logger.debug('WebSocket message received:', data.type)
            this.handleWebSocketMessage(data)
          } catch (error) {
            logger.error('Error parsing WebSocket message:', error, event.data)
          }
        }

        this.websocket.onclose = event => {
          logger.network(
            'Weatherflow WebSocket disconnected:',
            event.code,
            event.reason
          )
          this.isConnected = false
          this.handleReconnect()
        }

        this.websocket.onerror = error => {
          logger.error('Weatherflow WebSocket error:', error)
          this.isConnected = false
          reject(error)
        }

        // Set a timeout for connection
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('WebSocket connection timeout'))
          }
        }, 10000) // 10 second timeout
      } catch (error) {
        logger.error('Failed to connect to Weatherflow WebSocket:', error)
        reject(error)
      }
    })
  }

  // Subscribe to device observations
  subscribeToDevice() {
    if (!this.isConnected || !this.deviceId) {
      console.log(
        'Cannot subscribe: connected=',
        this.isConnected,
        'deviceId=',
        this.deviceId
      )
      return
    }

    const subscribeMessage = {
      type: 'listen_start',
      device_id: this.deviceId,
      id: 'current_weather',
    }

    logger.debug('Subscribing to device:', subscribeMessage)
    this.websocket.send(JSON.stringify(subscribeMessage))
  }

  // Handle incoming WebSocket messages
  handleWebSocketMessage(data) {
    logger.debug('Processing message type:', data.type, data)

    const messageHandlers = {
      obs: () => this.processObservation(data.obs?.[0]),
      obs_st: () => this.processObservationArray(data.obs?.[0], data.summary),
      evt_strike: () => this.processLightningStrike(data),
      evt_precip: () => this.processPrecipitationStart(data),
      connection_opened: () => logger.network('WebSocket connection opened'),
      ack: () => logger.network('WebSocket acknowledgment received:', data.id),
    }

    const handler = messageHandlers[data.type]
    if (handler) {
      handler()
    } else {
      logger.debug('Unhandled message type:', data.type)
    }
  }

  // Process individual observation
  processObservation(obs) {
    if (!obs) return

    const weatherData = {
      timestamp: obs.timestamp,
      temperature: obs.air_temperature,
      humidity: obs.relative_humidity,
      pressure: obs.barometric_pressure,
      windSpeed: obs.wind_avg,
      windGust: obs.wind_gust,
      windDirection: obs.wind_direction,
      precipitation: obs.precip_accum_local_day,
      solarRadiation: obs.solar_radiation,
      uv: obs.uv,
      feelsLike: obs.feels_like,
      dewPoint: obs.dew_point,
      visibility: obs.visibility,
      cloudBase: obs.cloud_base,
    }

    // Emit custom event for store to listen to
    window.dispatchEvent(
      new CustomEvent('weatherflow-data', {
        detail: weatherData,
      })
    )
  }

  // Process observation array data (Weatherflow's array format)
  async processObservationArray(obsArray, summary) {
    if (!obsArray || !Array.isArray(obsArray) || obsArray.length < 20) {
      logger.warn('Invalid observation array:', obsArray)
      return
    }

    // Weatherflow observation array format
    const rawWeatherData = {
      timestamp: obsArray[0],
      windLull: obsArray[1],
      windSpeed: obsArray[2], // wind_avg (m/s)
      windGust: obsArray[3], // m/s
      windDirection: obsArray[4],
      windInterval: obsArray[5],
      pressure: obsArray[6], // mb/hPa
      temperature: obsArray[7], // air_temperature (Celsius)
      humidity: obsArray[8], // relative_humidity (%)
      illuminance: obsArray[9],
      uv: obsArray[10],
      solarRadiation: obsArray[11],
      rainAccumulation: obsArray[12] || 0,
      precipType: obsArray[13],
      lightningAvgDistance: obsArray[14] || 0,
      lightningCount: obsArray[15] || 0,
      battery: obsArray[16],
      reportInterval: obsArray[17],
      localRainAccumulation: obsArray[18] || 0,
      rainAccumulationChecked: obsArray[19] || 0,
      localRainAccumulationChecked: obsArray[20] || 0,
      // Use summary data for additional fields (all temperatures in Celsius)
      feelsLike: summary?.feels_like || null,
      dewPoint: summary?.dew_point || null,
      heatIndex: summary?.heat_index || null,
      windChill: summary?.wind_chill || null,
      wetBulbTemperature: summary?.wet_bulb_temperature || null,
      airDensity: summary?.air_density || null,
      pressureTrend: summary?.pressure_trend || null,
    }

    logger.debug('Raw weather data:', rawWeatherData)

    // Convert to configured units
    const { convertWeatherData } = await import('../utils/simplifiedUtils.js')
    const weatherData = convertWeatherData(rawWeatherData)

    logger.debug('Converted weather data:', weatherData)

    // Emit custom event for store to listen to
    window.dispatchEvent(
      new CustomEvent('weatherflow-data', {
        detail: weatherData,
      })
    )
  }

  // Process lightning strike event
  processLightningStrike(data) {
    logger.info('Lightning strike detected:', data)

    // According to WeatherFlow docs: evt = [time_epoch, distance_km, energy]
    const strikeData = {
      type: 'lightning_strike',
      timestamp: data.evt ? data.evt[0] : Date.now() / 1000,
      distance: data.evt ? convertDistance(data.evt[1]) : null, // Convert to configured unit
      energy: data.evt ? data.evt[2] : null,
      deviceId: data.device_id,
    }

    // Emit custom event for lightning strike
    window.dispatchEvent(
      new CustomEvent('weatherflow-lightning', {
        detail: strikeData,
      })
    )
  }

  // Process precipitation start event
  processPrecipitationStart(data) {
    logger.info('Precipitation start detected:', data)

    const precipData = {
      type: 'precipitation_start',
      timestamp: Date.now() / 1000,
      deviceId: data.device_id,
    }

    // Emit custom event for precipitation start
    window.dispatchEvent(
      new CustomEvent('weatherflow-precipitation', {
        detail: precipData,
      })
    )
  }

  // Handle reconnection logic
  handleReconnect() {
    const config = getWeatherflowConfig()
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = Math.min(
        config.websocket.reconnectDelay * Math.pow(2, this.reconnectAttempts),
        config.websocket.maxReconnectDelay
      )

      logger.network(
        `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`
      )

      setTimeout(() => {
        this.connectWebSocket()
      }, delay)
    } else {
      logger.error('Max reconnection attempts reached')
    }
  }

  // Get current weather via REST API (fallback)
  async getCurrentWeather(deviceId, accessToken) {
    return this.resilientCall(
      async () => {
        const response = await fetch(
          `${this.baseUrl}/observations/?device_id=${deviceId}&token=${accessToken}`
        )

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        logger.info('REST API weather data:', data)

        if (data.obs && data.obs.length > 0) {
          const latestObs = data.obs[0]
          return {
            timestamp: latestObs.timestamp,
            temperature: latestObs.air_temperature,
            humidity: latestObs.relative_humidity,
            pressure: latestObs.barometric_pressure,
            windSpeed: latestObs.wind_avg,
            windGust: latestObs.wind_gust,
            windDirection: latestObs.wind_direction,
            precipitation: latestObs.precip_accum_local_day,
            solarRadiation: latestObs.solar_radiation,
            uv: latestObs.uv,
            feelsLike: latestObs.feels_like,
            dewPoint: latestObs.dew_point,
            visibility: latestObs.visibility,
            cloudBase: latestObs.cloud_base,
          }
        }

        throw new Error('No observation data available')
      },
      `current-weather-${deviceId}`,
      { cacheExpiry: 5 * 60 * 1000 } // 5 minutes for weather data
    )
  }

  // Get forecast data
  async getForecast() {
    if (!this.stationId || !this.accessToken) {
      logger.error('Missing credentials for forecast:', {
        stationId: this.stationId,
        hasToken: !!this.accessToken,
      })
      throw new Error('Station ID and access token required for forecast')
    }

    return this.resilientCall(
      async () => {
        const forecastUrl = `${this.baseUrl}/better_forecast?station_id=${this.stationId}&token=${this.accessToken}&units_temp=f&units_wind=mph&units_pressure=inhg&units_precip=in&units_distance=mi`
        logger.info('Fetching forecast from:', forecastUrl)

        const response = await fetch(forecastUrl)

        if (!response.ok) {
          logger.error(
            'Forecast API error:',
            response.status,
            response.statusText,
            'URL:',
            forecastUrl
          )
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        logger.info('Forecast data:', data)

        return {
          currentConditions: this.processCurrentConditions(data),
          forecast: this.processForecast(data),
        }
      },
      `weather-forecast-${this.stationId}`,
      { cacheExpiry: 30 * 60 * 1000 } // 30 minutes for forecast data
    )
  }

  processCurrentConditions(data) {
    if (!data.current_conditions) {
      throw new Error('Invalid current conditions data structure')
    }

    return data.current_conditions
  }

  // Process forecast data
  processForecast(data) {
    if (!data.forecast || !data.forecast.daily) {
      throw new Error('Invalid forecast data structure')
    }

    return data.forecast.daily.map(day => ({
      date: day.day_start_local,
      description: day.conditions,
      highTemp: day.air_temp_high,
      lowTemp: day.air_temp_low,
      precipitation: day.precip_probability, // Convert to percentage
      humidity: day.relative_humidity,
      windSpeed: day.wind_avg,
      windDirection: day.wind_direction,
      pressure: day.barometric_pressure,
    }))
  }

  // Disconnect and cleanup
  disconnect() {
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }
    this.isConnected = false
    this.reconnectAttempts = 0
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
    }
  }

  // Check if WebSocket is ready and has received data
  isWebSocketReady() {
    return (
      this.isConnected &&
      this.websocket &&
      this.websocket.readyState === WebSocket.OPEN
    )
  }

  // Wait for WebSocket to be ready (with timeout)
  async waitForWebSocketReady(timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (this.isWebSocketReady()) {
        resolve()
        return
      }

      const checkInterval = setInterval(() => {
        if (this.isWebSocketReady()) {
          clearInterval(checkInterval)
          clearTimeout(timeoutId)
          resolve()
        }
      }, 100)

      const timeoutId = setTimeout(() => {
        clearInterval(checkInterval)
        reject(new Error('WebSocket ready timeout'))
      }, timeout)
    })
  }
}

// Export singleton instance
export const currentWeatherApiService = new CurrentWeatherApiService()
