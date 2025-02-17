<template>
  <div class="calendar">
    <div class="event" v-for="day in store.feeds" :key="day.id">
      <div class="event-date">
        <span class="small light day">{{ $filters.moment(day[0].start, 'D') }}</span>
        <span class="xsmall light">{{ $filters.moment(day[0].start, 'MMMM, dddd') }}</span>
      </div>
      <div class="event-title" v-for="item in day" :key="item.id">
        <p v-if="item.duration != 86400000" class="xsmall light">
          {{ $filters.moment(item.start, 'h:mma') }} -
          {{ $filters.moment(item.end, 'h:mma') }}
        </p>
        <p v-else class="xsmall light">All day</p>
        <p class="xsmall">{{ item.summary }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar {
  display: grid;
  gap: 1em;
  grid-auto-flow: column;
  grid-auto-columns: 0.2fr;
}

.calendar .event .event-date {
  padding-left: 5px;
}

.calendar .event .event-date .day {
  padding-right: 0.25em;
}

.calendar .event .event-title {
  padding: 5px 5px 5px 10px;
  background-color: var(--background-blur);
  border-radius: 5px;
  border-left: solid 5px white;
  margin-bottom: 10px;
}

.calendar .event .event-title p {
  margin: 0;
}
</style>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useCalendarFeedsStore } from '@/store/CalendarFeeds'

const store = useCalendarFeedsStore()
store.fetchFeeds()

onMounted(async () => {
  // Start updating data on an interval
  const intervalId = setInterval(
    () => {
      store.fetchFeeds()
    },
    import.meta.env.VITE_ICAL_SYNC_INTERVAL
  ) // Update every 1 minute
  onUnmounted(() => {
    // Stop updating data when the component is unmounted
    clearInterval(intervalId)
  })
})
</script>
