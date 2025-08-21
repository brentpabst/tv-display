import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createLogger } from '../utils/logger'
import { formatFullDate } from '../utils/simplifiedUtils'

const logger = createLogger('ClockStore')

export const useClockStore = defineStore(
  'clock',
  () => {
    // State
    const timeDisplay = ref('')
    const seconds = ref('')
    const ampm = ref('')
    const currentDate = ref('')
    const refreshInterval = ref(null)

    // Actions
    const updateTime = () => {
      const now = new Date()
      const hours = now.getHours()
      const displayHours = hours % 12 || 12

      timeDisplay.value = `${displayHours}:${now.getMinutes().toString().padStart(2, '0')}`
      seconds.value = now.getSeconds().toString().padStart(2, '0')
      ampm.value = hours >= 12 ? 'PM' : 'AM'
      currentDate.value = formatFullDate(now)
    }

    // Start periodic refresh
    const startPeriodicRefresh = () => {
      // Stop any existing interval
      stopPeriodicRefresh()

      logger.info('Starting clock refresh every 1 second')

      // Update immediately
      updateTime()

      // Then update every second
      refreshInterval.value = setInterval(() => {
        updateTime()
      }, 1000)
    }

    // Stop periodic refresh
    const stopPeriodicRefresh = () => {
      if (refreshInterval.value) {
        clearInterval(refreshInterval.value)
        refreshInterval.value = null
        logger.debug('Stopped periodic clock refresh')
      }
    }

    // Get refresh status
    const getRefreshStatus = () => {
      return {
        isRefreshing: !!refreshInterval.value,
        refreshInterval: 1000, // Always 1 second for clock
        lastUpdate: new Date(),
      }
    }

    return {
      // State
      timeDisplay,
      seconds,
      ampm,
      currentDate,

      // Actions
      updateTime,
      startPeriodicRefresh,
      stopPeriodicRefresh,
      getRefreshStatus,
    }
  },
  {
    persist: {
      key: 'clock-store',
      storage: localStorage,
      paths: [], // Don't persist time values, just the store structure
    },
  }
)
