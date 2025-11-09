// Service Worker for TimeIsMoney PWA
const CACHE_NAME = 'tim2-v1.0.1';
const STATIC_CACHE = 'tim2-static-v1.0.1';
const DYNAMIC_CACHE = 'tim2-dynamic-v1.0.1';
const OFFLINE_URL = '/offline.html';

// Assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/offline.html',
    '/manifest.json',
    '/css/app.css',
    '/js/app.js',
    '/images/logo.png'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('[ServiceWorker] Install');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[ServiceWorker] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[ServiceWorker] Activate');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                        console.log('[ServiceWorker] Removing old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip chrome extension requests and other unsupported schemes
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Handle API calls differently
    if (url.pathname.startsWith('/api')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Clone the response before caching
                    const responseToCache = response.clone();

                    // Cache successful API responses
                    if (response.status === 200) {
                        caches.open(DYNAMIC_CACHE)
                            .then(cache => cache.put(request, responseToCache));
                    }

                    return response;
                })
                .catch(() => {
                    // If offline, try to serve from cache
                    return caches.match(request);
                })
        );
        return;
    }

    // Network-first strategy for translation files
    if (url.pathname.includes('/locales/') && url.pathname.endsWith('.json')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Clone and cache the fresh translation
                    const responseToCache = response.clone();
                    caches.open(DYNAMIC_CACHE)
                        .then(cache => cache.put(request, responseToCache));
                    return response;
                })
                .catch(() => {
                    // If offline, try to serve from cache
                    return caches.match(request);
                })
        );
        return;
    }

    // Network-first strategy for HTML pages
    if (request.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    const responseToCache = response.clone();
                    caches.open(DYNAMIC_CACHE)
                        .then(cache => cache.put(request, responseToCache));
                    return response;
                })
                .catch(() => {
                    return caches.match(request)
                        .then(response => {
                            if (response) {
                                return response;
                            }
                            // Return offline page if no cache match
                            return caches.match(OFFLINE_URL);
                        });
                })
        );
        return;
    }

    // Cache-first strategy for static assets
    event.respondWith(
        caches.match(request)
            .then(response => {
                if (response) {
                    return response;
                }

                return fetch(request)
                    .then(response => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        const responseToCache = response.clone();
                        caches.open(DYNAMIC_CACHE)
                            .then(cache => cache.put(request, responseToCache));

                        return response;
                    });
            })
    );
});

// Background sync for offline time entries
self.addEventListener('sync', event => {
    console.log('[ServiceWorker] Sync event');

    if (event.tag === 'sync-time-entries') {
        event.waitUntil(syncTimeEntries());
    }
});

// Sync time entries when back online
async function syncTimeEntries() {
    try {
        const db = await openDB();
        const tx = db.transaction('pendingTimeEntries', 'readonly');
        const store = tx.objectStore('pendingTimeEntries');
        const entries = await store.getAll();

        for (const entry of entries) {
            try {
                const response = await fetch('/api/time-entries', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${entry.token}`
                    },
                    body: JSON.stringify(entry.data)
                });

                if (response.ok) {
                    // Remove from pending if successful
                    const deleteTx = db.transaction('pendingTimeEntries', 'readwrite');
                    await deleteTx.objectStore('pendingTimeEntries').delete(entry.id);
                }
            } catch (error) {
                console.error('[ServiceWorker] Failed to sync entry:', error);
            }
        }
    } catch (error) {
        console.error('[ServiceWorker] Sync failed:', error);
    }
}

// Push notifications
self.addEventListener('push', event => {
    console.log('[ServiceWorker] Push received');

    let title = 'TimeIsMoney';
    let options = {
        body: 'You have a new notification',
        icon: '/images/icons/icon-192x192.png',
        badge: '/images/icons/badge-72x72.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now()
        },
        actions: [
            {
                action: 'view',
                title: 'View'
            },
            {
                action: 'close',
                title: 'Close'
            }
        ]
    };

    if (event.data) {
        const data = event.data.json();
        title = data.title || title;
        options = { ...options, ...data.options };
    }

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    console.log('[ServiceWorker] Notification click');
    event.notification.close();

    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow(event.notification.data?.url || '/')
        );
    }
});

// IndexedDB helper functions
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('Tim2DB', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = event => {
            const db = event.target.result;

            // Create stores for offline data
            if (!db.objectStoreNames.contains('pendingTimeEntries')) {
                db.createObjectStore('pendingTimeEntries', {
                    keyPath: 'id',
                    autoIncrement: true
                });
            }

            if (!db.objectStoreNames.contains('cachedData')) {
                const store = db.createObjectStore('cachedData', {
                    keyPath: 'key'
                });
                store.createIndex('timestamp', 'timestamp');
            }
        };
    });
}

// Message handling for client communication
self.addEventListener('message', event => {
    console.log('[ServiceWorker] Message received:', event.data);

    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }

    if (event.data.action === 'clearCache') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            }).then(() => {
                return event.ports[0].postMessage({ success: true });
            })
        );
    }

    if (event.data.action === 'cacheTimeEntry') {
        event.waitUntil(
            openDB().then(db => {
                const tx = db.transaction('pendingTimeEntries', 'readwrite');
                const store = tx.objectStore('pendingTimeEntries');
                return store.add({
                    data: event.data.entry,
                    token: event.data.token,
                    timestamp: Date.now()
                });
            }).then(() => {
                return event.ports[0].postMessage({ success: true });
            }).catch(error => {
                return event.ports[0].postMessage({
                    success: false,
                    error: error.message
                });
            })
        );
    }
});