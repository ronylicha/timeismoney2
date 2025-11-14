import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import AttachmentManager from '../components/Attachments/AttachmentManager';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useOffline } from '@/contexts/OfflineContext';

const ExpenseDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const { isOnline, getOfflineData } = useOffline();
    const [offlineExpense, setOfflineExpense] = useState<any>(null);

    const shouldFetchOnline = !!id && isOnline && !(id?.startsWith('local_'));

    const { data: expense, isLoading } = useQuery({
        queryKey: ['expense', id],
        queryFn: async () => {
            const response = await axios.get(`/expenses/${id}`);
            return response.data.data || response.data;
        },
        enabled: shouldFetchOnline,
    });

    useEffect(() => {
        if (!shouldFetchOnline && id) {
            getOfflineData('expenses', id)
                .then((data) => setOfflineExpense(data || null))
                .catch(() => setOfflineExpense(null));
        }
    }, [shouldFetchOnline, id, getOfflineData]);

    const resolvedExpense = shouldFetchOnline ? expense : offlineExpense;

    if ((isLoading && shouldFetchOnline) || (!resolvedExpense && !shouldFetchOnline)) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!resolvedExpense) {
        return (
            <div className="p-6">
                <div className="bg-white rounded-lg shadow p-10 text-center">
                    <p className="text-gray-600 mb-4">
                        {t('expenses.notFound') || 'Dépense introuvable'}
                    </p>
                    <Link
                        to="/expenses"
                        className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                        <span>{t('expenses.backToList') || 'Retour à la liste'}</span>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Link
                        to="/expenses"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-3"
                    >
                        <ArrowLeftIcon className="h-4 w-4 mr-1" />
                        {t('expenses.backToList') || 'Retour'}
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">{resolvedExpense.description}</h1>
                    <p className="text-gray-500">
                        {resolvedExpense.expense_date
                            ? format(new Date(resolvedExpense.expense_date), 'dd MMMM yyyy', { locale: fr })
                            : ''}
                    </p>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                    {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                    }).format(resolvedExpense.amount || 0)}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">
                    {t('expenses.details') || 'Détails'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-gray-500">{t('expenses.vendor') || 'Fournisseur'}</p>
                        <p className="text-gray-900">{resolvedExpense.vendor || '—'}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">{t('expenses.category') || 'Catégorie'}</p>
                        <p className="text-gray-900">{resolvedExpense.category?.name || resolvedExpense.category_name || '—'}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">{t('expenses.project') || 'Projet'}</p>
                        <p className="text-gray-900">{resolvedExpense.project?.name || resolvedExpense.project_name || '—'}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">{t('expenses.status') || 'Statut'}</p>
                        <p className="text-gray-900">{resolvedExpense.status || 'pending'}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <AttachmentManager
                    entityType="expenses"
                    entityId={String(resolvedExpense?.id || id || '')}
                />
            </div>
        </div>
    );
};

export default ExpenseDetail;
