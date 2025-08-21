// Simplified utilities using existing packages instead of custom implementations
// This reduces maintenance overhead and leverages well-tested, community-maintained solutions

import {
  format,
  isToday,
  isTomorrow,
  addDays,
  formatDistanceToNow,
} from 'date-fns'
import convert from 'convert-units'
import { debounce, throttle, merge } from 'lodash-es'
import numeral from 'numeral'
import { cardinalFromDegree, CardinalSubset } from 'cardinal-direction'
import { appConfig } from '../config'
import { createLogger } from './logger'

const logger = createLogger('SimplifiedUtils')

// ============================================================================
// DATE UTILITIES (using date-fns)
// ============================================================================

export const formatShortDay = dateValue => {
  if (!dateValue) return 'N/A'

  try {
    const date =
      typeof dateValue === 'number'
        ? new Date(dateValue * 1000) // Convert Unix timestamp
        : new Date(dateValue)
    return format(date, 'EEE')
  } catch (error) {
    logger.warn('Date formatting error:', error.message, 'Value:', dateValue)
    return 'N/A'
  }
}

export const formatFullDate = date => {
  if (!date) return ''
  return format(date, 'EEEE, MMMM d, yyyy')
}

export const formatTime = date => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return ''
  return format(date, 'h:mm a')
}

export const getFriendlyDayName = (dateString, baseDate = new Date()) => {
  // Create date in local timezone by parsing YYYY-MM-DD format
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day) // month is 0-indexed

  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'

  return format(date, 'EEEE')
}

export const getNextDays = (baseDate = new Date(), count = 3) => {
  const days = []

  for (let i = 0; i < count; i++) {
    const date = addDays(baseDate, i)
    const dateString = format(date, 'yyyy-MM-dd')

    days.push({
      date: dateString,
      dayNumber: date.getDate(),
      dayName: getFriendlyDayName(dateString, baseDate),
    })
  }

  return days
}

export const formatTimeAgo = timestamp => {
  if (!timestamp) return 'Unknown'

  try {
    let date
    if (timestamp instanceof Date) {
      date = timestamp
    } else if (typeof timestamp === 'number') {
      // Treat values > 1e12 as milliseconds (Date.now()), otherwise seconds
      const normalized = timestamp > 1e12 ? timestamp : timestamp * 1000
      date = new Date(normalized)
    } else {
      // Fallback: attempt to parse if string
      date = new Date(timestamp)
    }

    if (!(date instanceof Date) || isNaN(date.getTime())) return 'Unknown'
    return formatDistanceToNow(date, { addSuffix: true })
  } catch (error) {
    logger.warn('Time ago formatting error:', error)
    return 'Unknown'
  }
}

export { isToday, isTomorrow }

// ============================================================================
// DURATION UTILITIES
// ============================================================================

export const formatDuration = ms => {
  if (!ms) return '--'
  const minutes = Math.floor(ms / 60000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

// ============================================================================
// UNIT CONVERSIONS (using convert-units)
// ============================================================================

export const convertTemperature = (celsius, targetUnit = null) => {
  if (celsius === null || celsius === undefined) return null

  try {
    const unit = targetUnit || appConfig.weatherflow.display.temperatureUnit
    if (unit === 'C') return celsius

    return convert(celsius).from('C').to(unit)
  } catch (error) {
    logger.warn('Temperature conversion failed:', error)
    return celsius
  }
}

export const convertWindSpeed = (mps, targetUnit = null) => {
  if (mps === null || mps === undefined) return null

  try {
    const unit = targetUnit || appConfig.weatherflow.display.windUnit
    if (unit === 'mps') return mps

    // Handle mph conversion since convert-units uses 'm/h' for miles per hour
    if (unit === 'mph') {
      return convert(mps).from('m/s').to('m/h')
    }

    return convert(mps).from('m/s').to(unit)
  } catch (error) {
    logger.warn('Wind speed conversion failed:', error)
    return mps
  }
}

export const convertPressure = (mb, targetUnit = null) => {
  if (mb === null || mb === undefined) return null

  try {
    const unit = targetUnit || appConfig.weatherflow.display.pressureUnit
    if (unit === 'mb' || unit === 'hPa') return mb

    // Handle inHg conversion manually since convert-units doesn't support it
    if (unit === 'inHg') {
      // Convert hPa to inHg: 1 hPa = 0.02953 inHg
      return mb * 0.02953
    }

    // Try standard conversion for other units
    return convert(mb).from('hPa').to(unit)
  } catch (error) {
    logger.warn('Pressure conversion failed:', error)
    return mb
  }
}

export const convertPrecipitation = (mm, targetUnit = null) => {
  if (mm === null || mm === undefined) return null

  try {
    const unit = targetUnit || appConfig.weatherflow.display.precipitationUnit
    if (unit === 'mm') return mm

    return convert(mm).from('mm').to(unit)
  } catch (error) {
    logger.warn('Precipitation conversion failed:', error)
    return null
  }
}

export const convertDistance = (km, targetUnit = null) => {
  if (km === null || km === undefined) return null

  try {
    const unit =
      targetUnit ||
      (appConfig.weatherflow.display.windUnit === 'mph' ? 'mi' : 'km')
    if (unit === 'km') return km

    return convert(km).from('km').to(unit)
  } catch (err) {
    logger.warn('Distance conversion failed:', err)
    return km
  }
}

// ============================================================================
// COMMON UTILITIES (using lodash-es and other packages)
// ============================================================================

export const getWindDirection = degrees => {
  if (!degrees || degrees < 0 || degrees > 360) return ''
  return cardinalFromDegree(degrees, CardinalSubset.Intercardinal)
}

export const formatWindSpeed = (speed, direction, unitSymbol) => {
  if (!speed || speed === 0) return 'Calm'

  const formattedSpeed = numeral(speed).format('0.00')
  const directionText = direction ? getWindDirection(direction) : ''

  return `${directionText} @ ${formattedSpeed} ${unitSymbol}`.trim()
}

export const getPressureTrendIcon = trend => {
  const iconMap = {
    rising: 'mdi:trending-up',
    falling: 'mdi:trending-down',
    steady: 'mdi:trending-neutral',
  }
  return iconMap[trend] || 'mdi:trending-neutral'
}

// Performance utilities from lodash-es
export { debounce, throttle }

// Deep merge from lodash-es
export const deepMerge = merge

// ============================================================================
// FORMATTING UTILITIES (using numeral)
// ============================================================================

export const safeJsonParse = (str, fallback = null) => {
  try {
    return JSON.parse(str)
  } catch (error) {
    logger.warn('JSON parse failed:', error.message)
    return fallback
  }
}

export const formatNumber = (value, precision = 1) => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A'

  const formatString = `0.${'0'.repeat(precision)}`
  return numeral(value).format(formatString)
}

export const formatValue = (value, unit) => {
  if (value === null || value === undefined) return 'N/A'

  const precisionMap = {
    pressure: appConfig.weatherflow.display.pressureUnit === 'inHg' ? 2 : 1,
    temperature: 0,
    wind: 0,
    humidity: 0,
    uv: 0,
    precipitation: 2,
  }

  const precision = precisionMap[unit] ?? 1
  return formatNumber(value, precision)
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const isInRange = (value, min, max) => {
  return value >= min && value <= max
}

export const getConditionalClass = (condition, trueClass, falseClass = '') => {
  return condition ? trueClass : falseClass
}

// Get unit symbols for display
export const getUnitSymbol = measurementType => {
  const unitMap = {
    temperature:
      appConfig.weatherflow.display.temperatureUnit === 'F' ? '°F' : '°C',
    wind: appConfig.weatherflow.display.windUnit === 'mph' ? 'mph' : 'km/h',
    pressure:
      appConfig.weatherflow.display.pressureUnit === 'inHg' ? 'inHg' : 'hPa',
    humidity: '%',
    uv: '',
    precipitation:
      appConfig.weatherflow.display.precipitationUnit === 'in' ? 'in' : 'mm',
    distance: appConfig.weatherflow.display.windUnit === 'mph' ? 'mi' : 'km',
  }

  return unitMap[measurementType] || ''
}

// Convert all weather data to configured units
export const convertWeatherData = weatherData => {
  if (!weatherData) return weatherData

  const conversions = {
    temperature: 'temperature',
    feelsLike: 'temperature',
    dewPoint: 'temperature',
    heatIndex: 'temperature',
    windChill: 'temperature',
    wetBulbTemperature: 'temperature',
    windSpeed: 'wind',
    windGust: 'wind',
    windLull: 'wind',
    pressure: 'pressure',
    precipitation: 'precipitation',
    lightningAvgDistance: 'distance',
  }

  const converted = { ...weatherData }

  Object.entries(conversions).forEach(([key, type]) => {
    if (weatherData[key] !== null && weatherData[key] !== undefined) {
      const converter = {
        temperature: convertTemperature,
        wind: convertWindSpeed,
        pressure: convertPressure,
        precipitation: convertPrecipitation,
        distance: convertDistance,
      }[type]

      if (converter) {
        converted[key] = converter(weatherData[key])
      }
    }
  })

  return converted
}

// Weather icon utilities
export const getWeatherIcon = description => {
  if (!description) return 'mdi:weather-sunny'
  const desc = description.toLowerCase()

  if (
    desc.includes('rain') ||
    desc.includes('drizzle') ||
    desc.includes('shower')
  ) {
    if (desc.includes('storm') || desc.includes('thunder'))
      return 'mdi:weather-lightning-rainy'
    return 'mdi:weather-rainy'
  }
  if (desc.includes('snow') || desc.includes('sleet'))
    return 'mdi:weather-snowy'
  if (desc.includes('cloud')) {
    if (desc.includes('sun') || desc.includes('partly'))
      return 'mdi:weather-partly-cloudy'
    return 'mdi:weather-cloudy'
  }
  if (desc.includes('storm') || desc.includes('thunder'))
    return 'mdi:weather-lightning-rainy'
  if (desc.includes('fog') || desc.includes('mist') || desc.includes('haze'))
    return 'mdi:weather-fog'
  if (desc.includes('sun') || desc.includes('clear') || desc.includes('fair'))
    return 'mdi:weather-sunny'

  return 'mdi:weather-sunny' // Default
}
