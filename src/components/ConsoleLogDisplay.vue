<template>
  <Transition name="log-fade">
    <div
      v-if="latestLog"
      class="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30 max-w-4xl w-full px-4"
    >
      <div
        :class="[
          'rounded-lg px-4 py-3 backdrop-blur-sm border text-white drop-shadow-lg',
          logTypeClasses,
        ]"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-2 flex-1 min-w-0">
            <Icon
              v-if="latestLog.type === 'error'"
              :icon="getIconName('mdi:alert-circle')"
              class="text-red-300 text-xl flex-shrink-0 mt-0.5"
            />
            <Icon
              v-else-if="latestLog.type === 'warn'"
              :icon="getIconName('mdi:alert')"
              class="text-yellow-300 text-xl flex-shrink-0 mt-0.5"
            />
            <Icon
              v-else
              :icon="getIconName('mdi:information')"
              class="text-blue-300 text-xl flex-shrink-0 mt-0.5"
            />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium break-words">
                {{ latestLog.message }}
              </div>
              <div
                v-if="latestLog.timestamp"
                class="text-xs opacity-70 mt-1"
              >
                {{ formatTimestamp(latestLog.timestamp) }}
              </div>
            </div>
          </div>
          <button
            @click="clearLog"
            class="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            <Icon
              :icon="getIconName('mdi:close')"
              class="text-white text-lg"
            />
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
  import { ref, onMounted, onUnmounted, computed } from 'vue'
  import { Icon } from '@iconify/vue'
  import { getIconName } from '../utils/iconUtils'

  const latestLog = ref(null)
  let autoHideTimeout = null

  const logTypeClasses = computed(() => {
    if (!latestLog.value) return ''
    switch (latestLog.value.type) {
      case 'error':
        return 'bg-red-900/80 border-red-600/50'
      case 'warn':
        return 'bg-yellow-900/80 border-yellow-600/50'
      default:
        return 'bg-blue-900/80 border-blue-600/50'
    }
  })

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const formatLogMessage = (args) => {
    return args
      .map((arg) => {
        if (typeof arg === 'string') return arg
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 0)
          } catch {
            return String(arg)
          }
        }
        return String(arg)
      })
      .join(' ')
      .trim()
  }

  const showLog = (message, type = 'log') => {
    latestLog.value = {
      message,
      type,
      timestamp: Date.now(),
    }

    // Clear existing timeout
    if (autoHideTimeout) {
      clearTimeout(autoHideTimeout)
    }

    // Auto-hide after 5 seconds
    autoHideTimeout = setTimeout(() => {
      latestLog.value = null
    }, 5000)
  }

  const clearLog = () => {
    if (autoHideTimeout) {
      clearTimeout(autoHideTimeout)
      autoHideTimeout = null
    }
    latestLog.value = null
  }

  // Store original console methods
  const originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  }

  // Intercept console methods
  const interceptConsole = () => {
    console.log = (...args) => {
      originalConsole.log(...args)
      const message = formatLogMessage(args)
      if (message) {
        showLog(message, 'log')
      }
    }

    console.warn = (...args) => {
      originalConsole.warn(...args)
      const message = formatLogMessage(args)
      if (message) {
        showLog(message, 'warn')
      }
    }

    console.error = (...args) => {
      originalConsole.error(...args)
      const message = formatLogMessage(args)
      if (message) {
        showLog(message, 'error')
      }
    }
  }

  // Restore original console methods
  const restoreConsole = () => {
    console.log = originalConsole.log
    console.warn = originalConsole.warn
    console.error = originalConsole.error
  }

  onMounted(() => {
    interceptConsole()
  })

  onUnmounted(() => {
    restoreConsole()
    if (autoHideTimeout) {
      clearTimeout(autoHideTimeout)
    }
  })
</script>

<style scoped>
  .log-fade-enter-active,
  .log-fade-leave-active {
    transition: all 0.3s ease;
  }

  .log-fade-enter-from {
    opacity: 0;
    transform: translate(-50%, 20px);
  }

  .log-fade-leave-to {
    opacity: 0;
    transform: translate(-50%, 20px);
  }
</style>

