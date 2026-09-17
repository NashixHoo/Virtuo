// Virtuo PWA Service Worker (v2.1.0-prod)
const CACHE_NAME = "virtuo-v2.1.0";

const APP_SHELL_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./firebase-config.js",
  "./manifest.json",
  "./assets/icon.svg",
  "./assets/stars.svg",
  "./src/music/index.js",
  "./src/music/transposer.js",
  "./src/music/chord-parser.js",
  "./src/music/easy-play.js",
  "./src/music/smart-key.js",
  "./src/music/study-plan.js",
  "./src/music/demo-songs.js",
  "./src/music/music-intelligence.js",
  "./src/features/ai/virtuo-ai-view.js",
  "./src/audio/index.js",
  "./src/audio/metronome.js",
  "./src/audio/metronome-controller.js",
  "./src/audio/metronome-view.js",
  "./src/audio/band-engine.js",
  "./src/audio/voice-detector.js",
  "./src/features/minister/index.js",
  "./src/features/minister/minister-controller.js",
  "./src/features/minister/minister-view.js",
  "./src/features/minister/auto-scroll.js",
  "./src/features/rehearsal/index.js",
  "./src/features/rehearsal/rehearsal-controller.js",
  "./src/features/rehearsal/rehearsal-view.js",
  "./src/services/rehearsals.js",
  "./src/services/community.js",
  "./songs-service.js",
  "./src/database/index.js",
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
  "./src/design/design-system.js",
  "./src/audio/startup-chime.js",
  "./src/features/home/greeting.js",
  "./src/features/home/home-view.js",
  "./src/features/home/index.js",
  "./src/features/pulse/pulse.js",
  "./src/features/pulse/index.js",
  "./src/features/splash/splash.js",
  "./src/features/splash/index.js"
];

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

