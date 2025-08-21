import { getProxyConfig } from '../config'

/**
 * Apply proxy to URL if enabled, using config
 * @param {string} url - The URL to potentially proxy
 * @returns {string} The URL with proxy applied if enabled, or original URL if disabled
 */
export const applyProxy = url => {
  const proxyConfig = getProxyConfig()
  const enabled = proxyConfig?.enabled || false
  const proxyUrl = proxyConfig?.url || 'https://corsproxy.io/?url='

  if (enabled && proxyUrl) {
    return `${proxyUrl}${url}`
  }

  return url
}

/**
 * Create a fetch request with proxy support and timeout
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds (default: 15000)
 * @returns {Promise<Response>} The fetch response
 */
export const fetchWithProxy = async (url, options = {}, timeout = 15000) => {
  const proxiedUrl = applyProxy(url)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(proxiedUrl, {
      ...options,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`)
    }
    throw error
  }
}

/**
 * Check if proxy is enabled in configuration
 * @returns {boolean} True if proxy is enabled
 */
export const isProxyEnabled = () => {
  const proxyConfig = getProxyConfig()
  return proxyConfig?.enabled || false
}

/**
 * Get the configured proxy URL
 * @returns {string} The proxy URL or empty string if not configured
 */
export const getProxyUrl = () => {
  const proxyConfig = getProxyConfig()
  return proxyConfig?.url || ''
}
