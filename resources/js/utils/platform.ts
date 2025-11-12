/**
 * Platform detection and management utilities
 * Handles iOS-specific behaviors and cache management
 */

export interface PlatformInfo {
    isIOS: boolean;
    isAndroid: boolean;
    isSafari: boolean;
    isPWA: boolean;
    isStandalone: boolean;
    supportsServiceWorker: boolean;
    storageQuotaEstimate?: StorageEstimate;
}

/**
 * Detect if the device is running iOS
 */
export function isIOSDevice(): boolean {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const platform = window.navigator.platform?.toLowerCase() || '';

    // Check for iPhone, iPad, iPod
    const isIOS = /iphone|ipad|ipod/.test(userAgent) ||
                  /iphone|ipad|ipod/.test(platform) ||
                  // iPad on iOS 13+ reports as Macintosh
                  (platform === 'macintel' && navigator.maxTouchPoints > 1);

    return isIOS;
}

/**
 * Detect if the device is running Android
 */
export function isAndroidDevice(): boolean {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return userAgent.includes('android');
}

/**
 * Detect if browser is Safari
 */
export function isSafariBrowser(): boolean {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /safari/.test(userAgent) && !/chrome|chromium|crios|fxios/.test(userAgent);
}

/**
 * Detect if app is running as PWA (standalone mode)
 */
export function isPWAMode(): boolean {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://')
    );
}

/**
 * Get complete platform information
 */
export async function getPlatformInfo(): Promise<PlatformInfo> {
    const info: PlatformInfo = {
        isIOS: isIOSDevice(),
        isAndroid: isAndroidDevice(),
        isSafari: isSafariBrowser(),
        isPWA: isPWAMode(),
        isStandalone: isPWAMode(),
        supportsServiceWorker: 'serviceWorker' in navigator,
    };

    // Get storage quota if available
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
            info.storageQuotaEstimate = await navigator.storage.estimate();
        } catch (error) {
            console.warn('Failed to get storage estimate:', error);
        }
    }

    return info;
}

/**
 * Check if storage quota is approaching limit (iOS specific)
 * iOS Safari/PWA has a 50MB localStorage limit
 */
export async function checkStorageQuota(): Promise<{
    available: number;
    used: number;
    total: number;
    percentUsed: number;
    isNearLimit: boolean;
    isCritical: boolean;
}> {
    let used = 0;
    let total = 50 * 1024 * 1024; // Default 50MB for iOS

    // Try to get accurate storage estimate
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
            const estimate = await navigator.storage.estimate();
            if (estimate.usage !== undefined && estimate.quota !== undefined) {
                used = estimate.usage;
                total = estimate.quota;
            }
        } catch (error) {
            console.warn('Failed to estimate storage:', error);
        }
    }

    // Fallback: Estimate localStorage usage
    if (used === 0) {
        try {
            let totalSize = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length + key.length;
                }
            }
            // Multiply by 2 for UTF-16 encoding
            used = totalSize * 2;
        } catch (error) {
            console.warn('Failed to calculate localStorage size:', error);
        }
    }

    const available = total - used;
    const percentUsed = (used / total) * 100;
    const isNearLimit = percentUsed > 70; // Warning at 70%
    const isCritical = percentUsed > 85; // Critical at 85%

    return {
        available,
        used,
        total,
        percentUsed,
        isNearLimit,
        isCritical
    };
}

/**
 * Request persistent storage (important for iOS PWA)
 */
export async function requestPersistentStorage(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
        try {
            const isPersisted = await navigator.storage.persisted();
            if (!isPersisted) {
                const granted = await navigator.storage.persist();
                console.log('Persistent storage:', granted ? 'granted' : 'denied');
                return granted;
            }
            return true;
        } catch (error) {
            console.warn('Failed to request persistent storage:', error);
            return false;
        }
    }
    return false;
}

/**
 * Clear cache intelligently without losing critical data
 * This is safer than localStorage.clear() which removes auth tokens
 */
export async function clearCacheSafely(preserveKeys: string[] = []): Promise<void> {
    const defaultPreserveKeys = [
        'auth_token',
        'refresh_token',
        'user',
        'tenant_id',
        'language',
        'theme',
        'pwa-version'
    ];

    const keysToPreserve = [...defaultPreserveKeys, ...preserveKeys];

    // 1. Preserve critical localStorage items
    const preservedData: Record<string, string> = {};
    keysToPreserve.forEach(key => {
        const value = localStorage.getItem(key);
        if (value !== null) {
            preservedData[key] = value;
        }
    });

    // 2. Clear all caches
    if ('caches' in window) {
        try {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
            console.log('Cleared', cacheNames.length, 'cache(s)');
        } catch (error) {
            console.error('Failed to clear caches:', error);
        }
    }

    // 3. Clear localStorage except preserved keys
    localStorage.clear();

    // 4. Restore preserved data
    Object.entries(preservedData).forEach(([key, value]) => {
        localStorage.setItem(key, value);
    });

    console.log('Cache cleared safely, preserved keys:', Object.keys(preservedData));
}

/**
 * Compress database data before storing (helps with iOS quota)
 */
export async function compressData(data: string): Promise<string> {
    if (!data || typeof CompressionStream === 'undefined') {
        return data;
    }

    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    await writer.write(new TextEncoder().encode(data));
    await writer.close();

    const compressed = await new Response(stream.readable).arrayBuffer();
    return arrayBufferToBase64(compressed);
}

/**
 * Decompress persisted data (gzip/base64)
 */
export async function decompressData(data: string): Promise<string> {
    if (!data || typeof DecompressionStream === 'undefined') {
        return data;
    }

    try {
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        await writer.write(base64ToUint8Array(data));
        await writer.close();

        const decompressed = await new Response(stream.readable).arrayBuffer();
        return new TextDecoder().decode(decompressed);
    } catch (error) {
        console.error('Failed to decompress data', error);
        return data;
    }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
    try {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    } catch (error) {
        console.error('Unable to decode base64 payload', error);
        return new Uint8Array();
    }
}

/**
 * Get iOS-specific cache instructions for users
 */
export function getIOSClearCacheInstructions(): string {
    const isPWA = isPWAMode();

    if (isPWA) {
        return `Pour effacer le cache de l'application PWA sur iOS:

1. Fermez complètement l'application
2. Allez dans Réglages > Safari
3. Faites défiler et touchez "Avancé"
4. Touchez "Données de sites web"
5. Recherchez "timeismoney" et supprimez
6. Rouvrez l'application

Ou plus rapide:
1. Maintenez l'icône de l'app
2. Touchez "Supprimer l'app"
3. Retournez sur le site et réinstallez l'app`;
    }

    return `Pour effacer le cache Safari sur iOS:

1. Allez dans Réglages > Safari
2. Touchez "Effacer historique et données de sites"
3. Confirmez en touchant "Effacer"
4. Revenez sur le site

Note: Cela effacera votre session et vous devrez vous reconnecter.`;
}

/**
 * Detect iOS version
 */
export function getIOSVersion(): number | null {
    if (!isIOSDevice()) return null;

    const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
    if (match) {
        return parseInt(match[1], 10);
    }

    return null;
}

/**
 * Check if iOS version supports specific PWA features
 */
export function checkIOSPWASupport(): {
    supportsServiceWorker: boolean;
    supportsBackgroundSync: boolean;
    supportsPushNotifications: boolean;
    minimumVersion: boolean;
} {
    const version = getIOSVersion();

    return {
        supportsServiceWorker: version !== null && version >= 11.3,
        supportsBackgroundSync: false, // iOS doesn't support background sync
        supportsPushNotifications: version !== null && version >= 16.4, // Limited support
        minimumVersion: version !== null && version >= 13,
    };
}
