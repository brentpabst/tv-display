// Enhanced logging utility with configurable levels and origin tracking
import { getLoggingConfig } from '../config'

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
}

class Logger {
  constructor() {
    // Don't load config in constructor to avoid circular dependency
    this.config = null
    this.currentLevel = null
  }

  getConfig() {
    if (!this.config) {
      try {
        this.config = getLoggingConfig()
        this.currentLevel =
          LOG_LEVELS[this.config.level] !== undefined
            ? LOG_LEVELS[this.config.level]
            : LOG_LEVELS.warn
      } catch (error) {
        console.warn('Failed to load logger config, using defaults:', error)
        this.config = { level: 'warn', enableConsole: true }
        this.currentLevel = LOG_LEVELS.warn
      }
    }
    return this.config
  }

  shouldLog(level) {
    const config = this.getConfig()
    return LOG_LEVELS[level] >= this.currentLevel && config.enableConsole
  }

  // Enhanced logging methods with origin tracking
  debug(origin, ...args) {
    if (this.shouldLog('debug')) {
      console.log(`🐛 [${origin}]`, ...args)
    }
  }

  info(origin, ...args) {
    if (this.shouldLog('info')) {
      console.log(`ℹ️ [${origin}]`, ...args)
    }
  }

  warn(origin, ...args) {
    if (this.shouldLog('warn')) {
      console.warn(`⚠️ [${origin}]`, ...args)
    }
  }

  error(origin, ...args) {
    if (this.shouldLog('error')) {
      console.error(`❌ [${origin}]`, ...args)
    }
  }

  // Method for video/media operations
  media(origin, ...args) {
    if (this.shouldLog('info')) {
      console.log(`🎬 [${origin}]`, ...args)
    }
  }

  // Method for network/connection operations
  network(origin, ...args) {
    if (this.shouldLog('info')) {
      console.log(`🌐 [${origin}]`, ...args)
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export class for testing
export { Logger }

// Single consolidated logger creator
export const createLogger = (origin, options = {}) => {
  const loggerInstance = {
    debug: (...args) => logger.debug(origin, ...args),
    info: (...args) => logger.info(origin, ...args),
    warn: (...args) => logger.warn(origin, ...args),
    error: (...args) => logger.error(origin, ...args),
  }

  // Add specialized methods if requested
  if (options.media) {
    loggerInstance.media = (...args) => logger.media(origin, ...args)
  }

  if (options.network) {
    loggerInstance.network = (...args) => logger.network(origin, ...args)
  }

  return loggerInstance
}
