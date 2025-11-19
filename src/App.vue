<script setup>
  import { ref, computed } from 'vue'
  import VideoBackground from './components/VideoBackground.vue'
  import Clock from './components/Clock.vue'
  import WeatherAlerts from './components/WeatherAlerts.vue'
  import OfflineStatus from './components/OfflineStatus.vue'
  import CurrentWeather from './components/CurrentWeather.vue'
  import WeatherRadar from './components/WeatherRadar.vue'
  import WifiInfo from './components/WifiInfo.vue'
  import Calendar from './components/Calendar.vue'
  import TransitTime from './components/TransitTime.vue'
  import NhlDisplay from './components/NhlDisplay.vue'
  import ConsoleLogDisplay from './components/ConsoleLogDisplay.vue'

  import { useWeatherAlertsStore } from './stores/weatherAlerts'
  const weatherAlertsStore = useWeatherAlertsStore()

  // Dynamic positioning for bottom components when alerts are active
  const bottomPositionClass = computed(() => {
    return weatherAlertsStore.hasAlerts
      ? 'bottom-32' // Move up when alerts are showing
      : 'bottom-8' // Normal position
  })
</script>

<template>
  <div class="relative w-full h-screen">
    <VideoBackground />

    <!-- Offline status overlay -->
    <OfflineStatus />

    <!-- Clock overlay -->
    <div class="left-column absolute top-8 left-8 z-10">
      <Clock />
      <Calendar />
      <TransitTime />
    </div>

    <!-- Weather Radar overlay -->
    <div :class="`absolute ${bottomPositionClass} left-8 z-10`">
      <WeatherRadar />
    </div>

    <!-- Weather overlay -->
    <div class="absolute top-8 right-8 z-10">
      <CurrentWeather />
      <div class="mt-6"></div>
      <NhlDisplay />
    </div>

    <!-- WiFi Info overlay -->
    <div :class="`absolute ${bottomPositionClass} right-8 z-10`">
      <WifiInfo />
    </div>

    <!-- Weather alerts overlay -->
    <WeatherAlerts />

    <!-- Console log display -->
    <ConsoleLogDisplay />
  </div>
</template>

<style scoped></style>
