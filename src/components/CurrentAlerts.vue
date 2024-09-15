<template>
  <div class="alerts" v-if="store.alerts.length !== 0 && store.last_update != null">
    <div>
      <VueFeather type="alert-octagon" size="3.8rem" stroke-width="1" class="pulse"></VueFeather>
    </div>
    <div class="messages">
      <div v-for="alert in store.alerts" :key="alert.id" class="message">
        <span class="large">{{ alert.properties.event }}</span>
        <div class="small thin">
          <span class="upper">expires {{ $filters.timeago(alert.properties.expires) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useNwsAlertStore } from '@/stores/NwsAlerts'

const store = useNwsAlertStore()
store.getAlerts()
setInterval(() => store.getAlerts(), 1000 * 60)
</script>

<style scoped>
.alerts {
  display: flex;
  gap: 1em;
  align-items: stretch;
  background-color: rgba(255, 0, 0, 0.75);
  padding: 2em 4em;
}

.messages {
  display: flex;
}

.messages > .message:not(:last-child) {
  border-right: solid 2px white;
}

.message {
  padding: 0 1em;
}

.messages > .message:first-child {
  padding: 0;
  padding-right: 1em;
}
</style>
