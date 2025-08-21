import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { createLogger } from '../utils/logger'
import { appConfig } from '../config'
import { weatherAlertsApiService } from '../services/weatherAlertsApi'

const logger = createLogger('WeatherAlertsStore')

export const useWeatherAlertsStore = defineStore(
  'weatherAlerts',
  () => {
    const logger = createLogger('WeatherAlertsStore')

    logger.info('🚀 Weather Alerts Store created and initialized')

    // State
    const alerts = ref([])
    const currentAlertIndex = ref(0)
    const isLoading = ref(false)
    const error = ref(null)
    const lastFetched = ref(null)
    const fetchPromise = ref(null)
    const refreshInterval = ref(null)
    const rotationInterval = ref(null)

    // Local offline state (updated via events)
    const isOffline = ref(false)

    // Getters
    const hasAlerts = computed(() => alerts.value.length > 0)
    const currentAlert = computed(() => {
      if (alerts.value.length === 0) return null
      return alerts.value[currentAlertIndex.value]
    })
    const alertCount = computed(() => alerts.value.length)

    // Actions
    const setLoading = value => {
      isLoading.value = value
      logger.debug(`isLoading set to: ${value}`)
    }

    const setError = message => {
      error.value = message
      logger.error(`Error set to: ${message}`)
    }

    const clearError = () => {
      error.value = null
      logger.debug('Error cleared')
    }

    // Load sample alerts (for testing/offline fallback)
    const loadSampleAlerts = async () => {
      if (fetchPromise.value) {
        logger.debug('Sample alerts fetch already in progress, skipping')
        return
      }

      setLoading(true)
      clearError()

      try {
        fetchPromise.value = weatherAlertsApiService.loadSampleAlerts()
        const fetchedAlerts = await fetchPromise.value

        if (fetchedAlerts && fetchedAlerts.length > 0) {
          alerts.value = fetchedAlerts
          lastFetched.value = new Date()
          logger.info(`Loaded ${fetchedAlerts.length} sample alerts`)
        } else {
          logger.warn('No sample alerts found')
          alerts.value = []
        }
      } catch (err) {
        const errorMessage = `Failed to load sample alerts: ${err.message}`
        setError(errorMessage)
        logger.error(errorMessage, err)
      } finally {
        setLoading(false)
        fetchPromise.value = null
      }
    }

    // Fetch alerts from API
    const fetchAlerts = async () => {
      if (fetchPromise.value) {
        logger.debug('Alerts fetch already in progress, skipping')
        return
      }

      setLoading(true)
      clearError()

      try {
        // Clean up any expired alerts before fetching new ones
        removeExpiredAlerts()
        fetchPromise.value = weatherAlertsApiService.fetchAlerts()
        const fetchedAlerts = await fetchPromise.value

        if (fetchedAlerts && fetchedAlerts.length > 0) {
          alerts.value = fetchedAlerts
          // Ensure we do not keep any expired items
          removeExpiredAlerts()
          lastFetched.value = new Date()
          logger.info(`Loaded ${fetchedAlerts.length} alerts from API`)
          // Reset rotation to start at the newest data
          currentAlertIndex.value = 0
        } else {
          logger.warn('No alerts found in API response')
          alerts.value = []
          currentAlertIndex.value = 0
        }
      } catch (err) {
        const errorMessage = `Failed to fetch alerts: ${err.message}`
        setError(errorMessage)
        logger.error(errorMessage, err)
      } finally {
        setLoading(false)
        fetchPromise.value = null
      }
    }

    const rotateAlerts = () => {
      if (alerts.value.length > 1) {
        currentAlertIndex.value =
          (currentAlertIndex.value + 1) % alerts.value.length
        logger.debug(
          `Rotated to alert ${currentAlertIndex.value + 1} of ${alerts.value.length}`
        )
      }
    }

    const resetRotation = () => {
      currentAlertIndex.value = 0
    }

    const clearAlerts = () => {
      alerts.value = []
      currentAlertIndex.value = 0
      error.value = null
    }

    const isAlertExpired = alert => {
      if (!alert || !alert.expires) return false
      const expiresAt = new Date(alert.expires).getTime()
      return Number.isFinite(expiresAt) && expiresAt <= Date.now()
    }

    const removeExpiredAlerts = () => {
      if (!alerts.value || alerts.value.length === 0) return
      const before = alerts.value.length
      alerts.value = alerts.value.filter(a => !isAlertExpired(a))
      if (alerts.value.length !== before) {
        logger.info(
          `Removed ${before - alerts.value.length} expired alerts (remaining: ${alerts.value.length})`
        )
      }
      // Normalize index
      if (currentAlertIndex.value >= alerts.value.length) {
        currentAlertIndex.value = 0
      }
    }

    // Start periodic refresh
    const startPeriodicRefresh = () => {
      // Stop any existing interval
      stopPeriodicRefresh()

      const fetchInterval = appConfig.weatherAlerts.refreshInterval
      const rotationIntervalMs = appConfig.weatherAlerts.rotationInterval

      logger.info(
        `Starting weather alerts refresh every ${fetchInterval / 1000} seconds`
      )

      refreshInterval.value = setInterval(() => {
        logger.debug('Periodic weather alerts refresh triggered')
        fetchAlerts()
      }, fetchInterval)

      // Start rotation interval
      rotationInterval.value = setInterval(() => {
        if (alerts.value.length > 1) {
          currentAlertIndex.value =
            (currentAlertIndex.value + 1) % alerts.value.length
          logger.debug(
            `Rotated to alert ${currentAlertIndex.value + 1}/${alerts.value.length}`
          )
        }
      }, rotationIntervalMs)
    }

    // Stop periodic refresh
    const stopPeriodicRefresh = () => {
      if (refreshInterval.value) {
        clearInterval(refreshInterval.value)
        refreshInterval.value = null
        logger.debug('Stopped periodic weather alerts fetch')
      }

      if (rotationInterval.value) {
        clearInterval(rotationInterval.value)
        rotationInterval.value = null
        logger.debug('Stopped periodic alert rotation')
      }
    }

    // Get refresh status
    const getRefreshStatus = () => {
      return {
        isRefreshing: !!refreshInterval.value,
        isRotating: !!rotationInterval.value,
        lastFetched: lastFetched.value,
        nextFetch: lastFetched.value
          ? new Date(
              lastFetched.value.getTime() +
                appConfig.weatherAlerts.refreshInterval
            )
          : null,
        fetchInterval: appConfig.weatherAlerts.refreshInterval,
        rotationInterval: appConfig.weatherAlerts.rotationInterval,
      }
    }

    // Listen for offline state changes
    const handleOfflineStateChange = event => {
      logger.info(
        '📡 Weather Alerts Store received offline state change:',
        event.detail
      )
      isOffline.value = event.detail.isOffline
      if (isOffline.value) {
        logger.info(
          '🔄 Weather Alerts Store: Offline state detected, stopping refresh'
        )
        stopPeriodicRefresh()
      } else {
        logger.info(
          '🔄 Weather Alerts Store: Online state detected, restarting refresh'
        )
        startPeriodicRefresh()
      }
    }

    // Listen for network recovery events
    const handleNetworkRecovery = () => {
      logger.info(
        '🔄 Weather Alerts Store: Network recovery started, attempting to refresh alerts'
      )
      fetchAlerts()
    }

    // Setup event listeners
    const setupEventListeners = () => {
      logger.info('📡 Weather Alerts Store: Setting up event listeners')
      window.addEventListener('offline-state-changed', handleOfflineStateChange)
      window.addEventListener('network-recovery-started', handleNetworkRecovery)
      logger.info(
        '📡 Weather Alerts Store: Event listeners set up successfully'
      )
    }

    const cleanupEventListeners = () => {
      logger.info('📡 Weather Alerts Store: Cleaning up event listeners')
      window.removeEventListener(
        'offline-state-changed',
        handleOfflineStateChange
      )
      window.removeEventListener(
        'network-recovery-started',
        handleNetworkRecovery
      )
      stopPeriodicRefresh()
      logger.info(
        '📡 Weather Alerts Store: Event listeners cleaned up successfully'
      )
    }

    // Set up event listeners immediately
    logger.info('📡 Weather Alerts Store: About to set up event listeners')
    setupEventListeners()
    logger.info('📡 Weather Alerts Store: Event listeners setup completed')

    // Clean up any expired alerts that may have been loaded from persistence
    removeExpiredAlerts()
    if (alerts.value.length === 0) {
      logger.info('No active alerts after initialization cleanup')
    }

    return {
      // State
      alerts,
      currentAlertIndex,
      isLoading,
      error,
      lastFetched,
      isOffline, // Expose the local offline state

      // Getters
      hasAlerts,
      currentAlert,
      alertCount,

      // Actions
      setLoading,
      setError,
      clearError,
      loadSampleAlerts,
      fetchAlerts,
      startPeriodicRefresh,
      stopPeriodicRefresh,
      cleanupEventListeners, // Export cleanup function
    }
  },
  {
    persist: {
      key: 'weather-alerts-store',
      storage: localStorage,
      paths: ['alerts', 'currentAlertIndex', 'lastFetched'],
    },
  }
)
