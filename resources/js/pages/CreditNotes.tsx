import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
    MagnifyingGlassIcon,
    DocumentMinusIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CreditNote {
    id: number;
    credit_note_number: string;
    invoice_id: number;
    invoice_number: string;
    type: 'total' | 'partial';
    amount: number;
    reason: string;
    date: string;
    client?: {
        name: string;
    };
}

const CreditNotes: React.FC = () => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');

    const { data: creditNotes, isLoading } = useQuery({
        queryKey: ['credit-notes', searchTerm],
        queryFn: async () => {
            const response = await axios.get('/credit-notes', {
                params: {
                    search: searchTerm || undefined,
                },
            });
            return response.data.data;
        },
    });

    const getTypeBadge = (type: 'total' | 'partial') => {
        if (type === 'total') {
            return (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                    {t('creditNotes.totalCredit', 'Avoir total')}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                {t('creditNotes.partialCredit', 'Avoir partiel')}
            </span>
        );
    };

    return (
        <div className="p-6">
            <div className="mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {t('creditNotes.title', 'Avoirs')}
                        </h1>
                        <p className="mt-2 text-gray-600">
                            {t('creditNotes.subtitle', 'Gestion des avoirs et remboursements')}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex-1 relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t('creditNotes.searchPlaceholder', 'Rechercher un avoir...')}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">{t('common.loading', 'Chargement...')}</p>
                </div>
            ) : creditNotes?.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <DocumentMinusIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {t('creditNotes.noCreditNotes', 'Aucun avoir')}
                    </h3>
                    <p className="text-gray-600 mb-6">
                        {t('creditNotes.noCreditNotesDesc', 'Les avoirs créés apparaîtront ici')}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('creditNotes.number', 'Numéro')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('creditNotes.invoice', 'Facture')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('creditNotes.client', 'Client')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('creditNotes.type', 'Type')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('creditNotes.date', 'Date')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('creditNotes.amount', 'Montant')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('creditNotes.reason', 'Motif')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {creditNotes?.map((creditNote: CreditNote) => (
                                <tr
                                    key={creditNote.id}
                                    onClick={() => window.location.href = `/credit-notes/${creditNote.id}`}
                                    className="hover:bg-gray-50 cursor-pointer transition"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {creditNote.credit_note_number}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <Link
                                            to={`/invoices/${creditNote.invoice_id}`}
                                            className="text-blue-600 hover:text-blue-800"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {creditNote.invoice_number}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {creditNote.client?.name || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getTypeBadge(creditNote.type)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {creditNote.date ? format(new Date(creditNote.date), 'dd MMM yyyy', { locale: fr }) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                                        - {new Intl.NumberFormat('fr-FR', {
                                            style: 'currency',
                                            currency: 'EUR',
                                        }).format(creditNote.amount || 0)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                                        {creditNote.reason}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default CreditNotes;
