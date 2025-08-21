// Main application configuration
//
// CONFIGURATION RULES:
// 1. Use getter functions ONLY for:
//    - Entire config sections (e.g., getWeatherflowConfig())
//    - Computed/transformed values (e.g., getForecastRefreshInterval())
//    - Values that require business logic or validation
//
// 2. For simple property access, use dot notation directly:
//    - appConfig.weatherflow.deviceId (NOT getDeviceId())
//    - appConfig.audio.volume (NOT getAudioVolume())
//    - appConfig.nhl.intervals.preGame (NOT getNhlPreGameInterval())
//
// 3. When adding new config values, prefer direct access unless the getter
//    provides additional logic beyond simple property retrieval.
//
// 4. Environment variables take precedence over hardcoded values
//    - Use VITE_* prefix for build-time environment variables
//    - Fall back to hardcoded defaults for development
//    - Docker deployments can override via environment variables

// ============================================================================
// HELPER FUNCTIONS - Must be defined before use
// ============================================================================

// Enhanced environment variable helper that handles different data types
const env = (key, fallback, options = {}) => {
  const value = import.meta.env[key]

  if (value === undefined) {
    return fallback
  }

  // Handle different data types based on options or automatic detection
  const type = options.type || 'auto'

  if (
    type === 'boolean' ||
    (type === 'auto' && typeof fallback === 'boolean')
  ) {
    return typeof value === 'string'
      ? value.toLowerCase() === 'true'
      : Boolean(value)
  }

  if (type === 'number' || (type === 'auto' && typeof fallback === 'number')) {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? fallback : parsed
  }

  if (type === 'array' || (type === 'auto' && Array.isArray(fallback))) {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
    }
    return Array.isArray(value) ? value : fallback
  }

  // Default to string
  return value
}

// Generic helper to build objects from environment variables
const buildFromEnv = (prefix, defaults, id = '') => {
  const result = {}
  for (const [key, defaultValue] of Object.entries(defaults)) {
    const envKey = id
      ? `VITE_${prefix}_${id.toUpperCase()}_${key.toUpperCase()}`
      : `VITE_${prefix}_${key.toUpperCase()}`
    result[key] = env(envKey, defaultValue)
  }
  return result
}

export const appConfig = {
  proxy: {
    enabled: env('VITE_PROXY_ENABLED', true, { type: 'boolean' }),
    url: env('VITE_PROXY_URL', 'http://localhost:8080/'),
  },

  // Location settings
  location: {
    latitude: env('VITE_LOCATION_LATITUDE', 35.986351, { type: 'number' }), // Raleigh, NC
    longitude: env('VITE_LOCATION_LONGITUDE', -78.679718, { type: 'number' }),
  },

  // Weatherflow API configuration
  weatherflow: {
    deviceId: env('VITE_WEATHERFLOW_DEVICE_ID', '245102'),
    stationId: env('VITE_WEATHERFLOW_STATION_ID', '94964'),
    accessToken: env('VITE_WEATHERFLOW_ACCESS_TOKEN'), // No fallback - sensitive

    // WebSocket settings
    websocket: {
      reconnectAttempts: 5,
      reconnectDelay: 1000, // Base delay in ms
      maxReconnectDelay: 30000, // Max delay in ms
    },

    // Refresh intervals (in milliseconds)
    intervals: {
      forecastRefresh: 5 * 60 * 1000, // 5 minutes
      currentConditions: 30 * 1000, // 30 seconds
      rapidWind: 10 * 1000, // 10 seconds
    },

    // Display units configuration
    display: {
      temperatureUnit: env('VITE_WEATHERFLOW_TEMPERATURE_UNIT', 'F'), // 'F' or 'C'
      windUnit: env('VITE_WEATHERFLOW_WIND_UNIT', 'mph'), // 'mph' or 'km/h'
      pressureUnit: env('VITE_WEATHERFLOW_PRESSURE_UNIT', 'inHg'), // 'inHg' or 'hPa'
      precipitationUnit: env('VITE_WEATHERFLOW_PRECIPITATION_UNIT', 'in'), // 'in' or 'mm'
    },
  },

  // Video background configuration
  video: {
    sources: env('VITE_VIDEO_SOURCES', [
      'https://media-hls.wral.com/livehttporigin/_definst_/mp4:north_hills_mall.stream/playlist.m3u8',
    ]),
    currentSource: 0, // Index of the current video source to use
    fallbackImage: '/videobgbackup.webp',
    hlsConfig: {
      debug: false,
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 90,
    },
    opacity: {
      minOpacity: 0.2,
      maxOpacity: 0.7,
      baseOpacity: 0.5,
    },
    // Brightness analysis configuration for dynamic overlay opacity
    brightnessAnalysis: {
      enabled: true,
      interval: 1000, // Check brightness every 1 second
      minOpacity: 0.2,
      maxOpacity: 0.7,
      baseOpacity: 0.5,
      canvasWidth: 320,
      canvasHeight: 180,
      sampleSize: 0.1, // Sample 10% of pixels for performance
    },
    // Retry configuration for video loading
    retry: {
      maxRetries: env('VITE_VIDEO_RETRY_MAX_RETRIES', 5, { type: 'number' }),
      baseDelay: env('VITE_VIDEO_RETRY_BASE_DELAY', 5000, { type: 'number' }), // Start with 5 second delay
      maxDelay: env('VITE_VIDEO_RETRY_MAX_DELAY', 30000, { type: 'number' }), // Max delay of 30 seconds
      loadTimeout: env('VITE_VIDEO_RETRY_LOAD_TIMEOUT', 15000, {
        type: 'number',
      }), // Wait 15 seconds for video to load before timing out
      exponentialBackoff: true,
    },
  },

  // Logging configuration
  logging: {
    level: env('VITE_LOGGING_LEVEL', 'debug'), // 'debug', 'info', 'warn', 'error', 'none'
    enableConsole: env('VITE_LOGGING_ENABLE_CONSOLE', true, {
      type: 'boolean',
    }),
  },

  // App version/refresh monitoring
  appVersion: {
    enabled: true,
    // Resource to probe for ETag/Last-Modified. Use index.html by default
    resourceUrl: '/index.html',
    // How often to check (in ms)
    checkInterval: 1 * 60 * 1000, // 1 minute
  },

  // Calendar feed configuration
  calendar: {
    feeds: (() => {
      // Build calendar feeds from environment variables
      const feeds = []

      // Check for up to 5 calendar feeds
      for (let i = 1; i <= 5; i++) {
        const enabled = env(`VITE_CALENDAR_FEED_${i}_ENABLED`, false, {
          type: 'boolean',
        })
        if (enabled) {
          feeds.push({
            enabled: true,
            color: env(`VITE_CALENDAR_FEED_${i}_COLOR`, 'blue'),
            name: env(`VITE_CALENDAR_FEED_${i}_NAME`, `Calendar ${i}`),
            url: env(`VITE_CALENDAR_FEED_${i}_URL`),
          })
        }
      }

      // If no feeds configured, return empty array
      return feeds
    })(),
    display: {
      daysAhead: 4, // Number of days to show beyond today
      maxEventsPerDay: 3, // Maximum events to show per day
      refreshInterval: 30 * 60 * 1000, // Refresh every 30 minutes
    },
  },

  // WiFi network configuration for QR code display
  wifi: {
    ssid: env('VITE_WIFI_SSID'),
    security: env('VITE_WIFI_SECURITY'), // 'WPA', 'WEP', or 'nopass'
  },

  // Weather alerts configuration
  weatherAlerts: {
    loadSampleAlerts: env('VITE_WEATHER_ALERTS_LOAD_SAMPLE', false, {
      type: 'boolean',
    }), // Set to true to load sample alerts for testing
    refreshInterval: 60 * 1000, // Refresh every minute
    rotationInterval: 8000, // Rotate through multiple alerts every 8 seconds
  },

  // Google Maps API configuration
  transitTimes: {
    googleMaps: {
      apiKey: env('VITE_GOOGLE_MAPS_API_KEY'), // Add your Google Maps API key here for the Directions API
    },
    origin: env('VITE_TRANSIT_ORIGIN'),
    destinations: (() => {
      // Build transit destinations from environment variables
      const destinations = []

      // Check for up to 5 transit destinations
      for (let i = 1; i <= 5; i++) {
        const enabled = env(`VITE_TRANSIT_DESTINATION_${i}_ENABLED`, false, {
          type: 'boolean',
        })
        if (enabled) {
          destinations.push({
            id: env(`VITE_TRANSIT_DESTINATION_${i}_ID`, `destination-${i}`),
            name: env(`VITE_TRANSIT_DESTINATION_${i}_NAME`, `Destination ${i}`),
            address: env(`VITE_TRANSIT_DESTINATION_${i}_ADDRESS`),
          })
        }
      }

      // If no destinations configured, return empty array
      return destinations
    })(),
    refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  },

  // NHL API configuration
  nhl: {
    refreshInterval: 2 * 60 * 1000, // Refresh every 2 minutes

    // Dynamic refresh intervals based on game state (in milliseconds)
    intervals: {
      preGame: 15 * 60 * 1000, // 15 minutes before game starts
      preGameClose: 30 * 1000, // 30 seconds when game is about to start
      inGame: 15 * 1000, // 15 seconds during live game
      postGame: 60 * 60 * 1000, // 1 hour after game ends
    },
  },
}

// Helper functions for accessing config sections
export const getWeatherflowConfig = () => appConfig.weatherflow
export const getVideoConfig = () => appConfig.video
export const getLocationConfig = () => appConfig.location
export const getCalendarConfig = () => appConfig.calendar
export const getWifiConfig = () => appConfig.wifi
export const getWeatherAlertsConfig = () => appConfig.weatherAlerts
export const getProxyConfig = () => appConfig.proxy
export const getTransitTimesConfig = () => appConfig.transitTimes
export const getNhlConfig = () => appConfig.nhl

// Logging configuration getter
export const getLoggingConfig = () => appConfig.logging

// Computed/transformed values (keep these as they provide business logic)
export const getForecastRefreshInterval = () =>
  appConfig.weatherflow.intervals.forecastRefresh
export const getCalendarRefreshInterval = () =>
  appConfig.calendar.display.refreshInterval
export const getWeatherAlertsRefreshInterval = () =>
  appConfig.weatherAlerts.refreshInterval
export const getWeatherAlertsRotationInterval = () =>
  appConfig.weatherAlerts.rotationInterval

// Export the main config object
export default appConfig
