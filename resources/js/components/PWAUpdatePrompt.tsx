import React, { useEffect, useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

const PWAUpdatePrompt: React.FC = () => {
    const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
    const [isAndroid, setIsAndroid] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        // Check if user is on Android
        const userAgent = window.navigator.userAgent.toLowerCase();
        const android = userAgent.includes('android');
        setIsAndroid(android);

        // Check PWA version in localStorage
        const currentVersion = '3.1.0';
        const storedVersion = localStorage.getItem('pwa-version');

        if (android && storedVersion !== currentVersion) {
            setShowUpdatePrompt(true);
            localStorage.setItem('pwa-version', currentVersion);
        }

        // Listen for beforeinstallprompt event
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Listen for service worker updates
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New service worker available
                                setShowUpdatePrompt(true);
                            }
                        });
                    }
                });
            });
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleUpdate = async () => {
        // Clear all caches
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
        }

        // Unregister all service workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(
                registrations.map(registration => registration.unregister())
            );
        }

        // Clear localStorage
        localStorage.clear();

        // Force reload
        window.location.reload();
    };

    const handleReinstall = () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult: any) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                }
                setDeferredPrompt(null);
            });
        } else {
            // Show instructions for manual reinstall
            alert(
                'Pour mettre à jour l\'application:\n\n' +
                '1. Ouvrez Chrome\n' +
                '2. Allez dans Menu (3 points) > Applications\n' +
                '3. Trouvez "TimeIsMoney"\n' +
                '4. Appuyez longuement et désinstallez\n' +
                '5. Rechargez cette page\n' +
                '6. Installez à nouveau l\'application'
            );
        }
    };

    if (!showUpdatePrompt) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
            <div className="bg-blue-600 text-white p-4 rounded-lg shadow-lg">
                <div className="flex items-start">
                    <ArrowPathIcon className="h-6 w-6 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                        <h3 className="font-semibold mb-1">
                            Mise à jour disponible
                        </h3>
                        <p className="text-sm mb-3">
                            {isAndroid
                                ? "Une nouvelle version de l'application est disponible. L'icône a été mise à jour."
                                : "Une nouvelle version est disponible."}
                        </p>
                        <div className="flex space-x-2">
                            <button
                                onClick={handleUpdate}
                                className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-blue-50"
                            >
                                Mettre à jour
                            </button>
                            {isAndroid && (
                                <button
                                    onClick={handleReinstall}
                                    className="bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-800"
                                >
                                    Réinstaller
                                </button>
                            )}
                            <button
                                onClick={() => setShowUpdatePrompt(false)}
                                className="text-blue-100 hover:text-white text-sm"
                            >
                                Plus tard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PWAUpdatePrompt;