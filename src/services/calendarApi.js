// Calendar API service for iCal feed integration
import { getCalendarConfig } from '../config'
import ical from 'ical'
import { formatTime } from '../utils/simplifiedUtils'
import { createLogger } from '../utils/logger'
import { fetchWithProxy } from '../utils/proxyUtils'

const logger = createLogger('CalendarApi')

class CalendarApiService {
  constructor() {
    this.timeout = 15000 // 15 seconds timeout for calendar feeds
  }

  // Fetch iCal data from a single feed
  async fetchICalFeed(feed) {
    if (!feed.enabled || !feed.url) {
      throw new Error(
        `Feed ${feed.name || 'unnamed'} is disabled or has no URL`
      )
    }

    try {
      const response = await fetchWithProxy(
        feed.url,
        {
          headers: {
            Accept: 'text/calendar, text/plain, */*',
            'User-Agent': 'TV-Display-Calendar/1.0',
          },
        },
        this.timeout
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const icalData = await response.text()
      return this.parseICalData(icalData, feed)
    } catch (error) {
      if (error.message.includes('timeout')) {
        throw new Error(`Timeout fetching feed ${feed.name || 'unnamed'}`)
      }
      throw error
    }
  }

  // Parse iCal data using the ical package
  parseICalData(icalData, feed) {
    try {
      const parsedData = ical.parseICS(icalData)
      const events = []

      // Iterate through all events in the parsed data
      for (const [uid, event] of Object.entries(parsedData)) {
        if (event.type === 'VEVENT') {
          const normalizedEvent = this.normalizeEvent(event, feed)
          if (normalizedEvent) {
            events.push(normalizedEvent)
          }
        }
      }

      return events
    } catch (error) {
      logger.error('Error parsing iCal data:', error)
      throw new Error(`Failed to parse iCal data: ${error.message}`)
    }
  }

  // Normalize event to our standard format
  normalizeEvent(event, feed) {
    try {
      // Extract event properties with handling for complex title objects
      const title = this.extractTitle(event.summary) || 'Untitled Event'
      const location = this.extractTitle(event.location) || null

      // Truncate location if it's too long
      const truncatedLocation = location
        ? this.truncateText(location, 100)
        : null

      // Handle start and end dates
      const startDate = event.start ? new Date(event.start) : null
      let endDate = event.end ? new Date(event.end) : null

      // Validate required fields
      if (!startDate || isNaN(startDate.getTime())) {
        logger.warn('Event missing valid start date:', event)
        return null
      }

      // Determine if it's an all-day event
      const isAllDay = this.isAllDayEvent(event, startDate, endDate)

      // For all-day events without end dates, set end date to same day
      if (isAllDay && !endDate) {
        endDate = new Date(startDate)
        endDate.setHours(23, 59, 59, 999) // End of the same day
      }

      // Format dates and times
      const date = startDate.toISOString().split('T')[0]
      const startTime = isAllDay ? null : formatTime(startDate)
      const endTime = isAllDay ? null : formatTime(endDate)

      return {
        id: event.uid || `event_${Date.now()}_${Math.random()}`,
        title: title,
        location: truncatedLocation,
        date: date,
        startTime: startTime,
        endTime: endTime,
        type: isAllDay ? 'all-day' : 'timed',
        color: feed.color || 'blue',
        source: feed.name || 'Unknown',
        allDay: isAllDay,
      }
    } catch (error) {
      logger.error('Error normalizing event:', error, event)
      return null
    }
  }

  // Extract title from potentially complex iCal objects
  extractTitle(titleObj) {
    if (!titleObj) return null

    // If it's a string, return as-is
    if (typeof titleObj === 'string') {
      return titleObj
    }

    // If it's an object with a "val" property, use that
    if (typeof titleObj === 'object' && titleObj.val) {
      return titleObj.val
    }

    // If it's an object with params and val, use val
    if (typeof titleObj === 'object' && titleObj.params && titleObj.val) {
      return titleObj.val
    }

    // Handle arrays (some iCal parsers return arrays)
    if (Array.isArray(titleObj)) {
      // Take the first non-empty value
      for (const item of titleObj) {
        const extracted = this.extractTitle(item)
        if (extracted) return extracted
      }
      return null
    }

    // Fallback: try to stringify the object for debugging
    logger.warn('Unexpected title format:', titleObj)
    return JSON.stringify(titleObj)
  }

  // Determine if an event is an all-day event
  isAllDayEvent(event, startDate, endDate) {
    const isMidnight = d =>
      d && d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0

    // Explicit Microsoft all-day flag
    if (event['x-microsoft-cdo-alldayevent'] === 'TRUE') return true

    // Some parsers expose date-only via a flag; treat as all-day if present
    if (event.datetype === 'date' || event.isDate) return true

    if (!startDate) return false

    // No end provided and starts at midnight → treat as all-day
    if (!endDate && isMidnight(startDate)) return true

    if (endDate) {
      const startIsMidnight = isMidnight(startDate)
      const endIsMidnight = isMidnight(endDate)

      // Common iCal all-day pattern: DTSTART at 00:00, DTEND at 00:00 next day (exclusive end)
      if (startIsMidnight && endIsMidnight) {
        const diffMs = endDate.getTime() - startDate.getTime()
        const oneDayMs = 24 * 60 * 60 * 1000

        // Single or multi-day all-day events are whole-day multiples
        if (diffMs >= oneDayMs && diffMs % oneDayMs === 0) return true
      }
    }

    return false
  }

  // Truncate text to specified length with ellipsis
  truncateText(text, maxLength = 100) {
    if (!text || typeof text !== 'string') return text
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  // Get relevant events for display (next 3 days with events)
  getRelevantEvents(allEvents) {
    if (allEvents.length === 0) return []

    const today = new Date()
    const todayString = today.toISOString().split('T')[0]

    // Get all future events sorted by date
    const futureEvents = allEvents
      .filter(event => event.date >= todayString)
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    if (futureEvents.length === 0) return []

    // Get unique dates with events
    const uniqueDates = [...new Set(futureEvents.map(event => event.date))]
    const nextThreeDates = uniqueDates.slice(0, 3)

    // Filter events to only include those in our target date range
    const relevantEvents = allEvents.filter(event =>
      nextThreeDates.includes(event.date)
    )

    // Sort events by date and time
    return relevantEvents.sort((a, b) => {
      const dateA = new Date(a.date + ' ' + (a.startTime || '00:00'))
      const dateB = new Date(b.date + ' ' + (b.startTime || '00:00'))
      return dateA - dateB
    })
  }

  // Fetch all enabled calendar feeds
  async fetchAllFeeds() {
    const config = getCalendarConfig()
    const feeds = config.feeds || []

    if (feeds.length === 0) {
      logger.warn('No calendar feeds configured')
      return []
    }

    const enabledFeeds = feeds.filter(feed => feed.enabled)

    if (enabledFeeds.length === 0) {
      logger.warn('No enabled calendar feeds found')
      return []
    }

    const allEvents = []
    const errors = []

    // Fetch all events from all feeds
    const fetchPromises = enabledFeeds.map(async feed => {
      try {
        const events = await this.fetchICalFeed(feed)
        return { feed: feed.name, events, success: true }
      } catch (error) {
        logger.error(`Error fetching feed ${feed.name}:`, error)
        return { feed: feed.name, error: error.message, success: false }
      }
    })

    const results = await Promise.allSettled(fetchPromises)

    // Collect all events and errors
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { feed, events, success, error } = result.value
        if (success && events) {
          allEvents.push(...events)
        } else {
          errors.push({ feed, error })
        }
      } else {
        const feed = enabledFeeds[index]?.name || 'Unknown'
        errors.push({ feed, error: result.reason?.message || 'Unknown error' })
      }
    })

    // Log any errors
    if (errors.length > 0) {
      logger.warn('Some calendar feeds failed to load:', errors)
    }

    if (allEvents.length === 0) {
      logger.info('No events found in any feeds')
      return []
    }

    // Get relevant events for display
    const relevantEvents = this.getRelevantEvents(allEvents)
    logger.info(`Found ${relevantEvents.length} relevant events`)

    return relevantEvents
  }
}

// Export singleton instance
export const calendarApiService = new CalendarApiService()

// Export class for testing
export { CalendarApiService }
