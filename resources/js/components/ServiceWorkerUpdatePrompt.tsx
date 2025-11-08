import React, { useState, useEffect } from 'react';
import { RefreshCw, X, Info } from 'lucide-react';
import { toast } from 'react-toastify';

export const ServiceWorkerUpdatePrompt: React.FC = () => {
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
    const [showUpdate, setShowUpdate] = useState(false);

    useEffect(() => {
        // Check for service worker support
        if (!('serviceWorker' in navigator)) {
            return;
        }

        // Listen for service worker updates
        const checkForUpdates = async () => {
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                if (!registration) return;

                // Check if there's a waiting worker
                if (registration.waiting) {
                    setWaitingWorker(registration.waiting);
                    setShowUpdate(true);
                    return;
                }

                // Listen for new service worker installations
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                // New update available
                                setWaitingWorker(newWorker);
                                setShowUpdate(true);

                                // Show toast notification
                                toast.info('Une nouvelle version de l\'application est disponible !', {
                                    autoClose: false,
                                    closeButton: true
                                });
                            } else {
                                // First install
                                console.log('Service Worker installed for the first time');
                            }
                        }
                    });
                });

                // Check for updates every hour
                setInterval(async () => {
                    try {
                        await registration.update();
                    } catch (error) {
                        console.error('Failed to check for updates:', error);
                    }
                }, 60 * 60 * 1000); // 1 hour
            } catch (error) {
                console.error('Service Worker registration error:', error);
            }
        };

        checkForUpdates();

        // Listen for messages from the service worker
        const handleControllerChange = () => {
            window.location.reload();
        };

        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

        return () => {
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        };
    }, []);

    const handleUpdate = () => {
        if (!waitingWorker) return;

        // Tell the waiting service worker to take control
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });

        // Show loading toast
        toast.info('Mise à jour en cours...', {
            autoClose: 2000
        });

        // The page will reload automatically when the new SW takes control
    };

    const handleDismiss = () => {
        setShowUpdate(false);
        // Don't completely dismiss - will show again on next page load
        sessionStorage.setItem('sw-update-dismissed', 'true');
    };

    // Check if already dismissed in this session
    useEffect(() => {
        const dismissed = sessionStorage.getItem('sw-update-dismissed');
        if (dismissed && showUpdate) {
            setShowUpdate(false);
        }
    }, [showUpdate]);

    if (!showUpdate || !waitingWorker) {
        return null;
    }

    return (
        <div className="fixed top-4 right-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl border border-blue-200 p-4 max-w-sm">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <RefreshCw className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">
                                Mise à jour disponible
                            </h3>
                            <p className="text-sm text-gray-600 mt-0.5">
                                Une nouvelle version est prête
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Fermer"
                    >
                        <X className="h-4 w-4 text-gray-400" />
                    </button>
                </div>

                {/* Info */}
                <div className="flex items-start space-x-2 mb-4 p-2 bg-blue-50 rounded-lg">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-700">
                        L'application sera rechargée pour appliquer les améliorations et nouvelles fonctionnalités.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-3">
                    <button
                        onClick={handleUpdate}
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Mettre à jour maintenant
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                    >
                        Plus tard
                    </button>
                </div>
            </div>
        </div>
    );
};

// Compact version for status bar
export const ServiceWorkerStatus: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [hasUpdate, setHasUpdate] = useState(false);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Check for SW updates
        const checkUpdate = async () => {
            if (!('serviceWorker' in navigator)) return;

            const registration = await navigator.serviceWorker.getRegistration();
            if (registration?.waiting) {
                setHasUpdate(true);
            }
        };

        checkUpdate();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <div className="flex items-center space-x-4 text-sm">
            {/* Online Status */}
            <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                <span className="text-gray-600">
                    {isOnline ? 'En ligne' : 'Hors ligne'}
                </span>
            </div>

            {/* Update Status */}
            {hasUpdate && (
                <div className="flex items-center space-x-2 text-blue-600">
                    <RefreshCw className="h-4 w-4" />
                    <span>Mise à jour disponible</span>
                </div>
            )}
        </div>
    );
};