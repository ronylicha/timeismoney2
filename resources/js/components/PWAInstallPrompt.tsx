import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone, Check } from 'lucide-react';
import { PWAInstallPrompt } from '@/utils/serviceWorker';

export const InstallPromptBanner: React.FC = () => {
    const [prompt] = useState(() => new PWAInstallPrompt());
    const [canInstall, setCanInstall] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // Check if already dismissed in this session
        const dismissed = sessionStorage.getItem('pwa-install-dismissed');
        if (dismissed) {
            setIsDismissed(true);
            return;
        }

        // Check if already installed
        const checkInstalled = () => {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                || (window.navigator as any).standalone
                || document.referrer.includes('android-app://');

            if (isStandalone) {
                setIsInstalled(true);
                return;
            }
        };

        checkInstalled();

        // Listen for install prompt availability
        const checkCanInstall = () => {
            setCanInstall(prompt.canInstall());
        };

        // Check periodically if prompt becomes available
        const interval = setInterval(checkCanInstall, 1000);
        checkCanInstall();

        return () => clearInterval(interval);
    }, [prompt]);

    const handleInstall = async () => {
        if (!canInstall || isInstalling) return;

        setIsInstalling(true);
        try {
            const result = await prompt.install();

            if (result) {
                setIsInstalled(true);
                // Track installation success
                console.log('PWA installed successfully');

                // Hide banner after successful installation
                setTimeout(() => {
                    setIsDismissed(true);
                }, 3000);
            }
        } catch (error) {
            console.error('Installation failed:', error);
        } finally {
            setIsInstalling(false);
        }
    };

    const handleDismiss = () => {
        setIsDismissed(true);
        sessionStorage.setItem('pwa-install-dismissed', 'true');
    };

    // Don't show if already installed, dismissed, or can't install
    if (isInstalled || isDismissed || !canInstall) {
        return null;
    }

    return (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-slideUp">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Smartphone className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">
                                Installer TimeIsMoney
                            </h3>
                            <p className="text-sm text-gray-600 mt-0.5">
                                Accédez rapidement à l'application
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

                {/* Benefits */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                        <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        <span>Accès hors ligne à vos données</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                        <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        <span>Synchronisation automatique en arrière-plan</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                        <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        <span>Notifications push en temps réel</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-3">
                    <button
                        onClick={handleInstall}
                        disabled={isInstalling}
                        className={`
                            flex-1 flex items-center justify-center px-4 py-2.5
                            bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                            font-medium transition-colors
                            ${isInstalling ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        {isInstalling ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                                Installation...
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4 mr-2" />
                                Installer maintenant
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="px-4 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                    >
                        Plus tard
                    </button>
                </div>
            </div>
        </div>
    );
};

// Compact version for settings page
export const InstallPromptButton: React.FC = () => {
    const [prompt] = useState(() => new PWAInstallPrompt());
    const [canInstall, setCanInstall] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone
            || document.referrer.includes('android-app://');

        if (isStandalone) {
            setIsInstalled(true);
            return;
        }

        // Check if can install
        const checkCanInstall = () => {
            setCanInstall(prompt.canInstall());
        };

        const interval = setInterval(checkCanInstall, 1000);
        checkCanInstall();

        return () => clearInterval(interval);
    }, [prompt]);

    const handleInstall = async () => {
        if (!canInstall || isInstalling) return;

        setIsInstalling(true);
        try {
            const result = await prompt.install();
            if (result) {
                setIsInstalled(true);
            }
        } catch (error) {
            console.error('Installation failed:', error);
        } finally {
            setIsInstalling(false);
        }
    };

    if (isInstalled) {
        return (
            <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg">
                <Check className="h-5 w-5" />
                <span>Application installée</span>
            </div>
        );
    }

    if (!canInstall) {
        return (
            <div className="text-sm text-gray-500">
                L'installation de l'application n'est pas disponible sur ce navigateur
            </div>
        );
    }

    return (
        <button
            onClick={handleInstall}
            disabled={isInstalling}
            className={`
                flex items-center space-x-2 px-4 py-2
                bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                font-medium transition-colors
                ${isInstalling ? 'opacity-50 cursor-not-allowed' : ''}
            `}
        >
            {isInstalling ? (
                <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Installation...</span>
                </>
            ) : (
                <>
                    <Download className="h-4 w-4" />
                    <span>Installer l'application</span>
                </>
            )}
        </button>
    );
};