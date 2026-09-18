// Virtuo PWA Service Worker (v1.0.0 — Primeira Versão Oficial)
const CACHE_NAME = "virtuo-v1.0.0-prod";

const APP_SHELL_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./firebase-config.js",
  "./manifest.json",
  "./assets/icon.svg",
  "./assets/stars.svg",
  "./src/version.js",
  "./src/i18n/index.js",
  "./src/music/index.js",
  "./src/music/transposer.js",
  "./src/music/chord-parser.js",
  "./src/music/easy-play.js",
  "./src/music/smart-key.js",
  "./src/music/study-plan.js",
  "./src/music/demo-songs.js",
  "./src/music/music-intelligence.js",
  "./src/music/chord-engine/index.js",
  "./src/features/ai/virtuo-ai-view.js",
  "./src/audio/index.js",
  "./src/audio/sound-provider.js",
  "./src/audio/sample-registry.js",
  "./src/audio/musical-events.js",
  "./src/audio/metronome.js",
  "./src/audio/metronome-controller.js",
  "./src/audio/metronome-view.js",
  "./src/audio/band-engine.js",
  "./src/audio/real-band-engine.js",
  "./src/audio/real-sound-engine.js",
  "./src/audio/voice-detector.js",
  "./src/audio/culto-mode.js",
  "./src/features/minister/index.js",
  "./src/features/minister/minister-controller.js",
  "./src/features/minister/minister-view.js",
  "./src/features/minister/auto-scroll.js",
  "./src/features/rehearsal/index.js",
  "./src/features/rehearsal/rehearsal-controller.js",
  "./src/features/rehearsal/rehearsal-view.js",
  "./src/features/gear/index.js",
  "./src/features/gear/gear-schema.js",
  "./src/features/gear/gear-service.js",
  "./src/features/gear/gear-view.js",
  "./src/services/user-activity.js",
  "./src/services/rehearsals.js",
  "./src/services/community.js",
  "./songs-service.js",
  "./src/database/index.js",
  "./src/academy/solfege-bona-schema.js",
  "./src/features/tuner/tuner-view.js",
  "./src/features/vocal/index.js",
  "./src/features/vocal/vocal-view.js",
  "./src/features/vocal/vocal-trainer.js",
  "./src/features/performance/index.js",
  "./src/features/performance/performance-engine.js",
  "./src/features/performance/performance-view.js",
  "./src/features/performance/performance-history.js",
  "./src/features/guitar-coach/coach-view.js",
  "./src/features/diagnostics/diagnostics-view.js",
  "./src/performance/performance-monitor.js",
  "./src/features/admin/index.js",
  "./src/features/admin/song-manager.js",
  "./src/styles/aura.css",
  "./src/styles/branding.css",
  "./src/design/design-system.js",
  "./src/design/branding.js",
  "./src/motion/motion.js",
  "./src/audio/startup-chime.js",
  "./src/features/home/greeting.js",
  "./src/features/home/home-view.js",
  "./src/features/home/index.js",
  "./src/features/pulse/pulse.js",
  "./src/features/pulse/index.js",
  "./src/features/splash/splash.js",
  "./src/features/splash/index.js",
  "./src/features/aura/index.js",
  "./src/features/aura/aura-controller.js",
  "./src/components/ui/index.js",
  "./src/components/ui/card.js",
  "./src/components/ui/button.js",
  "./src/components/ui/input.js",
  "./src/components/ui/modal.js",
  "./src/components/ui/badge.js",
  "./src/components/ui/toast.js",
  "./src/components/ui/loader.js",
  "./src/components/ui/section.js",
  "./src/components/ui/avatar.js",
  "./src/components/ui/divider.js",
  "./src/components/ui/typography.js",
  "./assets/branding/logo.svg",
  "./assets/branding/logo-dark.svg",
  "./assets/branding/logo-light.svg",
  "./assets/branding/favicon.svg",
  "./assets/branding/icon-1024.png",
  "./assets/branding/icon-maskable-1024.png",
  "./assets/branding/logo/logo-principal.svg",
  "./assets/branding/logo/logo-icon-square.svg",
  "./assets/branding/logo/logo-splash.svg",
  "./assets/backgrounds/home.svg",
  "./assets/backgrounds/splash.svg",
  "./assets/backgrounds/login.svg",
  "./assets/backgrounds/missions.svg",
  "./assets/backgrounds/live.svg",
  "./assets/backgrounds/virtuo-background-home.svg",
  "./assets/backgrounds/virtuo-background-splash.svg",
  "./assets/backgrounds/virtuo-background-missions.svg",
  "./assets/backgrounds/virtuo-background-live.svg",
  "./assets/backgrounds/virtuo-background-login.svg"
];

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_SHELL_FILES).catch(err => {
        console.warn("[SW] Pre-caching warning:", err);
      });
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Bypass caching for API endpoints, Firestore, and Firebase Authentication
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("identitytoolkit.googleapis.com") ||
    url.hostname.includes("securetoken.googleapis.com") ||
    url.hostname.includes("firebasestorage.googleapis.com") ||
    event.request.method !== "GET"
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Retorna do cache e atualiza em segundo plano (stale-while-revalidate para arquivos locais)
        if (url.origin === self.location.origin) {
          fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
            }
          }).catch(() => {});
        }
        return cachedResponse;
      }

      return fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && url.origin === self.location.origin) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback para navegação HTML
        if (event.request.headers.get("accept")?.includes("text/html")) {
          return caches.match("./index.html");
        }
      });
    })
  );
});

