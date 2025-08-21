<template>
  <div class="text-white text-left">
    <div class="flex items-center drop-shadow-lg">
      <!-- Main time display (hours and minutes) -->
      <div class="text-8xl font-thin">
        {{ timeDisplay }}
      </div>

      <!-- Seconds and AM/PM stacked -->
      <div class="flex flex-col ml-4 items-start justify-center h-full">
        <div class="text-4xl font-thin">
          {{ seconds }}
        </div>
        <div class="text-3xl font-thin">{{ ampm }}</div>
      </div>
    </div>

    <div class="text-2xl font-medium font-thin drop-shadow-lg">
      {{ currentDate }}
    </div>
  </div>
</template>

<script setup>
  import { onMounted, onUnmounted } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useClockStore } from '../stores/clock'

  const clockStore = useClockStore()

  // Use storeToRefs to maintain reactivity
  const { timeDisplay, seconds, ampm, currentDate } = storeToRefs(clockStore)

  onMounted(() => {
    // Start periodic refresh
    clockStore.startPeriodicRefresh()
  })

  onUnmounted(() => {
    // Stop periodic refresh
    clockStore.stopPeriodicRefresh()
  })
</script>

<style scoped>
  /* No custom styles needed - using Tailwind classes */
</style>
