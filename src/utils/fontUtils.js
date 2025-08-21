import { ref } from 'vue'

// Track offline state
const isOffline = ref(false)

// Listen for offline state changes with init guard to prevent duplicates
let initialized = false
const handleOfflineStateChange = event => {
  isOffline.value = event.detail.isOffline
}
export const initFontUtils = () => {
  if (initialized || typeof window === 'undefined') return
  window.addEventListener('offline-state-changed', handleOfflineStateChange)
  initialized = true
}

/**
 * Check if we should attempt to load fonts
 * @returns {boolean} - True if fonts should be loaded
 */
export const shouldLoadFonts = () => {
  return !isOffline.value
}

/**
 * Load fonts with offline detection
 * @param {string} fontFamily - The font family to load
 * @param {string} fontUrl - The URL to load the font from
 */
export const loadFont = (fontFamily, fontUrl) => {
  if (!shouldLoadFonts()) {
    console.warn(`Font loading skipped - offline: ${fontFamily}`)
    return
  }

  try {
    // Create a link element to load the font
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = fontUrl
    link.onerror = () => {
      console.warn(`Failed to load font: ${fontFamily} from ${fontUrl}`)
    }
    document.head.appendChild(link)
  } catch (error) {
    console.warn(`Error loading font ${fontFamily}:`, error)
  }
}

/**
 * Load multiple fonts with offline detection
 * @param {Array} fonts - Array of font objects with family and url properties
 */
export const loadFonts = fonts => {
  if (!shouldLoadFonts()) {
    console.warn('Font loading skipped - offline')
    return
  }

  fonts.forEach(font => {
    loadFont(font.family, font.url)
  })
}
