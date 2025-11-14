import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import {
    PlusIcon,
    MagnifyingGlassIcon,
    DocumentTextIcon,
    ReceiptPercentIcon,
    ClipboardDocumentCheckIcon,
    DocumentMinusIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { InvoiceType } from '../types';

interface Invoice {
    id: number;
    invoice_number: string;
    client_id: number;
    status: string;
    type: InvoiceType;
    date: string;
    due_date: string;
    total: number;
    advance_percentage?: number;
    credit_notes_sum_total?: number;
    client?: {
        name: string;
    };
}

const Invoices: React.FC = () => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Check PDP configuration
    const { data: pdpConfig } = useQuery({
        queryKey: ['pdp-config'],
        queryFn: async () => {
            const response = await axios.get('/settings/pdp/config');
            return response.data;
        },
    });

    // Check invoicing compliance (FacturX requirements)
    const { data: complianceStatus, isLoading: isLoadingCompliance } = useQuery({
        queryKey: ['invoicing-compliance'],
        queryFn: async () => {
            const response = await axios.get('/settings/invoicing-compliance-status');
            return response.data;
        },
    });

    const { data: invoices, isLoading } = useQuery({
        queryKey: ['invoices', searchTerm, statusFilter],
        queryFn: async () => {
            const response = await axios.get('/invoices', {
                params: {
                    search: searchTerm,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                },
            });
            return response.data.data;
        },
    });

    const getStatusBadge = (status: string) => {
        const statusClassMap: Record<string, string> = {
            draft: 'invoice-status-draft',
            sent: 'invoice-status-sent',
            paid: 'invoice-status-paid',
            overdue: 'invoice-status-overdue',
            cancelled: 'invoice-status-cancelled',
        };

        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClassMap[status] || 'invoice-status-draft'}`}>
                {t(`invoices.statuses.${status}`, status)}
            </span>
        );
    };

    const getTypeBadge = (type: InvoiceType, advancePercentage?: number) => {
        const typeConfig = {
            invoice: {
                label: 'Facture',
                className: 'invoice-type-invoice',
                icon: DocumentTextIcon,
            },
            advance: {
                label: 'Acompte',
                className: 'invoice-type-advance',
                icon: ReceiptPercentIcon,
            },
            final: {
                label: 'Solde',
                className: 'invoice-type-final',
                icon: ClipboardDocumentCheckIcon,
            },
            credit_note: {
                label: 'Avoir',
                className: 'invoice-type-credit',
                icon: DocumentMinusIcon,
            },
            quote: {
                label: 'Devis',
                className: 'invoice-type-quote',
                icon: DocumentTextIcon,
            },
            recurring: {
                label: 'Récurrent',
                className: 'invoice-type-recurring',
                icon: DocumentTextIcon,
            },
        };

        const config = typeConfig[type] || typeConfig.invoice;
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
                <Icon className="w-3 h-3 mr-1" />
                {config.label}
                {type === 'advance' && advancePercentage && (
                    <span className="ml-1">({advancePercentage}%)</span>
                )}
            </span>
        );
    };

    return (
        <>
            <style>
                {`
                    /* Status badges */
                    .invoice-status-draft {
                        background-color: #4b5563 !important;
                        color: #ffffff !important;
                    }
                    .invoice-status-sent {
                        background-color: #2563eb !important;
                        color: #ffffff !important;
                    }
                    .invoice-status-paid {
                        background-color: #16a34a !important;
                        color: #ffffff !important;
                    }
                    .invoice-status-overdue {
                        background-color: #dc2626 !important;
                        color: #ffffff !important;
                    }
                    .invoice-status-cancelled {
                        background-color: #374151 !important;
                        color: #ffffff !important;
                    }

                    /* Type badges */
                    .invoice-type-invoice {
                        background-color: #2563eb !important;
                        color: #ffffff !important;
                    }
                    .invoice-type-advance {
                        background-color: #16a34a !important;
                        color: #ffffff !important;
                    }
                    .invoice-type-final {
                        background-color: #9333ea !important;
                        color: #ffffff !important;
                    }
                    .invoice-type-credit {
                        background-color: #dc2626 !important;
                        color: #ffffff !important;
                    }
                    .invoice-type-quote {
                        background-color: #ca8a04 !important;
                        color: #ffffff !important;
                    }
                    .invoice-type-recurring {
                        background-color: #4f46e5 !important;
                        color: #ffffff !important;
                    }
                `}
            </style>
            <div className="p-6">
                {/* PDP Configuration Alert */}
            {pdpConfig && !pdpConfig.configured && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">
                                PDP Non Configuré
                            </h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>
                                    Le Portail Public de Facturation n'est pas configuré pour votre entreprise. 
                                    La facturation électronique B2B est obligatoire en France.
                                </p>
                                <div className="mt-3">
                                    <Link
                                        to="/settings"
                                        className="font-medium text-red-800 underline hover:text-red-900"
                                    >
                                        Configurer le PDP maintenant →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('invoices.title')}</h1>
                        <p className="mt-2 text-gray-600">{t('invoices.subtitle')}</p>
                    </div>
                    {complianceStatus?.can_create_invoice ? (
                        <Link
                            to="/invoices/new"
                            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                        >
                            <PlusIcon className="h-5 w-5" />
                            <span>{t('invoices.newInvoice')}</span>
                        </Link>
                    ) : (
                        <div className="flex items-center space-x-3">
                            <div className="text-right mr-2">
                                <p className="text-sm font-medium text-red-600">Paramètres incomplets</p>
                                <p className="text-xs text-gray-500">Configuration FacturX requise</p>
                            </div>
                            <Link
                                to="/settings/billing"
                                className="flex items-center space-x-2 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition"
                            >
                                <ExclamationTriangleIcon className="h-5 w-5" />
                                <span>Compléter les paramètres</span>
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
                    <div className="flex-1 relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t('invoices.searchPlaceholder')}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">{t('invoices.allStatuses')}</option>
                        <option value="draft">{t('invoices.statuses.draft')}</option>
                        <option value="sent">{t('invoices.statuses.sent')}</option>
                        <option value="paid">{t('invoices.statuses.paid')}</option>
                        <option value="overdue">{t('invoices.statuses.overdue')}</option>
                        <option value="cancelled">{t('invoices.statuses.cancelled')}</option>
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">{t('common.loading')}</p>
                </div>
            ) : invoices?.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('invoices.noInvoices')}</h3>
                    <p className="text-gray-600 mb-6">{t('invoices.createFirstInvoice')}</p>
                    {complianceStatus?.can_create_invoice ? (
                        <Link
                            to="/invoices/new"
                            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                        >
                            <PlusIcon className="h-5 w-5" />
                            <span>{t('invoices.createInvoice')}</span>
                        </Link>
                    ) : (
                        <div className="inline-flex flex-col items-center">
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 max-w-md">
                                <div className="flex items-start">
                                    <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 mr-3 flex-shrink-0 mt-0.5" />
                                    <div className="text-left">
                                        <h4 className="font-medium text-orange-900 mb-1">Configuration FacturX requise</h4>
                                        <p className="text-sm text-orange-700">
                                            Complétez vos paramètres de facturation pour créer des factures conformes EN 16931.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <Link
                                to="/settings/billing"
                                className="inline-flex items-center space-x-2 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition"
                            >
                                <span>Compléter les paramètres de facturation</span>
                            </Link>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('invoices.number')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('invoices.client')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('invoices.issueDate')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('invoices.dueDate')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('invoices.amount')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Avoir
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('invoices.statusLabel')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {invoices?.map((invoice: Invoice) => (
                                <tr
                                    key={invoice.id}
                                    onClick={() => window.location.href = `/invoices/${invoice.id}`}
                                    className="hover:bg-gray-50 cursor-pointer transition"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {invoice.invoice_number}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {invoice.client?.name || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getTypeBadge(invoice.type || 'invoice', invoice.advance_percentage)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {invoice.date ? format(new Date(invoice.date), 'dd MMM yyyy', { locale: fr }) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {invoice.due_date ? format(new Date(invoice.due_date), 'dd MMM yyyy', { locale: fr }) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                        {new Intl.NumberFormat('fr-FR', {
                                            style: 'currency',
                                            currency: 'EUR',
                                        }).format(invoice.total || 0)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                                        {invoice.credit_notes_sum_total && invoice.credit_notes_sum_total > 0 ? (
                                            <span className="flex items-center">
                                                <DocumentMinusIcon className="h-4 w-4 mr-1" />
                                                -{new Intl.NumberFormat('fr-FR', {
                                                    style: 'currency',
                                                    currency: 'EUR',
                                                }).format(invoice.credit_notes_sum_total)}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(invoice.status)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            </div>
        </>
    );
};

export default Invoices;
