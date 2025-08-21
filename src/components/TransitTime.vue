<template>
  <div class="mt-6 w-fit">
    <!-- Transit Times Header -->
    <h2 class="text-lg font-light text-white mb-1 drop-shadow-lg uppercase">
      Transit Times
    </h2>

    <!-- Skeleton Loading State -->
    <div v-if="isLoading" class="space-y-0">
      <div v-for="i in 2" :key="i" class="animate-pulse">
        <div class="flex items-start">
          <!-- Car Icon Skeleton -->
          <div class="flex-shrink-0 mr-3 mt-1">
            <div class="w-6 h-6 bg-white/20 rounded"></div>
          </div>

          <!-- Transit Information Skeleton -->
          <div class="flex-1">
            <div class="w-32 h-6 bg-white/20 rounded mb-2"></div>
            <div class="w-48 h-4 bg-white/20 rounded ml-2"></div>
          </div>
        </div>

        <!-- Separator line (except for last item) -->
        <div v-if="i < 2" class="w-auto h-px bg-white/20 my-2"></div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-4">
      <div class="text-gray-400 text-sm">Unable to load transit times</div>
    </div>

    <div v-else-if="hasTransitData" class="space-y-0">
      <div
        v-for="(destination, index) in Object.values(transitData)"
        :key="destination.id"
      >
        <div class="flex items-start">
          <!-- Car Icon -->
          <div class="flex-shrink-0 mr-3 mt-1">
            <Icon
              :icon="getIconName('mdi:car')"
              class="w-6 h-6 text-white drop-shadow-lg"
            />
          </div>

          <!-- Transit Information -->
          <div class="flex-1">
            <div class="text-xl text-white font-medium drop-shadow-lg">
              <span v-if="destination.hasError" class="text-red-300">
                {{ destination.duration }} to {{ destination.name }}
              </span>
              <span v-else>
                {{ destination.duration }} to {{ destination.name }}
              </span>
            </div>
            <div
              v-if="destination.route && !destination.hasError"
              class="text-sm text-gray-300 drop-shadow-lg"
            >
              {{ destination.route }}
            </div>
            <div
              v-if="destination.hasError"
              class="text-sm text-red-300 drop-shadow-lg"
            >
              {{ destination.error }}
            </div>
          </div>
        </div>

        <!-- Separator line (except for last item) -->
        <div
          v-if="index < Object.values(transitData).length - 1"
          class="w-auto h-px bg-white opacity-30 my-2"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { onMounted, onUnmounted } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useTransitStore } from '../stores/transit'
  import { Icon } from '@iconify/vue'
  import { getIconName } from '../utils/iconUtils'

  const transitStore = useTransitStore()

  // Use storeToRefs to maintain reactivity
  const { transitData, isLoading, error, hasTransitData } =
    storeToRefs(transitStore)

  onMounted(async () => {
    await transitStore.updateTransitTimes()
    transitStore.startPeriodicRefresh()
  })

  onUnmounted(() => {
    transitStore.stopPeriodicRefresh()
  })
</script>
