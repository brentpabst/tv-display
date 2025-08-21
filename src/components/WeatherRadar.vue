<template>
  <div v-if="shouldShow" class="weather-radar-container">
    <div class="radar-map-container">
      <img
        class="w-100 h-100"
        src="https://radar.weather.gov/ridge/standard/KRAX_loop.gif?refreshed=1754954769170"
        alt="Weather Radar"
      />
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useWeatherAlertsStore } from '../stores/weatherAlerts'

  const weatherAlertsStore = useWeatherAlertsStore()

  // Only show the component when there are active weather alerts
  const shouldShow = computed(() => weatherAlertsStore.hasAlerts)
</script>
