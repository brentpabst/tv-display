import { createLogger } from './logger'

const logger = createLogger('RetryUtils')

/**
 * Retry a function with exponential backoff and jitter
 * @param {Function} fn - The function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.baseDelay - Base delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {Function} options.shouldRetry - Function to determine if error should retry (default: always retry)
 * @returns {Promise} - Promise that resolves with function result or rejects after max retries
 */
export const retryWithBackoff = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry = () => true,
  } = options

  let lastError

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`Retry attempt ${attempt + 1}/${maxRetries + 1}`)
      return await fn()
    } catch (error) {
      lastError = error

      // Check if we should retry this error
      if (!shouldRetry(error)) {
        logger.debug('Error should not be retried:', error.message)
        throw error
      }

      // If this was the last attempt, don't wait
      if (attempt === maxRetries) {
        logger.warn(`Max retries (${maxRetries}) reached, giving up`)
        break
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      )

      logger.debug(
        `Retry attempt ${attempt + 1} failed, waiting ${Math.round(delay)}ms before next attempt`
      )

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Create a resilient fetch function that automatically retries on network errors
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {Object} retryOptions - Retry options
 * @returns {Promise<Response>} - Fetch response
 */
export const createResilientFetch = (url, options = {}, retryOptions = {}) => {
  return retryWithBackoff(() => fetch(url, options), {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    shouldRetry: error => {
      // Retry on network errors, but not on HTTP errors (4xx, 5xx)
      return error.name === 'TypeError' || error.message.includes('fetch')
    },
    ...retryOptions,
  })
}

/**
 * Create a resilient API call function with offline support
 * @param {Function} apiCall - The API function to call
 * @param {Object} offlineStore - The offline state store
 * @param {string} cacheKey - Key for caching the result
 * @param {Object} options - Options for the resilient call
 * @returns {Promise} - API result or cached data
 */
export const createResilientApiCall = async (
  apiCall,
  offlineStore,
  cacheKey,
  options = {}
) => {
  const { useCache = true, maxAge = 15 * 60 * 1000 } = options // 15 minutes default

  try {
    // Try to make the API call
    const result = await apiCall()

    // Cache successful result
    if (useCache) {
      offlineStore.cacheData(cacheKey, result)
      offlineStore.lastUpdateTime = Date.now()
    }

    return result
  } catch (error) {
    logger.warn(`API call failed for ${cacheKey}:`, error.message)

    // Try to use cached data if available
    if (useCache) {
      const cached = offlineStore.getCachedData(cacheKey)
      if (cached) {
        logger.info(`Using cached data for ${cacheKey}`)
        return cached
      }
    }

    // If no cached data available, throw the error
    throw error
  }
}
