import { createLogger } from './logger'

const logger = createLogger('OfflineTestUtils')

/**
 * Utility functions for testing offline functionality
 * These can be used during development to simulate different network conditions
 */

// Store original fetch function
const originalFetch = window.fetch

/**
 * Simulate offline mode by intercepting fetch calls
 * @param {boolean} enabled - Whether to enable offline simulation
 */
export const simulateOffline = (enabled = true) => {
  if (enabled) {
    logger.info('Simulating offline mode')
    window.fetch = () => {
      return Promise.reject(new Error('Simulated offline mode'))
    }
  } else {
    logger.info('Restoring normal fetch behavior')
    window.fetch = originalFetch
  }
}

/**
 * Simulate slow network by adding delays to fetch calls
 * @param {number} delayMs - Delay in milliseconds
 * @param {boolean} enabled - Whether to enable slow network simulation
 */
export const simulateSlowNetwork = (delayMs = 2000, enabled = true) => {
  if (enabled) {
    logger.info(`Simulating slow network with ${delayMs}ms delay`)
    window.fetch = async (...args) => {
      await new Promise(resolve => setTimeout(resolve, delayMs))
      return originalFetch(...args)
    }
  } else {
    logger.info('Restoring normal network speed')
    window.fetch = originalFetch
  }
}

/**
 * Simulate intermittent network failures
 * @param {number} failureRate - Probability of failure (0-1)
 * @param {boolean} enabled - Whether to enable failure simulation
 */
export const simulateIntermittentFailures = (
  failureRate = 0.3,
  enabled = true
) => {
  if (enabled) {
    logger.info(
      `Simulating intermittent failures with ${failureRate * 100}% failure rate`
    )
    window.fetch = async (...args) => {
      if (Math.random() < failureRate) {
        throw new Error('Simulated network failure')
      }
      return originalFetch(...args)
    }
  } else {
    logger.info('Restoring normal network reliability')
    window.fetch = originalFetch
  }
}

/**
 * Simulate network recovery after a delay
 * @param {number} delayMs - How long to wait before recovery
 */
export const simulateNetworkRecovery = (delayMs = 5000) => {
  logger.info(`Simulating network recovery in ${delayMs}ms`)

  setTimeout(() => {
    logger.info('Simulating network recovery')
    window.fetch = originalFetch

    // Dispatch online event
    window.dispatchEvent(new Event('online'))
  }, delayMs)
}

/**
 * Get current simulation status
 * @returns {Object} - Current simulation configuration
 */
export const getSimulationStatus = () => {
  const isOffline = window.fetch !== originalFetch
  const isSlow = false // Would need to track this separately
  const isIntermittent = false // Would need to track this separately

  return {
    isOffline,
    isSlow,
    isIntermittent,
    originalFetch: window.fetch === originalFetch,
  }
}

/**
 * Reset all simulations and restore normal behavior
 */
export const resetSimulations = () => {
  logger.info('Resetting all network simulations')
  window.fetch = originalFetch
}

// Add to window for easy access during development
if (process.env.NODE_ENV === 'development') {
  window.offlineTestUtils = {
    simulateOffline,
    simulateSlowNetwork,
    simulateIntermittentFailures,
    simulateNetworkRecovery,
    getSimulationStatus,
    resetSimulations,
  }

  logger.info('Offline test utilities available at window.offlineTestUtils')
}
