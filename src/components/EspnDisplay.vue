<template>
  <div class="scoreboard" v-if="store.competition">
    <div class="name">
      <p class="small light upper">{{ store.event.name }}</p>
      <p class="xsmall thin">
        update {{ $filters.duration(store.refreshInterval) }}
        <span v-if="lastUpdate">| updated {{ lastUpdate }}</span>
      </p>
    </div>
    <div class="away">
      <img class="logo" :src="store.awayTeam.team.logos[0].href" />
      <p class="medium thin">
        {{ store.awayTeam.team.shortDisplayName }}
      </p>
      <p class="small" v-if="store.awayTeam.record">
        {{
          store.awayTeam.record.find((team) => team.type == 'total' || team.type == 'ytd')
            .displayValue
        }}
      </p>
    </div>
    <div class="info">
      <div v-if="store.competition.status.type.state == 'pre'">
        <p class="medium light">{{ $filters.momentCalendar(store.competition.date) }}</p>
        <p class="small light">{{ $filters.moment(store.competition.date, 'h:mm A') }}</p>
      </div>
      <div
        class="large light"
        v-if="
          store.competition.status.type.state != 'pre' &&
          store.awayTeam.score &&
          store.homeTeam.score
        "
      >
        {{ store.awayTeam.score.displayValue }} - {{ store.homeTeam.score.displayValue }}
      </div>
      <div class="large light" v-else-if="store.competition.status.type.state == 'pre'"></div>
      <div class="large light" v-else>0 - 0</div>
      <p class="small thin upper" v-if="store.competition.status.type.state != 'pre'">
        {{ store.competition.status.type.shortDetail }}
      </p>
    </div>
    <div class="home">
      <img class="logo" :src="store.homeTeam.team.logos[0].href" />
      <p class="medium thin">
        {{ store.homeTeam.team.shortDisplayName }}
      </p>
      <p class="small" v-if="store.homeTeam.record">
        {{
          store.homeTeam.record.find((team) => team.type == 'total' || team.type == 'ytd')
            .displayValue
        }}
      </p>
    </div>
    <div class="venue">
      <p class="xsmall upper">Venue</p>
      <p class="small">{{ store.competition.venue.fullName }}</p>
      <p class="xsmall light">
        {{ store.competition.venue.address.city }}, {{ store.competition.venue.address.state }}
        {{ store.competition.venue.address.country }}
      </p>
    </div>
    <div class="broadcasts">
      <p class="xsmall upper">Broadcasts</p>
      <p class="xsmall light">
        {{ store.competition.broadcasts.map((broadcast) => broadcast.media.shortName).join(', ') }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useEspnStore } from '@/stores/Espn'
import moment from 'moment'

const store = useEspnStore()
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
