// Service Worker for Skore Point PWA

const CACHE_VERSION = '1.1.4'; // Increment version to force cache refresh
const CACHE_NAME = `skore-point-v${CACHE_VERSION}`;
const urlsToCache = [
    'index.html',
    './',

    // Shared resources
    'shared/css/base.css',
    'shared/css/variables.css',
    'shared/css/components.css',
    'shared/js/app.js',
    'shared/js/router.js',
    'shared/js/auth-guard.js',
    'shared/js/ui.js',

    // Pages
    'pages/launch/launch.html',
    'pages/launch/launch.css',
    'pages/launch/launch.js',

    'pages/auth/login.html',
    'pages/auth/login.css',
    'pages/auth/login.js',

    'pages/auth/register.html',
    'pages/auth/register.css',
    'pages/auth/register.js',

    'pages/dashboard/dashboard.html',
    'pages/dashboard/dashboard.css',
    'pages/dashboard/dashboard.js',

    'pages/school/school.html',
    'pages/school/school.css',
    'pages/school/school.js',

    'pages/marks/marks.html',
    'pages/marks/marks.css',
    'pages/marks/marks.js',

    'pages/offline/offline.html',

    // Assets
    'assets/icons/icon-192x192.png',
    'assets/icons/icon-512x512.png',
    'assets/screenshot/skore-dashboard-wide.png',
    'assets/screenshot/skore-dashboard-mobile.png',
    
    // External libraries
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2',
    
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache opened');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('All resources cached');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Cache installation failed:', error);
            })
    );
});

// Activate event
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            console.log('Service Worker activated');
            return self.clients.claim();
        })
    );
});

// Fetch event
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;
    
    // Skip Chrome extensions and Firebase/Google API requests
    const requestUrl = event.request.url;
    if (requestUrl.startsWith('chrome-extension://') || 
        requestUrl.includes('firebasestorage.googleapis.com') ||
        requestUrl.includes('firebaseapp.com') ||
        requestUrl.includes('googleapis.com') ||
        requestUrl.includes('res.cloudinary.com') ||
        requestUrl.includes('api.cloudinary.com')) {
        return;
    }
    
    // Determine if this is an HTML, CSS, or JS file that should be network-first
    const isHTMLRequest = event.request.headers.get('Accept').includes('text/html');
    const isCSSRequest = requestUrl.endsWith('.css');
    const isJSRequest = requestUrl.endsWith('.js');
    
    if (isHTMLRequest || isCSSRequest || isJSRequest) {
        // Network-first strategy for HTML, CSS, and JS
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (!response || response.status !== 200) {
                        return response;
                    }
                    
                    // Clone and cache the response
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                })
                .catch(error => {
                    // Fall back to cache if network fails
                    console.log('Network failed, trying cache:', event.request.url);
                    return caches.match(event.request)
                        .then(cachedResponse => {
                            if (cachedResponse) {
                                return cachedResponse;
                            }
                            
                            // If it's a page request, return offline page
                            if (isHTMLRequest) {
                                return caches.match('pages/offline/offline.html');
                            }
                            
                            return new Response('Resource not available', {
                                status: 404,
                                headers: { 'Content-Type': 'text/plain' }
                            });
                        });
                })
        );
    } else {
        // Cache-first strategy for assets
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    // Return cached response if found
                    if (cachedResponse) {
                        console.log('Serving from cache:', event.request.url);
                        return cachedResponse;
                    }
                    
                    // Otherwise fetch from network
                    return fetch(event.request)
                        .then(response => {
                            // Check if we received a valid response
                            if (!response || response.status !== 200 || response.type !== 'basic') {
                                return response;
                            }
                            
                            // Clone the response
                            const responseToCache = response.clone();
                            
                            // Cache the new resource
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                            
                            return response;
                        })
                        .catch(error => {
                            console.log('Fetch failed:', error);
                            return caches.match('pages/offline/offline.html');
                        });
                })
        );
    }
});

// Background sync for offline data
self.addEventListener('sync', event => {
    console.log('Background sync:', event.tag);
    
    if (event.tag === 'sync-marks') {
        event.waitUntil(syncMarks());
    }
});

// Push notification event
self.addEventListener('push', event => {
    console.log('Push notification received:', event);
    
    const options = {
        body: event.data ? event.data.text() : 'New notification from Skore Point',
        icon: 'assets/icons/icon-192x192.png',
        badge: 'assets/icons/icon-192x192.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: '1'
        },
        actions: [
            {
                action: 'open',
                title: 'Open App'
            },
            {
                action: 'close',
                title: 'Close'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Skore Point', options)
    );
});

// Notification click event
self.addEventListener('notificationclick', event => {
    console.log('Notification click:', event);
    
    event.notification.close();
    
    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow('index.html')
        );
    }
});

// Sync marks function
async function syncMarks() {
    // This function would sync offline marks data
    // Implementation depends on your offline data strategy
    console.log('Syncing marks data...');
    
    // Example: Get offline marks from IndexedDB and sync to Firebase
    // const offlineMarks = await getOfflineMarks();
    // await syncMarksToFirebase(offlineMarks);
}