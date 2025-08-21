import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { format } from 'date-fns'
import SunCalc from 'suncalc'
import { createLogger } from '../utils/logger'
import { appConfig } from '../config'
import { currentWeatherApiService } from '../services/currentWeatherApi'
import { getLocationConfig, getWeatherflowConfig } from '../config'
import { getUnitSymbol } from '../utils/simplifiedUtils'

const logger = createLogger('CurrentWeatherStore')

export const useCurrentWeatherStore = defineStore(
  'currentWeather',
  () => {
    // State
    const currentWeather = ref(null)
    const currentConditions = ref([])
    const forecast = ref([])
    const lightningStrikes = ref([])
    const isLoading = ref(false)
    const error = ref(null)
    const connectionStatus = ref({
      isConnected: false,
      reconnectAttempts: 0,
    })
    const deviceId = ref(null)
    const accessToken = ref(null)

    // Getters
    const hasWeatherData = computed(() => currentWeather.value !== null)
    const hasForecast = computed(() => forecast.value.length > 0)

    const showLightningAlert = computed(() => {
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000
      return lightningStrikes.value.some(
        strike => strike.timestamp * 1000 > thirtyMinutesAgo
      )
    })
    const upcomingSunEvent = computed(() => {
      const now = new Date()
      const times = sunTimes.value

      logger.debug('Computing upcomingSunEvent:', { now, times })

      // Check if sunrise is next
      if (now < times.sunrise) {
        const result = {
          type: 'Sunrise',
          time: format(times.sunrise, 'h:mm a'),
          icon: '🌅',
        }
        logger.debug('Next event: Sunrise', result)
        return result
      }
      // Check if sunset is next
      else if (now < times.sunset) {
        const result = {
          type: 'Sunset',
          time: format(times.sunset, 'h:mm a'),
          icon: '🌇',
        }
        logger.debug('Next event: Sunset', result)
        return result
      }
      // If past sunset, next event is tomorrow's sunrise
      else {
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        const tomorrowTimes = SunCalc.getTimes(
          tomorrow,
          getLocationConfig().latitude,
          getLocationConfig().longitude
        )
        const result = {
          type: 'Sunrise',
          time: format(tomorrowTimes.sunrise, 'h:mm a'),
          icon: '🌅',
        }
        logger.debug('Next event: Tomorrow Sunrise', result)
        return result
      }
    })

    // Suncalc computed properties
    const sunTimes = computed(() => {
      const location = getLocationConfig()
      const now = new Date()
      return SunCalc.getTimes(now, location.latitude, location.longitude)
    })

    // Actions
    const initializeWeather = async (
      deviceIdParam,
      stationId,
      accessTokenParam,
      lat = null,
      lon = null
    ) => {
      try {
        isLoading.value = true
        error.value = null

        // Store credentials for later use
        deviceId.value = deviceIdParam
        accessToken.value = accessTokenParam

        logger.info('Initializing weather system...')

        const location = getLocationConfig()
        const config = getWeatherflowConfig()

        // Use provided coordinates or fall back to config
        const latitude = lat || location.latitude
        const longitude = lon || location.longitude

        try {
          logger.info('Initializing weather with:', {
            deviceId: deviceIdParam,
            stationId,
            accessToken: accessTokenParam,
            latitude,
            longitude,
          })

          // Set up event listener for real-time data
          window.addEventListener('weatherflow-data', handleWeatherData)
          window.addEventListener(
            'weatherflow-lightning',
            handleLightningStrike
          )
          window.addEventListener(
            'weatherflow-precipitation',
            handlePrecipitationStart
          )

          // Initialize API service first (sets stationId and accessToken)
          await currentWeatherApiService.initialize(
            deviceIdParam,
            stationId,
            accessTokenParam
          )

          // Get initial forecast data (now stationId and accessToken are set)
          await fetchForecast()

          // Initialize last forecast date
          lastForecastDate = new Date().toDateString()

          // Wait a bit for WebSocket to potentially receive initial data
          try {
            await currentWeatherApiService.waitForWebSocketReady(3000) // Wait up to 3 seconds
            logger.info('WebSocket is ready and may have received initial data')
          } catch (timeoutError) {
            logger.info(
              'WebSocket ready timeout, proceeding with REST fallback'
            )
          }

          // Only fetch current weather via REST if we don't have data yet
          if (deviceIdParam && !currentWeather.value) {
            logger.info(
              'No weather data received via WebSocket, fetching via REST API'
            )
            await fetchCurrentWeather(deviceIdParam, accessTokenParam)
          }

          logger.info('Weather system initialized')
        } catch (err) {
          logger.error('Error initializing weather:', err)
          error.value = err.message

          // Start periodic refresh as fallback if WebSocket fails
          if (deviceIdParam) {
            logger.info('Starting periodic refresh as fallback')
            startPeriodicRefresh(deviceIdParam, accessTokenParam)
          }
        } finally {
          isLoading.value = false
        }
      } catch (err) {
        logger.error('Error initializing weather:', err)
        error.value = err.message

        // Start periodic refresh as fallback if WebSocket fails
        if (deviceIdParam) {
          logger.info('Starting periodic refresh as fallback')
          startPeriodicRefresh(deviceIdParam, accessTokenParam)
        }
      } finally {
        isLoading.value = false
      }
    }

    const handleWeatherData = event => {
      const weatherData = event.detail
      currentWeather.value = weatherData

      // Update connection status
      connectionStatus.value = currentWeatherApiService.getConnectionStatus()

      logger.info('Weather data updated:', weatherData)
    }

    const handleLightningStrike = event => {
      const strikeData = event.detail
      logger.info('Lightning strike detected:', strikeData)

      // Add strike to tracking array
      lightningStrikes.value.push(strikeData)

      // Clean up strikes older than 30 minutes
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000
      lightningStrikes.value = lightningStrikes.value.filter(
        strike => strike.timestamp * 1000 > thirtyMinutesAgo
      )

      // You can add lightning strike handling logic here
      // For example, updating a lightning strike counter or triggering alerts
      logger.info('⚡ Lightning strike detected:', {
        distance: strikeData.distance
          ? `${strikeData.distance} ${getUnitSymbol('distance')} away`
          : 'Unknown distance',
        energy: strikeData.energy,
        timestamp: new Date(strikeData.timestamp * 1000).toLocaleTimeString(),
      })
    }

    const handlePrecipitationStart = event => {
      const precipData = event.detail
      logger.info('Precipitation start detected:', precipData)

      // You can add precipitation start handling logic here
      // For example, triggering rain alerts or updating precipitation status
      logger.info(
        '🌧️ Precipitation started at:',
        new Date(precipData.timestamp * 1000).toLocaleTimeString()
      )
    }

    const fetchCurrentWeather = async (deviceId, accessToken) => {
      try {
        const weatherData = await currentWeatherApiService.getCurrentWeather(
          deviceId,
          accessToken
        )
        currentWeather.value = weatherData
      } catch (err) {
        logger.error('Error fetching current weather:', err)
        error.value = err.message
      }
    }

    const fetchForecast = async () => {
      try {
        logger.info('Fetching forecast...')
        const forecastData = await currentWeatherApiService.getForecast()
        currentConditions.value = forecastData.currentConditions
        forecast.value = forecastData.forecast
        logger.info('Forecast data loaded:', forecastData.length, 'days')
      } catch (err) {
        logger.error('Error fetching forecast:', err)
        error.value = err.message
      }
    }

    const disconnect = () => {
      window.removeEventListener('weatherflow-data', handleWeatherData)
      window.removeEventListener('weatherflow-lightning', handleLightningStrike)
      window.removeEventListener(
        'weatherflow-precipitation',
        handlePrecipitationStart
      )
      currentWeatherApiService.disconnect()
      stopPeriodicRefresh()
      connectionStatus.value = { isConnected: false, reconnectAttempts: 0 }
    }

    // Set up periodic refresh for REST API fallback
    let refreshInterval = null
    let forecastInterval = null
    let lastForecastDate = null

    const startPeriodicRefresh = (deviceId, accessToken) => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
      if (forecastInterval) {
        clearInterval(forecastInterval)
      }

      const config = getWeatherflowConfig()

      // Refresh current weather based on config interval if WebSocket is not connected
      refreshInterval = setInterval(async () => {
        if (!connectionStatus.value.isConnected && deviceId) {
          logger.info('Refreshing weather data via REST API')
          await fetchCurrentWeather(deviceId, accessToken)
        }
      }, config.intervals.currentWeatherRefresh)

      // Refresh forecast every 30 minutes and check for day change
      forecastInterval = setInterval(async () => {
        const currentDate = new Date().toDateString()

        // Always refresh forecast every 30 minutes
        logger.info('Refreshing forecast data')
        await fetchForecast()

        // Check if it's a new day and refresh if needed
        if (lastForecastDate && lastForecastDate !== currentDate) {
          logger.info('New day detected, refreshing forecast')
          await fetchForecast()
        }

        lastForecastDate = currentDate
      }, config.intervals.forecastRefresh)
    }

    const stopPeriodicRefresh = () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
        refreshInterval = null
      }
      if (forecastInterval) {
        clearInterval(forecastInterval)
        forecastInterval = null
      }
    }

    // Get refresh status
    const getRefreshStatus = () => {
      const config = getWeatherflowConfig()
      return {
        isRefreshing: !!refreshInterval || !!forecastInterval,
        lastForecastDate: lastForecastDate,
        currentWeatherInterval: config.intervals.currentWeatherRefresh,
        forecastInterval: config.intervals.forecastRefresh,
      }
    }

    // Listen for offline state changes
    const handleOfflineStateChange = event => {
      logger.info(
        '📡 Weather Store received offline state change:',
        event.detail
      )
      if (event.detail.isOffline) {
        logger.info(
          '🔄 Weather Store: Offline state detected, stopping refresh'
        )
        stopPeriodicRefresh()
      } else {
        logger.info(
          '🔄 Weather Store: Online state detected, restarting refresh'
        )
        startPeriodicRefresh()
      }
    }

    // Listen for network recovery events
    const handleNetworkRecovery = () => {
      logger.info(
        '🔄 Weather Store: Network recovery started, attempting to refresh weather data'
      )
      // Refresh weather data when network recovers
      if (deviceId.value && accessToken.value) {
        logger.info(
          'Weather Store: Using stored credentials for network recovery'
        )
        fetchCurrentWeather(deviceId.value, accessToken.value)
      } else {
        logger.warn(
          'Weather Store: No credentials available for network recovery - deviceId:',
          deviceId.value,
          'accessToken:',
          !!accessToken.value
        )
        // Try to reinitialize if we have location data
        const location = getLocationConfig()
        if (location.latitude && location.longitude) {
          logger.info(
            'Weather Store: Attempting to reinitialize with location data'
          )
          // Note: We can't reinitialize without credentials, so just log the attempt
        }
      }
      if (forecast.value.length > 0) {
        fetchForecast()
      }
    }

    // Setup event listeners
    const setupEventListeners = () => {
      window.addEventListener('offline-state-changed', handleOfflineStateChange)
      window.addEventListener('network-recovery-started', handleNetworkRecovery)
    }

    const cleanupEventListeners = () => {
      window.removeEventListener(
        'offline-state-changed',
        handleOfflineStateChange
      )
      window.removeEventListener(
        'network-recovery-started',
        handleNetworkRecovery
      )
      stopPeriodicRefresh()
    }

    // Set up event listeners immediately
    setupEventListeners()

    return {
      // State
      currentWeather,
      currentConditions,
      forecast,
      isLoading,
      error,
      connectionStatus,
      lightningStrikes,

      // Getters
      hasWeatherData,
      hasForecast,
      showLightningAlert,
      upcomingSunEvent,

      // Actions
      initializeWeather,
      disconnect,
      startPeriodicRefresh,
      stopPeriodicRefresh,
      getRefreshStatus,
      cleanupEventListeners, // Export cleanup function
    }
  },
  {
    persist: {
      key: 'weather-store',
      storage: localStorage,
      paths: [
        'currentWeather',
        'currentConditions',
        'forecast',
        'lightningStrikes',
        'deviceId',
        'accessToken',
      ],
    },
  }
)
