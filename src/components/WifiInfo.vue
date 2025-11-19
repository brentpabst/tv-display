<template>
  <div class="text-white text-center">
    <h3 class="text-lg font-medium font-thin uppercase">Scan for WiFi</h3>
    <p class="text-white text-sm mb-2">Network: Kerberos</p>
    <div class="bg-white p-4 rounded-lg inline-block">
      <QRCodeVue :value="wifiQRCode" :size="100" level="M" renderAs="svg" />
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import QRCodeVue from 'qrcode.vue'
  import { getWifiConfig } from '../config'

  const wifiConfig = getWifiConfig()

  // Generate WiFi QR code in standard format
  const wifiQRCode = computed(() => {
    const { ssid, password, security } = wifiConfig

    // WiFi QR code format: WIFI:S:<SSID>;T:<WPA|WEP|nopass>;P:<password>;;
    // For networks without password, omit the P parameter
    if (security === 'nopass') {
      return `WIFI:S:${ssid};T:nopass;;`
    }
    return `WIFI:S:${ssid};T:${security};P:${password};;`
  })
</script>
