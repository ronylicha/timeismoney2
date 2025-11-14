import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeftIcon,
    FolderIcon,
    CurrencyEuroIcon,
    CalendarIcon,
    CheckCircleIcon,
    DocumentIcon,
    PhotoIcon,
} from '@heroicons/react/24/outline';
import { Project, Client } from '../types';
import ClientSearchSelect from '../components/ClientSearchSelect';
import { useOffline } from '@/contexts/OfflineContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { createLocalId } from '@/utils/offlineDB';
import {
    ATTACHMENT_QUEUE_EVENT,
    PendingAttachmentRecord,
    queueAttachmentUpload,
    listPendingAttachmentsByEntity,
    removePendingAttachment,
    processAttachmentQueue,
    reassignPendingAttachments,
} from '@/utils/offlineAttachments';

interface ProjectFormData {
    name: string;
    description: string;
    client_id: string;
    status: 'active' | 'on_hold' | 'completed' | 'archived' | 'cancelled';
    billing_type: 'hourly' | 'fixed' | 'retainer' | 'maintenance';
    hourly_rate: number;
    daily_rate: number;
    budget: number;
    estimated_hours: number;
    estimated_days: number;
    monthly_amount: number;
    contract_duration: number;
    billing_frequency: 'monthly' | 'quarterly' | 'yearly';
    start_date: string;
    end_date: string;
    color: string;
    is_billable: boolean;
}

const CreateProject: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isOnline = useOnlineStatus();
    const { saveOffline } = useOffline();
    const [searchParams] = useSearchParams();
    const clientIdFromUrl = searchParams.get('client_id') || '';

    const [formData, setFormData] = useState<ProjectFormData>({
        name: '',
        description: '',
        client_id: clientIdFromUrl,
        status: 'active',
        billing_type: 'hourly',
        hourly_rate: 0,
        daily_rate: 0,
        budget: 0,
        estimated_hours: 0,
        estimated_days: 0,
        monthly_amount: 0,
        contract_duration: 12,
        billing_frequency: 'monthly',
        start_date: '',
        end_date: '',
        color: '#3B82F6',
        is_billable: true
    });
    const [draftId] = useState(() => createLocalId());
    const [queuedAttachments, setQueuedAttachments] = useState<PendingAttachmentRecord[]>([]);

    // Initialize client_id from URL parameter
    useEffect(() => {
        if (clientIdFromUrl) {
            setFormData(prev => ({
                ...prev,
                client_id: clientIdFromUrl
            }));
        }
    }, [clientIdFromUrl]);

    const refreshQueuedAttachments = useCallback(() => {
        listPendingAttachmentsByEntity('projects', draftId)
            .then(setQueuedAttachments)
            .catch(() => setQueuedAttachments([]));
    }, [draftId]);

    useEffect(() => {
        refreshQueuedAttachments();
    }, [refreshQueuedAttachments]);

    useEffect(() => {
        const handler = () => refreshQueuedAttachments();
        window.addEventListener(ATTACHMENT_QUEUE_EVENT, handler);
        return () => window.removeEventListener(ATTACHMENT_QUEUE_EVENT, handler);
    }, [refreshQueuedAttachments]);

    const persistProjectToOffline = async (
        payload: Partial<ProjectFormData> & { id?: string },
        offlineDraft: boolean,
        forcedId?: string
    ) => {
        try {
            const tempId = forcedId || payload.id || createLocalId();
            await saveOffline('project', {
                ...payload,
                id: tempId,
                __offline: offlineDraft,
                created_at: payload.created_at || new Date().toISOString(),
            });
        } catch (error) {
            if (import.meta.env.DEV) {
                console.warn('Failed to cache project offline', error);
            }
        }
    };

    // Create project mutation
    const createProjectMutation = useMutation({
        mutationFn: async (data: ProjectFormData) => {
            const response = await axios.post('/projects', data);
            return response.data;
        },
        onSuccess: async (response) => {
            const payload = response?.project || response?.data || response;
            if (payload) {
                await persistProjectToOffline(payload, Boolean(response?.offline));
                if (payload.id) {
                    const pendingQueued = await listPendingAttachmentsByEntity('projects', draftId);
                    if (pendingQueued.length) {
                        await reassignPendingAttachments('projects', draftId, payload.id);
                        await processAttachmentQueue();
                        refreshQueuedAttachments();
                    }
                }
            } else if (!isOnline) {
                await persistProjectToOffline(formData, true, draftId);
            }
            toast.success(t('projects.createSuccess'));
            navigate('/projects');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || t('projects.createError');
            toast.error(message);
        }
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'number') {
            setFormData(prev => ({
                ...prev,
                [name]: parseFloat(value) || 0
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/zip'];
        if (!allowedTypes.includes(file.type)) {
            toast.error(t('projects.invalidAttachmentType') || 'Type de fichier non supporté');
            e.target.value = '';
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error(t('projects.attachmentTooLarge') || 'Fichier trop volumineux (10 MB max)');
            e.target.value = '';
            return;
        }

        try {
            await queueAttachmentUpload({
                entityType: 'projects',
                entityId: draftId,
                file,
            });
            refreshQueuedAttachments();
            toast.success(
                t('projects.attachmentQueued') ||
                'Pièce jointe ajoutée. Elle sera synchronisée après enregistrement.'
            );
        } catch (error) {
            toast.error(t('projects.attachmentQueueError') || 'Impossible d’ajouter la pièce jointe.');
        }

        e.target.value = '';
    };

    const handleRemoveQueuedAttachment = async (attachmentId: string) => {
        await removePendingAttachment(attachmentId);
        refreshQueuedAttachments();
        toast.info(t('projects.attachmentRemoved') || 'Pièce jointe retirée.');
    };

    const handleSyncQueuedAttachments = async () => {
        if (!isOnline) {
            toast.info(t('projects.waitForConnection') || 'Reconnectez-vous pour envoyer les pièces jointes.');
            return;
        }
        await processAttachmentQueue();
        refreshQueuedAttachments();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error(t('projects.nameRequired'));
            return;
        }

        if (!formData.client_id) {
            toast.error(t('projects.clientRequired'));
            return;
        }

        if (!isOnline) {
            const payload = {
                ...formData,
                id: draftId,
                created_at: new Date().toISOString(),
                __offline: true,
            };
            persistProjectToOffline(payload, true, draftId)
                .then(() => {
                    toast.success(
                        t('projects.createSuccess') ||
                        'Projet enregistré hors ligne. Il sera synchronisé automatiquement.'
                    );
                    navigate(`/projects/${draftId}`);
                })
                .catch(() => {
                    toast.error(
                        t('projects.createError') ||
                        'Impossible d’enregistrer le projet hors ligne.'
                    );
                });
            return;
        }

        createProjectMutation.mutate(formData);
    };

    const statusOptions = [
        { value: 'active', label: t('projects.active'), color: 'bg-green-100 text-green-800' },
        { value: 'on_hold', label: t('projects.onHold'), color: 'bg-yellow-100 text-yellow-800' },
        { value: 'completed', label: t('projects.completed'), color: 'bg-blue-100 text-blue-800' },
        { value: 'archived', label: t('projects.archived'), color: 'bg-gray-100 text-gray-800' },
        { value: 'cancelled', label: t('projects.cancelled'), color: 'bg-red-100 text-red-800' }
    ];

    const billingTypeOptions = [
        { value: 'hourly', label: t('projects.hourly') },
        { value: 'fixed', label: t('projects.fixed') },
        { value: 'retainer', label: t('projects.retainer') },
        { value: 'maintenance', label: t('projects.maintenance') }
    ];

    const billingFrequencyOptions = [
        { value: 'monthly', label: t('projects.monthly') },
        { value: 'quarterly', label: t('projects.quarterly') },
        { value: 'yearly', label: t('projects.yearly') }
    ];

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center mb-4">
                    <Link
                        to="/projects"
                        className="flex items-center text-gray-600 hover:text-gray-900 transition mr-4"
                    >
                        <ArrowLeftIcon className="h-5 w-5 mr-1" />
                        <span>{t('projects.backToProjects')}</span>
                    </Link>
                </div>
                <div className="flex items-center">
                    <FolderIcon className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('projects.newProject')}</h1>
                        <p className="text-gray-600">{t('projects.createProjectDescription')}</p>
                    </div>
                </div>
            </div>

            {!isOnline && (
                <div className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 border border-amber-200">
                    {t('projects.offlineFormInfo') ||
                        'Vous pouvez continuer à créer des projets hors ligne. Ils seront synchronisés dès que la connexion reviendra.'}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('projects.generalInfo')}</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('projects.projectName')} *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={t('projects.enterProjectName')}
                                required
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('projects.description')}
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={t('projects.describeProject')}
                            />
                        </div>

                        <div>
                            <ClientSearchSelect
                                value={formData.client_id}
                                onChange={(clientId) => setFormData(prev => ({ ...prev, client_id: clientId }))}
                                label={t('projects.client')}
                                placeholder={t('projects.selectClient') || 'Sélectionner un client...'}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('projects.status')}
                            </label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {statusOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('projects.billingType')}
                            </label>
                            <select
                                name="billing_type"
                                value={formData.billing_type}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {billingTypeOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('projects.color')}
                            </label>
                            <input
                                type="color"
                                name="color"
                                value={formData.color}
                                onChange={handleInputChange}
                                className="w-full h-10 px-1 py-1 border border-gray-300 rounded-lg"
                            />
                        </div>
                    </div>
                </div>

                {/* Financial Information */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <CurrencyEuroIcon className="h-5 w-5 mr-2" />
                        {t('projects.financialInfo')}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Hourly - Taux horaire */}
                        {formData.billing_type === 'hourly' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.hourlyRate')} (€) *
                                    </label>
                                    <input
                                        type="number"
                                        name="hourly_rate"
                                        value={formData.hourly_rate}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.estimatedHours')}
                                    </label>
                                    <input
                                        type="number"
                                        name="estimated_hours"
                                        value={formData.estimated_hours}
                                        onChange={handleInputChange}
                                        step="0.5"
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.budget')} (€)
                                    </label>
                                    <input
                                        type="number"
                                        name="budget"
                                        value={formData.budget}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="0.00"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">{t('projects.optionalBudget')}</p>
                                </div>
                            </>
                        )}

                        {/* Fixed - Forfait / TJM */}
                        {formData.billing_type === 'fixed' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.dailyRate')} (€) *
                                    </label>
                                    <input
                                        type="number"
                                        name="daily_rate"
                                        value={formData.daily_rate}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="0.00"
                                        required
                                    />
                                    <p className="mt-1 text-xs text-gray-500">{t('projects.tjmHelp')}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.estimatedDays')}
                                    </label>
                                    <input
                                        type="number"
                                        name="estimated_days"
                                        value={formData.estimated_days}
                                        onChange={handleInputChange}
                                        step="0.5"
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.totalBudget')} (€)
                                    </label>
                                    <input
                                        type="number"
                                        name="budget"
                                        value={formData.budget}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="0.00"
                                    />
                                </div>
                            </>
                        )}

                        {/* Retainer - Abonnement */}
                        {formData.billing_type === 'retainer' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.monthlyAmount')} (€) *
                                    </label>
                                    <input
                                        type="number"
                                        name="monthly_amount"
                                        value={formData.monthly_amount}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.contractDuration')} ({t('projects.months')})
                                    </label>
                                    <input
                                        type="number"
                                        name="contract_duration"
                                        value={formData.contract_duration}
                                        onChange={handleInputChange}
                                        step="1"
                                        min="1"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="12"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.billingFrequency')}
                                    </label>
                                    <select
                                        name="billing_frequency"
                                        value={formData.billing_frequency}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        {billingFrequencyOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        {/* Maintenance */}
                        {formData.billing_type === 'maintenance' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.maintenanceFee')} (€) *
                                    </label>
                                    <input
                                        type="number"
                                        name="monthly_amount"
                                        value={formData.monthly_amount}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.billingFrequency')}
                                    </label>
                                    <select
                                        name="billing_frequency"
                                        value={formData.billing_frequency}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        {billingFrequencyOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.estimatedHours')}
                                    </label>
                                    <input
                                        type="number"
                                        name="estimated_hours"
                                        value={formData.estimated_hours}
                                        onChange={handleInputChange}
                                        step="0.5"
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="0"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">{t('projects.monthlyHoursHelp')}</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Dates */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <CalendarIcon className="h-5 w-5 mr-2" />
                        {t('projects.dates')}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('projects.startDate')}
                            </label>
                            <input
                                type="date"
                                name="start_date"
                                value={formData.start_date}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('projects.endDate')}
                            </label>
                            <input
                                type="date"
                                name="end_date"
                                value={formData.end_date}
                                onChange={handleInputChange}
                                min={formData.start_date}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Attachments */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <DocumentIcon className="h-5 w-5 mr-2" />
                        {t('projects.attachments') || 'Pièces jointes'}
                    </h2>

                    {queuedAttachments.length > 0 && (
                        <div className="mb-4 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-amber-900">
                                    {t('projects.queuedAttachments') || 'Fichiers en attente'}
                                </p>
                                <button
                                    type="button"
                                    onClick={handleSyncQueuedAttachments}
                                    className="text-xs font-semibold text-amber-800 hover:underline"
                                >
                                    {isOnline
                                        ? (t('projects.syncNow') || 'Synchroniser maintenant')
                                        : (t('projects.waitForConnection') || 'En attente de connexion')}
                                </button>
                            </div>
                            <ul className="space-y-2 text-sm text-amber-900">
                                {queuedAttachments.map((attachment) => (
                                    <li
                                        key={attachment.id}
                                        className="flex items-center justify-between rounded bg-white/80 px-3 py-2"
                                    >
                                        <div>
                                            <p className="font-medium">{attachment.fileName}</p>
                                            <p className="text-xs text-amber-600">
                                                {(attachment.size / 1024).toFixed(1)} KB • {attachment.mimeType}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveQueuedAttachment(attachment.id)}
                                            className="text-xs text-amber-700 hover:text-amber-900"
                                        >
                                            {t('common.remove') || 'Retirer'}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('projects.addAttachment') || 'Ajouter une pièce jointe'}
                        </label>
                        <div className="flex items-center justify-center w-full">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <PhotoIcon className="w-8 h-8 mb-3 text-gray-400" />
                                    <p className="mb-2 text-sm text-gray-500">
                                        <span className="font-semibold">{t('projects.clickToUpload') || 'Cliquez pour téléverser'}</span> {t('projects.orDragDrop') || 'ou glissez-déposez'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {t('projects.attachmentHint') || 'Images, PDF ou ZIP — 10 MB max'}
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*,.pdf,.zip"
                                    onChange={handleAttachmentUpload}
                                />
                            </label>
                        </div>
                        {!isOnline && (
                            <p className="mt-3 text-sm text-amber-600">
                                {t('projects.attachmentsOfflineHelp') ||
                                    'Les pièces jointes sont stockées localement et seront envoyées automatiquement après synchronisation.'}
                            </p>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4">
                    <Link
                        to="/projects"
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    >
                        {t('common.cancel')}
                    </Link>
                    <button
                        type="submit"
                        disabled={createProjectMutation.isPending}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center"
                    >
                        {createProjectMutation.isPending ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                {t('projects.creating')}
                            </>
                        ) : (
                            <>
                                <CheckCircleIcon className="h-5 w-5 mr-2" />
                                {t('projects.createProject')}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateProject;
