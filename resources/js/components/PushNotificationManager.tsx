import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { enablePushNotifications } from '@/utils/serviceWorker';

export const PushNotificationManager: React.FC = () => {
    const { t } = useTranslation();
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
                toast.error(t('notifications.push.permissionRequired'));
                setIsLoading(false);
                return;
            }

            // Subscribe to push notifications
            const subscription = await enablePushNotifications();

            if (subscription) {
                setIsSubscribed(true);
                toast.success(t('notifications.push.enabled'));

                // Send subscription to server
                await sendSubscriptionToServer(subscription);
            } else {
                toast.error(t('notifications.push.enableError'));
            }
        } catch (error) {
            console.error('Failed to enable notifications:', error);
            toast.error(t('notifications.push.enableError'));
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
                toast.success(t('notifications.push.disabled'));

                // Remove subscription from server
                await removeSubscriptionFromServer(subscription);
            }
        } catch (error) {
            console.error('Failed to disable notifications:', error);
            toast.error(t('notifications.push.disableError'));
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
            toast.error(t('notifications.push.mustBeEnabled'));
            return;
        }

        const notification = new Notification(t('notifications.push.testTitle'), {
            body: t('notifications.push.testBody'),
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
                            {t('notifications.push.notSupported')}
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">
                            {t('notifications.push.browserNotSupported')}
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
                                {t('notifications.push.title')}
                            </h4>
                            <p className="text-sm text-gray-600">
                                {isSubscribed
                                    ? t('notifications.push.statusEnabled')
                                    : t('notifications.push.statusDisabled')}
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
                            {isLoading ? t('notifications.push.disabling') : t('notifications.push.disable')}
                        </button>
                    ) : (
                        <button
                            onClick={handleEnableNotifications}
                            disabled={isLoading || permission === 'denied'}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {isLoading ? t('notifications.push.enabling') : t('notifications.push.enable')}
                        </button>
                    )}
                </div>

                {/* Permission Status */}
                {permission === 'denied' && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-700">
                            <X className="h-4 w-4 inline mr-1" />
                            {t('notifications.push.blocked')}
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
                    {t('notifications.push.testButton')}
                </button>
            )}

            {/* Benefits List */}
            <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-3">
                    {t('notifications.push.benefitsTitle')}
                </h5>
                <ul className="space-y-2">
                    <li className="flex items-start text-sm text-gray-600">
                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{t('notifications.push.benefit1')}</span>
                    </li>
                    <li className="flex items-start text-sm text-gray-600">
                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{t('notifications.push.benefit2')}</span>
                    </li>
                    <li className="flex items-start text-sm text-gray-600">
                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{t('notifications.push.benefit3')}</span>
                    </li>
                    <li className="flex items-start text-sm text-gray-600">
                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{t('notifications.push.benefit4')}</span>
                    </li>
                </ul>
            </div>
        </div>
    );
};