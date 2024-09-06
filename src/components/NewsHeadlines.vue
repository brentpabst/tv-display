<template>
  <div class="news" v-if="currentItem" v-auto-animate>
    <img :key="currentItem.guid" :src="currentItem.enclosure.link" />
    <div :key="currentItem.guid">
      <div class="medium">{{ currentItem.title }}</div>
      <div class="small">{{ currentItem.description }}</div>
      <div class="small">{{ currentItem.pubDate }}</div>
    </div>
  </div>
</template>

<script setup>
import { useNewsStore } from '@/stores/News'
import { ref, onMounted, computed } from 'vue'

const store = useNewsStore()
store.initialize()

const currentNewsIndex = ref(0)
const currentItem = computed(() => store.news[currentNewsIndex.value])

onMounted(() => {
  setInterval(() => {
    currentNewsIndex.value = (currentNewsIndex.value + 1) % store.news.length
  }, 1000 * 10)
})
</script>

<style scoped>
.news {
  display: grid;
  gap: 1em;
  grid-auto-flow: column;
  background-color: var(--background-blur);
}
.news img {
  max-width: 200px;
}
</style>
