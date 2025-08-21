import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { addMinutes } from 'date-fns'
import { createLogger } from '../utils/logger'
import { appConfig } from '../config'
import { nhlApiService } from '../services/nhlApi'

const logger = createLogger('NhlStore')

export const useNhlStore = defineStore(
  'nhl',
  () => {
    logger.info('🚀 NHL Store created and initialized')

    // State
    const schedule = ref([])
    const event = ref(null)
    const last_update = ref(null)
    const isLoading = ref(false)
    const error = ref(null)

    // Local offline state (updated via events)
    const isOffline = ref(false)

    // Getters - simplified and focused
    const nextGame = computed(() => schedule.value[1] || null)

    const currentPeriod = computed(() => {
      if (!event.value?.periodDescriptor) return ''

      const { number, periodType } = event.value.periodDescriptor
      const isIntermission = event.value.clock?.inIntermission

      if (periodType === 'OT') return 'Overtime'
      if (periodType === 'SO') return 'Shootout'

      if (number <= 3) {
        const suffixes = ['th', 'st', 'nd', 'rd']
        const suffix = suffixes[number] || 'th'
        return `${number}${suffix}${isIntermission ? ' Intermission' : ' Period'}`
      }

      const overtimeNumber = number - 3
      return `${overtimeNumber}${overtimeNumber === 1 ? 'st' : 'th'} Overtime`
    })

    // Helper getters for better alignment with other stores
    const hasEvent = computed(() => event.value !== null)
    const hasSchedule = computed(() => schedule.value.length > 0)
    const isGameActive = computed(() =>
      ['LIVE', 'CRIT', 'PRE'].includes(event.value?.gameState)
    )
    const isGameFinished = computed(() =>
      ['FINAL', 'OFF'].includes(event.value?.gameState)
    )

    const refreshInterval = computed(() => {
      if (!event.value || !event.value.startTimeUTC) {
        logger.debug('No Event Scheduled')
        return appConfig.nhl.intervals.postGame
      }

      // Convert UTC string to Date object and subtract 15 minutes
      const eventTime = addMinutes(new Date(event.value.startTimeUTC), -15)
      const now = new Date()

      if (
        event.value.gameState == 'FUT' &&
        now.getTime() >= eventTime.getTime()
      ) {
        logger.debug('Event Scheduled & Starts Soon')
        return appConfig.nhl.intervals.preGameClose
      } else if (event.value.gameState == 'FUT') {
        logger.debug('Event Scheduled')
        return appConfig.nhl.intervals.preGame
      } else if (
        event.value.gameState == 'LIVE' ||
        event.value.gameState == 'CRIT'
      ) {
        logger.debug('Event in Progress')
        return appConfig.nhl.intervals.inGame
      } else if (
        event.value.gameState == 'OFF' ||
        event.value.gameState == 'FINAL'
      ) {
        logger.debug('Event Complete')
        return appConfig.nhl.intervals.postGame
      } else return appConfig.nhl.intervals.postGame
    })

    // Actions - organized and aligned with other stores
    const setLoading = loading => {
      isLoading.value = loading
    }

    const setError = errorMessage => {
      error.value = errorMessage
    }

    const clearError = () => {
      error.value = null
    }

    const getData = async () => {
      setLoading(true)
      clearError()

      try {
        // Get Carolina schedule
        const games = await nhlApiService.getCarolinaSchedule()
        schedule.value = games

        if (games.length > 0) {
          const currentGameId = games[0].id

          // Get current game details
          const gameData = await nhlApiService.getGameDetails(currentGameId)
          event.value = gameData
          last_update.value = new Date()
        }
      } catch (err) {
        const errorMessage = `Failed to get NHL data: ${err.message}`
        setError(errorMessage)
        logger.error(errorMessage, err)
      } finally {
        setLoading(false)
      }
    }

    let refreshIntervalId = null

    const startPeriodicRefresh = () => {
      // Don't start refresh if offline
      if (isOffline.value) {
        logger.info('Skipping refresh start - offline state')
        return
      }

      if (refreshIntervalId) {
        clearInterval(refreshIntervalId)
      }

      // Initial data fetch
      getData()

      // Set up dynamic refresh based on game state
      const updateRefreshInterval = () => {
        if (refreshIntervalId) {
          clearInterval(refreshIntervalId)
        }

        const interval = refreshInterval.value
        refreshIntervalId = setInterval(() => {
          // Don't refresh if offline
          if (isOffline.value) {
            logger.debug('Skipping refresh - offline state')
            return
          }

          getData()
          // Update interval after each fetch in case game state changed
          updateRefreshInterval()
        }, interval)
      }

      updateRefreshInterval()
    }

    const stopPeriodicRefresh = () => {
      if (refreshIntervalId) {
        clearInterval(refreshIntervalId)
        refreshIntervalId = null
      }
    }

    // Listen for offline state changes
    const handleOfflineStateChange = event => {
      logger.info('📡 NHL Store received offline state change:', event.detail)
      isOffline.value = event.detail.isOffline
      if (event.detail.isOffline) {
        logger.info('🔄 NHL Store: Offline state detected, stopping refresh')
        stopPeriodicRefresh()
      } else {
        logger.info('🔄 NHL Store: Online state detected, restarting refresh')
        startPeriodicRefresh()
      }
    }

    // Listen for network recovery events
    const handleNetworkRecovery = () => {
      logger.info(
        '🔄 NHL Store: Network recovery started, attempting to refresh data'
      )
      getData()
    }

    // Get refresh status
    const getRefreshStatus = () => {
      return {
        isRefreshing: !!refreshIntervalId,
        lastRefresh: last_update.value,
        nextRefresh: last_update.value
          ? new Date(last_update.value.getTime() + refreshInterval.value)
          : null,
        currentInterval: refreshInterval.value,
      }
    }

    // Setup event listeners
    const setupEventListeners = () => {
      logger.info('📡 NHL Store: Setting up event listeners')
      window.addEventListener('offline-state-changed', handleOfflineStateChange)
      window.addEventListener('network-recovery-started', handleNetworkRecovery)
      logger.info('📡 NHL Store: Event listeners set up successfully')
    }

    const cleanupEventListeners = () => {
      logger.info('📡 NHL Store: Cleaning up event listeners')
      window.removeEventListener(
        'offline-state-changed',
        handleOfflineStateChange
      )
      window.removeEventListener(
        'network-recovery-started',
        handleNetworkRecovery
      )
      stopPeriodicRefresh()
      logger.info('📡 NHL Store: Event listeners cleaned up successfully')
    }

    // Set up event listeners immediately
    logger.info('📡 NHL Store: About to set up event listeners')
    setupEventListeners()
    logger.info('📡 NHL Store: Event listeners setup completed')

    return {
      // State
      schedule,
      event,
      last_update,
      isLoading,
      error,
      isOffline, // Expose the local offline state

      // Getters
      nextGame,
      currentPeriod,
      refreshInterval,
      hasEvent,
      hasSchedule,
      isGameActive,
      isGameFinished,

      // Actions
      setLoading,
      setError,
      clearError,
      getData,
      startPeriodicRefresh,
      stopPeriodicRefresh,
      getRefreshStatus,
      cleanupEventListeners, // Export cleanup function
    }
  },
  {
    persist: {
      key: 'nhl-store',
      storage: localStorage,
      paths: ['schedule', 'event', 'last_update'],
    },
  }
)
