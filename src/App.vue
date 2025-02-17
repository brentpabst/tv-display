<template>
  <RouterView />
</template>

<style>
@import '@fontsource/roboto/100.css';
@import '@fontsource/roboto/300.css';
@import '@fontsource/roboto/400.css';
@import '@fontsource/roboto/700.css';
@import '@fontsource/kalam/300.css';
@import '@fontsource/kalam/400.css';
@import '@fontsource/kalam/700.css';
</style>

<script setup>
var currentTag = ''
window.setInterval(() => {
  fetch(window.location.origin).then((response) => {
    if (currentTag !== '') {
      let newTag = response.headers.get('etag')
      if (currentTag !== newTag) {
        console.log('eTags are not the same, reloading page')
        window.location.reload()
      }
    } else {
      currentTag = response.headers.get('etag')
    }
  })
}, 30000)
</script>
