import React, { useEffect, useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { isIOSDevice, isAndroidDevice, clearCacheSafely, getIOSClearCacheInstructions } from '../utils/platform';

const PWAUpdatePrompt: React.FC = () => {
    const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isAndroid, setIsAndroid] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        // Detect platform
        const ios = isIOSDevice();
        const android = isAndroidDevice();
        setIsIOS(ios);
        setIsAndroid(android);

        // Check PWA version in localStorage
        const currentVersion = '3.2.0'; // Incremented for iOS cache fix
        const storedVersion = localStorage.getItem('pwa-version');

        // Show update prompt for both iOS and Android if version changed
        if (storedVersion !== currentVersion) {
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
        setIsUpdating(true);

        try {
            // Use safe cache clearing that preserves auth tokens
            await clearCacheSafely();

            // Unregister service workers for a fresh start
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(
                    registrations.map(registration => registration.unregister())
                );
            }

            // Force reload - hard reload to bypass cache
            if (isIOS) {
                // iOS Safari needs a slight delay before reload
                setTimeout(() => {
                    window.location.href = window.location.href;
                }, 100);
            } else {
                window.location.reload();
            }
        } catch (error) {
            console.error('Failed to update:', error);
            setIsUpdating(false);
            alert(t('pwa.update.updateError'));
        }
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
            // Show platform-specific instructions
            const instructions = isIOS
                ? getIOSClearCacheInstructions()
                : 'Pour mettre à jour l\'application:\n\n' +
                  '1. Ouvrez Chrome\n' +
                  '2. Allez dans Menu (3 points) > Applications\n' +
                  '3. Trouvez "TimeIsMoney"\n' +
                  '4. Appuyez longuement et désinstallez\n' +
                  '5. Rechargez cette page\n' +
                  '6. Installez à nouveau l\'application';

            alert(instructions);
        }
    };

    const handleClearCache = () => {
        if (isIOS) {
            alert(getIOSClearCacheInstructions());
        } else {
            handleUpdate();
        }
    };

    if (!showUpdatePrompt) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
            <div className="bg-blue-600 text-white p-4 rounded-lg shadow-lg">
                <div className="flex items-start">
                    <ArrowPathIcon className={`h-6 w-6 mr-3 flex-shrink-0 ${isUpdating ? 'animate-spin' : ''}`} />
                    <div className="flex-1">
                        <h3 className="font-semibold mb-1">
                            Mise à jour disponible
                        </h3>
                        <p className="text-sm mb-3">
                            {isIOS
                                ? "Une nouvelle version de l'application est disponible. Améliorations du cache pour iOS."
                                : isAndroid
                                ? "Une nouvelle version de l'application est disponible. L'icône a été mise à jour."
                                : "Une nouvelle version est disponible."}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={handleUpdate}
                                disabled={isUpdating}
                                className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isUpdating ? 'Mise à jour...' : 'Mettre à jour'}
                            </button>
                            {(isAndroid || isIOS) && (
                                <button
                                    onClick={handleReinstall}
                                    disabled={isUpdating}
                                    className="bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-800 disabled:opacity-50"
                                >
                                    {isIOS ? 'Instructions' : 'Réinstaller'}
                                </button>
                            )}
                            {isIOS && (
                                <button
                                    onClick={handleClearCache}
                                    disabled={isUpdating}
                                    className="bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-800 disabled:opacity-50"
                                >
                                    Effacer cache
                                </button>
                            )}
                            <button
                                onClick={() => setShowUpdatePrompt(false)}
                                disabled={isUpdating}
                                className="text-blue-100 hover:text-white text-sm disabled:opacity-50"
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