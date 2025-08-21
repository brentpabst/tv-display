// Weather Alerts API service for NWS (National Weather Service) integration
import { getLocationConfig } from '../config'
import { createLogger } from '../utils/logger'

const logger = createLogger('WeatherAlertsApi')

class WeatherAlertsApiService {
  constructor() {
    this.baseUrl = 'https://api.weather.gov'
    this.timeout = 10000
  }

  // Format time for display
  formatTime(timeString) {
    if (!timeString) return ''
    const date = new Date(timeString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Fetch weather alerts from NWS API
  async fetchAlerts() {
    const location = getLocationConfig()
    const latitude = location.latitude
    const longitude = location.longitude

    logger.info(
      `Fetching weather alerts for location: ${latitude}, ${longitude}`
    )

    try {
      let url = `${this.baseUrl}/alerts/active?point=${latitude},${longitude}`
      logger.info(`Fetching from NWS API (point search): ${url}`)

      let response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeout),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      let data = await response.json()
      logger.info('NWS API response received:', {
        hasData: !!data,
        hasFeatures: !!(data && data.features),
        featuresCount: data && data.features ? data.features.length : 0,
        dataKeys: data ? Object.keys(data) : [],
        sampleFeature:
          data && data.features && data.features.length > 0
            ? data.features[0]
            : null,
      })

      if (!data.features || data.features.length === 0) {
        logger.info('No alerts found for specified point')
      }

      const processedAlerts = this.processAlerts(data)
      logger.info(
        `Processed ${processedAlerts.length} alerts from ${data && data.features ? data.features.length : 0} features`
      )

      return processedAlerts
    } catch (error) {
      logger.error('Error fetching weather alerts:', error)
      throw error
    }
  }

  // Load sample alerts from JSON file
  async loadSampleAlerts() {
    try {
      const response = await fetch('/nws_sample_alerts.json', {
        signal: AbortSignal.timeout(this.timeout),
      })

      if (!response.ok) {
        throw new Error(`Failed to load sample alerts: ${response.status}`)
      }

      const data = await response.json()
      return this.processAlerts(data)
    } catch (error) {
      logger.error('Error loading sample alerts from file:', error)
      throw error
    }
  }

  // Process and filter alerts from API response
  processAlerts(data) {
    logger.info('Processing alerts data:', {
      hasData: !!data,
      hasFeatures: !!(data && data.features),
      featuresCount: data && data.features ? data.features.length : 0,
    })

    if (!data.features || !Array.isArray(data.features)) {
      logger.warn('No features array found in alerts data')
      return []
    }

    const severityLevels = [
      'Warning',
      'Watch',
      'Advisory',
      'Moderate',
      'Minor',
      'Severe',
      'Unknown',
    ]

    logger.info(
      `Processing ${data.features.length} features with severity levels:`,
      severityLevels
    )

    const filteredAlerts = data.features.filter(feature => {
      const alert = feature.properties
      const isValidStatus = alert.status === 'Actual'
      const isValidSeverity = severityLevels.includes(alert.severity)

      if (!isValidStatus || !isValidSeverity) {
        logger.debug(
          `Filtered out alert ${alert.id}: status=${alert.status}, severity=${alert.severity}`
        )
      }

      return isValidStatus && isValidSeverity
    })

    logger.info(
      `Filtered ${filteredAlerts.length} valid alerts from ${data.features.length} features`
    )

    return filteredAlerts.map(feature => {
      const alert = feature.properties
      return {
        id: alert.id,
        event: alert.event,
        headline: alert.headline,
        description: alert.description,
        severity: alert.severity,
        expires: alert.expires,
        effective: alert.effective,
        formattedExpires: this.formatTime(alert.expires),
        areaDesc: alert.areaDesc,
        certainty: alert.certainty,
        urgency: alert.urgency,
      }
    })
  }
}

// Export singleton instance
export const weatherAlertsApiService = new WeatherAlertsApiService()

// Export class for testing
export { WeatherAlertsApiService }
