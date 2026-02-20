// Service Worker for Skore Point PWA

// We use dynamic versioning so that users always get the latest working code automatically,
// without refreshing tricks or technical knowledge. A new version is generated on each build,
// forcing the browser to update the service worker and clear old caches.
const VERSION = 'dynamic-' + new Date().getTime(); // Dynamic versioning
const CACHE_NAME = `skore-point-${VERSION}`;
const urlsToCache = [
  './',
  './index.html',

  // Shared CSS/JS
  './shared/css/base.css',
  './shared/css/variables.css',
  './shared/css/components.css',
  './shared/js/app.js',

  // Launch page
  './pages/launch/launch.html',
  './pages/launch/launch.css',
  './pages/launch/launch.js',

  // Auth
  './pages/auth/login.html',
  './pages/auth/login.css',
  './pages/auth/login.js',

  // Dashboard
  './pages/dashboard/dashboard.html',
  './pages/dashboard/dashboard.js',

  // School
  './pages/school/school.html',
  './pages/school/school.css',
  './pages/school/school.js',

  // Marks & Reports
  './pages/marks/marks.html',
  './pages/marks/marks.css',
  './pages/marks/marks.js',
  './pages/reports/reports.html',
  './pages/reports/reports.css',
  './pages/reports/reports.js',

  // Services and utils
  './services/report.service.js',
  './services/school.service.js',
  './services/cloudinary.service.js',
  './utils/grading.js',
  './utils/helpers.js',

  // Offline fallback
  './pages/offline/offline.html',

  // Icons & screenshots
  './assets/icons/skore-icon-96.png',
  './assets/icons/skore-icon-144.png',
  './assets/icons/skore-icon-192.png',
  './assets/icons/skore-icon-512-maskable.png',
  './assets/icons/skore-icon-512.jpg',
  './assets/icons/skore-icon.jpg',
  './assets/screenshot/skore-dashboard-wide.png',
  './assets/screenshot/skore-dashboard-mobile.png',

  // Favicons
  // Note: canonical favicons not present; using available skore-icon files instead
  './assets/icons/skore-icon-96.png',
  './assets/icons/skore-icon-192.png'
];

// Install - populate cache
self.addEventListener('install', (event) => {
  console.log(`[sw] Installing service worker version: ${VERSION}...`);
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache files one by one to avoid failing the whole cache if one file fails
      const cachePromises = urlsToCache.map(async (url) => {
        try {
          await cache.add(new Request(url, { cache: 'reload' }));
          console.log(`[sw] Cached: ${url}`);
        } catch (err) {
          console.warn('[sw] Failed to cache', url, err);
        }
      });
      await Promise.all(cachePromises);
    }).then(() => {
      console.log('[sw] Installation complete, skipping waiting');
      return self.skipWaiting();
    })
  );
});

// Activate - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log(`[sw] Activating service worker version: ${VERSION}...`);
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
    }).then(() => {
      console.log('[sw] Activation complete, claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch - network-first for HTML/CSS/JS, cache-first for others
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const requestUrl = new URL(event.request.url);

    // Ignore chrome-extension and external API calls
    if (requestUrl.protocol.startsWith('chrome-extension') || requestUrl.hostname.includes('firebaseapp.com') || requestUrl.hostname.includes('googleapis.com') || requestUrl.hostname.includes('cloudinary.com')) {
        return;
    }

    const isNavigation = event.request.mode === 'navigate';
    const isHtml = (event.request.headers.get('accept') || '').includes('text/html');
    const isJsOrCss = requestUrl.pathname.endsWith('.js') || requestUrl.pathname.endsWith('.css');
    const isImageOrFont = ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.woff2', '.woff', '.ico'].some(ext => requestUrl.pathname.endsWith(ext));

    // Strategy 1: Network-first for HTML, JS, and CSS to ensure freshness
    if (isNavigation || isHtml || isJsOrCss) {
        event.respondWith(
            fetch(event.request)
            .then((response) => {
                // If successful, cache the response and return it
                if (response && response.status === 200) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, copy);
                    });
                }
                return response;
            })
            .catch(() => {
                // If network fails, try to get it from the cache
                return caches.match(event.request).then((cachedResponse) => {
                    // If it's a navigation request and not in cache, show offline page
                    if (isNavigation && !cachedResponse) {
                        console.log('[sw] Navigation failed, showing offline page');
                        return caches.match('/pages/offline/offline.html');
                    }
                    return cachedResponse;
                });
            })
        );
        return;
    }

    // Strategy 2: Cache-first for images and fonts
    if (isImageOrFont) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                return cachedResponse || fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, copy);
                        });
                    }
                    return networkResponse;
                });
            }).catch((error) => {
                console.log(`[sw] Failed to fetch image/font ${event.request.url}`, error);
                // Return a fallback image if available
                if (isImageOrFont) {
                    return caches.match('./assets/icons/skore-icon-96.png');
                }
            })
        );
        return;
    }

    // Strategy 3: Default (Network then cache fallback) for everything else
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});

// Listen for skipWaiting message to allow immediate activation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[sw] Skip waiting message received');
    self.skipWaiting();
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[sw] Push notification received');
  
  let data = { title: 'Skore Point', body: 'New update available', icon: './assets/icons/skore-icon-192.png' };
  
  if (event.data) {
    try {
      data = JSON.parse(event.data.text());
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon || './assets/icons/skore-icon-192.png',
    badge: './assets/icons/skore-icon-96.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[sw] Notification click received');
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window open
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
