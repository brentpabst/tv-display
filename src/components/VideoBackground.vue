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
  import { ref, onMounted, onUnmounted, watch } from 'vue'
  import Hls from 'hls.js'
  import { getVideoConfig } from '../config'
  import { createLogger } from '../utils/logger'

  const logger = createLogger('VideoBackground', { media: true })

  // Feature flag: Set to false to disable reload and image swap functionality
  const ENABLE_RELOAD_AND_IMAGE_SWAP = false

  const videoRef = ref(null)
  const imageRef = ref(null)
  const canvasRef = ref(null)
  const showBackupImage = ref(false)
  let hls = null
  let brightnessAnalysisInterval = null
  let retryCount = 0
  const retryTimeout = ref(null)
  let videoCheckInterval = null
  let isAttemptingRestore = false

  // Add offline detection
  const isOffline = ref(false)

  // Listen for offline state changes
  const handleOfflineStateChange = event => {
    isOffline.value = event.detail.isOffline
    if (!ENABLE_RELOAD_AND_IMAGE_SWAP) {
      logger.info(
        `🎬 [VideoBackground] Offline state changed: ${isOffline.value} (reload disabled)`
      )
      return
    }

    if (isOffline.value) {
      logger.info(
        '🎬 [VideoBackground] Offline detected, stopping video retry attempts'
      )
      // Stop any ongoing retry attempts
      if (retryTimeout.value) {
        clearTimeout(retryTimeout.value)
        retryTimeout.value = null
      }
      // Keep periodic check running so we can restore when back online
      startPeriodicVideoCheck()
    } else {
      logger.info(
        '🎬 [VideoBackground] Online detected, attempting to restore video'
      )
      // Kick off an immediate restore attempt if backup image is showing
      startPeriodicVideoCheck()
      if (showBackupImage.value && !isAttemptingRestore) {
        retryCount = 0
        isAttemptingRestore = true
        initializeVideo()
      }
    }
  }

  // Setup event listener
  onMounted(() => {
    window.addEventListener('offline-state-changed', handleOfflineStateChange)
  })

  onUnmounted(() => {
    window.removeEventListener(
      'offline-state-changed',
      handleOfflineStateChange
    )
  })

  // Get video configuration
  const videoConfig = getVideoConfig()
  const videoSrc = videoConfig.sources[videoConfig.currentSource]
  const retryConfig = videoConfig.retry

  // Reactive overlay opacity
  const overlayOpacity = ref(videoConfig.brightnessAnalysis.baseOpacity)
  const canvasWidth = ref(videoConfig.brightnessAnalysis.canvasWidth)
  const canvasHeight = ref(videoConfig.brightnessAnalysis.canvasHeight)

  // Watch for changes to showBackupImage for debugging
  watch(showBackupImage, newValue => {
    logger.info('showBackupImage changed to:', newValue)
  })

  // Handle video errors and switch to backup image
  const handleVideoError = () => {
    if (!ENABLE_RELOAD_AND_IMAGE_SWAP) {
      logger.warn('Video failed to load (reload and image swap disabled)')
      return
    }

    logger.warn('Video failed to load, switching to backup image')
    logger.debug('Current retry count:', retryCount)
    logger.debug('Max retries:', retryConfig.maxRetries)
    showBackupImage.value = true
    isAttemptingRestore = false // Reset the restore attempt flag
    logger.debug('showBackupImage set to:', showBackupImage.value)
    // Begin periodic checks so we can restore when connectivity returns
    startPeriodicVideoCheck()
  }

  // Handle video playing event - hide backup image when video actually starts
  const handleVideoPlaying = () => {
    if (!ENABLE_RELOAD_AND_IMAGE_SWAP) {
      logger.media('Video started playing')
      return
    }

    logger.media('Video started playing, hiding backup image')
    showBackupImage.value = false
    isAttemptingRestore = false // Reset the restore attempt flag

    // Safety check: if video is still playing after 2 seconds, ensure backup image is hidden
    setTimeout(() => {
      const video = videoRef.value
      if (video && !video.paused && !video.ended && showBackupImage.value) {
        logger.info(
          'Safety check: video is playing but backup image still showing, hiding it'
        )
        showBackupImage.value = false
      }
    }, 2000)
  }

  // Handle video can play event - video is ready to play
  const handleVideoCanPlay = () => {
    logger.media('Video can play, ready to start')
  }

  // Handle video pause event - show backup image if video stops unexpectedly
  const handleVideoPause = () => {
    if (!ENABLE_RELOAD_AND_IMAGE_SWAP) {
      logger.media('Video paused')
      return
    }

    logger.media('Video paused unexpectedly')
    // Only show backup image if this wasn't a user-initiated pause
    if (!showBackupImage.value) {
      logger.media('Video paused unexpectedly, showing backup image')
      showBackupImage.value = true
    }
  }

  // Handle video ended event - show backup image when video ends
  const handleVideoEnded = () => {
    if (!ENABLE_RELOAD_AND_IMAGE_SWAP) {
      logger.media('Video ended')
      return
    }

    logger.media('Video ended, showing backup image')
    showBackupImage.value = true
  }

  // Retry video loading with exponential backoff
  const retryVideo = () => {
    if (!ENABLE_RELOAD_AND_IMAGE_SWAP) {
      logger.info('🎬 [VideoBackground] Video retry disabled')
      return
    }

    const browserOffline =
      typeof navigator !== 'undefined' && navigator.onLine === false
    if (isOffline.value && browserOffline) {
      logger.info('🎬 [VideoBackground] Skipping video retry - offline')
      return
    }

    if (retryCount >= retryConfig.maxRetries) {
      logger.warn(
        '🎬 [VideoBackground] Max retries reached, switching to backup image'
      )
      showBackupImage.value = true
      // Ensure we keep checking periodically to recover later
      startPeriodicVideoCheck()
      return
    }

    retryCount++
    logger.debug(`🎬 [VideoBackground] Current retry count: ${retryCount}`)
    logger.debug(`🎬 [VideoBackground] Max retries: ${retryConfig.maxRetries}`)

    const delay = Math.min(
      retryConfig.baseDelay * Math.pow(2, retryCount - 1),
      retryConfig.maxDelay
    )
    logger.info(
      `🎬 [VideoBackground] Retrying video load (attempt ${retryCount}/${retryConfig.maxRetries}) in ${delay}ms`
    )

    retryTimeout.value = setTimeout(() => {
      if (!isOffline.value) {
        logger.info('🎬 [VideoBackground] Attempting to restore video...')
        initializeVideo()
      }
    }, delay)
  }

  // Start periodic checking for video availability
  const startPeriodicVideoCheck = () => {
    if (!ENABLE_RELOAD_AND_IMAGE_SWAP) {
      logger.debug('🎬 [VideoBackground] Periodic video check disabled')
      return
    }

    if (videoCheckInterval) {
      clearInterval(videoCheckInterval)
    }

    // Check periodically if video is available again
    videoCheckInterval = setInterval(() => {
      if (isOffline.value) {
        logger.debug(
          '🎬 [VideoBackground] Skipping periodic video check - offline'
        )
        return
      }

      if (showBackupImage.value && !isAttemptingRestore) {
        logger.media('Periodic check: attempting to restore video...')
        retryCount = 0 // Reset retry count for periodic attempts
        isAttemptingRestore = true
        // Don't hide backup image here - let the video playing event handle it
        initializeVideo()
      }
    }, retryConfig.periodicCheckInterval || 60000) // Default to 60 seconds if not configured
  }

  // Stop periodic checking
  const stopPeriodicVideoCheck = () => {
    if (videoCheckInterval) {
      clearInterval(videoCheckInterval)
      videoCheckInterval = null
    }
  }

  // Initialize video (either HLS or native)
  const initializeVideo = () => {
    const video = videoRef.value

    // Set a timeout to reset the restore attempt flag if video doesn't start
    if (isAttemptingRestore) {
      setTimeout(() => {
        if (isAttemptingRestore) {
          logger.media('Video restore attempt timed out, resetting flag')
          isAttemptingRestore = false
        }
      }, 10000) // 10 second timeout
    }

      if (Hls.isSupported()) {
      setupHls(video)
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      setupNativeHls(video)
    } else {
      logger.error(
        'HLS is not supported in this browser, switching to backup image'
      )
      if (ENABLE_RELOAD_AND_IMAGE_SWAP) {
        handleVideoError()
      }
    }
  }

  // Handle image load and start brightness analysis
  const handleImageLoad = () => {
    logger.media('Backup image loaded, starting brightness analysis')
    setTimeout(startBrightnessAnalysis, 100)
  }

  // Analyze brightness and adjust overlay opacity
  const analyzeBrightness = () => {
    const video = videoRef.value
    const image = imageRef.value
    const canvas = canvasRef.value

    // Use video if available and not hidden, otherwise use image
    const mediaElement = showBackupImage.value ? image : video

    if (!mediaElement || !canvas) return

    // Check if image is broken (for backup image)
    if (
      showBackupImage.value &&
      image &&
      (image.naturalWidth === 0 || image.naturalHeight === 0)
    ) {
      logger.debug('Skipping brightness analysis for broken backup image')
      return
    }

    // For video, check if it has enough data
    if (!showBackupImage.value && video.readyState < 2) return

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
      let pixelCount = 0

      // Calculate average brightness from RGB values
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]

        // Convert RGB to brightness (luminance formula)
        const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        totalBrightness += brightness
        pixelCount++
      }

      const averageBrightness = totalBrightness / pixelCount

      // Adjust overlay opacity based on brightness
      // Brighter media = more overlay opacity for better contrast
      // Darker media = less overlay opacity to maintain visibility
      const targetOpacity = Math.max(
        videoConfig.brightnessAnalysis.minOpacity,
        Math.min(
          videoConfig.brightnessAnalysis.maxOpacity,
          videoConfig.brightnessAnalysis.baseOpacity - averageBrightness * 0.4
        )
      )

      // Smooth transition to new opacity
      overlayOpacity.value = targetOpacity
    } catch (error) {
      logger.warn('Brightness analysis failed:', error)
      // Use default opacity if analysis fails
      overlayOpacity.value = videoConfig.brightnessAnalysis.baseOpacity
    }
  }

  // Start brightness analysis
  const startBrightnessAnalysis = () => {
    if (brightnessAnalysisInterval) {
      clearInterval(brightnessAnalysisInterval)
    }

    // Analyze brightness based on config interval for smooth transitions
    brightnessAnalysisInterval = setInterval(
      analyzeBrightness,
      videoConfig.brightnessAnalysis.interval
    )
  }

  // Stop brightness analysis
  const stopBrightnessAnalysis = () => {
    if (brightnessAnalysisInterval) {
      clearInterval(brightnessAnalysisInterval)
      brightnessAnalysisInterval = null
    }
  }

  // Setup HLS.js for video playback
  const setupHls = video => {
    logger.media('Setting up HLS with source:', videoSrc)
    // Destroy any existing instance to avoid duplicate handlers
    if (hls) {
      try {
        hls.destroy()
      } catch {}
      hls = null
    }
    hls = new Hls({
      debug: false,
      enableWorker: true,
      lowLatencyMode: true,
    })

    hls.loadSource(videoSrc)
    hls.attachMedia(video)

    // Add timeout to switch to backup image if video doesn't load
    const videoLoadTimeout = ENABLE_RELOAD_AND_IMAGE_SWAP
      ? setTimeout(() => {
          if (!showBackupImage.value) {
            logger.warn('Video load timeout, attempting retry...')
            retryVideo()
          }
        }, retryConfig.loadTimeout)
      : null

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      logger.media('HLS manifest loaded, starting playback')
      if (videoLoadTimeout) {
        clearTimeout(videoLoadTimeout)
      }
      if (ENABLE_RELOAD_AND_IMAGE_SWAP) {
        retryCount = 0 // Reset retry count on successful load
        stopPeriodicVideoCheck() // Stop periodic checks since video is working
      }
      // Don't hide backup image here - let the video playing event handle it
      video.play().catch(e => {
        logger.error('Playback failed:', e)
        if (ENABLE_RELOAD_AND_IMAGE_SWAP) {
          retryVideo()
        }
      })
      setTimeout(startBrightnessAnalysis, 1000)
    })

    hls.on(Hls.Events.ERROR, (event, data) => {
      logger.error('HLS error:', data)
      if (videoLoadTimeout) {
        clearTimeout(videoLoadTimeout)
      }

      if (!ENABLE_RELOAD_AND_IMAGE_SWAP) {
        return
      }

      // For any error, attempt retry instead of immediately switching to backup
      if (
        data.fatal ||
        data.details === 'manifestLoadError' ||
        data.details === 'levelLoadError'
      ) {
        logger.media('Fatal HLS error, attempting retry...')
        retryVideo()
      } else {
        // For non-fatal errors, try to recover once, then retry
        logger.media('Non-fatal HLS error, attempting recovery...')
        setTimeout(() => {
          if (!showBackupImage.value) {
            logger.media('Recovery failed, attempting retry...')
            retryVideo()
          }
        }, 3000)
      }
    })
  }

  // Setup native HLS support
  const setupNativeHls = video => {
    video.src = videoSrc

    // Add timeout to switch to backup image if video doesn't load
    const videoLoadTimeout = ENABLE_RELOAD_AND_IMAGE_SWAP
      ? setTimeout(() => {
          if (!showBackupImage.value) {
            logger.warn('Video load timeout, attempting retry...')
            retryVideo()
          }
        }, retryConfig.loadTimeout)
      : null

    video.addEventListener('loadedmetadata', () => {
      logger.media('Native HLS manifest loaded, starting playback')
      if (videoLoadTimeout) {
        clearTimeout(videoLoadTimeout)
      }
      if (ENABLE_RELOAD_AND_IMAGE_SWAP) {
        retryCount = 0 // Reset retry count on successful load
        stopPeriodicVideoCheck() // Stop periodic checks since video is working
      }
      // Don't hide backup image here - let the video playing event handle it
      video.play().catch(e => {
        logger.error('Playback failed:', e)
        if (ENABLE_RELOAD_AND_IMAGE_SWAP) {
          retryVideo()
        }
      })
      setTimeout(startBrightnessAnalysis, 1000)
    })

    video.addEventListener('error', e => {
      logger.error('Native HLS error:', e)
      if (videoLoadTimeout) {
        clearTimeout(videoLoadTimeout)
      }
      if (ENABLE_RELOAD_AND_IMAGE_SWAP) {
        retryVideo()
      }
    })
  }

  onMounted(() => {
    initializeVideo()
  })

  onUnmounted(() => {
    stopBrightnessAnalysis()
    stopPeriodicVideoCheck()
    if (retryTimeout.value) {
      clearTimeout(retryTimeout.value)
    }
    if (hls) {
      hls.destroy()
    }
  })
</script>

<style scoped>
  /* No custom styles needed - using Tailwind classes */
</style>
