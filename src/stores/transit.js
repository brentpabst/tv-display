import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { createLogger } from '../utils/logger'
import { appConfig } from '../config'
import { transitApiService } from '../services/transitApi'

const logger = createLogger('TransitStore')

export const useTransitStore = defineStore(
  'transit',
  () => {
    logger.info('🚀 Transit Store created and initialized')

    // State
    const transitData = ref([])
    const isLoading = ref(false)
    const error = ref(null)

    // Local offline state (updated via events)
    const isOffline = ref(false)

    const hasTransitData = computed(
      () => Object.keys(transitData.value).length > 0
    )

    const setLoading = value => {
      isLoading.value = value
    }

    const setError = message => {
      error.value = message
    }

    const clearError = () => {
      error.value = null
    }

    // Update transit times for multiple routes
    const updateTransitTimes = async (origin, destinations) => {
      setLoading(true)
      clearError()

      try {
        // Use provided parameters or fall back to config values
        const originToUse = origin || appConfig.transitTimes.origin
        const destinationsToUse =
          destinations || appConfig.transitTimes.destinations

        // Validate parameters
        if (!originToUse) {
          throw new Error('Origin address is required')
        }
        if (
          !destinationsToUse ||
          !Array.isArray(destinationsToUse) ||
          destinationsToUse.length === 0
        ) {
          throw new Error(
            'Destinations array is required and must not be empty'
          )
        }

        logger.info(
          `Fetching transit times from ${originToUse} to ${destinationsToUse.length} destinations`
        )

        // Log destination details for debugging
        destinationsToUse.forEach((dest, index) => {
          logger.info(
            `Destination ${index + 1}: ${dest.name} (${dest.id}) - ${dest.address}`
          )
        })

        const routes = await transitApiService.getMultipleRoutes(
          originToUse,
          destinationsToUse
        )

        if (routes && Object.keys(routes).length > 0) {
          transitData.value = routes
          logger.info(`Loaded ${Object.keys(routes).length} transit routes`)

          // Log the actual routes that were loaded
          Object.keys(routes).forEach(routeId => {
            const route = routes[routeId]
            if (route.hasError) {
              logger.warn(
                `Route ${routeId} (${route.name}) failed: ${route.error}`
              )
            } else {
              logger.info(
                `Route ${routeId} (${route.name}) loaded: ${route.duration} (${route.distance})`
              )
            }
          })
        } else {
          logger.warn('No transit routes found')
          transitData.value = []
        }
      } catch (err) {
        const errorMessage = `Failed to get transit data: ${err.message}`
        setError(errorMessage)
        logger.error(errorMessage, err)
      } finally {
        setLoading(false)
      }
    }

    let refreshInterval = null

    const startPeriodicRefresh = () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }

      // Get origin and destinations from config
      const origin = appConfig.transitTimes.origin
      const destinations = appConfig.transitTimes.destinations

      refreshInterval = setInterval(
        () => updateTransitTimes(origin, destinations),
        appConfig.transitTimes.refreshInterval
      )
    }

    const stopPeriodicRefresh = () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
        refreshInterval = null
      }
    }

    // Listen for offline state changes
    const handleOfflineStateChange = event => {
      logger.info(
        '📡 Transit Store received offline state change:',
        event.detail
      )
      isOffline.value = event.detail.isOffline
      if (event.detail.isOffline) {
        logger.info(
          '🔄 Transit Store: Offline state detected, stopping refresh'
        )
        stopPeriodicRefresh()
      } else {
        logger.info(
          '🔄 Transit Store: Online state detected, restarting refresh'
        )
        startPeriodicRefresh()
      }
    }

    // Listen for network recovery events
    const handleNetworkRecovery = () => {
      logger.info(
        '🔄 Transit Store: Network recovery started, attempting to refresh transit data'
      )
      // Refresh transit data when network recovers
      const origin = appConfig.transitTimes.origin
      const destinations = appConfig.transitTimes.destinations
      updateTransitTimes(origin, destinations)
    }

    // Initialize transit data
    const initializeTransitData = async () => {
      logger.info('🚀 Transit Store: Initializing transit data')
      try {
        await updateTransitTimes() // This will use config defaults
      } catch (error) {
        logger.warn('Failed to initialize transit data:', error.message)
      }
    }

    // Setup event listeners
    const setupEventListeners = () => {
      logger.info('📡 Transit Store: Setting up event listeners')
      window.addEventListener('offline-state-changed', handleOfflineStateChange)
      window.addEventListener('network-recovery-started', handleNetworkRecovery)
      logger.info('📡 Transit Store: Event listeners set up successfully')
    }

    const cleanupEventListeners = () => {
      logger.info('📡 Transit Store: Cleaning up event listeners')
      window.removeEventListener(
        'offline-state-changed',
        handleOfflineStateChange
      )
      window.removeEventListener(
        'network-recovery-started',
        handleNetworkRecovery
      )
      stopPeriodicRefresh()
      logger.info('📡 Transit Store: Event listeners cleaned up successfully')
    }

    // Set up event listeners immediately
    logger.info('📡 Transit Store: About to set up event listeners')
    setupEventListeners()
    logger.info('📡 Transit Store: Event listeners setup completed')

    // Initialize transit data
    initializeTransitData()

    return {
      transitData,
      isLoading,
      error,
      isOffline, // Expose the local offline state
      hasTransitData,
      updateTransitTimes,
      startPeriodicRefresh,
      stopPeriodicRefresh,
      cleanupEventListeners,
    }
  },
  {
    persist: {
      key: 'transit-store',
      storage: localStorage,
      paths: ['transitData'],
    },
  }
)
