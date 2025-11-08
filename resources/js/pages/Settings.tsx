import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { Cog6ToothIcon, BellIcon, ShieldCheckIcon, GlobeAltIcon, CreditCardIcon, CalendarIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

const Settings: React.FC = () => {
    const { t } = useTranslation();
    const { language, changeLanguage, languages } = useLanguage();
    const queryClient = useQueryClient();

    // Fetch current user settings
    const { data: user, isLoading } = useQuery({
        queryKey: ['user-profile'],
        queryFn: async () => {
            const response = await axios.get('/user/profile');
            return response.data;
        },
    });

    const [preferences, setPreferences] = useState({
        locale: 'fr',
        timezone: 'Europe/Paris',
        date_format: 'd/m/Y',
        time_format: 'H:i',
        theme: 'light',
    });

    const [notificationSettings, setNotificationSettings] = useState({
        email_notifications: true,
        push_notifications: true,
        task_reminders: true,
    });

    React.useEffect(() => {
        if (user) {
            setPreferences({
                locale: user.locale || 'fr',
                timezone: user.timezone || 'Europe/Paris',
                date_format: user.date_format || 'd/m/Y',
                time_format: user.time_format || 'H:i',
                theme: user.theme || 'light',
            });

            // Load notification preferences from user.preferences JSON field
            if (user.preferences) {
                setNotificationSettings({
                    email_notifications: user.preferences.email_notifications ?? true,
                    push_notifications: user.preferences.push_notifications ?? true,
                    task_reminders: user.preferences.task_reminders ?? true,
                });
            }
        }
    }, [user]);

    // Update preferences mutation
    const updatePreferencesMutation = useMutation({
        mutationFn: async (data: typeof preferences) => {
            const response = await axios.patch('/user/preferences', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-profile'] });
            toast.success(t('settings.saveChanges') + ' - ' + t('common.success'));
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || t('common.error'));
        },
    });

    // Update password mutation
    const updatePasswordMutation = useMutation({
        mutationFn: async (data: { current_password: string; password: string; password_confirmation: string }) => {
            const response = await axios.patch('/user/password', data);
            return response.data;
        },
        onSuccess: () => {
            toast.success(t('settings.passwordUpdateSuccess'));
            setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || t('settings.passwordUpdateError'));
        },
    });

    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const [showPasswordForm, setShowPasswordForm] = useState(false);

    // Google Calendar state
    const [showGoogleCalendarForm, setShowGoogleCalendarForm] = useState(false);

    // Stripe state
    const [showStripeForm, setShowStripeForm] = useState(false);
    const [stripeForm, setStripeForm] = useState({
        stripe_publishable_key: '',
        stripe_secret_key: '',
        stripe_webhook_secret: '',
        stripe_enabled: true,
    });

    // Fetch Google Calendar status
    const { data: googleCalendarStatus, refetch: refetchGoogleCalendar } = useQuery({
        queryKey: ['google-calendar-status'],
        queryFn: async () => {
            const response = await axios.get('/google-calendar/status');
            return response.data;
        },
    });

    // Fetch Stripe settings
    const { data: stripeSettings, refetch: refetchStripe } = useQuery({
        queryKey: ['stripe-settings'],
        queryFn: async () => {
            const response = await axios.get('/settings/stripe');
            return response.data.data;
        },
    });

    React.useEffect(() => {
        if (stripeSettings) {
            setStripeForm({
                stripe_publishable_key: stripeSettings.stripe_publishable_key || '',
                stripe_secret_key: '', // Don't populate secret key for security
                stripe_webhook_secret: '',
                stripe_enabled: stripeSettings.stripe_enabled,
            });
        }
    }, [stripeSettings]);

    const handleSavePreferences = () => {
        updatePreferencesMutation.mutate(preferences);

        // Update notification settings in preferences field
        axios.patch('/user/preferences', {
            preferences: notificationSettings,
        }).then(() => {
            queryClient.invalidateQueries({ queryKey: ['user-profile'] });
        });
    };

    const handleLanguageChange = async (newLanguage: string) => {
        // Update UI language immediately
        await changeLanguage(newLanguage);

        // Update backend preference
        setPreferences({ ...preferences, locale: newLanguage });
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordForm.password !== passwordForm.password_confirmation) {
            toast.error(t('settings.passwordMismatch'));
            return;
        }
        updatePasswordMutation.mutate(passwordForm);
    };

    // Google Calendar mutations
    const connectGoogleCalendarMutation = useMutation({
        mutationFn: async () => {
            const response = await axios.get('/google-calendar/connect');
            return response.data;
        },
        onSuccess: (data) => {
            // Open authorization URL in new window
            window.open(data.authorization_url, '_blank', 'width=600,height=700');
            toast.info(t('settings.googleCalendarAuthInfo'));
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || t('settings.googleCalendarConnectError'));
        },
    });

    const disconnectGoogleCalendarMutation = useMutation({
        mutationFn: async () => {
            const response = await axios.post('/google-calendar/disconnect');
            return response.data;
        },
        onSuccess: () => {
            refetchGoogleCalendar();
            toast.success(t('settings.googleCalendarDisconnected'));
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || t('settings.googleCalendarDisconnectError'));
        },
    });

    const toggleGoogleCalendarSyncMutation = useMutation({
        mutationFn: async (enabled: boolean) => {
            const response = await axios.post('/google-calendar/toggle-sync', { enabled });
            return response.data;
        },
        onSuccess: () => {
            refetchGoogleCalendar();
            toast.success(t('settings.calendarSyncUpdated'));
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || t('settings.calendarSyncUpdateError'));
        },
    });

    // Stripe mutations
    const updateStripeMutation = useMutation({
        mutationFn: async (data: typeof stripeForm) => {
            const response = await axios.post('/settings/stripe', data);
            return response.data;
        },
        onSuccess: () => {
            refetchStripe();
            setShowStripeForm(false);
            toast.success(t('settings.stripeUpdated'));
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || t('settings.stripeUpdateError'));
        },
    });

    const testStripeConnectionMutation = useMutation({
        mutationFn: async () => {
            const response = await axios.post('/settings/stripe/test');
            return response.data;
        },
        onSuccess: () => {
            toast.success(t('settings.stripeTestSuccess'));
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || t('settings.stripeTestError'));
        },
    });

    const disableStripeMutation = useMutation({
        mutationFn: async () => {
            const response = await axios.post('/settings/stripe/disable');
            return response.data;
        },
        onSuccess: () => {
            refetchStripe();
            toast.success(t('settings.stripeDisabled'));
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || t('settings.stripeDisableError'));
        },
    });

    const handleStripeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateStripeMutation.mutate(stripeForm);
    };

    if (isLoading) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="space-y-4">
                        <div className="bg-white rounded-lg shadow p-6 h-48"></div>
                        <div className="bg-white rounded-lg shadow p-6 h-48"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">{t('settings.title')}</h1>
                <p className="mt-2 text-gray-600">{t('settings.subtitle')}</p>
            </div>

            <div className="space-y-6">
                {/* Language & Region Settings */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <GlobeAltIcon className="h-6 w-6 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">{t('settings.language')}</h2>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.languageLabel')}
                            </label>
                            <select
                                value={preferences.locale}
                                onChange={(e) => handleLanguageChange(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {languages.map((lang) => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.nativeName} ({lang.name})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.timezone')}
                            </label>
                            <select
                                value={preferences.timezone}
                                onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
                                <option value="Europe/London">Europe/London (UTC+0)</option>
                                <option value="America/New_York">America/New_York (UTC-5)</option>
                                <option value="America/Los_Angeles">America/Los_Angeles (UTC-8)</option>
                                <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                                <option value="Australia/Sydney">Australia/Sydney (UTC+11)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.dateFormat')}
                            </label>
                            <select
                                value={preferences.date_format}
                                onChange={(e) => setPreferences({ ...preferences, date_format: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="d/m/Y">DD/MM/YYYY (31/12/2025)</option>
                                <option value="m/d/Y">MM/DD/YYYY (12/31/2025)</option>
                                <option value="Y-m-d">YYYY-MM-DD (2025-12-31)</option>
                                <option value="d.m.Y">DD.MM.YYYY (31.12.2025)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.timeFormat')}
                            </label>
                            <select
                                value={preferences.time_format}
                                onChange={(e) => setPreferences({ ...preferences, time_format: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="H:i">24 Hours (14:30)</option>
                                <option value="h:i A">12 Hours (02:30 PM)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.theme')}
                            </label>
                            <select
                                value={preferences.theme}
                                onChange={(e) => setPreferences({ ...preferences, theme: e.target.value as 'light' | 'dark' | 'auto' })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="light">{t('settings.themeLight')}</option>
                                <option value="dark">{t('settings.themeDark')}</option>
                                <option value="auto">{t('settings.themeAuto')}</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Notifications */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <BellIcon className="h-6 w-6 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">{t('settings.notifications')}</h2>
                    </div>
                    <div className="space-y-3">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={notificationSettings.email_notifications}
                                onChange={(e) =>
                                    setNotificationSettings({
                                        ...notificationSettings,
                                        email_notifications: e.target.checked,
                                    })
                                }
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-3 text-gray-700">{t('settings.emailNotifications')}</span>
                        </label>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={notificationSettings.push_notifications}
                                onChange={(e) =>
                                    setNotificationSettings({
                                        ...notificationSettings,
                                        push_notifications: e.target.checked,
                                    })
                                }
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-3 text-gray-700">{t('settings.pushNotifications')}</span>
                        </label>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={notificationSettings.task_reminders}
                                onChange={(e) =>
                                    setNotificationSettings({
                                        ...notificationSettings,
                                        task_reminders: e.target.checked,
                                    })
                                }
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-3 text-gray-700">{t('settings.taskReminders')}</span>
                        </label>
                    </div>
                </div>

                {/* Google Calendar Integration */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <CalendarIcon className="h-6 w-6 text-gray-600" />
                            <h2 className="text-lg font-semibold text-gray-900">{t('settings.googleCalendarIntegration')}</h2>
                        </div>
                        {googleCalendarStatus?.connected ? (
                            <div className="flex items-center space-x-2 text-green-600">
                                <CheckCircleIcon className="h-5 w-5" />
                                <span className="text-sm font-medium">{t('settings.connected')}</span>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2 text-gray-400">
                                <XCircleIcon className="h-5 w-5" />
                                <span className="text-sm font-medium">{t('settings.notConnected')}</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        {googleCalendarStatus?.connected ? (
                            <>
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm text-green-800">
                                        <strong>{t('settings.calendarId')}:</strong> {googleCalendarStatus.calendar_id || 'primary'}
                                    </p>
                                    {googleCalendarStatus.token_expires_at && (
                                        <p className="text-sm text-green-800 mt-1">
                                            <strong>{t('settings.tokenExpires')}:</strong> {new Date(googleCalendarStatus.token_expires_at).toLocaleString()}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-900">{t('settings.enableCalendarSync')}</p>
                                        <p className="text-sm text-gray-600">{t('settings.enableCalendarSyncDescription')}</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={googleCalendarStatus.enabled}
                                            onChange={(e) => toggleGoogleCalendarSyncMutation.mutate(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                <button
                                    onClick={() => disconnectGoogleCalendarMutation.mutate()}
                                    disabled={disconnectGoogleCalendarMutation.isPending}
                                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:bg-gray-400"
                                >
                                    {disconnectGoogleCalendarMutation.isPending ? t('settings.disconnecting') : t('settings.disconnectGoogleCalendar')}
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-800">
                                        {t('settings.googleCalendarDescription')}
                                    </p>
                                </div>

                                <button
                                    onClick={() => connectGoogleCalendarMutation.mutate()}
                                    disabled={connectGoogleCalendarMutation.isPending}
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 flex items-center justify-center space-x-2"
                                >
                                    <CalendarIcon className="h-5 w-5" />
                                    <span>{connectGoogleCalendarMutation.isPending ? t('settings.connecting') : t('settings.connectGoogleCalendar')}</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Stripe Payment Integration */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <CreditCardIcon className="h-6 w-6 text-gray-600" />
                            <h2 className="text-lg font-semibold text-gray-900">{t('settings.stripeIntegration')}</h2>
                        </div>
                        {stripeSettings?.stripe_enabled ? (
                            <div className="flex items-center space-x-2 text-green-600">
                                <CheckCircleIcon className="h-5 w-5" />
                                <span className="text-sm font-medium">{t('settings.enabled')}</span>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2 text-gray-400">
                                <XCircleIcon className="h-5 w-5" />
                                <span className="text-sm font-medium">{t('settings.disabled')}</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        {stripeSettings?.stripe_enabled && !showStripeForm ? (
                            <>
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm text-green-800 mb-2">
                                        <strong>{t('settings.status')}:</strong> {t('settings.stripeConfigured')}
                                    </p>
                                    {stripeSettings.stripe_publishable_key && (
                                        <p className="text-sm text-green-800 font-mono">
                                            <strong>{t('settings.publishableKey')}:</strong> {stripeSettings.stripe_publishable_key.substring(0, 20)}...
                                        </p>
                                    )}
                                </div>

                                {stripeSettings.webhook_instructions && (
                                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                        <p className="text-sm font-semibold text-purple-900 mb-2">{t('settings.webhookConfiguration')}</p>
                                        <p className="text-sm text-purple-800 mb-2">
                                            <strong>{t('settings.webhookUrl')}:</strong>
                                        </p>
                                        <code className="block px-3 py-2 bg-white border border-purple-300 rounded text-xs font-mono mb-3 overflow-x-auto">
                                            {stripeSettings.webhook_instructions.url}
                                        </code>
                                        <p className="text-sm text-purple-800 mb-2">
                                            <strong>{t('settings.requiredEvents')}:</strong>
                                        </p>
                                        <ul className="list-disc list-inside text-xs text-purple-700 space-y-1 ml-2">
                                            {stripeSettings.webhook_instructions.events.map((event: string) => (
                                                <li key={event} className="font-mono">{event}</li>
                                            ))}
                                        </ul>
                                        <p className="text-xs text-purple-600 mt-2 italic">
                                            {stripeSettings.webhook_instructions.description}
                                        </p>
                                    </div>
                                )}

                                <div className="flex space-x-3">
                                    <button
                                        onClick={() => testStripeConnectionMutation.mutate()}
                                        disabled={testStripeConnectionMutation.isPending}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                                    >
                                        {testStripeConnectionMutation.isPending ? t('settings.testing') : t('settings.testConnection')}
                                    </button>
                                    <button
                                        onClick={() => setShowStripeForm(true)}
                                        className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                                    >
                                        {t('settings.updateSettings')}
                                    </button>
                                </div>

                                <button
                                    onClick={() => {
                                        if (confirm(t('settings.confirmDisableStripe'))) {
                                            disableStripeMutation.mutate();
                                        }
                                    }}
                                    disabled={disableStripeMutation.isPending}
                                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:bg-gray-400"
                                >
                                    {disableStripeMutation.isPending ? t('settings.disabling') : t('settings.disableStripe')}
                                </button>
                            </>
                        ) : (
                            <form onSubmit={handleStripeSubmit} className="space-y-4">
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-800">
                                        {t('settings.stripeDescription')}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('settings.publishableKey')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={stripeForm.stripe_publishable_key}
                                        onChange={(e) => setStripeForm({ ...stripeForm, stripe_publishable_key: e.target.value })}
                                        placeholder="pk_test_..."
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('settings.secretKey')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="password"
                                        value={stripeForm.stripe_secret_key}
                                        onChange={(e) => setStripeForm({ ...stripeForm, stripe_secret_key: e.target.value })}
                                        placeholder="sk_test_..."
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">{t('settings.keepSecretHint')}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('settings.webhookSecret')}
                                    </label>
                                    <input
                                        type="password"
                                        value={stripeForm.stripe_webhook_secret}
                                        onChange={(e) => setStripeForm({ ...stripeForm, stripe_webhook_secret: e.target.value })}
                                        placeholder="whsec_..."
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">{t('settings.webhookSecretHint')}</p>
                                </div>

                                <div className="flex space-x-3">
                                    {showStripeForm && stripeSettings?.stripe_enabled && (
                                        <button
                                            type="button"
                                            onClick={() => setShowStripeForm(false)}
                                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={updateStripeMutation.isPending}
                                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400"
                                    >
                                        {updateStripeMutation.isPending ? t('settings.saving') : t('settings.saveStripeSettings')}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* Security */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <ShieldCheckIcon className="h-6 w-6 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">{t('settings.security')}</h2>
                    </div>
                    <div className="space-y-3">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={user?.two_factor_enabled || false}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                disabled
                            />
                            <span className="ml-3 text-gray-700">{t('settings.enableTwoFactor')}</span>
                        </label>
                        <button
                            onClick={() => setShowPasswordForm(!showPasswordForm)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                            {t('settings.changePassword')}
                        </button>

                        {showPasswordForm && (
                            <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('settings.currentPassword')}
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordForm.current_password}
                                        onChange={(e) =>
                                            setPasswordForm({ ...passwordForm, current_password: e.target.value })
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('settings.newPassword')}
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordForm.password}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                        minLength={8}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('settings.confirmNewPassword')}
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordForm.password_confirmation}
                                        onChange={(e) =>
                                            setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                        minLength={8}
                                    />
                                </div>
                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordForm(false)}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={updatePasswordMutation.isPending}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                                    >
                                        {updatePasswordMutation.isPending ? t('common.loading') : t('common.update')}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={handleSavePreferences}
                        disabled={updatePreferencesMutation.isPending}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                    >
                        {updatePreferencesMutation.isPending ? t('common.loading') : t('settings.saveChanges')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
