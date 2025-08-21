import { createLogger } from './logger'
import { check, watch } from 'is-offline'
import { appConfig } from '../config'

const logger = createLogger('NetworkMonitor')

export const setupNetworkMonitoring = offlineStore => {
  logger.info('Setting up network monitoring')

  let unwatch = null
  let versionCheckInterval = null
  let lastSeenTag = null

  // Enhanced connectivity check using is-offline package
  const checkConnectivity = async () => {
    try {
      logger.debug('Performing enhanced connectivity check')

      // Use is-offline package for more reliable detection
      const offline = await check()

      if (offline) {
        logger.debug('is-offline package detected offline state')
        if (!offlineStore.isOffline) {
          logger.info('Network lost, transitioning to offline state')
          offlineStore.setOffline()
        }
      } else {
        logger.debug('is-offline package detected online state')
        if (offlineStore.isOffline) {
          logger.info('Network restored, transitioning to online state')
          offlineStore.setOnline()
        }
      }
    } catch (error) {
      logger.error('Connectivity check failed:', error)
      // Fallback to offline state if check fails
      if (!offlineStore.isOffline) {
        logger.warn('Connectivity check failed, assuming offline')
        offlineStore.setOffline()
      }
    }
  }

  // Browser online/offline events (as backup)
  const handleOnline = () => {
    logger.info('Browser online event detected')
    // Don't immediately trust browser events, verify with is-offline
    setTimeout(checkConnectivity, 1000)
  }

  const handleOffline = () => {
    logger.info('Browser offline event detected')
    // Don't immediately trust browser events, verify with is-offline
    setTimeout(checkConnectivity, 1000)
  }

  // Enhanced fetch wrapper with offline detection
  const createResilientFetch = (url, options = {}) => {
    return async (...args) => {
      try {
        const response = await fetch(url, options, ...args)

        // If we get a successful response, we're definitely online
        if (offlineStore.isOffline) {
          logger.debug(
            'Successful fetch while offline, transitioning to online'
          )
          offlineStore.setOnline()
        }

        return response
      } catch (error) {
        // Check if this looks like a network error
        if (isNetworkError(error)) {
          logger.debug('Network error detected during fetch')
          offlineStore.incrementNetworkErrors()
        }

        throw error
      }
    }
  }

  // Helper to determine if an error is network-related
  const isNetworkError = error => {
    return (
      error.name === 'NetworkError' ||
      error.name === 'TypeError' ||
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('Failed to fetch')
    )
  }

  // Start continuous monitoring
  const startMonitoring = () => {
    logger.info('Starting continuous network monitoring')

    // Initial check
    checkConnectivity()

    // Setup is-offline watch for real-time updates
    try {
      unwatch = watch(offline => {
        logger.debug('is-offline watch detected change:', { offline })
        if (offline) {
          if (!offlineStore.isOffline) {
            logger.info(
              'Network lost via watch, transitioning to offline state'
            )
            offlineStore.setOffline()
          }
        } else {
          if (offlineStore.isOffline) {
            logger.info(
              'Network restored via watch, transitioning to online state'
            )
            offlineStore.setOnline()
          }
        }
      })
      logger.info('is-offline watch setup successful')
    } catch (error) {
      logger.warn('Failed to setup is-offline watch:', error)
    }

    // Setup event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listen for visibility changes (when tab becomes visible)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        logger.debug('Tab became visible, checking connectivity')
        checkConnectivity()
      }
    })
    // Start version/etag polling if enabled
    if (appConfig.appVersion?.enabled) {
      const { resourceUrl, checkInterval } = appConfig.appVersion
      const probe = async () => {
        try {
          // Use HEAD to avoid downloading content
          const res = await fetch(resourceUrl, {
            method: 'HEAD',
            cache: 'no-cache',
          })
          const etag = res.headers.get('ETag') || res.headers.get('Etag')
          const lastModified = res.headers.get('Last-Modified')

          const tag = etag || lastModified
          if (tag) {
            if (lastSeenTag && tag !== lastSeenTag) {
              logger.warn('App version change detected via tag, forcing reload')
              // Force a hard reload to pick up new assets
              window.location.reload(true)
              return
            } else {
              logger.info('App version change not detected, not reloading')
            }
            lastSeenTag = tag
          } else {
            logger.debug('No ETag/Last-Modified header present on resource')
          }
        } catch (e) {
          logger.debug('Version probe failed:', e?.message || e)
        }
      }

      // Run once at start then on interval
      probe()
      versionCheckInterval = setInterval(probe, checkInterval || 300000)
    }
  }

  const stopMonitoring = () => {
    logger.info('Stopping network monitoring')

    // Clean up is-offline watch
    if (unwatch) {
      logger.debug('Cleaning up is-offline watch')
      unwatch()
      unwatch = null
    }

    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    document.removeEventListener('visibilitychange', checkConnectivity)

    if (versionCheckInterval) {
      clearInterval(versionCheckInterval)
      versionCheckInterval = null
    }
  }

  // Check if monitoring is currently active
  const isMonitoring = () => {
    return !!unwatch
  }

  // Get detailed monitoring status for debugging
  const getMonitoringStatus = () => {
    return {
      hasWatch: !!unwatch,
      isActive: isMonitoring(),
    }
  }

  // Start monitoring immediately
  startMonitoring()

  // Return utilities for external use
  return {
    checkConnectivity,
    createResilientFetch,
    isNetworkError,
    startMonitoring,
    stopMonitoring,
    isMonitoring,
    getMonitoringStatus,
  }
}

// Export a function to check if we're currently online
export const isOnline = () => {
  return navigator.onLine
}

// Export a function to get connection info
export const getConnectionInfo = () => {
  if ('connection' in navigator) {
    const connection = navigator.connection
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    }
  }
  return null
}
