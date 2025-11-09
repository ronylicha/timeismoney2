// Service Worker for TimeIsMoney PWA
const CACHE_NAME = 'timeismoney-v7';
const urlsToCache = [
  '/login',
  '/manifest.json?v=3.1.0',
  '/images/icons/icon-192x192-v3.png',
  '/images/icons/icon-512x512-v3.png',
  '/images/icons/icon-144x144-v3.png',
  '/images/icons/icon-96x96-v3.png',
  '/images/icons/icon-72x72-v3.png'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Cache addAll failed:', error);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          // Delete ALL old caches including workbox caches
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      // Force all tabs to reload to get new content
      return self.clients.matchAll({ type: 'window' });
    }).then(clients => {
      clients.forEach(client => {
        // Send message to client to reload
        client.postMessage({ type: 'CACHE_UPDATED', version: '3.1.0' });
      });
    })
  );
  // Claim clients immediately
  self.clients.claim();
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Skip Vite dev server requests (port 5173-5177)
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    const port = parseInt(url.port);
    if (port >= 5173 && port <= 5177) {
      return;
    }
  }

  // Skip HMR and Vite specific requests
  if (url.pathname.includes('/@vite') ||
      url.pathname.includes('/@react-refresh') ||
      url.pathname.includes('/@fs/') ||
      url.pathname.includes('/node_modules/')) {
    return;
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    // In PWA mode, always redirect to login for the root path
    if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '' || url.pathname === '/dashboard') {
      // Check if this is a PWA navigation to root
      if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '') {
        event.respondWith(
          Response.redirect('/login', 302)
        );
        return;
      }
    }

    // For other navigation requests, try network first, then cache
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful responses
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(request)
            .then(response => {
              if (response) {
                return response;
              }
              // If not in cache, return login page for navigation requests
              return caches.match('/login');
            });
        })
    );
    return;
  }

  // For API requests, network only (don't cache API responses)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // For static resources (JS, CSS, images), use cache-first strategy
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          // Return cached version
          return response;
        }
        // If not in cache, fetch from network
        return fetch(request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type === 'opaque') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Add to cache
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, responseToCache);
              });

            return response;
          });
      })
  );
});

// Handle push notifications
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle notification',
    icon: '/images/icons/icon-192x192.png',
    badge: '/images/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('TimeIsMoney', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/dashboard')
  );
});