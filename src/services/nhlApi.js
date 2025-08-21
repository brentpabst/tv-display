import { createLogger } from '../utils/logger'
import { fetchWithProxy } from '../utils/proxyUtils'

const logger = createLogger('NhlApi')

export const nhlApiService = {
  isAvailable() {
    return true // NHL API is public, no key required
  },

  async getCarolinaSchedule() {
    try {
      const url = 'https://api-web.nhle.com/v1/club-schedule/car/week/now'
      logger.info('Fetching Carolina Hurricanes schedule', { url })

      const response = await fetchWithProxy(url)

      if (!response.ok) {
        const errorMsg = `HTTP error! status: ${response.status}`
        logger.error('NHL Carolina schedule HTTP error', {
          status: response.status,
          url,
        })
        throw new Error(errorMsg)
      }

      const data = await response.json()
      const games = data.games || []
      logger.info('Successfully retrieved Carolina schedule', {
        gameCount: games.length,
        url,
        responseSize: JSON.stringify(data).length,
      })

      return games
    } catch (error) {
      logger.error('NHL Carolina schedule API error:', error)
      throw new Error(`Failed to get Carolina schedule: ${error.message}`)
    }
  },

  async getGameDetails(gameId) {
    try {
      const url = `https://api-web.nhle.com/v1/gamecenter/${gameId}/landing`
      logger.info('Fetching NHL game details', { gameId, url })

      const response = await fetchWithProxy(url)

      if (!response.ok) {
        const errorMsg = `HTTP error! status: ${response.status}`
        logger.error('NHL game details HTTP error', {
          status: response.status,
          gameId,
          url,
        })
        throw new Error(errorMsg)
      }

      const data = await response.json()
      logger.info('Successfully retrieved NHL game details', {
        gameId,
        gameState: data.gameState,
        awayTeam: data.awayTeam?.commonName?.default,
        homeTeam: data.homeTeam?.commonName?.default,
        startTime: data.startTimeUTC,
        responseSize: JSON.stringify(data).length,
      })

      return data
    } catch (error) {
      logger.error('NHL game details API error:', error)
      throw new Error(`Failed to get game details: ${error.message}`)
    }
  },
}
