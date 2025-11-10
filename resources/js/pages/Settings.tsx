import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { BellIcon, ShieldCheckIcon, GlobeAltIcon, CreditCardIcon, CalendarIcon, CheckCircleIcon, XCircleIcon, BuildingOfficeIcon, ArrowRightIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import SignatureDashboard from '../components/SignatureDashboard';
import SignatureVerification from '../components/SignatureVerification';

// MultiSelect component for searchable dropdown
interface MultiSelectProps {
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    className?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ 
    options, 
    selected, 
    onChange, 
    placeholder = "Sélectionner...", 
    className = "" 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredOptions = options.filter(option => 
        option.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !selected.includes(option)
    );
    
    const handleSelect = (option: string) => {
        onChange([...selected, option]);
        setSearchTerm('');
    };
    
    const handleRemove = (option: string) => {
        onChange(selected.filter(item => item !== option));
    };
    
    return (
        <div className={`relative ${className}`}>
            <div className="min-h-10 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                <div className="flex flex-wrap gap-2 p-2">
                    {selected.map((item, index) => (
                        <span 
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded"
                        >
                            {item}
                            <button
                                type="button"
                                onClick={() => handleRemove(item)}
                                className="text-blue-600 hover:text-blue-800"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setIsOpen(true)}
                        placeholder={selected.length === 0 ? placeholder : ''}
                        className="flex-1 min-w-[120px] outline-none bg-transparent text-sm"
                    />
                </div>
            </div>
            
            {isOpen && filteredOptions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {filteredOptions.map((option, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => handleSelect(option)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                        >
                            {option}
                        </button>
                    ))}
                </div>
            )}
            
            {isOpen && searchTerm && filteredOptions.length === 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                    <div className="px-3 py-2 text-sm text-gray-500">
                        Aucune option trouvée
                    </div>
                </div>
            )}
            
            {isOpen && (
                <div 
                    className="fixed inset-0 z-0" 
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};

// OAuth Scopes disponibles pour PDP
const PDP_OAUTH_SCOPES = [
    'invoice_submit',
    'invoice_read', 
    'invoice_update',
    'invoice_delete',
    'credit_note_submit',
    'credit_note_read',
    'credit_note_update',
    'credit_note_delete',
    'payment_read',
    'payment_webhook',
    'company_read',
    'company_update',
    'report_read',
    'audit_read'
];

const Settings: React.FC = () => {
    const { t } = useTranslation();
    const { changeLanguage, languages } = useLanguage();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

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
    const [activeSignatureTab, setActiveSignatureTab] = useState('dashboard');

    // Stripe state
    const [showStripeForm, setShowStripeForm] = useState(false);
    const [stripeForm, setStripeForm] = useState({
        stripe_publishable_key: '',
        stripe_secret_key: '',
        stripe_webhook_secret: '',
        stripe_enabled: true,
    });

    // PDP state
    const [showPdpForm, setShowPdpForm] = useState(false);
    const [pdpForm, setPdpForm] = useState({
        pdp_enabled: false,
        pdp_mode: 'simulation',
        pdp_base_url: '',
        pdp_oauth_url: '',
        pdp_client_id: '',
        pdp_client_secret: '',
        pdp_scopes: ['invoice_submit', 'invoice_read'],
        pdp_timeout: 30,
        pdp_retry_attempts: 3,
        pdp_retry_delay: 5,
        pdp_simulation_auto_approve: true,
        pdp_simulation_processing_delay: 30,
        pdp_simulation_error_rate: 0,
        pdp_webhook_enabled: false,
        pdp_webhook_url: '',
        pdp_webhook_secret: '',
        pdp_notifications_email_enabled: true,
    });

    // Timestamp state
    const [showTimestampForm, setShowTimestampForm] = useState(false);
    const [timestampForm, setTimestampForm] = useState({
        timestamp_provider: 'simple',
        timestamp_tsa_url: '',
        timestamp_api_key: '',
        timestamp_api_secret: '',
        timestamp_certificate_id: '',
        timestamp_include_certificate: false,
        timestamp_enabled: true,
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

    // Fetch PDP settings
    const { data: pdpSettings, refetch: refetchPdp } = useQuery({
        queryKey: ['pdp-settings'],
        queryFn: async () => {
            const response = await axios.get('/settings/pdp');
            return response.data.data;
        },
    });

    // Fetch Timestamp settings
    const { data: timestampSettings, refetch: refetchTimestamp } = useQuery({
        queryKey: ['timestamp-settings'],
        queryFn: async () => {
            const response = await axios.get('/settings/timestamp');
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

    React.useEffect(() => {
        if (pdpSettings) {
            setPdpForm({
                pdp_enabled: pdpSettings.pdp_enabled || false,
                pdp_mode: pdpSettings.pdp_mode || 'simulation',
                pdp_base_url: pdpSettings.pdp_base_url || '',
                pdp_oauth_url: pdpSettings.pdp_oauth_url || '',
                pdp_client_id: pdpSettings.pdp_client_id || '',
                pdp_client_secret: '', // Don't populate secret key for security
                pdp_scopes: pdpSettings.pdp_scope ? pdpSettings.pdp_scope.split(' ') : ['invoice_submit', 'invoice_read'],
                pdp_timeout: pdpSettings.pdp_timeout || 30,
                pdp_retry_attempts: pdpSettings.pdp_retry_attempts || 3,
                pdp_retry_delay: pdpSettings.pdp_retry_delay || 5,
                pdp_simulation_auto_approve: pdpSettings.pdp_simulation_auto_approve ?? true,
                pdp_simulation_processing_delay: pdpSettings.pdp_simulation_processing_delay || 30,
                pdp_simulation_error_rate: pdpSettings.pdp_simulation_error_rate || 0,
                pdp_webhook_enabled: pdpSettings.pdp_webhook_enabled || false,
                pdp_webhook_url: pdpSettings.pdp_webhook_url || '',
                pdp_webhook_secret: '', // Don't populate secret for security
                pdp_notifications_email_enabled: pdpSettings.pdp_notifications_email_enabled ?? true,
            });
        }
    }, [pdpSettings]);

    React.useEffect(() => {
        if (timestampSettings) {
            setTimestampForm({
                timestamp_provider: timestampSettings.timestamp_provider || 'simple',
                timestamp_tsa_url: timestampSettings.timestamp_tsa_url || '',
                timestamp_api_key: '', // Don't populate secret key for security
                timestamp_api_secret: '', // Don't populate secret for security
                timestamp_certificate_id: timestampSettings.timestamp_certificate_id || '',
                timestamp_include_certificate: timestampSettings.timestamp_include_certificate ?? false,
                timestamp_enabled: timestampSettings.timestamp_enabled ?? true,
            });
        }
    }, [timestampSettings]);

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

    const toggleStripeMutation = useMutation({
        mutationFn: async (enabled: boolean) => {
            const response = await axios.post('/settings/stripe/toggle', { stripe_enabled: enabled });
            return response.data;
        },
        onSuccess: (_, variables) => {
            refetchStripe();
            toast.success(variables ? t('settings.stripeEnabled') : t('settings.stripeDisabled'));
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || t('settings.stripeToggleError'));
        }
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
        }
    });

    // PDP mutations
    const updatePdpMutation = useMutation({
        mutationFn: async (data: typeof pdpForm) => {
            // Convertir le tableau de scopes en chaîne pour l'API
            const formData = {
                ...data,
                pdp_scope: data.pdp_scopes.join(' ')
            };
            const response = await axios.post('/settings/pdp', formData);
            return response.data;
        },
        onSuccess: () => {
            refetchPdp();
            setShowPdpForm(false);
            toast.success('Paramètres PDP mis à jour');
        },
        onError: (error: any) => {
            toast.error(error.response?.data.message || 'Erreur lors de la mise à jour PDP');
        },
    });

    const testPdpConnectionMutation = useMutation({
        mutationFn: async () => {
            const response = await axios.post('/settings/pdp/test');
            return response.data;
        },
        onSuccess: () => {
            toast.success('Connexion PDP réussie');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Erreur de connexion PDP');
        },
    });

    const disablePdpMutation = useMutation({
        mutationFn: async () => {
            const response = await axios.post('/settings/pdp/disable');
            return response.data;
        },
        onSuccess: () => {
            refetchPdp();
            toast.success('PDP désactivé');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Erreur lors de la désactivation PDP');
        },
    });

    const handleStripeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateStripeMutation.mutate(stripeForm);
    };

    const handlePdpSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updatePdpMutation.mutate(pdpForm);
    };

    // Timestamp mutations
    const updateTimestampMutation = useMutation({
        mutationFn: async (data: typeof timestampForm) => {
            // Clean data before sending - remove secret for openapi provider
            const cleanData = { ...data };
            if (cleanData.timestamp_provider === 'openapi') {
                cleanData.timestamp_api_secret = '';
            }
            const response = await axios.patch('/settings/timestamp', cleanData);
            return response.data;
        },
        onSuccess: () => {
            refetchTimestamp();
            setShowTimestampForm(false);
            toast.success('Paramètres d\'horodatage mis à jour');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour de l\'horodatage');
        },
    });

    const testTimestampConnectionMutation = useMutation({
        mutationFn: async () => {
            const response = await axios.post('/settings/timestamp/test');
            return response.data;
        },
        onSuccess: () => {
            toast.success('Connexion au service d\'horodatage réussie');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Erreur de connexion au service d\'horodatage');
        },
    });

    const handleTimestampSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateTimestampMutation.mutate(timestampForm);
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
                        <div className="flex items-center space-x-3">
                            {stripeSettings?.stripe_configured && (
                                <div className="flex items-center space-x-2">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={stripeSettings?.stripe_enabled || false}
                                            onChange={(e) => toggleStripeMutation.mutate(e.target.checked)}
                                            disabled={toggleStripeMutation.isPending}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                    <span className="text-sm font-medium">
                                        {stripeSettings?.stripe_enabled ? (
                                            <span className="text-green-600">{t('settings.enabled')}</span>
                                        ) : (
                                            <span className="text-gray-400">{t('settings.disabled')}</span>
                                        )}
                                    </span>
                                </div>
                            )}
                            {!stripeSettings?.stripe_configured && (
                                <div className="flex items-center space-x-2 text-gray-400">
                                    <XCircleIcon className="h-5 w-5" />
                                    <span className="text-sm font-medium">{t('settings.notConfigured')}</span>
                                </div>
                            )}
                        </div>
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

                                {/* Webhook Configuration Instructions */}
                                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                    <p className="text-sm font-semibold text-purple-900 mb-2">
                                        📡 {t('settings.webhookConfiguration')}
                                    </p>
                                    <p className="text-sm text-purple-800 mb-3">
                                        {t('settings.webhookInstructions')}
                                    </p>

                                    <div className="mb-3">
                                        <p className="text-xs font-semibold text-purple-900 mb-1">
                                            {t('settings.webhookUrl')}:
                                        </p>
                                        <code className="block px-3 py-2 bg-white border border-purple-300 rounded text-xs font-mono overflow-x-auto">
                                            {window.location.origin}/api/webhooks/stripe
                                        </code>
                                    </div>

                                    <div>
                                        <p className="text-xs font-semibold text-purple-900 mb-2">
                                            {t('settings.requiredEvents')}:
                                        </p>
                                        <ul className="list-disc list-inside text-xs text-purple-700 space-y-1 ml-2">
                                            <li className="font-mono">payment_intent.succeeded</li>
                                            <li className="font-mono">payment_intent.payment_failed</li>
                                            <li className="font-mono">charge.succeeded</li>
                                            <li className="font-mono">charge.failed</li>
                                            <li className="font-mono">charge.refunded</li>
                                            <li className="font-mono">customer.subscription.created</li>
                                            <li className="font-mono">customer.subscription.updated</li>
                                            <li className="font-mono">customer.subscription.deleted</li>
                                            <li className="font-mono">invoice.paid</li>
                                            <li className="font-mono">invoice.payment_failed</li>
                                        </ul>
                                    </div>

                                    <p className="text-xs text-purple-600 mt-3 italic">
                                        💡 {t('settings.webhookSetupHint')}
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

                {/* PDP Integration */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <DocumentTextIcon className="h-6 w-6 text-gray-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Portail Public de Facturation (PDP)</h2>
                        </div>
                        {pdpSettings?.pdp_enabled ? (
                            <div className="flex items-center space-x-2 text-green-600">
                                <CheckCircleIcon className="h-5 w-5" />
                                <span className="text-sm font-medium">Activé</span>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2 text-gray-400">
                                <XCircleIcon className="h-5 w-5" />
                                <span className="text-sm font-medium">Désactivé</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        {pdpSettings?.pdp_enabled && !showPdpForm ? (
                            <>
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm text-green-800 mb-2">
                                        <strong>Statut:</strong> PDP configuré
                                    </p>
                                    <p className="text-sm text-green-800 mb-1">
                                        <strong>Mode:</strong> {pdpSettings.pdp_mode === 'simulation' ? 'Simulation' : 'Production'}
                                    </p>
                                    {pdpSettings.pdp_base_url && (
                                        <p className="text-sm text-green-800 font-mono">
                                            <strong>URL:</strong> {pdpSettings.pdp_base_url.substring(0, 30)}...
                                        </p>
                                    )}
                                </div>

                                <div className="flex space-x-3">
                                    <button
                                        onClick={() => testPdpConnectionMutation.mutate()}
                                        disabled={testPdpConnectionMutation.isPending}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                                    >
                                        {testPdpConnectionMutation.isPending ? 'Test en cours...' : 'Tester la connexion'}
                                    </button>
                                    <button
                                        onClick={() => setShowPdpForm(true)}
                                        className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                                    >
                                        Modifier les paramètres
                                    </button>
                                </div>

                                <button
                                    onClick={() => {
                                        if (confirm('Êtes-vous sûr de vouloir désactiver le PDP ?')) {
                                            disablePdpMutation.mutate();
                                        }
                                    }}
                                    disabled={disablePdpMutation.isPending}
                                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:bg-gray-400"
                                >
                                    {disablePdpMutation.isPending ? 'Désactivation...' : 'Désactiver le PDP'}
                                </button>
                            </>
                        ) : (
                            <form onSubmit={handlePdpSubmit} className="space-y-4">
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-800">
                                        Configurez l'intégration avec le Portail Public de Facturation de la DGFIP pour la facturation électronique B2B obligatoire en France.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Activer le PDP
                                        </label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={pdpForm.pdp_enabled}
                                                onChange={(e) => setPdpForm({ ...pdpForm, pdp_enabled: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Mode
                                        </label>
                                        <select
                                            value={pdpForm.pdp_mode}
                                            onChange={(e) => setPdpForm({ ...pdpForm, pdp_mode: e.target.value as 'simulation' | 'production' })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="simulation">Simulation</option>
                                            <option value="production">Production</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        URL de base PDP <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="url"
                                        value={pdpForm.pdp_base_url}
                                        onChange={(e) => setPdpForm({ ...pdpForm, pdp_base_url: e.target.value })}
                                        placeholder="https://sandbox.pdp.dgfip.fr"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        URL OAuth PDP
                                    </label>
                                    <input
                                        type="url"
                                        value={pdpForm.pdp_oauth_url}
                                        onChange={(e) => setPdpForm({ ...pdpForm, pdp_oauth_url: e.target.value })}
                                        placeholder="https://auth.pdp.dgfip.fr/oauth/token"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Client ID <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={pdpForm.pdp_client_id}
                                            onChange={(e) => setPdpForm({ ...pdpForm, pdp_client_id: e.target.value })}
                                            placeholder="client_id_pdp"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Client Secret <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="password"
                                            value={pdpForm.pdp_client_secret}
                                            onChange={(e) => setPdpForm({ ...pdpForm, pdp_client_secret: e.target.value })}
                                            placeholder="secret_pdp"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Scope OAuth
                                    </label>
                                    <MultiSelect
                                        options={PDP_OAUTH_SCOPES}
                                        selected={pdpForm.pdp_scopes}
                                        onChange={(scopes) => setPdpForm({ ...pdpForm, pdp_scopes: scopes })}
                                        placeholder="Sélectionner les scopes OAuth..."
                                        className="w-full"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Sélectionnez les permissions requises pour l'API PDP
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Timeout (secondes)
                                        </label>
                                        <input
                                            type="number"
                                            value={pdpForm.pdp_timeout}
                                            onChange={(e) => setPdpForm({ ...pdpForm, pdp_timeout: parseInt(e.target.value) || 30 })}
                                            min="1"
                                            max="300"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Tentatives de retry
                                        </label>
                                        <input
                                            type="number"
                                            value={pdpForm.pdp_retry_attempts}
                                            onChange={(e) => setPdpForm({ ...pdpForm, pdp_retry_attempts: parseInt(e.target.value) || 3 })}
                                            min="0"
                                            max="10"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Délai retry (secondes)
                                        </label>
                                        <input
                                            type="number"
                                            value={pdpForm.pdp_retry_delay}
                                            onChange={(e) => setPdpForm({ ...pdpForm, pdp_retry_delay: parseInt(e.target.value) || 5 })}
                                            min="1"
                                            max="300"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                {pdpForm.pdp_mode === 'simulation' && (
                                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <h3 className="text-sm font-semibold text-yellow-900 mb-3">Paramètres de simulation</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={pdpForm.pdp_simulation_auto_approve}
                                                        onChange={(e) => setPdpForm({ ...pdpForm, pdp_simulation_auto_approve: e.target.checked })}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                                                    />
                                                    <span className="text-sm text-gray-700">Auto-approuver</span>
                                                </label>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Délai traitement (sec)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={pdpForm.pdp_simulation_processing_delay}
                                                    onChange={(e) => setPdpForm({ ...pdpForm, pdp_simulation_processing_delay: parseInt(e.target.value) || 30 })}
                                                    min="0"
                                                    max="300"
                                                    className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Taux d'erreur (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={pdpForm.pdp_simulation_error_rate}
                                                    onChange={(e) => setPdpForm({ ...pdpForm, pdp_simulation_error_rate: parseInt(e.target.value) || 0 })}
                                                    min="0"
                                                    max="100"
                                                    className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex space-x-3">
                                    {showPdpForm && pdpSettings?.pdp_enabled && (
                                        <button
                                            type="button"
                                            onClick={() => setShowPdpForm(false)}
                                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                        >
                                            Annuler
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={updatePdpMutation.isPending}
                                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400"
                                    >
                                        {updatePdpMutation.isPending ? 'Enregistrement...' : 'Enregistrer les paramètres PDP'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* Timestamp Integration */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <CalendarIcon className="h-6 w-6 text-gray-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Horodatage Qualifié (NF525)</h2>
                        </div>
                        {timestampSettings?.timestamp_provider && timestampSettings?.timestamp_provider !== 'simple' ? (
                            <div className="flex items-center space-x-2">
                                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                <span className="text-sm text-green-600">
                                    <strong>Statut:</strong> Service configuré
                                </span>
                                <button
                                    onClick={() => setShowTimestampForm(!showTimestampForm)}
                                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                                >
                                    {showTimestampForm ? 'Annuler' : 'Modifier'}
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <XCircleIcon className="h-5 w-5 text-red-500" />
                                <span className="text-sm text-red-600">
                                    <strong>Statut:</strong> Non configuré
                                </span>
                                <button
                                    onClick={() => setShowTimestampForm(!showTimestampForm)}
                                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                                >
                                    {showTimestampForm ? 'Annuler' : 'Configurer'}
                                </button>
                            </div>
                        )}
                    </div>

                    <p className="text-gray-600 mb-4">
                        Configurez le service d'horodatage qualifié pour la conformité NF525. 
                        L'horodatage simple est disponible par défaut sans configuration requise.
                    </p>

                    {showTimestampForm && (
                        <form onSubmit={handleTimestampSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={timestampForm.timestamp_enabled}
                                            onChange={(e) => setTimestampForm({ ...timestampForm, timestamp_enabled: e.target.checked })}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Activer l'horodatage</span>
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fournisseur d'horodatage
                                    </label>
                                    <select
                                        value={timestampForm.timestamp_provider}
                                        onChange={(e) => setTimestampForm({ ...timestampForm, timestamp_provider: e.target.value as 'simple' | 'universign' | 'openapi' })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="simple">Simple (sans configuration)</option>
                                        <option value="universign">Universign</option>
                                        <option value="openapi">OpenAPI.com</option>
                                    </select>
                                </div>

                                {timestampForm.timestamp_provider === 'universign' && (
                                    <>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                URL TSA Universign <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="url"
                                                value={timestampForm.timestamp_tsa_url}
                                                onChange={(e) => setTimestampForm({ ...timestampForm, timestamp_tsa_url: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="https://ws.universign.eu/tsa"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Clé API Universign <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="password"
                                                value={timestampForm.timestamp_api_key}
                                                onChange={(e) => setTimestampForm({ ...timestampForm, timestamp_api_key: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="Clé API Universign"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Secret API Universign <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="password"
                                                value={timestampForm.timestamp_api_secret}
                                                onChange={(e) => setTimestampForm({ ...timestampForm, timestamp_api_secret: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="Secret API Universign"
                                                required
                                            />
                                        </div>
                                    </>
                                )}

                                {timestampForm.timestamp_provider === 'openapi' && (
                                    <>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                URL TSA OpenAPI.com <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="url"
                                                value={timestampForm.timestamp_tsa_url}
                                                onChange={(e) => setTimestampForm({ ...timestampForm, timestamp_tsa_url: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="https://api.openapi.com/tsa/v1"
                                                required
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                URL du service d'horodatage qualifié OpenAPI.com
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Clé API OpenAPI.com <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="password"
                                                value={timestampForm.timestamp_api_key}
                                                onChange={(e) => setTimestampForm({ ...timestampForm, timestamp_api_key: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="Clé API OpenAPI.com"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Identifiant de certificat
                                            </label>
                                            <input
                                                type="text"
                                                value={timestampForm.timestamp_certificate_id || ''}
                                                onChange={(e) => setTimestampForm({ ...timestampForm, timestamp_certificate_id: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="ID du certificat de signature"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Optionnel: Identifiant du certificat à utiliser pour l'horodatage
                                            </p>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={timestampForm.timestamp_include_certificate || false}
                                                    onChange={(e) => setTimestampForm({ ...timestampForm, timestamp_include_certificate: e.target.checked })}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                                <span className="text-sm text-gray-700">Inclure le certificat dans le timestamp</span>
                                            </label>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Cochez cette option pour inclure le certificat de signature dans l'horodatage
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex space-x-3">
                                {timestampForm.timestamp_provider !== 'simple' && (
                                    <button
                                        type="button"
                                        onClick={() => testTimestampConnectionMutation.mutate()}
                                        disabled={testTimestampConnectionMutation.isPending}
                                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:bg-gray-400"
                                    >
                                        {testTimestampConnectionMutation.isPending ? 'Test...' : 'Tester la connexion'}
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={updateTimestampMutation.isPending}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                                >
                                    {updateTimestampMutation.isPending ? 'Enregistrement...' : 'Enregistrer les paramètres'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Tenant Billing Settings */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <BuildingOfficeIcon className="h-6 w-6 text-gray-600" />
                            <h2 className="text-lg font-semibold text-gray-900">{t('settings.billingSettings')}</h2>
                        </div>
                    </div>
                    <p className="text-gray-600 mb-4">{t('settings.billingSettingsDescription')}</p>
                    <button
                        onClick={() => navigate('/settings/billing')}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition space-x-2"
                    >
                        <span>{t('settings.billingSettings')}</span>
                        <ArrowRightIcon className="h-4 w-4" />
                    </button>
                </div>

                {/* Electronic Signature Management */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <ShieldCheckIcon className="h-6 w-6 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Gestion des Signatures Électroniques</h2>
                    </div>
                    
                    <div className="mb-4">
                        <div className="flex space-x-1 border-b border-gray-200">
                            <button
                                onClick={() => setActiveSignatureTab('dashboard')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                    activeSignatureTab === 'dashboard'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Tableau de Bord
                            </button>
                            <button
                                onClick={() => setActiveSignatureTab('verification')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                    activeSignatureTab === 'verification'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Vérification
                            </button>
                        </div>
                    </div>

                    <div className="mt-4">
                        {activeSignatureTab === 'dashboard' && <SignatureDashboard />}
                        {activeSignatureTab === 'verification' && <SignatureVerification />}
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
