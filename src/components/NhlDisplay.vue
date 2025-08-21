<template>
  <div
    class="grid grid-cols-3 gap-1 bg-stone-800/70 backdrop-blur-xs rounded-lg p-3 text-white items-center"
    v-if="!isLoading && event && event.awayTeam && event.homeTeam"
  >
    <div class="col-span-3 text-center">
      <p class="text-sm font-light uppercase">
        {{
          event.awayTeam.placeName?.default || event.awayTeam.placeName || 'TBD'
        }}
        {{
          event.awayTeam.commonName?.default ||
          event.awayTeam.commonName ||
          'TBD'
        }}
        @
        {{
          event.homeTeam.placeName?.default || event.homeTeam.placeName || 'TBD'
        }}
        {{
          event.homeTeam.commonName?.default ||
          event.homeTeam.commonName ||
          'TBD'
        }}
      </p>
      <p class="text-xs font-thin">
        <span v-if="nextUpdateFormatted"
          >next update in {{ nextUpdateFormatted }}</span
        >
      </p>
    </div>
    <div class="text-center flex flex-col items-center">
      <img
        class="max-w-24 h-auto"
        :src="event.awayTeam.darkLogo || event.awayTeam.logo"
      />
      <p class="text-base font-thin">
        {{
          event.awayTeam.commonName?.default ||
          event.awayTeam.commonName ||
          'TBD'
        }}
      </p>
      <p class="text-sm" v-if="event.awayTeam.record">
        {{ event.awayTeam.record }}
      </p>
    </div>

    <div class="text-center">
      <!-- Game Status -->
      <div
        v-if="isGameFinished(gameState)"
        class="text-base font-light uppercase"
      >
        Final{{ event.periodDescriptor?.periodType == 'OT' ? '/OT' : '' }}
      </div>

      <div v-else-if="isGameActive(gameState)">
        <div v-if="event.clock && !event.clock.inIntermission">
          <p class="text-base font-thin">
            <Icon
              :icon="
                getIconName(
                  event.clock.running ? 'mdi:loading' : 'mdi:clock-outline'
                )
              "
              class="w-4 h-4 text-white/70"
            />
            {{ event.clock.timeRemaining || '--:--' }}
          </p>
          <p class="text-xs uppercase font-thin">{{ getCurrentPeriod() }}</p>
        </div>
        <div v-else>
          <p>
            <Icon
              :icon="getIconName('mdi:loading')"
              class="w-6 h-6 animate-spin"
            />
            {{ event.clock?.timeRemaining || '--:--' }}
          </p>
          <p class="text-xs uppercase font-thin">{{ getCurrentPeriod() }}</p>
        </div>
      </div>

      <!-- Future Game Time -->
      <div v-if="event.gameState == 'FUT'">
        <p class="text-base font-light">
          {{ formatGameTime(event.startTimeUTC) }}
        </p>
        <p class="text-sm font-light">
          {{ formatGameTime(event.startTimeUTC, 'h:mm A') }}
        </p>
      </div>

      <!-- Scores -->
      <div v-if="shouldShowScores(gameState)">
        <div class="text-2xl font-light">
          {{ event.awayTeam.score || 0 }} - {{ event.homeTeam.score || 0 }}
        </div>
        <div
          v-if="isGameActive(gameState)"
          class="border border-white mt-2 p-1 rounded"
        >
          <p class="text-xs font-thin uppercase">Shots on Goal</p>
          <p class="text-sm">
            {{ event.awayTeam.sog || 0 }} - {{ event.homeTeam.sog || 0 }}
          </p>
        </div>
      </div>
    </div>

    <div class="text-center flex flex-col items-center">
      <img class="max-w-24 h-auto" :src="getTeamLogo(event.homeTeam)" />
      <p class="text-base font-thin">{{ getTeamName(event.homeTeam) }}</p>
      <p class="text-sm" v-if="event.homeTeam.record">
        {{ event.homeTeam.record }}
      </p>
    </div>
    <div class="col-span-3 w-full h-px bg-white opacity-30 my-2"></div>
    <div v-if="shouldShowVenueInfo(gameState)" class="self-start">
      <p class="text-xs uppercase">Venue</p>
      <p class="text-sm">{{ event.venue?.default || event.venue || 'TBD' }}</p>
      <p class="text-xs font-light">
        {{ event.venueLocation?.default || event.venueLocation || '' }}
      </p>
    </div>

    <div
      v-if="shouldShowVenueInfo(gameState)"
      class="col-span-2 self-start text-right"
    >
      <p class="text-xs uppercase">Broadcasts</p>
      <p class="text-xs font-light">{{ getBroadcastNetworks() }}</p>
    </div>
    <div
      v-if="nextGame && event.gameState != 'FUT'"
      class="col-span-3 text-center"
    >
      <p
        class="uppercase"
        :class="isGameFinished(gameState) ? 'text-sm' : 'text-xs'"
      >
        Next Game
      </p>
      <p
        class="font-thin"
        :class="isGameFinished(gameState) ? 'text-sm' : 'text-xs'"
      >
        {{ getTeamName(nextGame.awayTeam) }} @
        {{ getTeamName(nextGame.homeTeam) }},
        {{ formatGameTime(nextGame.startTimeUTC) }} @
        {{ formatGameTime(nextGame.startTimeUTC, 'h:mm A') }}
      </p>
    </div>
  </div>
  <div
    class="grid gap-1 bg-stone-800/70 backdrop-blur-xs rounded-lg p-3 text-white items-center"
    v-else-if="isLoading"
  >
    <!-- Skeleton Loading State -->
    <div class="grid grid-cols-3 gap-1 w-full max-w-2xl mx-auto">
      <!-- Header Row -->
      <div class="col-span-3 text-center">
        <div class="h-4 bg-gray-600 rounded animate-pulse w-40 mx-auto"></div>
        <div
          class="h-3 bg-gray-600 rounded animate-pulse w-28 mx-auto mt-2"
        ></div>
      </div>

      <!-- Team and Info Row -->
      <div class="text-center flex flex-col items-center">
        <div class="w-20 h-20 bg-gray-600 rounded animate-pulse"></div>
        <div class="h-4 bg-gray-600 rounded animate-pulse w-16 mt-2"></div>
        <div class="h-3 bg-gray-600 rounded animate-pulse w-12 mt-1"></div>
      </div>

      <div class="text-center">
        <div class="h-6 bg-gray-600 rounded animate-pulse w-16 mx-auto"></div>
        <div
          class="h-4 bg-gray-600 rounded animate-pulse w-20 mx-auto mt-2"
        ></div>
        <div
          class="h-8 bg-gray-600 rounded animate-pulse w-24 mx-auto mt-3"
        ></div>
      </div>

      <div class="text-center flex flex-col items-center">
        <div class="w-20 h-20 bg-gray-600 rounded animate-pulse"></div>
        <div class="h-4 bg-gray-600 rounded animate-pulse w-16 mt-2"></div>
        <div class="h-3 bg-gray-600 rounded animate-pulse w-12 mt-1"></div>
      </div>

      <!-- Venue and Broadcast Row -->
      <div class="self-start">
        <div class="h-3 bg-gray-600 rounded animate-pulse w-12"></div>
        <div class="h-4 bg-gray-600 rounded animate-pulse w-20 mt-1"></div>
        <div class="h-3 bg-gray-600 rounded animate-pulse w-16 mt-1"></div>
      </div>

      <div class="col-span-2 self-start text-right">
        <div class="h-3 bg-gray-600 rounded animate-pulse w-16 ml-auto"></div>
        <div
          class="h-3 bg-gray-600 rounded animate-pulse w-20 ml-auto mt-1"
        ></div>
      </div>
    </div>
  </div>

  <div
    class="grid gap-1 bg-stone-800/70 backdrop-blur-xs rounded-lg p-3 text-white items-center"
    v-else-if="!event"
  >
    <div class="flex flex-col items-center text-center">
      <p class="text-sm font-light uppercase">Carolina Hurricanes Hockey</p>
      <p class="text-xs font-thin">
        <span v-if="nextUpdateFormatted"
          >next update in {{ nextUpdateFormatted }}</span
        >
        <span v-else>loading...</span>
      </p>
      <img
        class="max-w-40 h-auto"
        src="https://assets.nhle.com/logos/nhl/svg/CAR_dark.svg"
      />
      <p class="text-sm font-light uppercase">No Upcoming Games</p>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useNhlStore } from '../stores/nhl'
  import { formatDistanceToNow, format, parseISO } from 'date-fns'
  import { formatDuration } from '../utils/simplifiedUtils'
  import { Icon } from '@iconify/vue'
  import { getIconName } from '../utils/iconUtils'

  const nhlStore = useNhlStore()
  const { event, nextGame, refreshInterval, last_update, isLoading } =
    storeToRefs(nhlStore)

  const nextUpdateFormatted = ref()

  // Computed properties to reduce template complexity
  const gameState = computed(() => event.value?.gameState)

  // Format game time using date-fns
  const formatGameTime = (timeString, formatStr = 'MMM d') => {
    if (!timeString) return 'TBD'
    try {
      const date = parseISO(timeString)
      return format(date, formatStr)
    } catch (error) {
      return 'TBD'
    }
  }

  // Get current period description
  const getCurrentPeriod = () => {
    if (!event.value) return ''
    const game = event.value

    if (game.periodDescriptor?.periodType === 'OT') return 'Overtime'
    if (game.periodDescriptor?.periodType === 'SO') return 'Shootout'

    const period = game.periodDescriptor?.periodNumber || 1
    if (period === 1) return '1st Period'
    if (period === 2) return '2nd Period'
    if (period === 3) return '3rd Period'
    return `${period}th Period`
  }

  // Get broadcast networks
  const getBroadcastNetworks = () => {
    if (!event.value?.tvBroadcasts || event.value.tvBroadcasts.length === 0) {
      return 'TBD'
    }
    return event.value.tvBroadcasts
      .map(broadcast => broadcast.network)
      .join(', ')
  }

  // Helper functions to reduce template complexity
  const isGameActive = gameState => {
    return ['LIVE', 'CRIT', 'PRE'].includes(gameState)
  }

  const isGameFinished = gameState => {
    return ['FINAL', 'OFF'].includes(gameState)
  }

  const shouldShowScores = gameState => {
    return isGameActive(gameState) || isGameFinished(gameState)
  }

  const shouldShowVenueInfo = gameState => {
    return !isGameFinished(gameState)
  }

  const getTeamLogo = team => {
    return team.darkLogo || team.logo
  }

  const getTeamName = (team, type = 'commonName') => {
    return team[type]?.default || team[type] || 'TBD'
  }

  // Update time displays every second
  let updateInterval
  onMounted(() => {
    // Start the store's periodic refresh
    nhlStore.startPeriodicRefresh()

    // Update time displays every second
    updateInterval = setInterval(() => {
      // Calculate next update time
      if (refreshInterval.value) {
        try {
          const now = new Date()
          const nextUpdate = new Date(now.getTime() + refreshInterval.value)
          nextUpdateFormatted.value = formatDistanceToNow(nextUpdate, {
            addSuffix: false,
          })
        } catch (error) {
          nextUpdateFormatted.value = ''
        }
      }
    }, 1000)
  })

  onUnmounted(() => {
    // Stop the store's periodic refresh
    nhlStore.stopPeriodicRefresh()

    // Clear the display update interval
    if (updateInterval) {
      clearInterval(updateInterval)
    }
  })
</script>
