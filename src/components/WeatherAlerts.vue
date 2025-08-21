<template>
  <!-- Weather Alerts Container - Only show when not loading and has alerts -->
  <Transition name="alert-fade" appear>
    <div v-if="shouldShow" class="fixed bottom-0 left-0 right-0 z-20">
      <div class="bg-red-900/80 backdrop-blur-sm border-t-2 border-red-600">
        <div class="container mx-auto px-4 py-3">
          <!-- Multiple alerts header -->
          <div
            v-if="alertCount && alertCount > 1"
            class="flex items-center justify-between mb-2"
          >
            <div class="text-lg font-thin uppercase text-white">
              {{ alertCount }} Active Weather Alerts
            </div>
            <div class="flex items-center space-x-2">
              <div class="text-sm opacity-75 text-white">
                {{ (currentAlertIndex || 0) + 1 }} of {{ alertCount }}
              </div>
              <!-- Rotation indicator dots -->
              <div class="flex space-x-1">
                <div
                  v-for="(alert, index) in alerts || []"
                  :key="alert.id"
                  class="w-2 h-2 rounded-full transition-all duration-300"
                  :class="
                    index === (currentAlertIndex || 0)
                      ? 'bg-white'
                      : 'bg-white/30'
                  "
                ></div>
              </div>
            </div>
          </div>

          <!-- Alert content (single or current from multiple) -->
          <div
            v-if="displayAlert"
            class="flex items-center justify-between text-white"
          >
            <div class="flex items-center flex-1">
              <div>
                <div class="text-lg font-semibold transition-all duration-300">
                  {{ displayAlert.event }}
                </div>
                <div class="text-sm opacity-90 transition-all duration-300">
                  {{ displayAlert.headline }}
                </div>
              </div>
            </div>
            <div class="text-right ml-4">
              <div class="text-sm opacity-75 transition-all duration-300">
                Until {{ displayAlert.formattedExpires }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
  import { onMounted, onUnmounted, computed } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useWeatherAlertsStore } from '../stores/weatherAlerts'

  const weatherAlertsStore = useWeatherAlertsStore()

  // Use storeToRefs to maintain reactivity for reactive properties
  const {
    alerts,
    currentAlert,
    currentAlertIndex,
    hasAlerts,
    alertCount,
    isLoading,
  } = storeToRefs(weatherAlertsStore)
  const { fetchAlerts, rotateAlerts } = weatherAlertsStore

  // Debug logging removed for production cleanliness

  // Computed property to determine which alert to display
  const displayAlert = computed(() => {
    // Add comprehensive safety checks
    if (
      !alerts?.value ||
      !Array.isArray(alerts.value) ||
      alerts.value.length === 0
    ) {
      return null
    }
    if (!alertCount?.value) {
      return null
    }
    if (alertCount.value === 1) {
      return alerts.value[0]
    }
    if (!currentAlert?.value) {
      return null
    }
    return currentAlert.value
  })

  // Computed property to determine if we should show the component
  // This prevents flashing by ensuring we only show when we have actual alerts
  const shouldShow = computed(() => {
    // Add comprehensive safety checks
    if (isLoading?.value === true) {
      return false
    }
    if (!hasAlerts?.value) {
      return false
    }
    if (!displayAlert.value) {
      return false
    }
    return true
  })

  onMounted(() => {
    // Fetch alerts immediately
    fetchAlerts()

    // Start periodic refresh and rotation
    weatherAlertsStore.startPeriodicRefresh()
  })

  onUnmounted(() => {
    // Stop periodic refresh and rotation
    weatherAlertsStore.stopPeriodicRefresh()
  })
</script>

<style scoped>
  /* Transition styles for smooth alert appearance */
  .alert-fade-enter-active,
  .alert-fade-leave-active {
    transition: all 0.3s ease;
  }

  .alert-fade-enter-from {
    opacity: 0;
    transform: translateY(100%);
  }

  .alert-fade-leave-to {
    opacity: 0;
    transform: translateY(100%);
  }
</style>
