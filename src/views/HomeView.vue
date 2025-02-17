<template>
  <VideoBackground style="z-index: -1" />
  <div class="container">
    <div class="main">
      <div class="left">
        <DigitalClock />
        <EventCalendar />
      </div>
      <div class="right">
        <CurrentWeather />
        <NhlDisplay />
      </div>
    </div>
    <div class="lower">
      <CurrentAlerts />
    </div>
  </div>
</template>

<script setup>
import VideoBackground from '@/components/common/VideoBackground.vue'
import DigitalClock from '@/components/widgets/DigitalClock.vue'
import CurrentWeather from '@/components/widgets/CurrentWeather.vue'
import CurrentAlerts from '@/components/widgets/CurrentAlerts.vue'
import EventCalendar from '@/components/widgets/EventCalendar.vue'
import NhlDisplay from '@/components/widgets/NhlDisplay.vue'
</script>
