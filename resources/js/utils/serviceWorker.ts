/**
 * Service Worker registration and management utilities
 */

export interface ServiceWorkerConfig {
    onUpdate?: (registration: ServiceWorkerRegistration) => void;
    onSuccess?: (registration: ServiceWorkerRegistration) => void;
    onError?: (error: Error) => void;
}

/**
 * Register the service worker
 */
export function registerServiceWorker(config?: ServiceWorkerConfig): void {
    if (!('serviceWorker' in navigator)) {
        console.log('Service Worker not supported');
        return;
    }

    window.addEventListener('load', () => {
        const swUrl = '/service-worker.js';

        navigator.serviceWorker
            .register(swUrl)
            .then(registration => {
                console.log('Service Worker registered:', registration);

                // Check for updates periodically
                setInterval(() => {
                    registration.update();
                }, 60 * 60 * 1000); // Check every hour

                registration.onupdatefound = () => {
                    const installingWorker = registration.installing;
                    if (!installingWorker) return;

                    installingWorker.onstatechange = () => {
                        if (installingWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                // New update available
                                console.log('New content available; please refresh.');
                                if (config?.onUpdate) {
                                    config.onUpdate(registration);
                                }
                            } else {
                                // Content cached for offline use
                                console.log('Content cached for offline use.');
                                if (config?.onSuccess) {
                                    config.onSuccess(registration);
                                }
                            }
                        }
                    };
                };
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
                if (config?.onError) {
                    config.onError(error);
                }
            });
    });
}

/**
 * Unregister all service workers
 */
export async function unregisterServiceWorkers(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.unregister()));
        console.log('All Service Workers unregistered');
    } catch (error) {
        console.error('Failed to unregister Service Workers:', error);
    }
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
    if (!('caches' in window)) {
        return;
    }

    try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
        console.log('All caches cleared');
    } catch (error) {
        console.error('Failed to clear caches:', error);
    }
}

/**
 * Send message to service worker
 */
export function sendMessageToSW(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
        if (!navigator.serviceWorker.controller) {
            reject(new Error('No active Service Worker'));
            return;
        }

        const messageChannel = new MessageChannel();

        messageChannel.port1.onmessage = event => {
            if (event.data.error) {
                reject(new Error(event.data.error));
            } else {
                resolve(event.data);
            }
        };

        navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
    });
}

/**
 * Request persistent storage
 */
export async function requestPersistentStorage(): Promise<boolean> {
    if (!navigator.storage || !navigator.storage.persist) {
        return false;
    }

    try {
        const isPersisted = await navigator.storage.persisted();

        if (isPersisted) {
            console.log('Storage is already persistent');
            return true;
        }

        const result = await navigator.storage.persist();
        console.log(`Persistent storage ${result ? 'granted' : 'denied'}`);
        return result;
    } catch (error) {
        console.error('Failed to request persistent storage:', error);
        return false;
    }
}

/**
 * Check if app is installed as PWA
 */
export function isPWAInstalled(): boolean {
    // Check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return true;
    }

    // Check iOS Safari
    if ((window.navigator as any).standalone === true) {
        return true;
    }

    return false;
}

/**
 * Prompt user to install PWA
 */
export class PWAInstallPrompt {
    private deferredPrompt: any = null;

    constructor() {
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later
            this.deferredPrompt = e;
        });
    }

    /**
     * Check if install is available
     */
    canInstall(): boolean {
        return this.deferredPrompt !== null;
    }

    /**
     * Show install prompt
     */
    async prompt(): Promise<boolean> {
        if (!this.deferredPrompt) {
            return false;
        }

        // Show the install prompt
        this.deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await this.deferredPrompt.userChoice;

        // Clear the deferred prompt
        this.deferredPrompt = null;

        return outcome === 'accepted';
    }
}

/**
 * Check online status
 */
export function isOnline(): boolean {
    return navigator.onLine;
}

/**
 * Add online/offline event listeners
 */
export function setupNetworkListeners(
    onOnline?: () => void,
    onOffline?: () => void
): () => void {
    const handleOnline = () => {
        console.log('App is online');
        if (onOnline) onOnline();
    };

    const handleOffline = () => {
        console.log('App is offline');
        if (onOffline) onOffline();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Return cleanup function
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
}

/**
 * Cache time entry for offline sync
 */
export async function cacheTimeEntryOffline(entry: any): Promise<void> {
    const token = localStorage.getItem('auth_token');

    if (!token) {
        throw new Error('No authentication token found');
    }

    try {
        const result = await sendMessageToSW({
            action: 'cacheTimeEntry',
            entry,
            token
        });

        if (!result.success) {
            throw new Error(result.error || 'Failed to cache time entry');
        }
    } catch (error) {
        console.error('Failed to cache time entry:', error);
        throw error;
    }
}

/**
 * Request background sync
 */
export async function requestBackgroundSync(tag: string = 'sync-time-entries'): Promise<void> {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
        console.warn('Background Sync not supported');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register(tag);
        console.log(`Background sync registered: ${tag}`);
    } catch (error) {
        console.error('Failed to register background sync:', error);
    }
}

/**
 * Enable push notifications
 */
export async function enablePushNotifications(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push notifications not supported');
        return null;
    }

    try {
        // Request permission
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
            console.log('Push notification permission denied');
            return null;
        }

        // Get service worker registration
        const registration = await navigator.serviceWorker.ready;

        // Subscribe to push notifications
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
                import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
            )
        });

        console.log('Push notification subscription:', subscription);
        return subscription;
    } catch (error) {
        console.error('Failed to enable push notifications:', error);
        return null;
    }
}

/**
 * Convert URL-safe base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}