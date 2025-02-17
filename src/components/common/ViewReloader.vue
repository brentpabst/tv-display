<template>
  <div></div>
</template>
<script setup>
console.log('Starting ViewReloader')
var currentTag = ''
window.setInterval(() => {
  fetch(window.location.origin).then((response) => {
    if (currentTag !== '') {
      let newTag = response.headers.get('etag')
      if (currentTag !== newTag) {
        console.log('eTags are not the same, reloading page')
        window.location.reload()
      } else {
        console.log('eTags are the same, not reloading page')
      }
    } else {
      currentTag = response.headers.get('etag')
    }
  })
}, 30 * 1000)
</script>
