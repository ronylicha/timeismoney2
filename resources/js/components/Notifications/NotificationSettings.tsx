import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
    BellIcon,
    EnvelopeIcon,
    DevicePhoneMobileIcon,
    CheckIcon,
    XMarkIcon,
    CogIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface NotificationPreference {
    id: number;
    notification_type: string;
    email_enabled: boolean;
    push_enabled: boolean;
    in_app_enabled: boolean;
}

interface PushSubscription {
    id: number;
    device_name: string;
    created_at: string;
    updated_at: string;
}

const NotificationSettings: React.FC = () => {
    const queryClient = useQueryClient();
    const [isSubscribing, setIsSubscribing] = useState(false);
    const [pushSupported, setPushSupported] = useState(false);
    const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');

    // Check push notification support
    useEffect(() => {
        if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
            setPushSupported(true);
            setPushPermission(Notification.permission);
        }
    }, []);

    // Fetch preferences
    const { data: preferencesData, isLoading: loadingPreferences } = useQuery({
        queryKey: ['notification-preferences'],
        queryFn: async () => {
            const response = await axios.get('/notifications/preferences');
            return response.data;
        }
    });

    // Fetch subscriptions
    const { data: subscriptions = [], isLoading: loadingSubscriptions } = useQuery({
        queryKey: ['push-subscriptions'],
        queryFn: async () => {
            const response = await axios.get('/notifications/subscriptions');
            return response.data.subscriptions;
        }
    });

    // Update preferences mutation
    const updatePreferencesMutation = useMutation({
        mutationFn: async (preferences: NotificationPreference[]) => {
            await axios.put('/notifications/preferences', { preferences });
        },
        onSuccess: () => {
            toast.success('Préférences mises à jour');
            queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
        },
        onError: () => {
            toast.error('Erreur lors de la mise à jour');
        }
    });

    // Delete subscription mutation
    const deleteSubscriptionMutation = useMutation({
        mutationFn: async (id: number) => {
            await axios.delete(`/notifications/subscriptions/${id}`);
        },
        onSuccess: () => {
            toast.success('Appareil supprimé');
            queryClient.invalidateQueries({ queryKey: ['push-subscriptions'] });
        }
    });

    // Test notification mutation
    const testNotificationMutation = useMutation({
        mutationFn: async (type: 'push' | 'email') => {
            await axios.post('/notifications/test', { type });
        },
        onSuccess: (_, type) => {
            toast.success(`Test ${type === 'push' ? 'push' : 'email'} envoyé`);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Erreur lors du test');
        }
    });

    // Subscribe to push notifications
    const subscribeToPush = async () => {
        if (!pushSupported) {
            toast.error('Les notifications push ne sont pas supportées');
            return;
        }

        setIsSubscribing(true);

        try {
            // Request permission
            const permission = await Notification.requestPermission();
            setPushPermission(permission);

            if (permission !== 'granted') {
                toast.error('Permission refusée pour les notifications');
                return;
            }

            // Get service worker registration
            const registration = await navigator.serviceWorker.ready;

            // Get VAPID public key
            const { data: { public_key } } = await axios.get('/notifications/vapid-key');

            // Subscribe to push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(public_key)
            });

            // Send subscription to server
            await axios.post('/notifications/subscribe', {
                subscription: subscription.toJSON()
            });

            toast.success('Notifications push activées');
            queryClient.invalidateQueries({ queryKey: ['push-subscriptions'] });

        } catch (error) {
            console.error('Push subscription error:', error);
            toast.error('Erreur lors de l\'activation des notifications');
        } finally {
            setIsSubscribing(false);
        }
    };

    // Convert VAPID key
    const urlBase64ToUint8Array = (base64String: string) => {
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
    };

    // Handle preference toggle
    const handleToggle = (
        preference: NotificationPreference,
        field: 'email_enabled' | 'push_enabled' | 'in_app_enabled'
    ) => {
        if (!preferencesData?.preferences) return;

        const updated = preferencesData.preferences.map((p: NotificationPreference) =>
            p.notification_type === preference.notification_type
                ? { ...p, [field]: !p[field] }
                : p
        );

        updatePreferencesMutation.mutate(updated);
    };

    // Get notification type label
    const getTypeLabel = (type: string): string => {
        return preferencesData?.types?.[type] || type;
    };

    // Get notification category
    const getCategory = (type: string): string => {
        const categories: Record<string, string> = {
            invoice_created: 'Factures',
            invoice_sent: 'Factures',
            invoice_overdue: 'Factures',
            payment_received: 'Paiements',
            task_assigned: 'Tâches',
            task_due_soon: 'Tâches',
            task_completed: 'Tâches',
            timer_reminder: 'Timer',
            daily_summary: 'Rapports',
            weekly_report: 'Rapports',
            monthly_report: 'Rapports',
            expense_approved: 'Dépenses',
            expense_rejected: 'Dépenses',
            chorus_pro_update: 'Chorus Pro',
            backup_completed: 'Système',
            subscription_expiring: 'Abonnement',
        };
        return categories[type] || 'Autre';
    };

    // Group preferences by category
    const groupedPreferences = preferencesData?.preferences?.reduce((acc: any, pref: NotificationPreference) => {
        const category = getCategory(pref.notification_type);
        if (!acc[category]) acc[category] = [];
        acc[category].push(pref);
        return acc;
    }, {}) || {};

    if (loadingPreferences || loadingSubscriptions) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Push Notification Setup */}
            {pushSupported && pushPermission !== 'granted' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5" />
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                                Notifications push désactivées
                            </h3>
                            <p className="mt-1 text-sm text-yellow-700">
                                Activez les notifications push pour recevoir des alertes en temps réel.
                            </p>
                            <button
                                onClick={subscribeToPush}
                                disabled={isSubscribing}
                                className="mt-3 bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                            >
                                {isSubscribing ? 'Activation...' : 'Activer les notifications'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Registered Devices */}
            {subscriptions.length > 0 && (
                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Appareils enregistrés
                    </h3>
                    <div className="space-y-3">
                        {subscriptions.map((sub: PushSubscription) => (
                            <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center">
                                    <DevicePhoneMobileIcon className="h-5 w-5 text-gray-400 mr-3" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {sub.device_name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Ajouté le {new Date(sub.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => deleteSubscriptionMutation.mutate(sub.id)}
                                    className="text-red-600 hover:text-red-800"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Notification Preferences */}
            <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Préférences de notification
                </h3>

                <div className="space-y-6">
                    {Object.entries(groupedPreferences).map(([category, preferences]) => (
                        <div key={category}>
                            <h4 className="text-sm font-medium text-gray-700 mb-3">{category}</h4>
                            <div className="space-y-3">
                                {(preferences as NotificationPreference[]).map((pref) => (
                                    <div key={pref.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="text-sm text-gray-900">
                                            {getTypeLabel(pref.notification_type)}
                                        </span>
                                        <div className="flex items-center space-x-4">
                                            {/* Email toggle */}
                                            <button
                                                onClick={() => handleToggle(pref, 'email_enabled')}
                                                className={`p-2 rounded-lg transition-colors ${
                                                    pref.email_enabled
                                                        ? 'bg-blue-100 text-blue-600'
                                                        : 'bg-gray-200 text-gray-400'
                                                }`}
                                                title="Email"
                                            >
                                                <EnvelopeIcon className="h-5 w-5" />
                                            </button>

                                            {/* Push toggle */}
                                            <button
                                                onClick={() => handleToggle(pref, 'push_enabled')}
                                                disabled={!pushSupported || pushPermission !== 'granted'}
                                                className={`p-2 rounded-lg transition-colors ${
                                                    pref.push_enabled
                                                        ? 'bg-green-100 text-green-600'
                                                        : 'bg-gray-200 text-gray-400'
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                title="Push"
                                            >
                                                <BellIcon className="h-5 w-5" />
                                            </button>

                                            {/* In-app toggle */}
                                            <button
                                                onClick={() => handleToggle(pref, 'in_app_enabled')}
                                                className={`p-2 rounded-lg transition-colors ${
                                                    pref.in_app_enabled
                                                        ? 'bg-purple-100 text-purple-600'
                                                        : 'bg-gray-200 text-gray-400'
                                                }`}
                                                title="In-app"
                                            >
                                                <DevicePhoneMobileIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Test Notifications */}
            <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Tester les notifications
                </h3>
                <div className="flex space-x-4">
                    <button
                        onClick={() => testNotificationMutation.mutate('email')}
                        disabled={testNotificationMutation.isPending}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        <EnvelopeIcon className="h-5 w-5 mr-2" />
                        Tester email
                    </button>
                    <button
                        onClick={() => testNotificationMutation.mutate('push')}
                        disabled={testNotificationMutation.isPending || !pushSupported || pushPermission !== 'granted'}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                        <BellIcon className="h-5 w-5 mr-2" />
                        Tester push
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationSettings;