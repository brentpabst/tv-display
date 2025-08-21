import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { createLogger } from '../utils/logger'

const logger = createLogger('OfflineStateStore')

export const useOfflineStateStore = defineStore(
  'offlineState',
  () => {
    logger.info('🚀 OfflineStateStore created and initialized')

    // State
    const isOffline = ref(false)
    const isRecovering = ref(false)
    const lastOnlineTime = ref(Date.now())
    const lastUpdateTime = ref(Date.now())
    const networkErrors = ref(0)
    const cachedData = ref(new Map())
    // Ensure cachedData is always a Map (handles persistence restoration)
    const ensureCachedDataIsMap = () => {
      if (!(cachedData.value instanceof Map)) {
        if (cachedData.value && typeof cachedData.value === 'object') {
          // Convert plain object back to Map
          const newMap = new Map(Object.entries(cachedData.value))
          cachedData.value = newMap
          if (Object.keys(cachedData.value).length > 0) {
            logger.info('Converted persisted cached data from object to Map')
          }
        } else {
          cachedData.value = new Map()
        }
      }
    }

    // Call this function to ensure Map integrity
    ensureCachedDataIsMap()

    // Watch for changes to cachedData to ensure it's always a Map
    watch(
      cachedData,
      newValue => {
        if (!(newValue instanceof Map)) {
          logger.debug('cachedData changed to non-Map type, converting back')
          ensureCachedDataIsMap()
        }
      },
      { deep: true }
    )

    // Getter that always ensures Map integrity
    const getCachedDataMap = () => {
      ensureCachedDataIsMap()
      return cachedData.value
    }

    // Computed
    const hasStaleData = computed(() => {
      const staleThreshold = 15 * 60 * 1000 // 15 minutes
      return Date.now() - lastUpdateTime.value > staleThreshold
    })

    const shouldRetry = computed(() => networkErrors.value < 3)

    const statusMessage = computed(() => {
      if (isOffline.value) return 'Offline - Using cached data'
      if (hasStaleData.value)
        return 'Limited connectivity - Data may be outdated'
      return 'Online - All systems operational'
    })

    // Actions
    const setOffline = () => {
      logger.info('🔄 Setting offline state - stopping all refresh intervals')
      isOffline.value = true
      isRecovering.value = false
      // Stop all refresh intervals
      stopAllRefreshIntervals()
    }

    const setOnline = () => {
      logger.info('🔄 Setting online state - triggering network recovery')
      isOffline.value = false
      lastOnlineTime.value = Date.now()

      // Notify listeners that we are now online
      logger.info(
        '📡 Dispatching offline-state-changed event to all stores (online)'
      )
      const event = new CustomEvent('offline-state-changed', {
        detail: { isOffline: false },
      })
      window.dispatchEvent(event)

      // Trigger recovery and restart intervals
      triggerNetworkRecovery()
    }

    const triggerNetworkRecovery = async () => {
      if (isRecovering.value) {
        logger.debug('Recovery already in progress')
        return
      }

      logger.info('Starting network recovery')
      isRecovering.value = true

      try {
        // Attempt to refresh all stores
        await refreshAllStores()
        lastUpdateTime.value = Date.now()
        networkErrors.value = 0
        logger.info('Network recovery completed successfully')
      } catch (error) {
        logger.error('Network recovery failed:', error)
        // If recovery fails, we might be back offline
        setOffline()
      } finally {
        isRecovering.value = false
      }
    }

    const stopAllRefreshIntervals = () => {
      logger.info('📡 Dispatching offline-state-changed event to all stores')
      // This will be implemented as we enhance each store
      // For now, we'll emit an event that stores can listen to
      const event = new CustomEvent('offline-state-changed', {
        detail: { isOffline: true },
      })
      logger.info('📡 Event details:', event.detail)
      window.dispatchEvent(event)
      logger.info('📡 Event dispatched successfully')
    }

    const refreshAllStores = async () => {
      logger.info('📡 Dispatching network-recovery-started event to all stores')
      // This will be implemented as we enhance each store
      // For now, we'll emit an event that stores can listen to
      const event = new CustomEvent('network-recovery-started')
      logger.info('📡 Dispatching network recovery event')
      window.dispatchEvent(event)
      logger.info('📡 Network recovery event dispatched successfully')
    }

    const cacheData = (key, data, timestamp = Date.now()) => {
      const map = getCachedDataMap()
      logger.debug('Caching data:', { key, timestamp })
      map.set(key, { data, timestamp, isStale: false })
      // Ensure reactivity on Map updates
      cachedData.value = new Map(map)

      // Update the last update time when new data is cached
      lastUpdateTime.value = Math.max(lastUpdateTime.value, timestamp)
    }

    const getCachedData = key => {
      const map = getCachedDataMap()
      const cached = map.get(key)
      if (cached && !cached.isStale) {
        logger.debug('Retrieved cached data:', key)
        return cached.data
      }
      logger.debug('No valid cached data found for:', key)
      return null
    }

    const markDataStale = key => {
      const map = getCachedDataMap()
      const cached = map.get(key)
      if (cached) {
        cached.isStale = true
        logger.debug('Marked data as stale:', key)
        cachedData.value = new Map(map)
      }
    }

    const clearCache = () => {
      const map = getCachedDataMap()
      logger.info('Clearing all cached data')
      map.clear()
      cachedData.value = new Map()
    }

    // Get cached data count for UI display
    const getCachedDataCount = () => {
      const map = getCachedDataMap()
      return Array.from(map.values()).filter(data => !data.isStale).length
    }

    // Get cached data entries for UI display
    const getCachedDataEntries = () => {
      const map = getCachedDataMap()
      const entries = {}
      for (const [key, data] of map.entries()) {
        if (!data.isStale) {
          entries[key] = { timestamp: data.timestamp }
        }
      }
      return entries
    }

    const incrementNetworkErrors = () => {
      networkErrors.value++
      logger.warn('Network error count increased:', networkErrors.value)

      if (networkErrors.value >= 3) {
        logger.warn('Network error threshold reached, going offline')
        setOffline()
      }
    }

    const resetNetworkErrors = () => {
      networkErrors.value = 0
      logger.debug('Network error count reset')
    }

    return {
      // State
      isOffline,
      isRecovering,
      lastOnlineTime,
      lastUpdateTime,
      networkErrors,
      cachedData,

      // Computed
      hasStaleData,
      shouldRetry,
      statusMessage,

      // Actions
      setOffline,
      setOnline,
      triggerNetworkRecovery,
      stopAllRefreshIntervals,
      refreshAllStores,
      cacheData,
      getCachedData,
      markDataStale,
      clearCache,
      getCachedDataCount,
      getCachedDataEntries,
      incrementNetworkErrors,
      resetNetworkErrors,
    }
  },
  {
    persist: {
      key: 'offline-state',
      storage: localStorage,
      paths: [
        'lastOnlineTime',
        'lastUpdateTime',
        'networkErrors',
        'cachedData',
      ],
    },
  }
)
