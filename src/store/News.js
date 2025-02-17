import { defineStore } from 'pinia'

const news_url = 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml'

export const useNewsStore = defineStore('news', {
  state: () => ({
    news: []
  }),
  actions: {
    async initialize() {
      await fetch('https://api.rss2json.com/v1/api.json?rss_url=' + news_url)
        .then((response) => response.json())
        .then((data) => {
          this.news = data.items
        })
    }
  }
})
