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
        return {}
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
