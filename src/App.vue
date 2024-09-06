<template>
  <VideoBackground style="z-index: -1" :options="videoOptions" />

  <div class="container">
    <div class="main">
      <div class="left">
        <DigitalClock />
        <EventCalendar />
      </div>
      <div class="right">
        <CurrentWeather />
      </div>
    </div>
    <div class="lower">
      <CurrentAlerts />
      <NewsHeadlines />
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

<script>
import VideoBackground from './components/VideoBackground.vue'
import DigitalClock from './components/DigitalClock.vue'
import CurrentWeather from './components/CurrentWeather.vue'
import CurrentAlerts from './components/CurrentAlerts.vue'
import moment from 'moment'
import EventCalendar from './components/EventCalendar.vue'
import NewsHeadlines from './components/NewsHeadlines.vue'
export default {
  components: {
    VideoBackground,
    DigitalClock,
    EventCalendar,
    CurrentWeather,
    CurrentAlerts,
    NewsHeadlines
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
