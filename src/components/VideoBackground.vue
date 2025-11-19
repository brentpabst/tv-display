<template>
  <div class="relative w-full h-screen overflow-hidden">
    <!-- Video element -->
    <video
      ref="videoRef"
      class="w-full h-full object-cover bg-black"
      :class="{ hidden: showBackupImage }"
      autoplay
      muted
      loop
      playsinline
      @error="handleVideoError"
      @playing="handleVideoPlaying"
      @canplay="handleVideoCanPlay"
      @pause="handleVideoPause"
      @ended="handleVideoEnded"
    ></video>

    <!-- Backup image -->
    <img
      v-if="showBackupImage"
      ref="imageRef"
      src="/videobgbackup.webp"
      alt="Background"
      class="w-full h-full object-cover bg-black"
      @load="handleImageLoad"
    />

    <!-- Adaptive background overlay -->
    <div
      class="absolute inset-0 transition-all duration-500 ease-in-out"
      :style="{ backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }"
    ></div>

    <!-- Hidden canvas for video analysis -->
    <canvas
      ref="canvasRef"
      class="hidden"
      :width="canvasWidth"
      :height="canvasHeight"
    ></canvas>
  </div>
</template>

<script setup>
  import { ref, onMounted, onUnmounted } from 'vue'
  import Hls from 'hls.js'
  import { getVideoConfig } from '../config'
  import { createLogger } from '../utils/logger'

  const logger = createLogger('VideoBackground', { media: true })

  // Configuration
  const videoConfig = getVideoConfig()
  const videoSrc = videoConfig.sources[videoConfig.currentSource]
  const retryConfig = videoConfig.retry
  const GRACE_PERIOD_MS = 5000
  const RESTORE_TIMEOUT_MS = 10000
  const SAFETY_CHECK_DELAY_MS = 2000

  // Refs
  const videoRef = ref(null)
  const imageRef = ref(null)
  const canvasRef = ref(null)
  const showBackupImage = ref(false)
  const overlayOpacity = ref(videoConfig.brightnessAnalysis.baseOpacity)
  const canvasWidth = ref(videoConfig.brightnessAnalysis.canvasWidth)
  const canvasHeight = ref(videoConfig.brightnessAnalysis.canvasHeight)
  const isOffline = ref(false)
  const retryTimeout = ref(null)

  // State variables
  let hls = null
  let brightnessAnalysisInterval = null
  let videoCheckInterval = null
  let retryCount = 0
  let isAttemptingRestore = false
  let gracePeriodTimeout = null
  let errorStateStartTime = null
  let isInErrorState = false

  // ============================================================================
  // Grace Period Management
  // ============================================================================

  const clearGracePeriod = () => {
    if (gracePeriodTimeout) {
      clearTimeout(gracePeriodTimeout)
      gracePeriodTimeout = null
    }
    isInErrorState = false
    errorStateStartTime = null
  }

  const startGracePeriod = () => {
    // If already in error state, check if grace period is still active
    if (isInErrorState && errorStateStartTime) {
      const elapsed = Date.now() - errorStateStartTime
      if (elapsed < GRACE_PERIOD_MS) {
        logger.debug(
          `Already in grace period, ${GRACE_PERIOD_MS - elapsed}ms remaining`
        )
        return
      }
    }

    clearGracePeriod()
    isInErrorState = true
    errorStateStartTime = Date.now()

    logger.debug(`Starting grace period (${GRACE_PERIOD_MS}ms) before failback`)

    gracePeriodTimeout = setTimeout(() => {
      const video = videoRef.value
      // Check if video recovered during grace period
      if (video?.readyState >= 2 && !video.paused && !video.ended) {
        logger.media('Video recovered during grace period, canceling failback')
        clearGracePeriod()
        return
      }

      logger.warn('Grace period expired, triggering failback')
      triggerFailback()
    }, GRACE_PERIOD_MS)
  }

  const triggerFailback = () => {
    logger.warn('Grace period expired, attempting retry before failback')
    clearGracePeriod()
    retryVideo()
  }

  // ============================================================================
  // Video Event Handlers
  // ============================================================================

  const handleVideoError = () => {
    logger.warn('Video error detected, starting grace period')
    startGracePeriod()
  }

  const handleVideoPlaying = () => {
    logger.media('Video started playing, hiding backup image')
    clearGracePeriod()
    showBackupImage.value = false
    isAttemptingRestore = false

    // Safety check: ensure backup image is hidden if video is still playing
    setTimeout(() => {
      const video = videoRef.value
      if (video?.readyState >= 2 && !video.paused && !video.ended && showBackupImage.value) {
        logger.info('Safety check: hiding backup image for playing video')
        showBackupImage.value = false
      }
    }, SAFETY_CHECK_DELAY_MS)
  }

  const handleVideoCanPlay = () => {
    logger.media('Video can play, ready to start')
  }

  const handleVideoPause = () => {
    logger.media('Video paused')
    // Only start grace period for unexpected pauses
    if (!showBackupImage.value) {
      logger.media('Video paused unexpectedly, starting grace period')
      startGracePeriod()
    }
  }

  const handleVideoEnded = () => {
    logger.media('Video ended, showing backup image')
    clearGracePeriod()
    showBackupImage.value = true
  }

  // ============================================================================
  // Retry Logic
  // ============================================================================

  const retryVideo = () => {
    const browserOffline =
      typeof navigator !== 'undefined' && !navigator.onLine
    if (isOffline.value || browserOffline) {
      logger.info('Skipping video retry - offline')
      return
    }

    if (retryCount >= retryConfig.maxRetries) {
      logger.warn('Max retries reached, switching to backup image')
      clearGracePeriod()
      showBackupImage.value = true
      startPeriodicVideoCheck()
      return
    }

    retryCount++
    const delay = Math.min(
      retryConfig.baseDelay * Math.pow(2, retryCount - 1),
      retryConfig.maxDelay
    )

    logger.info(
      `Retrying video load (attempt ${retryCount}/${retryConfig.maxRetries}) in ${delay}ms`
    )

    retryTimeout.value = setTimeout(() => {
      if (!isOffline.value) {
        logger.info('Attempting to restore video...')
        initializeVideo()
      }
    }, delay)
  }

  // ============================================================================
  // Periodic Video Check
  // ============================================================================

  const startPeriodicVideoCheck = () => {
    if (videoCheckInterval) {
      clearInterval(videoCheckInterval)
    }

    const checkInterval = retryConfig.periodicCheckInterval || 60000
    videoCheckInterval = setInterval(() => {
      if (isOffline.value) {
        logger.debug('Skipping periodic video check - offline')
        return
      }

      if (showBackupImage.value && !isAttemptingRestore) {
        logger.media('Periodic check: attempting to restore video...')
        retryCount = 0
        isAttemptingRestore = true
        initializeVideo()
      }
    }, checkInterval)
  }

  const stopPeriodicVideoCheck = () => {
    if (videoCheckInterval) {
      clearInterval(videoCheckInterval)
      videoCheckInterval = null
    }
  }

  // ============================================================================
  // Video Initialization
  // ============================================================================

  const initializeVideo = () => {
    const video = videoRef.value
    if (!video) return

    // Reset restore attempt flag after timeout
    if (isAttemptingRestore) {
      setTimeout(() => {
        if (isAttemptingRestore) {
          logger.media('Video restore attempt timed out, resetting flag')
          isAttemptingRestore = false
        }
      }, RESTORE_TIMEOUT_MS)
    }

    if (Hls.isSupported()) {
      setupHls(video)
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      setupNativeHls(video)
    } else {
      logger.error('HLS is not supported in this browser')
      triggerFailback()
    }
  }

  // ============================================================================
  // HLS Setup
  // ============================================================================

  const setupHls = video => {
    logger.media('Setting up HLS with source:', videoSrc)

    // Clean up existing instance
    if (hls) {
      try {
        hls.destroy()
      } catch (e) {
        // Ignore destroy errors
      }
      hls = null
    }

    hls = new Hls({
      debug: false,
      enableWorker: true,
      lowLatencyMode: true,
    })

    hls.loadSource(videoSrc)
    hls.attachMedia(video)

    const videoLoadTimeout = setTimeout(() => {
      if (!showBackupImage.value) {
        logger.warn('Video load timeout, starting grace period...')
        startGracePeriod()
      }
    }, retryConfig.loadTimeout)

    const clearTimeoutAndGracePeriod = () => {
      clearTimeout(videoLoadTimeout)
      clearGracePeriod()
    }

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      logger.media('HLS manifest loaded, starting playback')
      clearTimeoutAndGracePeriod()
      retryCount = 0
      stopPeriodicVideoCheck()

      video.play().catch(e => {
        logger.error('Playback failed:', e)
        startGracePeriod()
      })

      setTimeout(startBrightnessAnalysis, 1000)
    })

    hls.on(Hls.Events.ERROR, (event, data) => {
      logger.error('HLS error:', data)
      clearTimeout(videoLoadTimeout)

      const isFatalError =
        data.fatal ||
        data.details === 'manifestLoadError' ||
        data.details === 'levelLoadError'

      logger.media(
        `${isFatalError ? 'Fatal' : 'Non-fatal'} HLS error, starting grace period...`
      )
      startGracePeriod()
    })
  }

  const setupNativeHls = video => {
    video.src = videoSrc

    const videoLoadTimeout = setTimeout(() => {
      if (!showBackupImage.value) {
        logger.warn('Video load timeout, starting grace period...')
        startGracePeriod()
      }
    }, retryConfig.loadTimeout)

    const clearTimeoutAndGracePeriod = () => {
      clearTimeout(videoLoadTimeout)
      clearGracePeriod()
    }

    video.addEventListener('loadedmetadata', () => {
      logger.media('Native HLS manifest loaded, starting playback')
      clearTimeoutAndGracePeriod()
      retryCount = 0
      stopPeriodicVideoCheck()

      video.play().catch(e => {
        logger.error('Playback failed:', e)
        startGracePeriod()
      })

      setTimeout(startBrightnessAnalysis, 1000)
    })

    video.addEventListener('error', e => {
      logger.error('Native HLS error:', e)
      clearTimeout(videoLoadTimeout)
      startGracePeriod()
    })
  }

  // ============================================================================
  // Brightness Analysis
  // ============================================================================

  const handleImageLoad = () => {
    logger.media('Backup image loaded, starting brightness analysis')
    setTimeout(startBrightnessAnalysis, 100)
  }

  const analyzeBrightness = () => {
    const video = videoRef.value
    const image = imageRef.value
    const canvas = canvasRef.value
    const mediaElement = showBackupImage.value ? image : video

    if (!mediaElement || !canvas) return

    // Validate media element
    if (showBackupImage.value) {
      if (image && (image.naturalWidth === 0 || image.naturalHeight === 0)) {
        logger.debug('Skipping brightness analysis for broken backup image')
        return
      }
    } else if (video.readyState < 2) {
      return
    }

    try {
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(mediaElement, 0, 0, canvasWidth.value, canvasHeight.value)

      const imageData = ctx.getImageData(
        0,
        0,
        canvasWidth.value,
        canvasHeight.value
      )
      const data = imageData.data

      let totalBrightness = 0
      const pixelCount = data.length / 4

      // Calculate average brightness using luminance formula
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        totalBrightness += (0.299 * r + 0.587 * g + 0.114 * b) / 255
      }

      const averageBrightness = totalBrightness / pixelCount

      // Adjust overlay opacity: brighter media = more opacity for contrast
      const targetOpacity = Math.max(
        videoConfig.brightnessAnalysis.minOpacity,
        Math.min(
          videoConfig.brightnessAnalysis.maxOpacity,
          videoConfig.brightnessAnalysis.baseOpacity - averageBrightness * 0.4
        )
      )

      overlayOpacity.value = targetOpacity
    } catch (error) {
      logger.warn('Brightness analysis failed:', error)
      overlayOpacity.value = videoConfig.brightnessAnalysis.baseOpacity
    }
  }

  const startBrightnessAnalysis = () => {
    if (brightnessAnalysisInterval) {
      clearInterval(brightnessAnalysisInterval)
    }

    brightnessAnalysisInterval = setInterval(
      analyzeBrightness,
      videoConfig.brightnessAnalysis.interval
    )
  }

  const stopBrightnessAnalysis = () => {
    if (brightnessAnalysisInterval) {
      clearInterval(brightnessAnalysisInterval)
      brightnessAnalysisInterval = null
    }
  }

  // ============================================================================
  // Offline State Management
  // ============================================================================

  const handleOfflineStateChange = event => {
    isOffline.value = event.detail.isOffline

    if (isOffline.value) {
      logger.info('Offline detected, stopping video retry attempts')
      if (retryTimeout.value) {
        clearTimeout(retryTimeout.value)
        retryTimeout.value = null
      }
      clearGracePeriod()
      startPeriodicVideoCheck()
    } else {
      logger.info('Online detected, attempting to restore video')
      startPeriodicVideoCheck()
      if (showBackupImage.value && !isAttemptingRestore) {
        retryCount = 0
        isAttemptingRestore = true
        initializeVideo()
      }
    }
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  onMounted(() => {
    window.addEventListener('offline-state-changed', handleOfflineStateChange)
    initializeVideo()
  })

  onUnmounted(() => {
    window.removeEventListener(
      'offline-state-changed',
      handleOfflineStateChange
    )
    stopBrightnessAnalysis()
    stopPeriodicVideoCheck()
    clearGracePeriod()
    if (retryTimeout.value) {
      clearTimeout(retryTimeout.value)
    }
    if (hls) {
      try {
        hls.destroy()
      } catch (e) {
        // Ignore destroy errors
      }
    }
  })
</script>

<style scoped>
  /* No custom styles needed - using Tailwind classes */
</style>
