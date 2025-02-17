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
      <div>
        <div
          class="medium light upper"
          v-if="store.event.gameState == 'FINAL' || store.event.gameState == 'OFF'"
        >
          Final{{ store.event.periodDescriptor.periodType == 'OT' ? '/OT' : '' }}
        </div>
        <div
          v-else-if="
            store.event.gameState == 'LIVE' ||
            store.event.gameState == 'CRIT' ||
            store.event.gameState == 'PRE'
          "
        >
          <div v-if="store.event.clock && !store.event.clock.inIntermission">
            <p class="medium thin">
              <VueFeather
                v-if="store.event.clock.running"
                type="rotate-cw"
                animation="spin"
                size="1rem"
              />
              <VueFeather v-if="!store.event.clock.running" type="clock" size="1rem" />
              {{ store.event.clock.timeRemaining }}
            </p>
            <p class="xsmall upper thin">
              {{ store.currentPeriod }}
            </p>
          </div>
          <div v-else>
            <p>
              <VueFeather type="rotate-cw" animation="spin" size=".8rem" />
              {{ store.event.clock.timeRemaining }}
            </p>
            <p class="xsmall upper thin">{{ store.currentPeriod }}</p>
          </div>
        </div>
      </div>
      <div v-if="store.event.gameState == 'FUT'">
        <p class="medium light">{{ $filters.momentCalendar(store.event.startTimeUTC) }}</p>
        <p class="small light">
          {{ $filters.moment(store.event.startTimeUTC, 'h:mm A') }}
        </p>
      </div>
      <div
        v-if="
          store.event.gameState == 'LIVE' ||
          store.event.gameState == 'CRIT' ||
          store.event.gameState == 'FINAL' ||
          store.event.gameState == 'OFF'
        "
      >
        <div class="large light">
          {{ store.event.awayTeam.score }} - {{ store.event.homeTeam.score }}
        </div>
        <div class="sog" v-if="store.event.gameState == 'LIVE' || store.event.gameState == 'CRIT'">
          <p class="xxsmall thin upper">Shots on Goal</p>
          <p class="small">
            {{ store.event.awayTeam.sog || 0 }} - {{ store.event.homeTeam.sog || 0 }}
          </p>
        </div>
      </div>
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
    <div class="venue" v-if="store.event.gameState != 'FINAL' || store.event.gameState != 'OFF'">
      <p class="xsmall upper">Venue</p>
      <p class="small">{{ store.event.venue.default }}</p>
      <p class="xsmall light">
        {{ store.event.venueLocation.default }}
      </p>
    </div>
    <div
      class="broadcasts"
      v-if="store.event.gameState != 'FINAL' || store.event.gameState != 'OFF'"
    >
      <p class="xsmall upper">Broadcasts</p>
      <p class="xsmall light">
        {{ store.event.tvBroadcasts.map((broadcast) => broadcast.network).join(', ') }}
      </p>
    </div>
    <div class="next" v-if="store.nextGame && store.event.gameState != 'FUT'">
      <p
        class="upper"
        :class="{
          xsmall: store.event.gameState != 'FINAL',
          small: store.event.gameState == 'FINAL'
        }"
      >
        Next Game
      </p>
      <p
        class="thin"
        :class="{
          xsmall: store.event.gameState != 'FINAL',
          small: store.event.gameState == 'FINAL'
        }"
      >
        {{
          store.nextGame.awayTeam.commonName.default +
          ' @ ' +
          store.nextGame.homeTeam.commonName.default
        }},
        {{
          $filters.momentCalendar(store.nextGame.startTimeUTC) +
          ' @ ' +
          $filters.moment(store.event.startTimeUTC, 'h:mm A')
        }}
      </p>
    </div>
  </div>
  <div class="scoreboard" v-else>
    <div class="name">
      <p class="small light upper">Carolina Hurricanes Hockey</p>
      <p class="xsmall thin">update {{ $filters.duration(store.refreshInterval) }}</p>
      <img class="maxLogo" src="https://assets.nhle.com/logos/nhl/svg/CAR_dark.svg" />
      <p class="small light upper">No Upcoming Games</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useNhlStore } from '@/store/Nhl'
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
    'venue empty broadcasts'
    'next next next';
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
.next {
  grid-area: next;
  text-align: center;
}

.logo {
  max-width: 6rem;
}

.maxLogo {
  max-width: 10rem;
}

.sog {
  border: solid 1px white;
  margin-top: 0.5em;
  padding: 0.2em;
}
</style>
