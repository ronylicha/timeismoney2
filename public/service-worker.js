// Advanced Service Worker for TimeIsMoney PWA
// Provides offline-first API access, bidirectional sync, and ID deduplication

const CACHE_VERSION = '4.3.0';
const CACHE_BASE = `tim2-v${CACHE_VERSION}`;
const STATIC_CACHE = `${CACHE_BASE}-static`;
const DYNAMIC_CACHE = `${CACHE_BASE}-dynamic`;
const API_CACHE = `${CACHE_BASE}-api`;
const OFFLINE_URL = '/offline.html';

const OFFLINE_SYNC_TAG = 'sync-offline-queue';
const LEGACY_SYNC_TAG = 'sync-time-entries';

const DB_NAME = 'Tim2DB';
const DB_VERSION = 2;
const JSON_HEADERS = { 'Content-Type': 'application/json' };

// iOS detection for cache limits (Service Worker still exposes navigator)
const isIOS = /iphone|ipad|ipod/i.test(self.navigator.userAgent || '');
const MAX_CACHE_SIZE = isIOS ? 50 : 100;
const MAX_CACHE_AGE = isIOS ? 1000 * 60 * 60 * 24 * 3 : 1000 * 60 * 60 * 24 * 7;

const OFFLINE_ROUTES = [
    '/time',
    '/timesheet',
    '/clients',
    '/clients/new',
    '/projects',
    '/projects/new',
    '/expenses',
    '/expenses/new',
];

// Static assets cached on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/offline.html',
    '/manifest.json',
    '/build/manifest.json',
    '/css/app.css',
    '/js/app.js',
    '/images/logo.png',
    '/app-manifest-v3.json',
    '/images/icons/icon-192x192-v3.png',
    '/images/icons/icon-512x512-v3.png',
    '/wasm/sql-wasm.wasm',
    ...OFFLINE_ROUTES,
];

const EXTERNAL_ASSETS = [
    'https://fonts.bunny.net/css?family=inter:400,500,600,700',
];

const CRITICAL_MANIFEST_ENTRIES = [
    'resources/js/app.tsx',
    'resources/js/pages/TimeTracking.tsx',
    'resources/js/pages/TimeSheet.tsx',
    'resources/js/pages/Clients.tsx',
    'resources/js/pages/ClientDetail.tsx',
    'resources/js/pages/CreateClient.tsx',
    'resources/js/pages/EditClient.tsx',
    'resources/js/pages/Projects.tsx',
    'resources/js/pages/ProjectDetail.tsx',
    'resources/js/pages/CreateProject.tsx',
    'resources/js/pages/EditProject.tsx',
    'resources/js/pages/Expenses.tsx',
    'resources/js/pages/CreateExpense.tsx',
];

// API paths that should never be intercepted for offline writes
const OFFLINE_BLOCKLIST = [
    /\/quotes?/i,
    /\/invoices?/i,
    /\/factures?/i,
    /\/billing/i,
    /\/payments?/i,
    /\/stripe/i,
];

const TIMER_OPERATIONS = ['start', 'stop', 'pause', 'resume', 'current'];

const ENTITY_META = {
    projects: { key: 'project', label: 'Project' },
    clients: { key: 'client', label: 'Client' },
    tasks: { key: 'task', label: 'Task' },
    'time-entries': { key: 'time_entry', label: 'Time entry', collectionKey: 'time_entries' },
    users: { key: 'user', label: 'User' },
    notifications: { key: 'notification', label: 'Notification' },
    expenses: { key: 'expense', label: 'Expense' },
    'expense-categories': { key: 'expense_category', label: 'Expense category' },
};

const hasNavigatorStatus = typeof self.navigator !== 'undefined' && typeof self.navigator.onLine === 'boolean';
let swIsOnline = hasNavigatorStatus ? self.navigator.onLine : true;
let swAuthToken = null;

const DEBUG_LOG_ENABLED = (() => {
    try {
        const host = self.location?.hostname || '';
        return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.test') || host.endsWith('.local');
    } catch (error) {
        return false;
    }
})();

const API_PREFETCH_ENDPOINTS = [
    '/projects',
    '/clients',
    '/tasks?include_full=true', // Include all relations (comments, attachments, checklist) for offline
    '/time-entries?scope=recent',
    '/time-entries/timesheet',
    '/expenses',
    '/expense-categories',
    '/notifications',
    '/users/me',
    '/users',
    '/dashboard/summary',
];

const API_PREFETCH_HEADERS = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
};

const DB_DEBUG_LOGS_ENABLED = DEBUG_LOG_ENABLED;
const API_PREFETCH_TIMEOUT_MS = 15000;
const API_PREFETCH_INTERVAL_MS = 1000 * 60 * 5; // 5 minutes

let prefetchIntervalId = null;

function debugLog(...args) {
    if (!DEBUG_LOG_ENABLED) {
        return;
    }
    console.log('[ServiceWorker][Debug]', ...args);
}

function debugDbInsert(storeName, value) {
    if (!DB_DEBUG_LOGS_ENABLED) {
        return;
    }
    try {
        const label = extractDebugIdentifier(value);
        const preview = buildPreviewSnippet(value);
        console.debug(`[ServiceWorker][DB] ${storeName}${label ? ` (${label})` : ''}`, preview);
    } catch (error) {
        console.debug(`[ServiceWorker][DB] ${storeName}`, value);
    }
}

function extractDebugIdentifier(value) {
    if (!value || typeof value !== 'object') {
        return '';
    }
    return value.key || value.url || value.clientId || value.id || '';
}

function buildPreviewSnippet(value) {
    if (value == null) {
        return '';
    }

    if (typeof value === 'string') {
        return value.slice(0, 500);
    }

    if (typeof value === 'object') {
        try {
            return JSON.stringify(value).slice(0, 500);
        } catch (error) {
            return '[unserializable]';
        }
    }

    return String(value);
}

function getAuthHeaderValue() {
    if (!swAuthToken) {
        return null;
    }
    return `Bearer ${swAuthToken}`;
}

function buildPrefetchHeaders() {
    const headers = new Headers(API_PREFETCH_HEADERS);
    const authHeader = getAuthHeaderValue();
    if (authHeader) {
        headers.set('Authorization', authHeader);
    }
    return headers;
}

self.addEventListener('message', event => {
    if (!event.data) return;

    if (event.data.action === 'SET_ONLINE_STATUS') {
        const wasOffline = !swIsOnline;
        swIsOnline = Boolean(event.data.online);

        // When coming back online, prefetch data
        if (wasOffline && swIsOnline && swAuthToken) {
            debugLog('[ServiceWorker] Back online, prefetching data');
            if (event.waitUntil) {
                event.waitUntil(prefetchApiData('back-online'));
            } else {
                prefetchApiData('back-online');
            }
        }

        // Start/stop periodic prefetch based on online status
        if (swIsOnline && swAuthToken) {
            startPeriodicPrefetch();
        } else {
            stopPeriodicPrefetch();
        }
        return;
    }

    if (event.data.action === 'SET_AUTH_TOKEN') {
        swAuthToken = typeof event.data.token === 'string' && event.data.token ? event.data.token : null;
        debugLog('[ServiceWorker] Auth token updated', swAuthToken ? 'present' : 'cleared');

        if (swAuthToken && swIsOnline) {
            startPeriodicPrefetch();
            if (event.waitUntil) {
                event.waitUntil(prefetchApiData('auth-token-update'));
            } else {
                prefetchApiData('auth-token-update');
            }
        } else {
            stopPeriodicPrefetch();
        }
        return;
    }

    if (event.data.action === 'CLEAR_AUTH_TOKEN') {
        swAuthToken = null;
        stopPeriodicPrefetch();
        debugLog('[ServiceWorker] Auth token cleared');
        return;
    }

    if (event.data.action === 'PREFETCH_NOW') {
        debugLog('[ServiceWorker] Manual prefetch requested');
        if (event.waitUntil) {
            event.waitUntil(prefetchApiData('manual'));
        } else {
            prefetchApiData('manual');
        }
        return;
    }
});

// -----------------------------
// Install & Activate
// -----------------------------
self.addEventListener('install', event => {
    event.waitUntil(
        (async () => {
            try {
                await Promise.all([
                    precacheAssets(STATIC_CACHE, STATIC_ASSETS),
                    caches.open(DYNAMIC_CACHE),
                    caches.open(API_CACHE),
                    prefetchCriticalChunks(),
                    precacheAssets(DYNAMIC_CACHE, EXTERNAL_ASSETS),
                    prefetchApiData('install'),
                ]);
            } catch (error) {
                console.warn('[ServiceWorker] Install encountered errors but continuing', error);
            } finally {
                self.skipWaiting();
            }
        })()
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (![STATIC_CACHE, DYNAMIC_CACHE, API_CACHE].includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                    return null;
                })
            );
        }).then(() => limitCacheSize(DYNAMIC_CACHE, MAX_CACHE_SIZE))
          .then(() => cleanOldCacheEntries(DYNAMIC_CACHE, MAX_CACHE_AGE))
          .then(() => self.clients.claim())
          .then(() => prefetchApiData('activate'))
          .then(() => {
              // Start periodic prefetch if we have auth token and are online
              if (swAuthToken && swIsOnline) {
                  startPeriodicPrefetch();
              }
          })
    );
});

// -----------------------------
// Fetch Handling
// -----------------------------
self.addEventListener('fetch', event => {
    const hasNavigator = typeof self.navigator !== 'undefined' && typeof self.navigator.onLine === 'boolean';
    const navigatorOnline = hasNavigator ? self.navigator.onLine : undefined;
    const effectiveOnline = typeof navigatorOnline === 'boolean' ? navigatorOnline : swIsOnline;

    if (swIsOnline !== effectiveOnline) {
        swIsOnline = effectiveOnline;
    }
    const { request } = event;
    const url = new URL(request.url);

    if (!url.protocol.startsWith('http')) {
        return;
    }

    if (isOfflineCapableApiRequest(request)) {
        event.respondWith(handleOfflineCapableApiRequest(request));
        return;
    }

    // Translation files: network first
    if (url.pathname.includes('/locales/') && url.pathname.endsWith('.json')) {
        event.respondWith(networkFirstTranslation(request));
        return;
    }

    // HTML navigation requests
    if (request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(networkFirstHTML(request));
        return;
    }

    const staticDestinations = new Set(['style', 'script', 'image', 'font', 'worker']);

    if (staticDestinations.has(request.destination) || request.url.endsWith('.wasm') || request.destination === 'manifest') {
        event.respondWith(cacheFirstStatic(request));
        return;
    }
});

// -----------------------------
// Background Sync
// -----------------------------
self.addEventListener('sync', event => {
    if (event.tag === OFFLINE_SYNC_TAG) {
        event.waitUntil(processOfflineQueue());
    }

    if (event.tag === LEGACY_SYNC_TAG) {
        event.waitUntil(syncTimeEntries());
    }
});

// -----------------------------
// Push Notifications
// -----------------------------
self.addEventListener('push', event => {
    let title = 'TimeIsMoney';
    let options = {
        body: 'You have a new notification',
        icon: '/images/icons/icon-192x192.png',
        badge: '/images/icons/badge-72x72.png',
        vibrate: [200, 100, 200],
        data: { dateOfArrival: Date.now() },
        actions: [
            { action: 'view', title: 'View' },
            { action: 'close', title: 'Close' },
        ],
    };

    if (event.data) {
        try {
            const data = event.data.json();
            title = data.title || title;
            options = { ...options, ...data.options };
        } catch (error) {
            options.body = event.data.text();
        }
    }

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'view') {
        event.waitUntil(clients.openWindow(event.notification.data?.url || '/dashboard'));
        return;
    }

    event.waitUntil(clients.openWindow('/dashboard'));
});

// -----------------------------
// Message Handling
// -----------------------------
self.addEventListener('message', event => {
    const { data } = event;
    if (!data || !data.action) return;

    switch (data.action) {
        case 'skipWaiting':
            self.skipWaiting();
            break;
        case 'clearCache':
            event.waitUntil(clearAllCaches().then(() => reply(event, { success: true })));
            break;
        case 'forceRefresh':
            event.waitUntil(
                forceRefreshCaches()
                    .then(() => prefetchApiData('message:forceRefresh'))
                    .then(() => reply(event, { success: true }))
            );
            break;
        case 'getCacheInfo':
            event.waitUntil(getCacheInfo().then(info => reply(event, { success: true, cacheInfo: info })));
            break;
        case 'cacheTimeEntry':
            event.waitUntil(cacheTimeEntry(data.entry, data.token).then(() => reply(event, { success: true })).catch(error => reply(event, { success: false, error: error.message })));
            break;
        case 'flushOfflineQueue':
            event.waitUntil(processOfflineQueue().then(() => reply(event, { success: true })).catch(error => reply(event, { success: false, error: error.message })));
            break;
        default:
            break;
    }
});

function reply(event, payload) {
    if (event.ports && event.ports[0]) {
        event.ports[0].postMessage(payload);
    }
}

// -----------------------------
// Fetch Strategies
// -----------------------------
async function handleOfflineCapableApiRequest(request) {
    const entityInfo = parseEntityInfo(request);
    const method = request.method.toUpperCase();

    if (method === 'GET') {
        return networkFirstApi(request, entityInfo);
    }

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        return handleApiMutation(request, entityInfo);
    }

    return fetch(request);
}

async function networkFirstApi(request, entityInfo) {
    try {
        const networkResponse = await fetch(request);

        if (isJSONResponse(networkResponse)) {
            cacheApiResponse(request, networkResponse.clone());
        } else {
            caches.open(API_CACHE).then(cache => cache.put(request, networkResponse.clone()));
        }

        return networkResponse;
    } catch (error) {
        const cachedRecord = await getCachedApiRecord(request.url);

        if (cachedRecord) {
            let payload = parseJSON(cachedRecord.body) || {};
            payload = await applyPendingChangesToPayload(entityInfo, payload);
            return new Response(JSON.stringify(payload), {
                status: cachedRecord.status || 200,
                headers: buildOfflineHeaders(cachedRecord.headers),
            });
        }

        const pendingOnly = await buildPendingOnlyPayload(entityInfo);
        if (pendingOnly) {
            return new Response(JSON.stringify(pendingOnly), {
                status: 200,
                headers: buildOfflineHeaders(),
            });
        }

        return new Response(JSON.stringify({
            message: 'Offline data unavailable for this resource',
            offline: true,
        }), {
            status: 503,
            headers: JSON_HEADERS,
        });
    }
}

async function handleApiMutation(request, entityInfo) {
    const offlineClone = request.clone();
    try {
        const response = await fetch(request);
        if (isJSONResponse(response)) {
            cacheApiResponse(request, response.clone());
        }
        return response;
    } catch (error) {
        if (!entityInfo.entity || entityInfo.isBlocked) {
            return new Response(JSON.stringify({
                message: 'Offline mode not supported for this endpoint',
                offline: true,
            }), {
                status: 503,
                headers: JSON_HEADERS,
            });
        }

        return queueOfflineMutation(offlineClone, entityInfo);
    }
}

// -----------------------------
// Offline Queueing & Responses
// -----------------------------
async function queueOfflineMutation(request, entityInfo) {
    const bodyText = await request.text();
    const payload = parseJSON(bodyText) || {};
    const entryHeaders = {};

    request.headers.forEach((value, key) => {
        entryHeaders[key] = value;
    });

    const baseAction = deriveActionFromRequest(request.method, entityInfo);

    // Timer operations are handled specially so we can convert them to manual entries
    if (entityInfo.entity === 'time-entries' && TIMER_OPERATIONS.includes(entityInfo.operation || '')) {
        return handleOfflineTimerRequest(entityInfo, baseAction, payload);
    }

    let clientId = entityInfo.id;
    if (!clientId) {
        clientId = ensureClientId(payload, entityInfo);
    }

    const pendingPayload = enrichPayloadForOffline(payload, clientId, entityInfo);

    await savePendingEntity({
        clientId,
        entityType: entityInfo.entity,
        action: baseAction,
        payload: pendingPayload,
        targetId: entityInfo.id || null,
    });

    await addOfflineQueueEntry({
        url: request.url,
        method: request.method,
        headers: entryHeaders,
        body: bodyText,
        entityType: entityInfo.entity,
        action: baseAction,
        clientId,
        targetId: entityInfo.id || null,
        operation: entityInfo.operation || null,
        attempts: 0,
        createdAt: Date.now(),
    });

    await registerBackgroundSync();

    return buildOptimisticResponse(entityInfo, baseAction, pendingPayload);
}

async function handleOfflineTimerRequest(entityInfo, action, payload) {
    switch (entityInfo.operation) {
        case 'start':
            return handleTimerStartOffline(payload);
        case 'pause':
            return handleTimerPauseOffline();
        case 'resume':
            return handleTimerResumeOffline();
        case 'stop':
            return handleTimerStopOffline(payload);
        default:
            return new Response(JSON.stringify({
                message: 'Timer action queued offline',
                offline: true,
            }), { status: 202, headers: JSON_HEADERS });
    }
}

async function handleTimerStartOffline(payload) {
    const clientId = generateClientId('timer');
    const startedAt = new Date().toISOString();

    const timer = {
        id: clientId,
        project_id: payload.project_id,
        task_id: payload.task_id || null,
        description: payload.description || '',
        started_at: startedAt,
        ended_at: null,
        is_billable: payload.is_billable ?? true,
        status: 'running',
        offline: true,
        paused_seconds: 0,
        pauses: [],
    };

    await savePendingEntity({
        clientId,
        entityType: 'time-entries',
        action: 'timer',
        payload: timer,
    });

    return new Response(JSON.stringify({
        message: 'Timer started offline',
        timer,
        offline: true,
    }), { status: 201, headers: JSON_HEADERS });
}

async function handleTimerPauseOffline() {
    const timer = await getActiveOfflineTimer();
    if (!timer) {
        return new Response(JSON.stringify({ message: 'No offline timer running', offline: true }), { status: 404, headers: JSON_HEADERS });
    }

    if (timer.status === 'paused') {
        return new Response(JSON.stringify({ message: 'Timer already paused', timer, offline: true }), { status: 200, headers: JSON_HEADERS });
    }

    timer.status = 'paused';
    timer.pauses = timer.pauses || [];
    timer.pauses.push({ started_at: new Date().toISOString() });

    await savePendingEntity({
        clientId: timer.id,
        entityType: 'time-entries',
        action: 'timer',
        payload: timer,
    });

    return new Response(JSON.stringify({ message: 'Timer paused offline', timer, offline: true }), { status: 200, headers: JSON_HEADERS });
}

async function handleTimerResumeOffline() {
    const timer = await getActiveOfflineTimer();
    if (!timer) {
        return new Response(JSON.stringify({ message: 'No offline timer running', offline: true }), { status: 404, headers: JSON_HEADERS });
    }

    if (timer.status !== 'paused') {
        return new Response(JSON.stringify({ message: 'Timer is not paused', timer, offline: true }), { status: 200, headers: JSON_HEADERS });
    }

    const lastPause = timer.pauses?.[timer.pauses.length - 1];
    if (lastPause && !lastPause.ended_at) {
        lastPause.ended_at = new Date().toISOString();
        timer.paused_seconds = (timer.paused_seconds || 0) + Math.max(0, (new Date(lastPause.ended_at).getTime() - new Date(lastPause.started_at).getTime()) / 1000);
    }

    timer.status = 'running';
    await savePendingEntity({
        clientId: timer.id,
        entityType: 'time-entries',
        action: 'timer',
        payload: timer,
    });

    return new Response(JSON.stringify({ message: 'Timer resumed offline', timer, offline: true }), { status: 200, headers: JSON_HEADERS });
}

async function handleTimerStopOffline(payload) {
    const timer = await getActiveOfflineTimer();
    if (!timer) {
        return new Response(JSON.stringify({ message: 'No offline timer running', offline: true }), { status: 404, headers: JSON_HEADERS });
    }

    const endedAt = new Date().toISOString();
    const start = new Date(timer.started_at).getTime();
    const end = new Date(endedAt).getTime();
    const pausedSeconds = timer.paused_seconds || 0;
    const durationSeconds = Math.max(0, Math.round((end - start) / 1000) - Math.round(pausedSeconds));

    const finalEntry = {
        id: timer.id,
        project_id: timer.project_id,
        task_id: timer.task_id,
        description: payload.description || timer.description,
        started_at: timer.started_at,
        ended_at: endedAt,
        duration_seconds: durationSeconds,
        is_billable: timer.is_billable,
        offline: true,
    };

    await savePendingEntity({
        clientId: timer.id,
        entityType: 'time-entries',
        action: 'create',
        payload: finalEntry,
    });

    const requestBody = JSON.stringify({
        project_id: finalEntry.project_id,
        task_id: finalEntry.task_id,
        description: finalEntry.description,
        started_at: finalEntry.started_at,
        ended_at: finalEntry.ended_at,
        duration_seconds: finalEntry.duration_seconds,
        is_billable: finalEntry.is_billable,
        is_manual: true,
    });

    await addOfflineQueueEntry({
        url: '/api/time-entries',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
        entityType: 'time-entries',
        action: 'create',
        clientId: finalEntry.id,
        targetId: null,
        operation: 'store',
        attempts: 0,
        createdAt: Date.now(),
    });

    await registerBackgroundSync();

    return new Response(JSON.stringify({
        message: 'Timer stopped offline',
        time_entry: finalEntry,
        offline: true,
    }), { status: 200, headers: JSON_HEADERS });
}

function buildOptimisticResponse(entityInfo, action, payload) {
    const meta = ENTITY_META[entityInfo.entity] || {};
    const key = decideResponseKey(entityInfo, meta);

    const status = action === 'create' ? 201 : action === 'delete' ? 202 : 200;
    const body = {
        message: `${meta.label || 'Resource'} ${describeAction(action)} (offline)`,
        offline: true,
    };

    if (action === 'delete') {
        body.id = entityInfo.id || payload?.id;
    } else if (key) {
        body[key] = payload;
    } else {
        body.data = payload;
    }

    return new Response(JSON.stringify(body), {
        status,
        headers: JSON_HEADERS,
    });
}

function describeAction(action) {
    switch (action) {
        case 'create':
            return 'enregistré';
        case 'update':
            return 'mis à jour';
        case 'delete':
            return 'supprimé';
        default:
            return 'synchronisé';
    }
}

function decideResponseKey(entityInfo, meta) {
    if (entityInfo.entity === 'time-entries' && entityInfo.operation === 'start') {
        return 'timer';
    }
    if (entityInfo.entity === 'time-entries' && entityInfo.operation === 'stop') {
        return 'time_entry';
    }
    return meta.key || 'data';
}

// -----------------------------
// Background Sync Processing
// -----------------------------
async function processOfflineQueue() {
    const entries = await getOfflineQueueEntries();

    for (const entry of entries) {
        try {
            const headers = new Headers(entry.headers || {});
            if (!headers.has('Content-Type') && entry.body) {
                headers.set('Content-Type', 'application/json');
            }

            const response = await fetch(entry.url, {
                method: entry.method,
                headers,
                body: entry.body || null,
            });

            if (!response.ok) {
                throw new Error(`Status ${response.status}`);
            }

            if (isJSONResponse(response)) {
                cacheApiResponse(new Request(entry.url, { method: 'GET' }), response.clone());
            }

            await resolveOfflineEntry(entry, response.clone());
            await deleteOfflineQueueEntry(entry.id);
        } catch (error) {
            await updateOfflineQueueEntry(entry.id, {
                attempts: (entry.attempts || 0) + 1,
                lastError: error.message,
            });
        }
    }
}

async function resolveOfflineEntry(entry, response) {
    let payload = null;
    try {
        payload = await response.clone().json();
    } catch (error) {
        // non JSON payloads are ignored
    }

    if (entry.action === 'create' && entry.clientId) {
        const serverRecord = extractEntityFromPayload(entry.entityType, payload);
        if (serverRecord?.id) {
            await saveIdMapping(entry.clientId, serverRecord.id, entry.entityType);
        }
        await deletePendingEntity(entry.clientId);
    }

    if (entry.action === 'update') {
        await deletePendingEntity(entry.clientId || entry.targetId);
    }

    if (entry.action === 'delete') {
        await deletePendingEntity(entry.clientId || entry.targetId);
    }

    broadcastMessage({
        type: 'SYNC_SUCCESS',
        entityType: entry.entityType,
        clientId: entry.clientId,
        targetId: entry.targetId,
        action: entry.action,
        payload: extractEntityFromPayload(entry.entityType, payload),
    });
}

function broadcastMessage(message) {
    self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage(message));
    });
}

// -----------------------------
// Cache Helpers
// -----------------------------
function safeCloneResponse(response) {
    if (!response || response.bodyUsed) {
        return null;
    }
    try {
        return response.clone();
    } catch (error) {
        console.warn('[ServiceWorker] clone() failed', error);
        return null;
    }
}

async function putInCache(cacheName, request, response) {
    const clone = safeCloneResponse(response);
    if (!clone) {
        return;
    }
    try {
        const cache = await caches.open(cacheName);
        await cache.put(request, clone);
        debugLog(`[ServiceWorker][Cache:${cacheName}] Stored ${request.url}`, `status ${response.status}`);
    } catch (error) {
        console.warn('[ServiceWorker] cache.put() failed', request.url, error);
    }
}

function networkFirstTranslation(request) {
    return fetch(request)
        .then(response => {
            putInCache(DYNAMIC_CACHE, request, response);
            return response;
        })
        .catch(async () => {
            const fallback = await caches.match(request);
            if (fallback) {
                return fallback;
            }
            return new Response('{}', {
                status: 200,
                headers: JSON_HEADERS,
            });
        });
}

function networkFirstHTML(request) {
    return fetch(request)
        .then(response => {
            putInCache(DYNAMIC_CACHE, request, response);
            return response;
        })
        .catch(async () => {
            const cachedResponse = await caches.match(request)
                || await caches.match('/')
                || await caches.match('/index.html');

            if (cachedResponse) {
                return cachedResponse;
            }

            return caches.match(OFFLINE_URL);
        });
}

async function cacheFirstStatic(request) {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }

    try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
            await putInCache(DYNAMIC_CACHE, request, networkResponse);
        }
        return networkResponse;
    } catch (error) {
        const fallback = await caches.match(request);
        if (fallback) {
            return fallback;
        }
        throw error;
    }
}

async function prefetchCriticalChunks() {
    try {
        const manifestResponse = await fetch('/build/manifest.json', { cache: 'no-store' });
        if (!manifestResponse.ok) {
            return;
        }

        const manifest = await manifestResponse.json();
        const urls = new Set();

        const collectEntry = (entryKey, depth = 0) => {
            if (!entryKey || depth > 10) {
                return;
            }
            const entry = manifest[entryKey];
            if (!entry) {
                return;
            }

            if (entry.file) {
                urls.add(`/build/${entry.file}`);
            }

            if (Array.isArray(entry.css)) {
                entry.css.forEach(cssFile => urls.add(`/build/${cssFile}`));
            }

            if (Array.isArray(entry.imports)) {
                entry.imports.forEach(importKey => collectEntry(importKey, depth + 1));
            }
        };

        CRITICAL_MANIFEST_ENTRIES.forEach(entryKey => collectEntry(entryKey));

        if (!urls.size) {
            return;
        }

        const cache = await caches.open(DYNAMIC_CACHE);

        await Promise.all(
            Array.from(urls).map(async (url) => {
                try {
                    const response = await fetch(url, { cache: 'no-store' });
                    if (response.ok) {
                        const clone = safeCloneResponse(response);
                        if (clone) {
                            await cache.put(new Request(url), clone);
                        }
                    }
                } catch (error) {
                    console.warn('[ServiceWorker] Failed to prefetch', url, error);
                }
            })
        );
    } catch (error) {
        console.warn('[ServiceWorker] Failed to prefetch critical chunks', error);
    }
}

async function prefetchApiData(trigger = 'install') {
    if (!API_PREFETCH_ENDPOINTS.length) {
        return;
    }

    if (!swAuthToken) {
        debugLog(`[ServiceWorker] Skipping API prefetch (${trigger}) - auth token missing`);
        return;
    }

    const navigatorOnline = (typeof self.navigator !== 'undefined' && typeof self.navigator.onLine === 'boolean')
        ? self.navigator.onLine
        : swIsOnline;

    if (!navigatorOnline) {
        debugLog(`[ServiceWorker] Skipping API prefetch (${trigger}) while offline`);
        return;
    }

    debugLog(`[ServiceWorker] Prefetching API data (${trigger})`);
    const results = await Promise.allSettled(API_PREFETCH_ENDPOINTS.map(endpoint => warmApiEndpoint(endpoint, trigger)));
    const fulfilled = results.filter(result => result.status === 'fulfilled').length;
    debugLog(`[ServiceWorker] API prefetch complete (${trigger})`, `${fulfilled}/${results.length} succeeded`);
}

async function warmApiEndpoint(endpoint, trigger) {
    try {
        const url = buildApiUrl(endpoint);
        if (!isPrefetchableEndpoint(url)) {
            debugLog(`[ServiceWorker] Skip prefetch ${url.pathname} (${trigger}) - not eligible`);
            return false;
        }

        const requestInit = {
            method: 'GET',
            headers: buildPrefetchHeaders(),
            credentials: 'include',
            mode: 'same-origin',
            cache: 'no-store',
        };

        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        if (controller) {
            requestInit.signal = controller.signal;
        }

        const timeout = controller ? setTimeout(() => controller.abort(), API_PREFETCH_TIMEOUT_MS) : null;
        const request = new Request(url.toString(), requestInit);
        const response = await fetch(request.clone());
        if (timeout) {
            clearTimeout(timeout);
        }

        if (!response || !response.ok) {
            throw new Error(`status ${response?.status}`);
        }

        if (isJSONResponse(response.clone())) {
            await cacheApiResponse(request.clone(), response.clone());
        }

        await putInCache(API_CACHE, request.clone(), response.clone());
        debugLog(`[ServiceWorker] Prefetched ${url.pathname} (${trigger})`);
        return true;
    } catch (error) {
        debugLog(`[ServiceWorker] Prefetch failed for ${endpoint} (${trigger})`, error);
        return false;
    }
}

function startPeriodicPrefetch() {
    stopPeriodicPrefetch();

    if (!swAuthToken || !swIsOnline) {
        debugLog('[ServiceWorker] Not starting periodic prefetch - missing auth or offline');
        return;
    }

    debugLog('[ServiceWorker] Starting periodic prefetch');
    prefetchIntervalId = setInterval(() => {
        const navigatorOnline = (typeof self.navigator !== 'undefined' && typeof self.navigator.onLine === 'boolean')
            ? self.navigator.onLine
            : swIsOnline;

        if (swAuthToken && navigatorOnline) {
            prefetchApiData('periodic').catch(error => {
                debugLog('[ServiceWorker] Periodic prefetch error', error);
            });
        }
    }, API_PREFETCH_INTERVAL_MS);
}

function stopPeriodicPrefetch() {
    if (prefetchIntervalId !== null) {
        debugLog('[ServiceWorker] Stopping periodic prefetch');
        clearInterval(prefetchIntervalId);
        prefetchIntervalId = null;
    }
}

function isPrefetchableEndpoint(urlObject) {
    if (!urlObject) {
        return false;
    }

    const url = typeof urlObject === 'string' ? new URL(urlObject, self.location.origin) : urlObject;

    if (url.origin !== self.location.origin) {
        return false;
    }

    if (!url.pathname.startsWith('/api/')) {
        return false;
    }

    return !OFFLINE_BLOCKLIST.some(pattern => pattern.test(url.pathname));
}

function buildApiUrl(endpoint) {
    if (!endpoint) {
        return new URL('/api', self.location.origin);
    }

    if (typeof endpoint === 'string' && /^https?:\/\//i.test(endpoint)) {
        return new URL(endpoint);
    }

    let normalized = typeof endpoint === 'string' ? endpoint.trim() : '';
    if (!normalized.startsWith('/')) {
        normalized = `/${normalized}`;
    }

    if (normalized !== '/api' && !normalized.startsWith('/api/')) {
        normalized = `/api${normalized}`;
    }

    return new URL(normalized, self.location.origin);
}

function normalizeApiCacheKey(urlLike) {
    try {
        const url = typeof urlLike === 'string'
            ? new URL(urlLike, self.location.origin)
            : urlLike instanceof URL
                ? new URL(urlLike.toString())
                : new URL(String(urlLike || ''), self.location.origin);

        if (!url.pathname.startsWith('/api/')) {
            return url.toString();
        }

        url.search = '';
        url.hash = '';
        return url.toString();
    } catch (error) {
        return null;
    }
}

async function cacheApiResponse(request, response) {
    try {
        if (!isJSONResponse(response)) {
            return;
        }

        const body = await response.clone().text();
        const headers = [];
        response.headers.forEach((value, key) => headers.push([key, value]));

        const db = await openDB();
        const record = {
            key: request.url,
            body,
            headers,
            status: response.status,
            timestamp: Date.now(),
        };
        await putInStore(db, 'cachedData', record);

        const normalizedKey = normalizeApiCacheKey(request.url);
        if (normalizedKey && normalizedKey !== record.key) {
            await putInStore(db, 'cachedData', {
                ...record,
                key: normalizedKey,
            });
        }

        const payloadPreview = parseJSON(body) || body;
        debugLog('[ServiceWorker][API Cache] Cached data for', request.url, buildPreviewSnippet(payloadPreview));
    } catch (error) {
        console.error('[ServiceWorker] Failed to cache API response', error);
    }
}

async function getCachedApiRecord(key) {
    try {
        const db = await openDB();
        const exact = await getFromStore(db, 'cachedData', key);
        if (exact) {
            return exact;
        }

        const normalizedKey = normalizeApiCacheKey(key);
        if (!normalizedKey || normalizedKey === key) {
            return null;
        }

        return await getFromStore(db, 'cachedData', normalizedKey);
    } catch (error) {
        return null;
    }
}

function buildOfflineHeaders(storedHeaders) {
    const headers = new Headers(JSON_HEADERS);
    headers.set('X-Offline', 'true');

    if (storedHeaders) {
        try {
            storedHeaders.forEach(([key, value]) => headers.set(key, value));
        } catch (error) {
            // ignore malformed headers
        }
    }

    return headers;
}

async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
}

async function forceRefreshCaches() {
    await caches.delete(DYNAMIC_CACHE);
    await caches.open(DYNAMIC_CACHE);
}

async function getCacheInfo() {
    const [staticKeys, dynamicKeys, apiKeys] = await Promise.all([
        caches.open(STATIC_CACHE).then(cache => cache.keys()),
        caches.open(DYNAMIC_CACHE).then(cache => cache.keys()),
        caches.open(API_CACHE).then(cache => cache.keys()),
    ]);

    return {
        static: staticKeys.length,
        dynamic: dynamicKeys.length,
        api: apiKeys.length,
        isIOS,
        maxCacheSize: MAX_CACHE_SIZE,
    };
}

async function limitCacheSize(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
        const keysToDelete = keys.slice(0, keys.length - maxItems);
        await Promise.all(keysToDelete.map(key => cache.delete(key)));
    }
}

async function cleanOldCacheEntries(cacheName, maxAge) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    const now = Date.now();

    await Promise.all(keys.map(async request => {
        const response = await cache.match(request);
        if (!response) return;
        const dateHeader = response.headers.get('date');
        if (!dateHeader) return;
        const responseTime = new Date(dateHeader).getTime();
        if (now - responseTime > maxAge) {
            await cache.delete(request);
        }
    }));
}

// -----------------------------
// Offline Payload helpers
// -----------------------------
async function applyPendingChangesToPayload(entityInfo, payload) {
    const pending = await getPendingEntities(entityInfo.entity);
    if (!pending.length) {
        return payload;
    }

    if (!entityInfo.id) {
        const result = applyPendingToCollectionPayload(payload, pending);
        return result ?? payload;
    }

    const match = pending.find(entry => matchesPendingEntry(entry, entityInfo.id));
    if (!match) {
        return payload;
    }

    if (match.action === 'delete') {
        return { message: 'Resource queued for deletion', offline: true };
    }

    if (match.payload) {
        return match.payload;
    }

    return payload;
}

function applyPendingToCollectionPayload(payload, pending) {
    let collection = null;
    let type = null;

    if (Array.isArray(payload)) {
        collection = [...payload];
        type = 'array';
    } else if (Array.isArray(payload?.data)) {
        collection = [...payload.data];
        type = 'paginated';
    } else {
        return null;
    }

    let changed = false;

    pending.forEach(entry => {
        if (entry.action === 'timer') return;

        if (entry.action === 'create' && entry.payload) {
            collection = [entry.payload, ...collection.filter(item => !matchesItemId(item, entry.payload.id))];
            changed = true;
        }

        if (entry.action === 'update' && entry.payload) {
            const idx = collection.findIndex(item => matchesItemId(item, entry.targetId || entry.payload.id));
            if (idx >= 0) {
                collection[idx] = { ...collection[idx], ...entry.payload };
            } else {
                collection.unshift(entry.payload);
            }
            changed = true;
        }

        if (entry.action === 'delete' && entry.targetId) {
            const originalLength = collection.length;
            collection = collection.filter(item => !matchesItemId(item, entry.targetId));
            if (collection.length !== originalLength) {
                changed = true;
            }
        }
    });

    if (!changed) {
        return null;
    }

    if (type === 'array') {
        return collection;
    }

    return {
        ...payload,
        data: collection,
        total: collection.length,
        last_page: 1,
        current_page: 1,
        offline: true,
    };
}

async function buildPendingOnlyPayload(entityInfo) {
    const pending = await getPendingEntities(entityInfo.entity);
    if (!pending.length) {
        return null;
    }

    if (!entityInfo.id) {
        const items = pending
            .filter(entry => entry.action === 'create' && entry.payload)
            .map(entry => entry.payload);
        if (!items.length) {
            return null;
        }
        return {
            data: items,
            total: items.length,
            per_page: items.length,
            current_page: 1,
            last_page: 1,
            offline: true,
        };
    }

    const match = pending.find(entry => matchesPendingEntry(entry, entityInfo.id));
    if (!match) {
        return null;
    }

    if (match.action === 'delete') {
        return { message: 'Resource queued for deletion', offline: true };
    }

    return match.payload || null;
}

function matchesPendingEntry(entry, id) {
    const target = entry.targetId || entry.clientId || entry.payload?.id;
    if (!target) return false;
    return String(target) === String(id);
}

function matchesItemId(item, id) {
    if (!item || !id) return false;
    const needle = String(id);
    const candidates = [item.id, item.local_id, item.client_id, item.uuid];
    return candidates.filter(Boolean).map(String).includes(needle);
}

// -----------------------------
// Entity & Request helpers
// -----------------------------
function isOfflineCapableApiRequest(request) {
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) {
        return false;
    }

    if (!url.pathname.startsWith('/api/')) {
        return false;
    }

    return !OFFLINE_BLOCKLIST.some(pattern => pattern.test(url.pathname));
}

function parseEntityInfo(request) {
    const url = new URL(request.url);
    const parts = url.pathname.replace(/^\//, '').split('/');
    if (parts[0] === 'api') {
        parts.shift();
    }

    const entity = parts[0] || null;
    let id = null;
    let operation = null;

    if (parts[1]) {
        if (isIdSegment(parts[1])) {
            id = parts[1];
            operation = parts[2] || null;
        } else {
            operation = parts[1];
            id = parts[2] && isIdSegment(parts[2]) ? parts[2] : null;
        }
    }

    return {
        entity,
        id,
        operation,
        pathname: url.pathname,
        isBlocked: OFFLINE_BLOCKLIST.some(pattern => pattern.test(url.pathname)),
    };
}

function isIdSegment(segment) {
    if (!segment) return false;
    return /^[0-9a-fA-F-]{6,}$/.test(segment) || /^\d+$/.test(segment);
}

function deriveActionFromRequest(method, entityInfo) {
    if (entityInfo.operation && TIMER_OPERATIONS.includes(entityInfo.operation)) {
        return entityInfo.operation;
    }

    switch (method.toUpperCase()) {
        case 'POST':
            return 'create';
        case 'PUT':
        case 'PATCH':
            return 'update';
        case 'DELETE':
            return 'delete';
        default:
            return 'update';
    }
}

function ensureClientId(payload, entityInfo) {
    if (payload && payload.id) {
        return payload.id;
    }
    return generateClientId(entityInfo.entity || 'item');
}

function enrichPayloadForOffline(payload, clientId, entityInfo) {
    return {
        ...payload,
        id: clientId,
        client_uuid: clientId,
        offline: true,
        __entity: entityInfo.entity,
    };
}

function generateClientId(prefix) {
    return `${prefix || 'offline'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseJSON(text) {
    try {
        return text ? JSON.parse(text) : null;
    } catch (error) {
        return null;
    }
}

function isJSONResponse(response) {
    const contentType = response.headers.get('Content-Type') || '';
    return contentType.includes('application/json');
}

function extractEntityFromPayload(entityType, payload) {
    if (!payload) return null;
    const meta = ENTITY_META[entityType];

    if (entityType === 'time-entries') {
        if (payload.time_entry) return payload.time_entry;
        if (payload.timer) return payload.timer;
    }

    if (meta?.key && payload[meta.key]) {
        return payload[meta.key];
    }

    if (payload.data && Array.isArray(payload.data) && payload.data.length) {
        return payload.data[0];
    }

    if (payload.data && payload.data.id) {
        return payload.data;
    }

    if (payload.id) {
        return payload;
    }

    return null;
}

// -----------------------------
// IndexedDB Helpers
// -----------------------------
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = event => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains('pendingTimeEntries')) {
                db.createObjectStore('pendingTimeEntries', { keyPath: 'id', autoIncrement: true });
            }

            if (!db.objectStoreNames.contains('cachedData')) {
                const store = db.createObjectStore('cachedData', { keyPath: 'key' });
                store.createIndex('timestamp', 'timestamp');
            }

            if (!db.objectStoreNames.contains('offlineQueue')) {
                db.createObjectStore('offlineQueue', { keyPath: 'id', autoIncrement: true });
            }

            if (!db.objectStoreNames.contains('pendingEntities')) {
                const store = db.createObjectStore('pendingEntities', { keyPath: 'clientId' });
                store.createIndex('entityType', 'entityType', { unique: false });
            }

            if (!db.objectStoreNames.contains('idMappings')) {
                db.createObjectStore('idMappings', { keyPath: 'clientId' });
            }
        };
    });
}

async function putInStore(db, storeName, value) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(value);
        request.onsuccess = () => {
            debugDbInsert(storeName, value);
            resolve(request.result);
        };
        request.onerror = () => reject(request.error);
    });
}

async function getFromStore(db, storeName, key) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function deleteFromStore(db, storeName, key) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
}

async function savePendingEntity(entry) {
    const db = await openDB();
    await putInStore(db, 'pendingEntities', {
        clientId: entry.clientId,
        entityType: entry.entityType,
        action: entry.action,
        payload: entry.payload,
        targetId: entry.targetId || null,
        timestamp: Date.now(),
    });
}

async function deletePendingEntity(clientId) {
    if (!clientId) return;
    const db = await openDB();
    await deleteFromStore(db, 'pendingEntities', clientId);
}

async function getPendingEntities(entityType) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('pendingEntities', 'readonly');
        const store = tx.objectStore('pendingEntities');
        let request;

        if (entityType && store.indexNames.contains('entityType')) {
            const index = store.index('entityType');
            request = index.getAll(entityType);
        } else {
            request = store.getAll();
        }

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

async function getActiveOfflineTimer() {
    const timers = await getPendingEntities('time-entries');
    return timers.find(entry => entry.action === 'timer')?.payload || null;
}

async function addOfflineQueueEntry(entry) {
    const db = await openDB();
    await putInStore(db, 'offlineQueue', entry);
}

async function getOfflineQueueEntries() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('offlineQueue', 'readonly');
        const store = tx.objectStore('offlineQueue');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

async function deleteOfflineQueueEntry(id) {
    const db = await openDB();
    await deleteFromStore(db, 'offlineQueue', id);
}

async function updateOfflineQueueEntry(id, patch) {
    const db = await openDB();
    const entry = await getFromStore(db, 'offlineQueue', id);
    if (!entry) return;
    await putInStore(db, 'offlineQueue', { ...entry, ...patch });
}

async function saveIdMapping(clientId, serverId, entityType) {
    if (!clientId || !serverId) return;
    const db = await openDB();
    await putInStore(db, 'idMappings', {
        clientId,
        serverId,
        entityType,
        updatedAt: Date.now(),
    });
}

// -----------------------------
// Legacy time-entry sync (for cacheTimeEntry action)
// -----------------------------
async function cacheTimeEntry(entry, token) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('pendingTimeEntries', 'readwrite');
        const store = tx.objectStore('pendingTimeEntries');
        const record = {
            data: entry,
            token,
            timestamp: Date.now(),
        };
        const request = store.add(record);
        request.onsuccess = () => {
            debugDbInsert('pendingTimeEntries', record);
            resolve(true);
        };
        request.onerror = () => reject(request.error);
    });
}

async function syncTimeEntries() {
    try {
        const db = await openDB();
        const tx = db.transaction('pendingTimeEntries', 'readonly');
        const store = tx.objectStore('pendingTimeEntries');
        const entries = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });

        for (const entry of entries) {
            try {
                const response = await fetch('/api/time-entries', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${entry.token}`,
                    },
                    body: JSON.stringify(entry.data),
                });

                if (response.ok) {
                    const deleteTx = db.transaction('pendingTimeEntries', 'readwrite');
                    deleteTx.objectStore('pendingTimeEntries').delete(entry.id);
                }
            } catch (error) {
                // ignore and retry later
            }
        }
    } catch (error) {
        console.error('[ServiceWorker] Legacy sync failed', error);
    }
}

// -----------------------------
// Background Sync Registration
// -----------------------------
async function registerBackgroundSync() {
    if (!self.registration.sync) {
        return;
    }

    try {
        await self.registration.sync.register(OFFLINE_SYNC_TAG);
    } catch (error) {
        console.error('[ServiceWorker] Failed to register background sync', error);
    }
}
async function precacheAssets(cacheName, assets) {
    const cache = await caches.open(cacheName);
    await Promise.all(assets.map(async (asset) => {
        try {
            const request = new Request(asset, { mode: asset.startsWith('https://') ? 'cors' : 'same-origin' });
            const response = await fetch(request);
            if (response.ok) {
                await cache.put(request, response.clone());
            }
        } catch (error) {
            console.warn('[ServiceWorker] Failed to precache', asset, error);
        }
    }));
}
