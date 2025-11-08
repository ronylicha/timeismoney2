import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { Cog6ToothIcon, BellIcon, ShieldCheckIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
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
            toast.success('Password updated successfully');
            setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update password');
        },
    });

    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const [showPasswordForm, setShowPasswordForm] = useState(false);

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
            toast.error('Passwords do not match');
            return;
        }
        updatePasswordMutation.mutate(passwordForm);
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
                                Theme
                            </label>
                            <select
                                value={preferences.theme}
                                onChange={(e) => setPreferences({ ...preferences, theme: e.target.value as 'light' | 'dark' | 'auto' })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                                <option value="auto">Auto (System)</option>
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
                                        Current Password
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
                                        New Password
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
                                        Confirm New Password
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
