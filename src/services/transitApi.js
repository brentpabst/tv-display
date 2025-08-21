import { getTransitTimesConfig } from '../config'
import { createLogger } from '../utils/logger'
import { fetchWithProxy } from '../utils/proxyUtils'

const logger = createLogger('TransitApiService')

export const transitApiService = {
  isRoutingAvailable() {
    return !!getTransitTimesConfig().googleMaps.apiKey
  },

  async getRouteInfo(origin, destination) {
    if (!this.isRoutingAvailable()) {
      throw new Error('Google Maps API key not configured')
    }

    try {
      const apiKey = getTransitTimesConfig().googleMaps.apiKey
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=driving&units=imperial&key=${apiKey}`

      const response = await fetchWithProxy(url)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.status === 'OK' && data.routes && data.routes.length > 0) {
        const route = data.routes[0]
        const leg = route.legs[0]

        return {
          duration: leg.duration.text,
          distance: leg.distance.text,
          route: this.extractRouteDescription(route),
          durationMinutes: Math.round(leg.duration.value / 60),
          distanceMiles: Math.round(leg.distance.value * 0.000621371 * 10) / 10,
          startAddress: leg.start_address || origin,
          endAddress: leg.end_address || destination,
        }
      } else {
        throw new Error(
          `Directions API error: ${data.status} - ${data.error_message || 'Unknown error'}`
        )
      }
    } catch (error) {
      logger.error('Google Maps Directions API error:', error)
      throw new Error(`Failed to get route: ${error.message}`)
    }
  },

  extractRouteDescription(route) {
    return route.summary ? `via ${route.summary}` : null
  },

  async getMultipleRoutes(origin, destinations) {
    const routes = {}
    const results = {
      successful: 0,
      failed: 0,
      errors: [],
    }

    logger.info(
      `Starting to fetch ${destinations.length} transit routes from ${origin}`
    )

    await Promise.all(
      destinations.map(async destination => {
        try {
          logger.info(
            `Fetching route to ${destination.name} (${destination.address})`
          )
          const routeInfo = await this.getRouteInfo(origin, destination.address)

          routes[destination.id] = {
            ...destination,
            ...routeInfo,
            lastUpdated: new Date(),
          }

          results.successful++
          logger.info(
            `✅ Successfully loaded route to ${destination.name}: ${routeInfo.duration} (${routeInfo.distance})`
          )
        } catch (error) {
          results.failed++
          const errorMsg = `Failed to get route for ${destination.name}: ${error.message}`
          results.errors.push({
            destination: destination.name,
            error: error.message,
          })
          logger.error(errorMsg, error)

          // Add a failed route entry so the UI can show it
          routes[destination.id] = {
            ...destination,
            error: error.message,
            duration: 'Unavailable',
            distance: 'Unavailable',
            route: null,
            durationMinutes: null,
            distanceMiles: null,
            startAddress: origin,
            endAddress: destination.address,
            lastUpdated: new Date(),
            hasError: true,
          }
        }
      })
    )

    logger.info(
      `Transit routes completed: ${results.successful} successful, ${results.failed} failed`
    )
    if (results.errors.length > 0) {
      logger.warn('Failed routes:', results.errors)
    }

    return routes
  },
}
