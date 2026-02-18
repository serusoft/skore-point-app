// Service Worker for Skore Point PWA

const CACHE_NAME = 'skore-point-v2.5';
const urlsToCache = [
  '/',
  '/index.html',

  // Shared CSS/JS
  '/shared/css/base.css',
  '/shared/css/variables.css',
  '/shared/css/components.css',
  '/shared/js/app.js',

  // Launch page
  '/pages/launch/launch.html',
  '/pages/launch/launch.css',
  '/pages/launch/launch.js',

  // Auth
  '/pages/auth/login.html',
  '/pages/auth/login.css',
  '/pages/auth/login.js',

  // Marks & Reports
  '/pages/marks/marks.html',
  '/pages/marks/marks.css',
  '/pages/marks/marks.js',
  '/pages/reports/reports.html',
  '/pages/reports/reports.css',
  '/pages/reports/reports.js',

  // Services and utils
  '/services/report.service.js',
  '/services/school.service.js',
  '/utils/grading.js',
  '/utils/helpers.js',

  // Offline fallback
  '/pages/offline/offline.html',

  // Icons & screenshots
  '/assets/icons/skore-icon-96.png',
  '/assets/icons/skore-icon-144.png',
  '/assets/icons/skore-icon-192.png',
  '/assets/icons/skore-icon-512-maskable.png',
  '/assets/icons/skore-icon-512.jpg',
  '/assets/icons/skore-icon.jpg',
  '/assets/screenshot/skore-dashboard-wide.png',
  '/assets/screenshot/skore-dashboard-mobile.png',

  // Favicons
  // Note: canonical favicons not present; using available skore-icon files instead
  '/assets/icons/skore-icon-96.png',
  '/assets/icons/skore-icon-192.png'
];

// Install - populate cache
self.addEventListener('install', (event) => {
  console.log('[sw] Installing service worker v2.5...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of urlsToCache) {
        try {
          await cache.add(new Request(url, { cache: 'reload' }));
        } catch (err) {
          console.warn('[sw] Failed to cache', url, err);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// Activate - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[sw] Activating service worker v2.5...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[sw] Deleting cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - network-first for HTML/CSS/JS, cache-first for others
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  // Ignore chrome-extension and external API calls for caching
  if (requestUrl.protocol.startsWith('chrome-extension') || requestUrl.hostname.includes('firebaseapp.com') || requestUrl.hostname.includes('googleapis.com') || requestUrl.hostname.includes('cloudinary.com')) {
    return;
  }

  const isNavigation = event.request.mode === 'navigate' || (event.request.headers.get('accept') || '').includes('text/html');
  const isStaticAsset = ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.woff2', '.woff', '.css', '.js', '.ico'].some(ext => requestUrl.pathname.endsWith(ext));

  if (isNavigation || event.request.headers.get('accept')?.includes('text/html')) {
    // Network-first for navigations (HTML)
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match('/pages/offline/offline.html'))
    );
    return;
  }

  if (isStaticAsset) {
    // Cache-first for static assets
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).then((resp) => {
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return resp;
      }).catch(() => caches.match('/pages/offline/offline.html')))
    );
    return;
  }

  // Default: try network then fallback to cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Listen for skipWaiting message to allow immediate activation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
