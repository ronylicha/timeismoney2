import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { enablePushNotifications } from '@/utils/serviceWorker';

export const PushNotificationManager: React.FC = () => {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Check current permission status
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }

        // Check if already subscribed
        checkSubscription();
    }, []);

    const checkSubscription = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch (error) {
            console.error('Failed to check subscription:', error);
        }
    };

    const handleEnableNotifications = async () => {
        setIsLoading(true);

        try {
            // Request permission first
            const permission = await Notification.requestPermission();
            setPermission(permission);

            if (permission !== 'granted') {
                toast.error('Vous devez autoriser les notifications pour continuer');
                setIsLoading(false);
                return;
            }

            // Subscribe to push notifications
            const subscription = await enablePushNotifications();

            if (subscription) {
                setIsSubscribed(true);
                toast.success('Notifications push activées avec succès !');

                // Send subscription to server
                await sendSubscriptionToServer(subscription);
            } else {
                toast.error('Impossible d\'activer les notifications push');
            }
        } catch (error) {
            console.error('Failed to enable notifications:', error);
            toast.error('Erreur lors de l\'activation des notifications');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisableNotifications = async () => {
        setIsLoading(true);

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();
                setIsSubscribed(false);
                toast.success('Notifications désactivées');

                // Remove subscription from server
                await removeSubscriptionFromServer(subscription);
            }
        } catch (error) {
            console.error('Failed to disable notifications:', error);
            toast.error('Erreur lors de la désactivation des notifications');
        } finally {
            setIsLoading(false);
        }
    };

    const sendSubscriptionToServer = async (subscription: PushSubscription) => {
        try {
            const response = await fetch('/api/push-subscriptions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                },
                body: JSON.stringify(subscription)
            });

            if (!response.ok) {
                throw new Error('Failed to save subscription');
            }
        } catch (error) {
            console.error('Failed to send subscription to server:', error);
        }
    };

    const removeSubscriptionFromServer = async (subscription: PushSubscription) => {
        try {
            const response = await fetch('/api/push-subscriptions', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                },
                body: JSON.stringify({ endpoint: subscription.endpoint })
            });

            if (!response.ok) {
                throw new Error('Failed to remove subscription');
            }
        } catch (error) {
            console.error('Failed to remove subscription from server:', error);
        }
    };

    const testNotification = () => {
        if (permission !== 'granted') {
            toast.error('Les notifications doivent être autorisées');
            return;
        }

        const notification = new Notification('Time Is Money 2', {
            body: 'Test de notification - Tout fonctionne correctement !',
            icon: '/images/icons/icon-192x192.png',
            badge: '/images/icons/badge-72x72.png',
            vibrate: [200, 100, 200],
            tag: 'test-notification',
            requireInteraction: false
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    };

    // Check if notifications are supported
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                    <BellOff className="h-5 w-5 text-yellow-600" />
                    <div>
                        <p className="font-medium text-yellow-800">
                            Notifications non disponibles
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">
                            Votre navigateur ne supporte pas les notifications push
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Status Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${isSubscribed ? 'bg-green-100' : 'bg-gray-100'}`}>
                            <Bell className={`h-5 w-5 ${isSubscribed ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900">
                                Notifications Push
                            </h4>
                            <p className="text-sm text-gray-600">
                                {isSubscribed
                                    ? 'Activées - Vous recevrez des notifications'
                                    : 'Désactivées - Activez pour recevoir des alertes'}
                            </p>
                        </div>
                    </div>

                    {/* Toggle Button */}
                    {isSubscribed ? (
                        <button
                            onClick={handleDisableNotifications}
                            disabled={isLoading}
                            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {isLoading ? 'Désactivation...' : 'Désactiver'}
                        </button>
                    ) : (
                        <button
                            onClick={handleEnableNotifications}
                            disabled={isLoading || permission === 'denied'}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {isLoading ? 'Activation...' : 'Activer'}
                        </button>
                    )}
                </div>

                {/* Permission Status */}
                {permission === 'denied' && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-700">
                            <X className="h-4 w-4 inline mr-1" />
                            Les notifications ont été bloquées. Veuillez les autoriser dans les paramètres de votre navigateur.
                        </p>
                    </div>
                )}
            </div>

            {/* Test Button */}
            {isSubscribed && (
                <button
                    onClick={testNotification}
                    className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                    Tester une notification
                </button>
            )}

            {/* Benefits List */}
            <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-3">
                    Avec les notifications activées :
                </h5>
                <ul className="space-y-2">
                    <li className="flex items-start text-sm text-gray-600">
                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Rappels pour démarrer/arrêter le timer</span>
                    </li>
                    <li className="flex items-start text-sm text-gray-600">
                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Alertes pour les échéances de projets</span>
                    </li>
                    <li className="flex items-start text-sm text-gray-600">
                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Notifications de paiements reçus</span>
                    </li>
                    <li className="flex items-start text-sm text-gray-600">
                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Mises à jour importantes de l'application</span>
                    </li>
                </ul>
            </div>
        </div>
    );
};