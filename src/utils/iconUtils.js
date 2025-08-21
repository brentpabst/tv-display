import { ref } from 'vue'

// Track offline state
const isOffline = ref(false)

// Listen for offline state changes with init guard to prevent duplicates
let initialized = false
const handleOfflineStateChange = event => {
  isOffline.value = event.detail.isOffline
}
export const initIconUtils = () => {
  if (initialized || typeof window === 'undefined') return
  window.addEventListener('offline-state-changed', handleOfflineStateChange)
  initialized = true
}

/**
 * Get a fallback icon when offline
 * @param {string} iconName - The original icon name
 * @returns {string} - A fallback icon name that should be available locally
 */
export const getFallbackIcon = iconName => {
  // Map common icons to fallbacks that are more likely to be cached
  const fallbackMap = {
    'mdi:wifi-off': 'mdi:wifi',
    'mdi:database': 'mdi:circle',
    'mdi:refresh': 'mdi:reload',
    'mdi:car': 'mdi:car',
    'mdi:loading': 'mdi:circle',
    'mdi:clock-outline': 'mdi:clock',
    'mdi:weather-windy': 'mdi:weather',
    'mdi:weather-rainy': 'mdi:weather',
    'mdi:thermometer': 'mdi:thermometer',
    'mdi:water-percent': 'mdi:water',
    'mdi:gauge': 'mdi:gauge',
    'mdi:lightning-bolt': 'mdi:lightning',
    'mdi:sync': 'mdi:reload',
    'mdi:wifi-strength-1': 'mdi:wifi',
  }

  return fallbackMap[iconName] || 'mdi:circle'
}

/**
 * Check if we should use fallback icons
 * @returns {boolean} - True if offline fallbacks should be used
 */
export const shouldUseFallbackIcons = () => {
  return isOffline.value
}

/**
 * Get the appropriate icon name considering offline state
 * @param {string} iconName - The preferred icon name
 * @returns {string} - The icon name to use (original or fallback)
 */
export const getIconName = iconName => {
  if (shouldUseFallbackIcons()) {
    const fallback = getFallbackIcon(iconName)
    // Only show warning if the fallback is actually different
    if (fallback !== iconName) {
      console.warn(
        `Iconify offline: using fallback for ${iconName} -> ${fallback}`
      )
    }
    return fallback
  }
  return iconName
}
