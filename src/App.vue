<template>
  <VideoBackground style="z-index: -1" :options="videoOptions" />

  <div class="container">
    <v-offline online-class="online" offline-class="offline" @detected-condition="onNetworkChange">
      <template v-if="!online">
        <div>
          <VueFeather type="alert-octagon" size="1rem" stroke-width="1" class="pulse" />
          Internet is Offline or Disconnected
        </div>
      </template>
    </v-offline>
    <div class="main">
      <div class="left">
        <DigitalClock />
        <EventCalendar />
      </div>
      <div class="right">
        <CurrentWeather />
        <NhlDisplay />
      </div>
    </div>
    <div class="lower">
      <CurrentAlerts />
      <!--<NewsHeadlines />-->
    </div>
  </div>
</template>

<style>
@import '@fontsource/roboto/100.css';
@import '@fontsource/roboto/300.css';
@import '@fontsource/roboto/400.css';
@import '@fontsource/roboto/700.css';
@import '@fontsource/kalam/300.css';
@import '@fontsource/kalam/400.css';
@import '@fontsource/kalam/700.css';
@import 'video.js/dist/video-js.css';
</style>

<style scoped>
.offline {
  text-align: center;
  margin: 1rem auto;
  background-color: rgba(255, 0, 0, 0.75);
  border-radius: 5px;
  padding: 1em 2em;
}
</style>

<script>
import VideoBackground from './components/VideoBackground.vue'
import DigitalClock from './components/DigitalClock.vue'
import CurrentWeather from './components/CurrentWeather.vue'
import CurrentAlerts from './components/CurrentAlerts.vue'
import moment from 'moment'
import EventCalendar from './components/EventCalendar.vue'
import NewsHeadlines from './components/NewsHeadlines.vue'
import { VOffline } from 'v-offline'
import { ref } from 'vue'
import NhlDisplay from './components/NhlDisplay.vue'

export default {
  components: {
    VideoBackground,
    DigitalClock,
    EventCalendar,
    CurrentWeather,
    CurrentAlerts,
    NewsHeadlines,
    VOffline,
    NhlDisplay
  },
  setup() {
    const online = ref(true)
    const onNetworkChange = (isOnline) => {
      online.value = isOnline
    }
    return { online, onNetworkChange }
  },
  data() {
    return {
      moment: moment(),
      videoOptions: {
        autoplay: true,
        controls: false,
        muted: true,
        preload: 'auto',
        loop: true,
        fluid: true,
        aspectRatio: '16:9',
        responsive: true,
        sources: [
          {
            src: 'https://media-hls.wral.com/livehttporigin/_definst_/mp4:north_hills_mall.stream/playlist.m3u8',
            type: 'application/x-mpegURL'
          }
        ]
      }
    }
  }
}
</script>
