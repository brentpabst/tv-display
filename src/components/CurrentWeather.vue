<template>
  <div class="weather">
    <div class="small light">
      <VueFeather type="wind" />
      <span v-if="store.weather.wind_speed > 0">
        {{ store.weather.wind_speed }} <sup class="xsmall">{{ store.windDirection }}</sup>
      </span>
      <span v-else>Calm</span>
      <VueFeather :type="store.sun.nextActivity"></VueFeather>
      <span v-if="store.sun.nextActivity === 'sunrise'">
        {{ $filters.moment(store.sun.tomorrow.sunrise, 'h:mma') }}
      </span>
      <span v-else>
        {{ $filters.moment(store.sun.today.sunset, 'h:mma') }}
      </span>
    </div>
    <div class="xlarge light">
      <VueFeather v-if="store.weather.icon" :type="store.weather.icon" size="3rem"></VueFeather>
      {{ store.weather.temp }}°
    </div>
    <div class="light">Feels like {{ store.weather.feels_like }}°</div>
    <div class="light" v-if="store.weather.precipitation_type == 1">
      <VueFeather type="droplet" />{{ store.weather.rain_accumulated.toPrecision(2) }} inches of
      rain today
    </div>
    <div class="light" v-else-if="store.weather.precipitation_type == 2">
      <VueFeather type="cloud-snow" />{{ store.weather.rain_accumulated.toPrecision(2) }} inches of
      hail today
    </div>
  </div>
  <div class="forecasts">
    <div
      v-for="forecast in store.forecast.slice(0, 3)"
      :key="forecast.day_start_local"
      class="forecast"
    >
      <div class="upper xsmall day">
        {{ $filters.momentUnixCalendar(forecast.day_start_local) }}
      </div>
      <div class="icon">
        <VueFeather :type="forecast.icon" size="1.5rem" />
      </div>
      <div class="xsmall thin">
        <VueFeather type="droplet" size="0.7rem" />{{ forecast.precip_probability }}%
      </div>
      <div class="small light">{{ forecast.air_temp_high }}° | {{ forecast.air_temp_low }}°</div>
      <div></div>
    </div>
  </div>
  <div v-if="store.weather.lightning_strike_count > 0" class="lightning">
    <div>
      <VueFeather type="zap" size="3rem" stroke-width="1" class="pulse" />
    </div>
    <div>
      <span class="medium thin">Lightning Nearby</span>
      <div class="info">
        <div>
          <div class="xxsmall upper thin">Avg Distance</div>
          <div class="xsmall thin">
            {{ Math.abs(store.weather.lightning_strike_avg_distance - 1).toFixed(0) }} -
            {{ (store.weather.lightning_strike_avg_distance + 1).toFixed(0) }} mi away
          </div>
        </div>
        <div>
          <div class="xxsmall upper thin">Strikes</div>
          <div class="xsmall thin">{{ store.weather.lightning_strike_count }} a min</div>
        </div>
        <div v-if="store.weather.strike_distance > 0">
          <div class="xxsmall upper thin">Last Strike</div>
          <div class="xsmall thin">{{ store.weather.strike_distance.toFixed(0) }} mi away</div>
        </div>
        <div v-if="store.weather.strike_distance > 0">
          <div class="xxsmall upper thin">Last Strike</div>
          <div class="xsmall thin">{{ $filters.timeagoUnix(store.weather.strike_last) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useWeatherStore } from '@/stores/Weather'

const store = useWeatherStore()
store.initialize()

onMounted(() => {
  // Start updating data on an interval
  const intervalId = setInterval(() => {
    store.refresh()
  }, 60000) // Update every 1 minute

  // Stop updating data when the component is unmounted
  onUnmounted(() => {
    store.socket.close()
    clearInterval(intervalId)
  })
})
</script>

<style scoped>
.weather {
  text-align: right;
}

.vue-feather {
  width: 1rem;
  height: 1rem;
  margin-right: 0.25rem;
  margin-left: 0.5rem;
}

.lightning {
  background-color: rgba(255, 0, 0, 0.75);
  border-radius: 5px;
  padding: 0.3em 0.1em;
  display: flex;
  align-items: center;
}

.pulse {
  animation: pulse 1s infinite;
}

.lightning .info {
  display: grid;
  gap: 0.5em;
  grid-template-columns: 1fr 1fr;
  justify-content: end;
}

.forecasts {
  display: grid;
  gap: 1em;
  grid-auto-flow: column;
  justify-content: end;
}

.forecast {
  text-align: center;
}

.day {
  background-color: rgba(255, 255, 255, 0.3);
  padding: 0.5em;
  border-radius: 5px;
  margin-bottom: 0.5em;
}

@keyframes pulse {
  0% {
    transform: scale(0.8);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(0.8);
  }
}
</style>
