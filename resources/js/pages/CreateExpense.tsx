import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
    ArrowLeftIcon,
    BanknotesIcon,
    DocumentIcon,
    CheckCircleIcon,
    PhotoIcon
} from '@heroicons/react/24/outline';
import { Project, PaginatedResponse } from '../types';
import { useOffline } from '@/contexts/OfflineContext';
import { useAuth } from '@/contexts/AuthContext';
import { createLocalId } from '@/utils/offlineDB';
import {
    ATTACHMENT_QUEUE_EVENT,
    PendingAttachmentRecord,
    listPendingAttachmentsByEntity,
    queueAttachmentUpload,
    removePendingAttachment,
    processAttachmentQueue,
} from '@/utils/offlineAttachments';

interface ExpenseFormData {
    description: string;
    amount: number;
    expense_date: string;
    category: string;
    vendor: string;
    project_id: string;
    billable: boolean;
    notes: string;
    receipt: File | null;
}

const CreateExpense: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isOnline, saveOffline, getOfflineData, offlineDB } = useOffline();
    const { user } = useAuth();
    const [formData, setFormData] = useState<ExpenseFormData>({
        description: '',
        amount: 0,
        expense_date: new Date().toISOString().split('T')[0],
        category: '',
        vendor: '',
        project_id: '',
        billable: true,
        notes: '',
        receipt: null
    });

    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [offlineProjects, setOfflineProjects] = useState<Project[]>([]);
    const [offlineCategories, setOfflineCategories] = useState<any[]>([]);
    const [draftId] = useState(() => createLocalId());
    const [queuedAttachments, setQueuedAttachments] = useState<PendingAttachmentRecord[]>([]);

    // Fetch expense categories
    const { data: categoriesData } = useQuery<PaginatedResponse<any>>({
        queryKey: ['expense-categories'],
        queryFn: async () => {
            const response = await axios.get('/expense-categories');
            return response.data;
        },
        enabled: isOnline,
    });

    // Fetch projects for dropdown
    const { data: projectsData } = useQuery<PaginatedResponse<Project>>({
        queryKey: ['projects'],
        queryFn: async () => {
            const response = await axios.get('/projects');
            return response.data;
        },
        enabled: isOnline,
    });

    useEffect(() => {
        getOfflineData('projects')
            .then((data) => {
                const normalized: Project[] = Array.isArray(data) ? data : data ? [data] : [];
                setOfflineProjects(normalized);
            })
            .catch(() => setOfflineProjects([]));

        getOfflineData('expenseCategories')
            .then((data) => {
                const normalized = Array.isArray(data) ? data : data ? [data] : [];
                setOfflineCategories(normalized);
            })
            .catch(() => setOfflineCategories([]));
    }, [getOfflineData]);

    useEffect(() => {
        if (!projectsData?.data?.length || !offlineDB) {
            return;
        }
        projectsData.data.forEach((project: Project) => {
            if (!project) return;
            offlineDB.save('project', project).catch(() => undefined);
        });
    }, [projectsData, offlineDB]);

    useEffect(() => {
        if (!categoriesData?.data?.length || !offlineDB) {
            return;
        }
        categoriesData.data.forEach((category: any) => {
            if (!category) return;
            offlineDB.save('expenseCategory', category).catch(() => undefined);
        });
    }, [categoriesData, offlineDB]);

    const refreshQueuedAttachments = useCallback(() => {
        listPendingAttachmentsByEntity('expenses', draftId)
            .then(setQueuedAttachments)
            .catch(() => setQueuedAttachments([]));
    }, [draftId]);

    useEffect(() => {
        refreshQueuedAttachments();
    }, [refreshQueuedAttachments]);

    useEffect(() => {
        const listener = () => refreshQueuedAttachments();
        window.addEventListener(ATTACHMENT_QUEUE_EVENT, listener);
        return () => window.removeEventListener(ATTACHMENT_QUEUE_EVENT, listener);
    }, [refreshQueuedAttachments]);

    // Create expense mutation
    const createExpenseMutation = useMutation({
        mutationFn: async (data: ExpenseFormData) => {
            const formDataToSend = new FormData();
            
            // Append all form fields
            Object.keys(data).forEach(key => {
                if (key !== 'receipt' && data[key as keyof ExpenseFormData] !== null) {
                    formDataToSend.append(key, String(data[key as keyof ExpenseFormData]));
                }
            });
            
            // Append receipt if exists
            if (data.receipt) {
                formDataToSend.append('receipt', data.receipt);
            }
            
            const response = await axios.post('/expenses', formDataToSend, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        },
        onSuccess: (response) => {
            toast.success(t('expenses.createSuccess'));
            navigate(`/expenses/${response.expense.id}`);
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || t('expenses.createError');
            toast.error(message);
        }
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const target = e.target as HTMLInputElement;
        const { name, value, type } = target;
        const checked = target.type === 'checkbox' ? target.checked : false;
        
        if (type === 'checkbox') {
            setFormData(prev => ({
                ...prev,
                [name]: checked
            }));
        } else if (type === 'number') {
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

    const categoryOptions = useMemo(() => {
        const map = new Map<string, any>();
        (categoriesData?.data ?? []).forEach((category: any) => {
            if (category) {
                map.set(String(category.id), category);
            }
        });
        offlineCategories.forEach((category: any) => {
            if (category) {
                map.set(String(category.id), category);
            }
        });
        return Array.from(map.values());
    }, [categoriesData, offlineCategories]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            toast.error(t('expenses.invalidFileType'));
            e.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error(t('expenses.fileSizeError'));
            e.target.value = '';
            return;
        }

        if (!isOnline) {
            try {
                await queueAttachmentUpload({
                    entityType: 'expenses',
                    entityId: draftId,
                    file,
                });
                refreshQueuedAttachments();
                toast.success(
                    t('expenses.attachmentQueued') ||
                    'Justificatif enregistré hors ligne. Il sera envoyé automatiquement.'
                );
            } catch (error) {
                toast.error(
                    t('expenses.attachmentQueueError') ||
                    'Impossible d’enregistrer le justificatif hors ligne.'
                );
            }
            e.target.value = '';
            return;
        }

        setFormData(prev => ({
            ...prev,
            receipt: file
        }));

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setReceiptPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setReceiptPreview(null);
        }
    };

    const removeReceipt = () => {
        setFormData(prev => ({
            ...prev,
            receipt: null
        }));
        setReceiptPreview(null);
    };

    const handleRemoveQueuedAttachment = async (attachmentId: string) => {
        await removePendingAttachment(attachmentId);
        refreshQueuedAttachments();
        toast.info(
            t('expenses.attachmentRemoved') ||
            'Justificatif retiré de la file d’attente.'
        );
    };

    const handleSyncQueuedAttachments = async () => {
        if (!isOnline) {
            toast.info(
                t('expenses.syncWhenOnline') ||
                'Reconnectez-vous pour envoyer les justificatifs.'
            );
            return;
        }
        await processAttachmentQueue();
        refreshQueuedAttachments();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.description.trim()) {
            toast.error(t('expenses.descriptionRequired'));
            return;
        }

        if (formData.amount <= 0) {
            toast.error(t('expenses.amountRequired'));
            return;
        }

        if (!formData.expense_date) {
            toast.error(t('expenses.dateRequired'));
            return;
        }

        if (!isOnline) {
            try {
                await saveOffline('expense', {
                    id: draftId,
                    description: formData.description,
                    amount: Number(formData.amount),
                    expense_date: formData.expense_date,
                    category_id: formData.category,
                    vendor: formData.vendor,
                    project_id: formData.project_id || null,
                    is_billable: formData.billable,
                    notes: formData.notes,
                    user_id: user?.id || null,
                    synced: false,
                    __offline: true,
                });
                toast.success(
                    t('expenses.offlineQueued') ||
                    'Dépense enregistrée hors ligne. Elle sera synchronisée automatiquement.'
                );
                navigate('/expenses');
            } catch (error) {
                console.error('Failed to save offline expense', error);
                toast.error(
                    t('expenses.offlineSaveError') ||
                    'Impossible d’enregistrer la dépense hors ligne.'
                );
            }
            return;
        }

        createExpenseMutation.mutate(formData);
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center mb-4">
                    <Link
                        to="/expenses"
                        className="flex items-center text-gray-600 hover:text-gray-900 transition mr-4"
                    >
                        <ArrowLeftIcon className="h-5 w-5 mr-1" />
                        <span>{t('expenses.backToExpenses')}</span>
                    </Link>
                </div>
                <div className="flex items-center">
                    <BanknotesIcon className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('expenses.newExpense')}</h1>
                        <p className="text-gray-600">{t('expenses.newExpenseDescription')}</p>
                    </div>
                </div>
            </div>

            {!isOnline && (
                <div className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 border border-amber-200">
                    {t('expenses.offlineFormInfo') ||
                        'Vous êtes hors ligne. Les dépenses seront synchronisées automatiquement dès que la connexion reviendra. Ajoutez les justificatifs plus tard si nécessaire.'}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('expenses.generalInfo')}</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('expenses.description')} *
                            </label>
                            <input
                                type="text"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={t('expenses.descriptionPlaceholder')}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('expenses.amount')} (€) *
                            </label>
                            <input
                                type="number"
                                name="amount"
                                value={formData.amount}
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
                                {t('expenses.expenseDate')} *
                            </label>
                            <input
                                type="date"
                                name="expense_date"
                                value={formData.expense_date}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('expenses.category')}
                            </label>
                            <input
                                type="text"
                                name="category"
                                value={formData.category}
                                onChange={handleInputChange}
                                list="expense-category-options"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={t('expenses.categoryPlaceholder')}
                            />
                            <datalist id="expense-category-options">
                                {categoryOptions?.map((category: any) => (
                                    <option key={category.id} value={category.name} />
                                ))}
                            </datalist>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('expenses.vendor')}
                            </label>
                            <input
                                type="text"
                                name="vendor"
                                value={formData.vendor}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={t('expenses.vendorPlaceholder')}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('expenses.project')}
                            </label>
                            <select
                                name="project_id"
                                value={formData.project_id}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">{t('expenses.selectProject')}</option>
                                {(isOnline ? projectsData?.data : offlineProjects)?.map(project => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Options */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('expenses.options')}</h2>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="billable"
                            name="billable"
                            checked={formData.billable}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="billable" className="ml-2 block text-sm text-gray-900">
                            {t('expenses.billableToClient')}
                        </label>
                    </div>
                </div>

                {/* Receipt */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <DocumentIcon className="h-5 w-5 mr-2" />
                        {t('expenses.receipt')}
                    </h2>

                    <div className="space-y-4">
                        {queuedAttachments.length > 0 && (
                            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium text-amber-900">
                                        {t('expenses.queuedReceipts') || 'Justificatifs en attente'}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleSyncQueuedAttachments}
                                        className="text-xs font-semibold text-amber-800 hover:underline"
                                    >
                                        {isOnline
                                            ? (t('expenses.syncNow') || 'Synchroniser maintenant')
                                            : (t('expenses.waitForConnection') || 'En attente de connexion')}
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
                                {t('expenses.uploadReceipt')}
                            </label>
                            <div className="flex items-center justify-center w-full">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <PhotoIcon className="w-8 h-8 mb-3 text-gray-400" />
                                        <p className="mb-2 text-sm text-gray-500">
                                            <span className="font-semibold">{t('expenses.clickToUpload')}</span> {t('expenses.orDragDrop')}
                                        </p>
                                        <p className="text-xs text-gray-500">{t('expenses.fileTypeHint')}</p>
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*,.pdf"
                                        onChange={handleFileChange}
                                    />
                                </label>
                            </div>
                            {!isOnline && (
                                <p className="mt-3 text-sm text-amber-600">
                                    {t('expenses.offlineAttachmentInfo') ||
                                        'Les justificatifs sélectionnés hors ligne sont enregistrés localement et seront envoyés automatiquement.'}
                                </p>
                            )}
                        </div>

                        {formData.receipt && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center">
                                        <DocumentIcon className="h-8 w-8 text-gray-400 mr-3" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {formData.receipt.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {(formData.receipt.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={removeReceipt}
                                        className="text-red-600 hover:text-red-800 transition-colors"
                                    >
                                        {t('common.delete')}
                                    </button>
                                </div>

                                {receiptPreview && (
                                    <div className="mt-4">
                                        <img
                                            src={receiptPreview}
                                            alt={t('expenses.receiptPreview')}
                                            className="max-w-full h-auto rounded-lg shadow-md"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Notes */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('expenses.notes')}</h2>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('expenses.additionalNotes')}
                        </label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={t('expenses.notesPlaceholder')}
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4">
                    <Link
                        to="/expenses"
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    >
                        {t('common.cancel')}
                    </Link>
                    <button
                        type="submit"
                        disabled={createExpenseMutation.isPending}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center"
                    >
                        {createExpenseMutation.isPending ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                {t('common.creating')}
                            </>
                        ) : (
                            <>
                                <CheckCircleIcon className="h-5 w-5 mr-2" />
                                {t('expenses.createExpense')}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateExpense;
