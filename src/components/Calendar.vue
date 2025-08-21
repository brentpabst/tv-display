<template>
  <div class="mt-6">
    <!-- Calendar Header -->
    <h2 class="text-lg font-light text-white mb-1 drop-shadow-lg uppercase">
      upcoming events
    </h2>

    <!-- Skeleton Loading State -->
    <div v-if="isLoading" class="flex gap-3">
      <div
        v-for="day in 3"
        :key="day"
        class="flex-1 flex flex-col animate-pulse"
      >
        <!-- Day Header Skeleton -->
        <div class="text-left mb-2">
          <div class="w-8 h-8 bg-white/20 rounded mb-1"></div>
          <div class="w-16 h-3 bg-white/20 rounded"></div>
          <div class="w-full h-px bg-white/20 mt-1"></div>
        </div>

        <!-- Events Container Skeleton -->
        <div class="space-y-2">
          <!-- Event Skeleton 1 -->
          <div class="bg-white/10 rounded-lg p-2">
            <div class="w-20 h-2 bg-white/20 rounded mb-1"></div>
            <div class="w-32 h-3 bg-white/20 rounded mb-1"></div>
            <div class="w-24 h-2 bg-white/20 rounded"></div>
          </div>

          <!-- Event Skeleton 2 -->
          <div class="bg-white/10 rounded-lg p-2">
            <div class="w-24 h-2 bg-white/20 rounded mb-1"></div>
            <div class="w-28 h-3 bg-white/20 rounded mb-1"></div>
            <div class="w-20 h-2 bg-white/20 rounded"></div>
          </div>

          <!-- Event Skeleton 3 -->
          <div class="bg-white/10 rounded-lg p-2">
            <div class="w-16 h-2 bg-white/20 rounded mb-1"></div>
            <div class="w-36 h-3 bg-white/20 rounded mb-1"></div>
            <div class="w-28 h-2 bg-white/20 rounded"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-6">
      <div class="text-gray-400 text-sm">Unable to load calendar events</div>
    </div>

    <!-- Calendar Content -->
    <div v-else-if="hasEvents" class="flex gap-3">
      <!-- Day Column Template -->
      <div
        v-for="(day, index) in displayDays"
        :key="day.date"
        class="flex-1 flex flex-col"
      >
        <!-- Day Header -->
        <div class="text-left mb-2">
          <span class="text-2xl font-light text-white">{{
            day.dayNumber
          }}</span>
          <span class="text-xs font-medium text-gray-300 ml-1 uppercase">{{
            day.dayName
          }}</span>
          <div class="w-full h-px bg-gray-400"></div>
        </div>

        <!-- Events Container -->
        <div class="space-y-1">
          <!-- All-Day Events -->
          <div
            v-for="event in day.allDayEvents"
            :key="event.id"
            class="bg-stone-800/70 backdrop-blur-xs border-l-4 border-green-500 rounded-r-lg p-1.5"
          >
            <div class="text-xs text-gray-400 font-medium">All day</div>
            <div class="text-xs text-white font-medium">{{ event.title }}</div>
            <div
              v-if="event.source"
              class="text-xs text-gray-500 mt-0.5 italic"
            >
              {{ event.source }}
            </div>
          </div>

          <!-- Timed Events -->
          <div
            v-for="event in day.timedEvents"
            :key="event.id"
            class="bg-stone-800/70 backdrop-blur-xs border-l-4 rounded-r-lg p-1.5"
            :class="getEventColorClass(event.color)"
          >
            <div class="text-xs text-gray-400 font-medium">
              {{ formatEventTime(event) }}
            </div>
            <div class="text-xs text-white font-medium">{{ event.title }}</div>
            <div
              v-if="event.source"
              class="text-xs text-gray-500 mt-0.5 italic"
            >
              {{ event.source }}
            </div>
          </div>

          <!-- No Events Placeholder -->
          <div
            v-if="day.allDayEvents.length === 0 && day.timedEvents.length === 0"
            class="text-center py-2"
          >
            <div class="text-xs text-gray-300">No events</div>
          </div>
        </div>
      </div>
    </div>

    <!-- No Events State -->
    <div v-else class="text-center py-6">
      <div class="text-gray-400 text-sm">No upcoming events found</div>
    </div>
  </div>
</template>

<script setup>
  import { onMounted, onUnmounted } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useCalendarStore } from '../stores/calendar'

  // Safely format time ranges, collapsing midnight-midnight to "All day"
  const formatEventTime = event => {
    if (!event) return ''
    if (event.allDay || event.type === 'all-day') return 'All day'
    const start = event.startTime || ''
    const end = event.endTime || ''
    // Some feeds may provide 12:00 AM to 12:00 AM for all-day — collapse it
    const isMidnight = t => t === '12:00 AM'
    if (isMidnight(start) && isMidnight(end)) return 'All day'
    if (start && end) return `${start} - ${end}`
    return start || end || ''
  }

  const calendarStore = useCalendarStore()

  // Destructure store properties
  const { displayDays, isLoading, error, hasEvents } =
    storeToRefs(calendarStore)

  // Get color class for event types
  const getEventColorClass = eventType => {
    const colorMap = {
      green: 'border-green-500',
      orange: 'border-orange-500',
      blue: 'border-blue-500',
      red: 'border-red-500',
      gray: 'border-gray-400',
    }

    return colorMap[eventType] || 'border-gray-500'
  }

  // Load events from store
  const loadEvents = () => {
    calendarStore.loadFromICalSources()
  }

  onMounted(() => {
    // Load events when component mounts
    loadEvents()

    // Start periodic refresh
    calendarStore.startPeriodicRefresh()
  })

  onUnmounted(() => {
    // Stop periodic refresh when component unmounts
    calendarStore.stopPeriodicRefresh()
  })
</script>

<style scoped>
  /* No custom styles needed - using Tailwind classes */
</style>
