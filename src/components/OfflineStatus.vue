<template>
  <!-- Offline / Connectivity Banner -->
  <Transition name="alert-fade" appear>
    <div v-if="shouldShow" class="fixed top-0 left-0 right-0 z-20">
      <div class="bg-amber-900/80 backdrop-blur-sm border-b-2 border-amber-600">
        <div class="container mx-auto px-4 py-3">
          <div class="flex items-center justify-between text-white">
            <div class="flex items-center space-x-3">
              <Icon
                :icon="
                  offlineStore.isOffline
                    ? getIconName('mdi:wifi-off')
                    : getIconName('mdi:wifi-strength-1')
                "
                class="text-yellow-300 text-xl flex-shrink-0"
              />
              <div>
                <div class="text-lg font-thin uppercase">
                  {{
                    offlineStore.isOffline ? 'Offline' : 'Limited Connectivity'
                  }}
                </div>
                <div class="text-sm opacity-90">
                  <span>
                    {{
                      offlineStore.isOffline
                        ? 'Using cached data'
                        : 'Data may be outdated'
                    }}
                  </span>
                  <span
                    v-if="offlineStore.lastUpdateTime"
                    class="ml-2 opacity-75"
                  >
                    • Last updated
                    {{ formatTimeAgo(offlineStore.lastUpdateTime) }}
                  </span>
                </div>
              </div>
            </div>

            <div
              v-if="offlineStore.isRecovering"
              class="flex items-center space-x-2"
            >
              <Icon
                :icon="getIconName('mdi:sync')"
                class="text-blue-300 text-xl"
              />
              <span class="text-sm text-blue-200">Reconnecting…</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
  import { computed } from 'vue'
  import { Icon } from '@iconify/vue'
  import { useOfflineStateStore } from '../stores/offlineState'
  import { formatTimeAgo } from '../utils/simplifiedUtils'
  import { getIconName } from '../utils/iconUtils'

  const offlineStore = useOfflineStateStore()

  // Show when offline, recovering, or data is stale
  const shouldShow = computed(() => {
    return (
      offlineStore.isOffline ||
      offlineStore.isRecovering ||
      offlineStore.hasStaleData
    )
  })
</script>

<style scoped>
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
