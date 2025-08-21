<template>
  <div v-if="hasWeatherData" class="text-white">
    <!-- Main Current Weather Display -->
    <div class="text-right mb-0">
      <div class="flex items-center justify-end space-x-4">
        <Icon
          :icon="getWeatherIcon(currentConditions?.icon || 'clear')"
          class="w-24 h-24 text-white"
        />
        <div
          v-if="currentWeather?.temperature !== null"
          class="text-8xl font-thin"
        >
          {{ formatNumber(currentWeather.temperature, 1) }}°
        </div>
        <div v-else class="w-32 h-32 bg-white/20 rounded animate-pulse"></div>
      </div>
    </div>

    <!-- Feels Like -->
    <div class="text-right mb-4">
      <span
        v-if="currentWeather?.feelsLike !== null"
        class="inline-flex items-center space-x-2 text-xl"
      >
        <Icon icon="mdi:thermometer" class="w-5 h-5 text-white" />
        <span>Feels like {{ formatNumber(currentWeather.feelsLike, 1) }}°</span>
      </span>
      <span
        v-else
        class="inline-block w-24 h-5 bg-white/20 rounded animate-pulse"
      ></span>
    </div>

    <!-- Lightning Alert -->
    <div v-if="showLightningAlert" class="mb-4 text-right">
      <div
        class="inline-flex items-center space-x-2 bg-yellow-500/20 border border-yellow-400/50 rounded-lg px-4 py-2 animate-pulse"
      >
        <Icon
          :icon="getIconName('mdi:lightning-bolt')"
          class="w-5 h-5 text-yellow-400"
        />
        <span class="text-yellow-300 text-sm">
          Lightning Detected
          <template v-if="lightningStrikes.length">
            {{
              lightningStrikes[lightningStrikes.length - 1].distance !== null
                ? `${lightningStrikes[lightningStrikes.length - 1].distance.toFixed(0)} ${getUnitSymbol('distance')} away`
                : ''
            }}
            <span>
              ({{
                formatTimeAgo(
                  lightningStrikes[lightningStrikes.length - 1].timestamp
                )
              }})
            </span>
          </template>
        </span>
      </div>
    </div>

    <!-- Weather Details -->
    <div class="mb-3 text-sm text-center">
      <!-- First Row: Wind, Sunrise -->
      <div class="flex items-center space-x-4 justify-center mb-1">
        <!-- Wind Speed -->
        <div class="flex items-center space-x-2">
          <Icon icon="mdi:weather-windy" class="w-4 h-4 text-white" />
          <span v-if="currentWeather?.windSpeed !== null">{{
            formatWindSpeedWithUnits(
              currentWeather.windSpeed,
              currentWeather.windDirection
            )
          }}</span>
          <span
            v-else
            class="w-16 h-4 bg-white/20 rounded animate-pulse"
          ></span>
        </div>

        <!-- Sunrise/Sunset -->
        <div class="flex items-center space-x-2">
          <Icon
            :icon="
              upcomingSunEvent?.type === 'Sunrise'
                ? 'mdi:weather-sunset-up'
                : 'mdi:weather-sunset-down'
            "
            class="w-4 h-4 text-white"
          />
          <span v-if="upcomingSunEvent">{{ upcomingSunEvent.time }}</span>
          <span
            v-else
            class="w-20 h-4 bg-white/20 rounded animate-pulse"
          ></span>
        </div>
      </div>

      <!-- Second Row: Feels Like, Pressure -->
      <div class="flex items-center space-x-4 justify-center">
        <!-- Humidity -->
        <div class="flex items-center space-x-2">
          <Icon icon="mdi:water-percent" class="w-4 h-4 text-white" />
          <span v-if="currentWeather?.humidity !== null"
            >{{ currentWeather?.humidity }}%</span
          >
        </div>

        <!-- Pressure -->
        <div class="flex items-center space-x-2">
          <Icon icon="mdi:gauge" class="w-4 h-4 text-white" />
          <span v-if="currentWeather?.pressure !== null">
            <span v-if="currentWeather?.pressureTrend !== null" class="mr-1">
              <Icon
                :icon="getPressureTrendIcon(currentWeather.pressureTrend)"
                class="w-3 h-3 inline"
              />
            </span>
            {{ formatValue(currentWeather.pressure, 'pressure') }}
            {{ getUnitSymbol('pressure') }}
          </span>
          <span
            v-else
            class="w-16 h-4 bg-white/20 rounded animate-pulse"
          ></span>
        </div>

        <!-- Rain Accumulation -->
        <div class="flex items-center space-x-2">
          <Icon icon="mdi:weather-rainy" class="w-4 h-4 text-white" />
          <span v-if="currentWeather?.localRainAccumulationChecked !== null"
            >{{
              formatValue(
                currentWeather?.localRainAccumulationChecked || 0,
                'precipitation'
              )
            }}
            {{ getUnitSymbol('precipitation') }}</span
          >
          <span
            v-else
            class="w-16 h-4 bg-white/20 rounded animate-pulse"
          ></span>
        </div>
      </div>
    </div>

    <!-- Forecast Section -->
    <div class="flex space-x-8 justify-end">
      <div
        v-for="(day, index) in forecast.slice(0, 3)"
        :key="day.date"
        class="flex flex-col items-center space-y-1"
      >
        <!-- Day Header -->
        <div class="px-2 font-medium uppercase text-sm">
          {{ index === 0 ? 'Today' : formatDate(day.date) }}
        </div>

        <!-- Weather Icon -->
        <div class="w-10 h-10">
          <Icon
            :icon="getWeatherIcon(day.description)"
            class="w-full h-full text-white"
          />
        </div>

        <!-- Precipitation Chance -->
        <div class="flex items-center space-x-1 text-xs">
          <Icon icon="mdi:weather-rainy" class="w-4 h-4 text-white" />
          <span v-if="day.precipitation !== null"
            >{{ Math.round(day.precipitation) }}%</span
          >
          <span v-else class="w-8 h-4 bg-white/20 rounded animate-pulse"></span>
        </div>

        <!-- High and Low Temperatures (single line with icons) -->
        <div class="flex items-center space-x-2 text-base font-medium">
          <div v-if="day.highTemp !== null" class="flex items-center space-x-1">
            <Icon icon="mdi:arrow-up" class="w-3 h-3 text-white" />
            <span>{{ formatValue(day.highTemp, 'temperature') }}°</span>
          </div>
          <div v-else class="w-14 h-5 bg-white/20 rounded animate-pulse"></div>

          <div
            v-if="day.lowTemp !== null"
            class="flex items-center space-x-1 opacity-80"
          >
            <Icon icon="mdi:arrow-down" class="w-3 h-3 text-white" />
            <span>{{ formatValue(day.lowTemp, 'temperature') }}°</span>
          </div>
          <div v-else class="w-12 h-5 bg-white/20 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Loading State - Skeleton -->
  <div v-else-if="isLoading" class="text-white">
    <!-- Main Weather Skeleton -->
    <div class="text-right mb-8">
      <div class="flex items-center justify-end space-x-4">
        <div class="w-24 h-24 bg-white/20 rounded-full animate-pulse"></div>
        <div class="w-32 h-32 bg-white/20 rounded animate-pulse"></div>
      </div>
      <div
        class="w-64 h-6 bg-white/20 rounded animate-pulse ml-auto mt-2"
      ></div>
    </div>

    <!-- Weather Details Skeleton -->
    <div class="flex justify-end items-center mb-6 text-sm space-x-6">
      <!-- Wind Speed Skeleton -->
      <div class="flex items-center space-x-2">
        <div class="w-4 h-4 bg-white/20 rounded animate-pulse"></div>
        <div class="w-16 h-4 bg-white/20 rounded animate-pulse"></div>
      </div>

      <!-- Sunrise/Sunset Skeleton -->
      <div class="flex items-center space-x-2">
        <div class="w-4 h-4 bg-white/20 rounded animate-pulse"></div>
        <div class="w-24 h-4 bg-white/20 rounded animate-pulse"></div>
      </div>

      <!-- Rain Accumulation Skeleton -->
      <div class="flex items-center space-x-2">
        <div class="w-4 h-4 bg-white/20 rounded animate-pulse"></div>
        <div class="w-16 h-4 bg-white/20 rounded animate-pulse"></div>
      </div>
    </div>

    <!-- Forecast Skeleton -->
    <div class="flex space-x-8 justify-end">
      <div v-for="i in 3" :key="i" class="flex flex-col items-center space-y-2">
        <!-- Day Header Skeleton -->
        <div class="w-16 h-6 bg-white/20 rounded animate-pulse"></div>

        <!-- Weather Icon Skeleton -->
        <div class="w-12 h-12 bg-white/20 rounded animate-pulse"></div>

        <!-- Precipitation Skeleton -->
        <div class="flex items-center space-x-1">
          <div class="w-4 h-4 bg-white/20 rounded animate-pulse"></div>
          <div class="w-8 h-4 bg-white/20 rounded animate-pulse"></div>
        </div>

        <!-- Temperature Skeleton -->
        <div class="text-center">
          <div class="w-12 h-6 bg-white/20 rounded animate-pulse mb-1"></div>
          <div class="w-10 h-4 bg-white/20 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Error State -->
  <div v-else-if="error" class="text-right">
    <div class="text-gray-400 text-sm">Unable to load weather data</div>
  </div>
</template>

<script setup>
  import { onMounted, onUnmounted } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useCurrentWeatherStore } from '../stores/currentWeather'
  import { Icon } from '@iconify/vue'
  import { getIconName } from '../utils/iconUtils'
  import { appConfig } from '../config'
  import {
    getUnitSymbol,
    formatValue,
    formatShortDay,
    formatTimeAgo,
    formatWindSpeed,
    getPressureTrendIcon,
    formatNumber,
  } from '../utils/simplifiedUtils'
  import { getWeatherIcon } from '../utils/simplifiedUtils'

  const currentWeatherStore = useCurrentWeatherStore()

  // Destructure store properties - only what we actually use
  const {
    currentWeather,
    currentConditions,
    forecast,
    isLoading,
    error,
    hasWeatherData,
    upcomingSunEvent,
    showLightningAlert,
    lightningStrikes,
  } = storeToRefs(currentWeatherStore)

  // Get configuration values
  const deviceId = appConfig.weatherflow.deviceId
  const stationId = appConfig.weatherflow.stationId
  const accessToken = appConfig.weatherflow.accessToken
  const location = appConfig.location

  // Utility functions
  const formatDate = formatShortDay

  const formatWindSpeedWithUnits = (speed, direction) => {
    return formatWindSpeed(speed, direction, getUnitSymbol('wind'))
  }

  onMounted(() => {
    // Initialize weather system with configuration values
    currentWeatherStore.initializeWeather(
      deviceId,
      stationId,
      accessToken,
      location.latitude,
      location.longitude
    )
  })

  onUnmounted(() => {
    currentWeatherStore.disconnect()
  })
</script>

<style scoped>
  /* No custom styles needed - using Tailwind classes */
</style>
