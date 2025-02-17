<template>
  <div class="clock">
    <div class="time">
      <div class="xlarge light">
        <span>{{ currentTime.format('h:mm') }}</span>
      </div>
      <div class="medium light">
        <span>{{ currentTime.format('ss') }}</span>
        <br />
        <span>{{ currentTime.format('A') }}</span>
      </div>
    </div>
    <div class="date small light">
      <span>{{ currentTime.format('dddd, MMMM Do') }}</span>
    </div>
  </div>
</template>

<script>
import moment from 'moment'

export default {
  data() {
    return {
      currentTime: moment()
    }
  },
  mounted() {
    this.updateTime()
    setInterval(this.updateTime, 1000)
  },
  methods: {
    updateTime() {
      this.currentTime = moment()
    }
  }
}
</script>

<style scoped>
.time {
  display: flex;
  align-items: center;
  column-gap: 10px;
}

.date {
  padding-left: 5px;
}
</style>
