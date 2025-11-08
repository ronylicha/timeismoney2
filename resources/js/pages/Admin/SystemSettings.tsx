import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
    CogIcon,
    ServerIcon,
    ShieldCheckIcon,
    EnvelopeIcon,
    CurrencyEuroIcon,
    DocumentTextIcon,
    CloudArrowUpIcon,
    BellIcon,
    GlobeAltIcon,
    ClockIcon,
    KeyIcon,
    CircleStackIcon,
    ArrowPathIcon,
    CheckIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface SystemSettings {
    general: {
        app_name: string;
        app_url: string;
        app_env: string;
        debug_mode: boolean;
        maintenance_mode: boolean;
        timezone: string;
        locale: string;
        currency: string;
    };
    security: {
        force_https: boolean;
        session_lifetime: number;
        password_min_length: number;
        require_2fa: boolean;
        allowed_ips: string[];
        rate_limit_per_minute: number;
    };
    email: {
        driver: string;
        host: string;
        port: number;
        encryption: string;
        from_address: string;
        from_name: string;
    };
    storage: {
        driver: string;
        max_upload_size_mb: number;
        allowed_extensions: string[];
        s3_bucket?: string;
        s3_region?: string;
    };
    billing: {
        stripe_enabled: boolean;
        paypal_enabled: boolean;
        tax_rate: number;
        invoice_prefix: string;
        invoice_footer: string;
        payment_terms_days: number;
    };
    chorus_pro: {
        enabled: boolean;
        production_mode: boolean;
        auto_submit: boolean;
        certificate_expiry?: string;
    };
    notifications: {
        email_enabled: boolean;
        push_enabled: boolean;
        daily_summary_time: string;
        weekly_summary_day: number;
    };
    backup: {
        enabled: boolean;
        frequency: string;
        retention_days: number;
        storage_location: string;
        last_backup?: string;
        next_backup?: string;
    };
}

const SystemSettings: React.FC = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('general');
    const [editMode, setEditMode] = useState(false);
    const [settings, setSettings] = useState<SystemSettings | null>(null);

    // Fetch settings
    const { data: originalSettings, isLoading } = useQuery({
        queryKey: ['admin-settings'],
        queryFn: async () => {
            const response = await axios.get('/api/admin/system-settings');
            setSettings(response.data);
            return response.data;
        }
    });

    // Save settings mutation
    const saveSettingsMutation = useMutation({
        mutationFn: async (updatedSettings: SystemSettings) => {
            await axios.put('/api/admin/system-settings', updatedSettings);
        },
        onSuccess: () => {
            toast.success('Paramètres sauvegardés');
            setEditMode(false);
            queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
        },
        onError: () => {
            toast.error('Erreur lors de la sauvegarde');
        }
    });

    // Test email mutation
    const testEmailMutation = useMutation({
        mutationFn: async () => {
            await axios.post('/api/admin/test-email');
        },
        onSuccess: () => {
            toast.success('Email de test envoyé');
        },
        onError: () => {
            toast.error('Erreur lors de l\'envoi');
        }
    });

    // Clear cache mutation
    const clearCacheMutation = useMutation({
        mutationFn: async () => {
            await axios.post('/api/admin/clear-cache');
        },
        onSuccess: () => {
            toast.success('Cache vidé');
        }
    });

    // Run backup mutation
    const runBackupMutation = useMutation({
        mutationFn: async () => {
            await axios.post('/api/admin/run-backup');
        },
        onSuccess: () => {
            toast.success('Backup lancé');
        },
        onError: () => {
            toast.error('Erreur lors du backup');
        }
    });

    const tabs = [
        { id: 'general', label: 'Général', icon: CogIcon },
        { id: 'security', label: 'Sécurité', icon: ShieldCheckIcon },
        { id: 'email', label: 'Email', icon: EnvelopeIcon },
        { id: 'storage', label: 'Stockage', icon: CloudArrowUpIcon },
        { id: 'billing', label: 'Facturation', icon: CurrencyEuroIcon },
        { id: 'chorus_pro', label: 'Chorus Pro', icon: DocumentTextIcon },
        { id: 'notifications', label: 'Notifications', icon: BellIcon },
        { id: 'backup', label: 'Backup', icon: CircleStackIcon },
    ];

    const handleSave = () => {
        if (settings) {
            saveSettingsMutation.mutate(settings);
        }
    };

    const handleCancel = () => {
        setSettings(originalSettings);
        setEditMode(false);
    };

    if (isLoading || !settings) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Paramètres système</h1>
                        <p className="text-gray-600 mt-1">Configuration globale de l'application</p>
                    </div>
                    <div className="flex space-x-3">
                        {editMode ? (
                            <>
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saveSettingsMutation.isPending}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {saveSettingsMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setEditMode(true)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                Modifier
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex space-x-6">
                {/* Sidebar */}
                <div className="w-64">
                    <nav className="space-y-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                                        activeTab === tab.id
                                            ? 'bg-indigo-100 text-indigo-700'
                                            : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <Icon className="h-5 w-5 mr-3" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Quick Actions */}
                    <div className="mt-8 space-y-2">
                        <button
                            onClick={() => clearCacheMutation.mutate()}
                            className="w-full flex items-center px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            <ArrowPathIcon className="h-4 w-4 mr-2" />
                            Vider le cache
                        </button>
                        <button
                            onClick={() => testEmailMutation.mutate()}
                            className="w-full flex items-center px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            <EnvelopeIcon className="h-4 w-4 mr-2" />
                            Test email
                        </button>
                        <button
                            onClick={() => runBackupMutation.mutate()}
                            className="w-full flex items-center px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            <CircleStackIcon className="h-4 w-4 mr-2" />
                            Lancer backup
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                    <div className="bg-white rounded-lg shadow p-6">
                        {/* General Settings */}
                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Paramètres généraux</h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Nom de l'application
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.general.app_name}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                general: { ...settings.general, app_name: e.target.value }
                                            })}
                                            disabled={!editMode}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            URL de l'application
                                        </label>
                                        <input
                                            type="url"
                                            value={settings.general.app_url}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                general: { ...settings.general, app_url: e.target.value }
                                            })}
                                            disabled={!editMode}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Environnement
                                        </label>
                                        <select
                                            value={settings.general.app_env}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                general: { ...settings.general, app_env: e.target.value }
                                            })}
                                            disabled={!editMode}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                                        >
                                            <option value="local">Local</option>
                                            <option value="staging">Staging</option>
                                            <option value="production">Production</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Fuseau horaire
                                        </label>
                                        <select
                                            value={settings.general.timezone}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                general: { ...settings.general, timezone: e.target.value }
                                            })}
                                            disabled={!editMode}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                                        >
                                            <option value="Europe/Paris">Europe/Paris</option>
                                            <option value="Europe/London">Europe/London</option>
                                            <option value="America/New_York">America/New_York</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Langue
                                        </label>
                                        <select
                                            value={settings.general.locale}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                general: { ...settings.general, locale: e.target.value }
                                            })}
                                            disabled={!editMode}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                                        >
                                            <option value="fr">Français</option>
                                            <option value="en">English</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Devise
                                        </label>
                                        <select
                                            value={settings.general.currency}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                general: { ...settings.general, currency: e.target.value }
                                            })}
                                            disabled={!editMode}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                                        >
                                            <option value="EUR">EUR (€)</option>
                                            <option value="USD">USD ($)</option>
                                            <option value="GBP">GBP (£)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={settings.general.debug_mode}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                general: { ...settings.general, debug_mode: e.target.checked }
                                            })}
                                            disabled={!editMode}
                                            className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">Mode debug</span>
                                    </label>

                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={settings.general.maintenance_mode}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                general: { ...settings.general, maintenance_mode: e.target.checked }
                                            })}
                                            disabled={!editMode}
                                            className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">Mode maintenance</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Security Settings */}
                        {activeTab === 'security' && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Paramètres de sécurité</h2>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Durée de session (minutes)
                                        </label>
                                        <input
                                            type="number"
                                            value={settings.security.session_lifetime}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                security: { ...settings.security, session_lifetime: parseInt(e.target.value) }
                                            })}
                                            disabled={!editMode}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Longueur minimale mot de passe
                                        </label>
                                        <input
                                            type="number"
                                            value={settings.security.password_min_length}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                security: { ...settings.security, password_min_length: parseInt(e.target.value) }
                                            })}
                                            disabled={!editMode}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Limite de requêtes par minute
                                        </label>
                                        <input
                                            type="number"
                                            value={settings.security.rate_limit_per_minute}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                security: { ...settings.security, rate_limit_per_minute: parseInt(e.target.value) }
                                            })}
                                            disabled={!editMode}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={settings.security.force_https}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    security: { ...settings.security, force_https: e.target.checked }
                                                })}
                                                disabled={!editMode}
                                                className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Forcer HTTPS</span>
                                        </label>

                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={settings.security.require_2fa}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    security: { ...settings.security, require_2fa: e.target.checked }
                                                })}
                                                disabled={!editMode}
                                                className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">2FA obligatoire pour les admins</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Email Settings */}
                        {activeTab === 'email' && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuration email</h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Driver
                                        </label>
                                        <select
                                            value={settings.email.driver}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                email: { ...settings.email, driver: e.target.value }
                                            })}
                                            disabled={!editMode}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                                        >
                                            <option value="smtp">SMTP</option>
                                            <option value="sendmail">Sendmail</option>
                                            <option value="mailgun">Mailgun</option>
                                            <option value="ses">Amazon SES</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Host
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.email.host}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                email: { ...settings.email, host: e.target.value }
                                            })}
                                            disabled={!editMode}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Port
                                        </label>
                                        <input
                                            type="number"
                                            value={settings.email.port}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                email: { ...settings.email, port: parseInt(e.target.value) }
                                            })}
                                            disabled={!editMode}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Encryption
                                        </label>
                                        <select
                                            value={settings.email.encryption}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                email: { ...settings.email, encryption: e.target.value }
                                            })}
                                            disabled={!editMode}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                                        >
                                            <option value="tls">TLS</option>
                                            <option value="ssl">SSL</option>
                                            <option value="">None</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Email expéditeur
                                        </label>
                                        <input
                                            type="email"
                                            value={settings.email.from_address}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                email: { ...settings.email, from_address: e.target.value }
                                            })}
                                            disabled={!editMode}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Nom expéditeur
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.email.from_name}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                email: { ...settings.email, from_name: e.target.value }
                                            })}
                                            disabled={!editMode}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Chorus Pro Settings */}
                        {activeTab === 'chorus_pro' && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuration Chorus Pro</h2>

                                <div className="space-y-4">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={settings.chorus_pro.enabled}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                chorus_pro: { ...settings.chorus_pro, enabled: e.target.checked }
                                            })}
                                            disabled={!editMode}
                                            className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">Activer Chorus Pro</span>
                                    </label>

                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={settings.chorus_pro.production_mode}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                chorus_pro: { ...settings.chorus_pro, production_mode: e.target.checked }
                                            })}
                                            disabled={!editMode}
                                            className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">Mode production</span>
                                    </label>

                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={settings.chorus_pro.auto_submit}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                chorus_pro: { ...settings.chorus_pro, auto_submit: e.target.checked }
                                            })}
                                            disabled={!editMode}
                                            className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">Envoi automatique</span>
                                    </label>
                                </div>

                                {settings.chorus_pro.certificate_expiry && (
                                    <div className="p-4 bg-yellow-50 rounded-lg">
                                        <div className="flex">
                                            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                                            <div className="ml-3">
                                                <p className="text-sm text-yellow-800">
                                                    Certificat expire le {settings.chorus_pro.certificate_expiry}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Backup Settings */}
                        {activeTab === 'backup' && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuration des backups</h2>

                                <div className="space-y-6">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={settings.backup.enabled}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                backup: { ...settings.backup, enabled: e.target.checked }
                                            })}
                                            disabled={!editMode}
                                            className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">Backups automatiques activés</span>
                                    </label>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Fréquence
                                        </label>
                                        <select
                                            value={settings.backup.frequency}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                backup: { ...settings.backup, frequency: e.target.value }
                                            })}
                                            disabled={!editMode}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                                        >
                                            <option value="daily">Quotidien</option>
                                            <option value="weekly">Hebdomadaire</option>
                                            <option value="monthly">Mensuel</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Rétention (jours)
                                        </label>
                                        <input
                                            type="number"
                                            value={settings.backup.retention_days}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                backup: { ...settings.backup, retention_days: parseInt(e.target.value) }
                                            })}
                                            disabled={!editMode}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Emplacement de stockage
                                        </label>
                                        <select
                                            value={settings.backup.storage_location}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                backup: { ...settings.backup, storage_location: e.target.value }
                                            })}
                                            disabled={!editMode}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                                        >
                                            <option value="local">Local</option>
                                            <option value="s3">Amazon S3</option>
                                            <option value="ftp">FTP</option>
                                        </select>
                                    </div>

                                    {settings.backup.last_backup && (
                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <p className="text-sm text-gray-700">
                                                <span className="font-medium">Dernier backup:</span> {settings.backup.last_backup}
                                            </p>
                                            {settings.backup.next_backup && (
                                                <p className="text-sm text-gray-700 mt-1">
                                                    <span className="font-medium">Prochain backup:</span> {settings.backup.next_backup}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemSettings;