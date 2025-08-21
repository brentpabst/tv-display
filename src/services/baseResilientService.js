import { createLogger } from '../utils/logger'
import { useOfflineStateStore } from '../stores/offlineState'
import { createResilientApiCall } from '../utils/retryUtils'

/**
 * Base service class that provides offline resilience, caching, and retry logic
 * All API services should extend this class to get offline support automatically
 */
export class BaseResilientService {
  constructor(serviceName) {
    this.serviceName = serviceName
    this.logger = createLogger(`${serviceName}Service`)
    // Don't get the store in constructor - lazy load it when needed
  }

  /**
   * Gets the offline store when needed (lazy loading)
   * @private
   */
  get _offlineStore() {
    try {
      return useOfflineStateStore()
    } catch (error) {
      this.logger.warn('Offline store not available yet:', error.message)
      return null
    }
  }

  /**
   * Wraps an API call with offline resilience, caching, and retry logic
   * @param {Function} apiCall - The API function to call
   * @param {string} cacheKey - Unique key for caching this data
   * @param {Object} options - Additional options
   * @returns {Promise<any>} The API response or cached data
   */
  async resilientCall(apiCall, cacheKey, options = {}) {
    const {
      retryAttempts = 3,
      retryDelay = 1000,
      cacheExpiry = 15 * 60 * 1000, // 15 minutes
      forceRefresh = false,
    } = options

    // If forcing refresh, skip cache check
    if (forceRefresh) {
      this.logger.info(`Force refresh requested for ${cacheKey}`)
      return this._executeWithRetry(apiCall, retryAttempts, retryDelay)
    }

    // Check if we have fresh cached data
    const cachedData = this._offlineStore?.getCachedData(cacheKey)
    if (cachedData && !this._isDataStale(cachedData, cacheExpiry)) {
      this.logger.debug(`Using cached data for ${cacheKey}`)
      return cachedData
    }

    // Execute API call with retry logic
    try {
      const result = await this._executeWithRetry(
        apiCall,
        retryAttempts,
        retryDelay
      )

      // Cache the successful result
      this._offlineStore?.cacheData(cacheKey, result)
      this.logger.info(`Successfully cached data for ${cacheKey}`)

      return result
    } catch (error) {
      this.logger.error(`API call failed for ${cacheKey}:`, error)

      // If we have stale cached data, return it as fallback
      if (cachedData) {
        this.logger.warn(
          `Returning stale cached data for ${cacheKey} as fallback`
        )
        return cachedData
      }

      throw error
    }
  }

  /**
   * Executes an API call with retry logic
   * @private
   */
  async _executeWithRetry(apiCall, maxAttempts, delay) {
    let lastError

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await apiCall()
      } catch (error) {
        lastError = error

        if (attempt === maxAttempts) {
          break
        }

        this.logger.warn(
          `Attempt ${attempt} failed for ${this.serviceName}, retrying in ${delay}ms:`,
          error.message
        )
        await this._sleep(delay)
        delay *= 2 // Exponential backoff
      }
    }

    throw lastError
  }

  /**
   * Checks if cached data is stale
   * @private
   */
  _isDataStale(cachedData, expiryMs) {
    if (!cachedData || !cachedData.timestamp) {
      return true
    }

    const age = Date.now() - cachedData.timestamp
    return age > expiryMs
  }

  /**
   * Utility sleep function
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Gets the current offline status
   */
  get isOffline() {
    return this._offlineStore?.isOffline ?? false
  }

  /**
   * Gets cached data count for this service
   */
  getCachedDataCount() {
    return this._offlineStore?.getCachedDataCount() ?? 0
  }

  /**
   * Clears cached data for this service
   */
  clearCache() {
    // Note: This would need to be implemented in offlineStore to clear by prefix
    this.logger.info(`Cache clear requested for ${this.serviceName}`)
  }
}
