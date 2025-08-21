import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { createLogger } from '../utils/logger'
import { appConfig } from '../config'
import { calendarApiService } from '../services/calendarApi'
import { getNextDays, getFriendlyDayName } from '../utils/simplifiedUtils'

const logger = createLogger('CalendarStore')

export const useCalendarStore = defineStore(
  'calendar',
  () => {
    logger.info('🚀 Calendar Store created and initialized')

    // State - only what we actually use
    const events = ref([])
    const isLoading = ref(false)
    const error = ref(null)
    const lastRefresh = ref(null)
    const refreshInterval = ref(null)

    // Local offline state (updated via events)
    const isOffline = ref(false)

    // Getters - simplified and consolidated
    const hasEvents = computed(() => events.value.length > 0)

    // Get the next 3 days with events, or fallback to immediate 3 days
    const displayDays = computed(() => {
      if (events.value.length === 0) {
        // No events - return immediate 3 days
        return getNextDays().map(day => ({
          ...day,
          allDayEvents: [],
          timedEvents: [],
        }))
      }

      const today = new Date()
      const todayString = today.toISOString().split('T')[0]

      // Get all future events sorted by date
      const futureEvents = events.value
        .filter(event => event.date >= todayString)
        .sort((a, b) => new Date(a.date) - new Date(b.date))

      if (futureEvents.length === 0) {
        // No future events - return immediate 3 days
        return getNextDays().map(day => ({
          ...day,
          allDayEvents: [],
          timedEvents: [],
        }))
      }

      // Get unique dates with events
      const uniqueDates = [...new Set(futureEvents.map(event => event.date))]
      const nextThreeDates = uniqueDates.slice(0, 3)

      // If we have events in the immediate 3 days, show those
      const immediateDays = getNextDays()

      const immediateHasEvents = immediateDays.some(day =>
        futureEvents.some(event => event.date === day.date)
      )

      if (immediateHasEvents) {
        return immediateDays.map(day => {
          const dayEvents = futureEvents.filter(
            event => event.date === day.date
          )
          return {
            ...day,
            allDayEvents: dayEvents.filter(event => event.type === 'all-day'),
            timedEvents: dayEvents.filter(event => event.type === 'timed'),
          }
        })
      }

      // Otherwise, show the next 3 upcoming days with events
      return nextThreeDates.map(dateString => {
        const date = new Date(dateString)
        const dayNumber = date.getDate()
        const dayName = getFriendlyDayName(dateString)
        const dayEvents = futureEvents.filter(
          event => event.date === dateString
        )

        return {
          date: dateString,
          dayNumber,
          dayName,
          allDayEvents: dayEvents.filter(event => event.type === 'all-day'),
          timedEvents: dayEvents.filter(event => event.type === 'timed'),
        }
      })
    })

    // Actions - simplified to essential operations
    const setLoading = loading => {
      isLoading.value = loading
    }

    const setError = errorMessage => {
      error.value = errorMessage
    }

    const clearError = () => {
      error.value = null
    }

    const clearEvents = () => {
      events.value = []
    }

    // Load events from iCal feeds
    const loadFromICalSources = async () => {
      setLoading(true)
      clearError()
      clearEvents() // Clear old events before loading new ones

      try {
        const fetchedEvents = await calendarApiService.fetchAllFeeds()

        if (fetchedEvents && fetchedEvents.length > 0) {
          events.value = fetchedEvents
          lastRefresh.value = new Date()
          logger.info(`Loaded ${fetchedEvents.length} events from iCal feeds`)
        } else {
          logger.warn('No events found in iCal feeds')
          events.value = []
        }
      } catch (err) {
        const errorMessage = `Failed to load calendar events: ${err.message}`
        setError(errorMessage)
        logger.error(errorMessage, err)
      } finally {
        setLoading(false)
      }
    }

    // Start periodic refresh
    const startPeriodicRefresh = () => {
      // Stop any existing interval
      stopPeriodicRefresh()

      const config =
        appConfig.calendar.display.refreshInterval || 30 * 60 * 1000 // Default to 30 minutes

      logger.info(`Starting calendar refresh every ${config / 60000} minutes`)

      refreshInterval.value = setInterval(() => {
        logger.debug('Periodic calendar refresh triggered')
        loadFromICalSources()
      }, config)
    }

    // Stop periodic refresh
    const stopPeriodicRefresh = () => {
      if (refreshInterval.value) {
        clearInterval(refreshInterval.value)
        refreshInterval.value = null
        logger.debug('Stopped periodic calendar refresh')
      }
    }

    // Get refresh status
    const getRefreshStatus = () => {
      return {
        isRefreshing: !!refreshInterval.value,
        lastRefresh: lastRefresh.value,
        nextRefresh: lastRefresh.value
          ? new Date(
              lastRefresh.value.getTime() +
                (appConfig.calendar.display.refreshInterval || 30 * 60 * 1000)
            )
          : null,
      }
    }

    // Listen for offline state changes
    const handleOfflineStateChange = event => {
      logger.info(
        '📡 Calendar Store received offline state change:',
        event.detail
      )
      isOffline.value = event.detail.isOffline
      if (event.detail.isOffline) {
        logger.info(
          '🔄 Calendar Store: Offline state detected, stopping refresh'
        )
        stopPeriodicRefresh()
      } else {
        logger.info(
          '🔄 Calendar Store: Online state detected, restarting refresh'
        )
        startPeriodicRefresh()
      }
    }

    // Listen for network recovery events
    const handleNetworkRecovery = () => {
      logger.info(
        '🔄 Calendar Store: Network recovery started, attempting to refresh calendar data'
      )
      loadFromICalSources()
    }

    // Setup event listeners
    const setupEventListeners = () => {
      logger.info('📡 Calendar Store: Setting up event listeners')
      window.addEventListener('offline-state-changed', handleOfflineStateChange)
      window.addEventListener('network-recovery-started', handleNetworkRecovery)
      logger.info('📡 Calendar Store: Event listeners set up successfully')
    }

    const cleanupEventListeners = () => {
      logger.info('📡 Calendar Store: Cleaning up event listeners')
      window.removeEventListener(
        'offline-state-changed',
        handleOfflineStateChange
      )
      window.removeEventListener(
        'network-recovery-started',
        handleNetworkRecovery
      )
      stopPeriodicRefresh()
      logger.info('📡 Calendar Store: Event listeners cleaned up successfully')
    }

    // Set up event listeners immediately
    logger.info('📡 Calendar Store: About to set up event listeners')
    setupEventListeners()
    logger.info('📡 Calendar Store: Event listeners setup completed')

    return {
      // State
      events,
      isLoading,
      error,
      lastRefresh,
      isOffline, // Expose the local offline state

      // Getters
      hasEvents,
      displayDays,

      // Actions
      setLoading,
      setError,
      clearError,
      clearEvents,
      loadFromICalSources,
      startPeriodicRefresh,
      stopPeriodicRefresh,
      getRefreshStatus,
      cleanupEventListeners, // Export cleanup function
    }
  },
  {
    persist: {
      key: 'calendar-store',
      storage: localStorage,
      paths: ['events', 'lastRefresh'],
    },
  }
)
