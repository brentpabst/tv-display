import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'
import './style.css'
import App from './App.vue'
import { setupNetworkMonitoring } from './utils/networkMonitor'
import { useOfflineStateStore } from './stores/offlineState'

const app = createApp(App)
const pinia = createPinia()

// Add persistence plugin
pinia.use(createPersistedState())

app.use(pinia)

// Initialize offline system after Pinia is ready
const offlineStore = useOfflineStateStore()
setupNetworkMonitoring(offlineStore)

app.mount('#app')
