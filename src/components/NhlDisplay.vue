<template>
  <div class="scoreboard" v-if="store.event && store.event.awayTeam && store.event.homeTeam">
    <div class="name">
      <p class="small light upper">
        {{ store.event.awayTeam.placeName.default }} {{ store.event.awayTeam.commonName.default }} @
        {{ store.event.homeTeam.placeName.default }} {{ store.event.homeTeam.commonName.default }}
      </p>
      <p class="xsmall thin">
        update {{ $filters.duration(store.refreshInterval) }}
        <span v-if="lastUpdate">| updated {{ lastUpdate }}</span>
      </p>
    </div>
    <div class="away">
      <img class="logo" :src="store.event.awayTeam.darkLogo" />
      <p class="medium thin">
        {{ store.event.awayTeam.commonName.default }}
      </p>
      <p class="small" v-if="store.event.awayTeam.record">
        {{ store.event.awayTeam.record }}
      </p>
    </div>

    <div class="info">
      <div v-if="store.event.gameState == 'FUT'">
        <p class="medium light">{{ $filters.momentCalendar(store.event.startTimeUTC) }}</p>
        <p class="small light">
          {{ $filters.moment(store.event.startTimeUTC, 'h:mm A') }}
        </p>
      </div>
      <div
        class="large light"
        v-if="
          store.event.gameState != 'FUT' && store.event.awayTeam.score && store.event.homeTeam.score
        "
      >
        {{ store.event.awayTeam.score }} - {{ store.event.homeTeam.score }}
      </div>
      <div class="large light" v-else-if="store.event.gameState == 'FUT'"></div>
      <div class="large light" v-else>0 - 0</div>
      <p class="small thin upper" v-if="store.event.gameState != 'FUT'">
        <span v-if="!store.event.clock.isIntermission">
          <VueFeather type="clock" size="1rem" stroke-width="1" />
          <VueFeather
            v-if="store.event.clock && store.event.clock.isRunning"
            type="refresh-cw"
            animation="spin"
            size="1rem"
          />
          {{ store.event.clock.timeRemaining }}
        </span>
        <span v-else>Intermission</span>
      </p>
    </div>
    <div class="home">
      <img class="logo" :src="store.event.homeTeam.darkLogo" />
      <p class="medium thin">
        {{ store.event.homeTeam.commonName.default }}
      </p>
      <p class="small" v-if="store.event.homeTeam.record">
        {{ store.event.homeTeam.record }}
      </p>
    </div>
    <div class="venue">
      <p class="xsmall upper">Venue</p>
      <p class="small">{{ store.event.venue.default }}</p>
      <p class="xsmall light">
        {{ store.event.venueLocation.default }}
      </p>
    </div>
    <div class="broadcasts">
      <p class="xsmall upper">Broadcasts</p>
      <p class="xsmall light">
        {{ store.event.tvBroadcasts.map((broadcast) => broadcast.network).join(', ') }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useNhlStore } from '@/stores/Nhl'
import moment from 'moment'

const store = useNhlStore()
store.getData()

const lastUpdate = ref()

setInterval(() => {
  lastUpdate.value = moment(store.last_update).fromNow()
}, 1000)

let interval = 10000
let loop = setInterval(() => {
  clearInterval(loop)
  store.getData()
  loop = setInterval(() => {
    store.getData()
  }, store.refreshInterval)
}, interval)
</script>

<style scoped>
.scoreboard {
  background-color: var(--background-blur);
  border-radius: 5px;
  padding: 0.8em 1em;
  display: grid;
  gap: 1em;
  grid-template-areas:
    'name name name'
    'away info home'
    'venue empty broadcasts';
  grid-auto-columns: 1fr;
  align-items: center;
}

.name {
  grid-area: name;
  text-align: center;
}
.away {
  grid-area: away;
  text-align: center;
}
.info {
  grid-area: info;
  text-align: center;
}
.home {
  grid-area: home;
  text-align: center;
}
.venue {
  grid-area: venue;
  align-self: start;
}
.broadcasts {
  grid-area: broadcasts;
  align-self: start;
  text-align: right;
}

.logo {
  max-width: 6rem;
}
</style>
