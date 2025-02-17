<template>
  <div class="player">
    <video ref="videoPlayer" class="video-js"></video>
    <div class="overlay"></div>
  </div>
</template>

<script>
import videojs from 'video.js'

export default {
  name: 'VideoBackground',
  props: {
    options: {
      type: Object,
      default() {
        return {
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
  },
  data() {
    return {
      player: null
    }
  },
  mounted() {
    this.player = videojs(this.$refs.videoPlayer, this.options, () => {})
  },
  beforeUnmount() {
    if (this.player) {
      this.player.dispose()
    }
  }
}
</script>

<style>
@import 'video.js/dist/video-js.css';
</style>

<style scoped>
.player {
  position: absolute;
  z-index: 0;
  inset: 0;
}
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 2, 120, 0.25);
}
</style>
