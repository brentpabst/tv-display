<template>
  <div>
    <p>{{ welcomeMessage }}</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      welcomeMessage: ''
    }
  },
  mounted() {
    const currentTime = new Date().getHours()
    if (currentTime >= 0 && currentTime < 12) {
      this.welcomeMessage = 'Good morning'
    } else if (currentTime >= 12 && currentTime < 18) {
      this.welcomeMessage = 'Good afternoon'
    } else {
      this.welcomeMessage = 'Good evening'
    }
  }
}
</script>

<style scoped>
p {
  font-family: Kalam, sans-serif;
  font-weight: 300;
  font-size: 5em;
}
</style>
