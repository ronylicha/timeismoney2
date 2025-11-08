import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeftIcon,
    PencilIcon,
    TrashIcon,
    DocumentArrowDownIcon,
    PaperAirplaneIcon,
    CheckCircleIcon,
    XCircleIcon,
    PrinterIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Invoice {
    id: number;
    invoice_number: string;
    client_id: number;
    status: string;
    issue_date: string;
    due_date: string;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    total_amount: number;
    notes: string | null;
    client?: {
        id: number;
        name: string;
        email: string;
        company: string | null;
        address: string | null;
    };
    items?: InvoiceItem[];
}

interface InvoiceItem {
    id: number;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
}

const InvoiceDetail: React.FC = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const isNewInvoice = !id || id === 'new';

    // Fetch invoice details (skip if creating new invoice)
    const { data: invoice, isLoading } = useQuery({
        queryKey: ['invoice', id],
        queryFn: async () => {
            const response = await axios.get(`/invoices/${id}`);
            return response.data.data;
        },
        enabled: !isNewInvoice, // Only fetch if we have a valid ID
    });

    // Update status mutation
    const updateStatusMutation = useMutation({
        mutationFn: async (status: string) => {
            const response = await axios.patch(`/invoices/${id}`, { status });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoice', id] });
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            toast.success(t('invoices.statusUpdated'));
        },
        onError: () => {
            toast.error(t('invoices.statusUpdateError'));
        },
    });

    // Delete invoice mutation
    const deleteInvoiceMutation = useMutation({
        mutationFn: async () => {
            await axios.delete(`/invoices/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            toast.success(t('invoices.deleteSuccess'));
            navigate('/invoices');
        },
        onError: () => {
            toast.error(t('invoices.deleteError'));
        },
    });

    // Download PDF mutation
    const downloadPdfMutation = useMutation({
        mutationFn: async () => {
            const response = await axios.get(`/invoices/${id}/pdf`, {
                responseType: 'blob',
            });
            return response.data;
        },
        onSuccess: (data) => {
            const url = window.URL.createObjectURL(new Blob([data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `facture-${invoice?.invoice_number}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success(t('invoices.downloadSuccess'));
        },
        onError: () => {
            toast.error(t('invoices.downloadError'));
        },
    });

    // Send invoice mutation
    const sendInvoiceMutation = useMutation({
        mutationFn: async () => {
            await axios.post(`/invoices/${id}/send`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoice', id] });
            toast.success(t('invoices.sendSuccess'));
        },
        onError: () => {
            toast.error(t('invoices.sendError'));
        },
    });

    const getStatusBadge = (status: string) => {
        const colors = {
            draft: 'bg-gray-100 text-gray-800',
            sent: 'bg-blue-100 text-blue-800',
            paid: 'bg-green-100 text-green-800',
            overdue: 'bg-red-100 text-red-800',
            cancelled: 'bg-red-100 text-red-800',
        };

        const labels = {
            draft: t('invoices.status.draft'),
            sent: t('invoices.status.sent'),
            paid: t('invoices.status.paid'),
            overdue: t('invoices.status.overdue'),
            cancelled: t('invoices.status.cancelled'),
        };

        return (
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
                {labels[status as keyof typeof labels] || status}
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="p-6">
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('invoices.notFound')}</h3>
                    <p className="text-gray-600 mb-6">{t('invoices.notFoundDescription')}</p>
                    <Link
                        to="/invoices"
                        className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                        <span>{t('invoices.backToInvoices')}</span>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center mb-4">
                    <Link
                        to="/invoices"
                        className="flex items-center text-gray-600 hover:text-gray-900 transition mr-4"
                    >
                        <ArrowLeftIcon className="h-5 w-5 mr-1" />
                        <span>{t('common.back')}</span>
                    </Link>
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <div className="flex items-center space-x-4 mb-4 md:mb-0">
                        <h1 className="text-3xl font-bold text-gray-900">{invoice.invoice_number}</h1>
                        {getStatusBadge(invoice.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {invoice.status === 'draft' && (
                            <>
                                <Link
                                    to={`/invoices/${id}/edit`}
                                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                                >
                                    <PencilIcon className="h-4 w-4" />
                                    <span>{t('common.edit')}</span>
                                </Link>
                                <button
                                    onClick={() => sendInvoiceMutation.mutate()}
                                    disabled={sendInvoiceMutation.isPending}
                                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-50"
                                >
                                    <PaperAirplaneIcon className="h-4 w-4" />
                                    <span>{t('invoices.send')}</span>
                                </button>
                            </>
                        )}

                        {invoice.status === 'sent' && (
                            <button
                                onClick={() => updateStatusMutation.mutate('paid')}
                                disabled={updateStatusMutation.isPending}
                                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-50"
                            >
                                <CheckCircleIcon className="h-4 w-4" />
                                <span>{t('invoices.markAsPaid')}</span>
                            </button>
                        )}

                        <button
                            onClick={() => downloadPdfMutation.mutate()}
                            disabled={downloadPdfMutation.isPending}
                            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm disabled:opacity-50"
                        >
                            <DocumentArrowDownIcon className="h-4 w-4" />
                            <span>{t('invoices.downloadPDF')}</span>
                        </button>

                        <button
                            onClick={() => window.print()}
                            className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition text-sm"
                        >
                            <PrinterIcon className="h-4 w-4" />
                            <span>{t('common.print')}</span>
                        </button>

                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm"
                        >
                            <TrashIcon className="h-4 w-4" />
                            <span>{t('common.delete')}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Invoice Content */}
            <div className="bg-white rounded-lg shadow p-8 mb-8">
                {/* Header Info */}
                <div className="flex justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('invoices.invoice')}</h2>
                        <p className="text-gray-600">{invoice.invoice_number}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-600">{t('invoices.issueDate')}</p>
                        <p className="font-semibold text-gray-900">
                            {format(new Date(invoice.issue_date), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">{t('invoices.dueDate')}</p>
                        <p className="font-semibold text-gray-900">
                            {format(new Date(invoice.due_date), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                    </div>
                </div>

                {/* Client Info */}
                {invoice.client && (
                    <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-600 mb-2">{t('invoices.billedTo')}</h3>
                        <p className="font-semibold text-gray-900">{invoice.client.name}</p>
                        {invoice.client.company && (
                            <p className="text-gray-700">{invoice.client.company}</p>
                        )}
                        <p className="text-gray-600">{invoice.client.email}</p>
                        {invoice.client.address && (
                            <p className="text-gray-600 mt-2 whitespace-pre-wrap">{invoice.client.address}</p>
                        )}
                    </div>
                )}

                {/* Items Table */}
                <div className="mb-8">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-gray-300">
                                <th className="text-left py-3 text-sm font-semibold text-gray-700">{t('invoices.description')}</th>
                                <th className="text-right py-3 text-sm font-semibold text-gray-700">{t('invoices.quantity')}</th>
                                <th className="text-right py-3 text-sm font-semibold text-gray-700">{t('invoices.unitPrice')}</th>
                                <th className="text-right py-3 text-sm font-semibold text-gray-700">{t('invoices.total')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items?.map((item: InvoiceItem) => (
                                <tr key={item.id} className="border-b border-gray-200">
                                    <td className="py-4 text-gray-900">{item.description}</td>
                                    <td className="text-right py-4 text-gray-700">{item.quantity}</td>
                                    <td className="text-right py-4 text-gray-700">
                                        {new Intl.NumberFormat('fr-FR', {
                                            style: 'currency',
                                            currency: 'EUR',
                                        }).format(item.unit_price)}
                                    </td>
                                    <td className="text-right py-4 font-semibold text-gray-900">
                                        {new Intl.NumberFormat('fr-FR', {
                                            style: 'currency',
                                            currency: 'EUR',
                                        }).format(item.total)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                        <div className="flex justify-between text-gray-700">
                            <span>{t('invoices.subtotal')}</span>
                            <span>
                                {new Intl.NumberFormat('fr-FR', {
                                    style: 'currency',
                                    currency: 'EUR',
                                }).format(invoice.subtotal)}
                            </span>
                        </div>
                        <div className="flex justify-between text-gray-700">
                            <span>{t('invoices.tax', { rate: invoice.tax_rate })}</span>
                            <span>
                                {new Intl.NumberFormat('fr-FR', {
                                    style: 'currency',
                                    currency: 'EUR',
                                }).format(invoice.tax_amount)}
                            </span>
                        </div>
                        <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t-2 border-gray-300">
                            <span>{t('invoices.total')}</span>
                            <span>
                                {new Intl.NumberFormat('fr-FR', {
                                    style: 'currency',
                                    currency: 'EUR',
                                }).format(invoice.total_amount)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                    <div className="mt-8 pt-8 border-t border-gray-200">
                        <h3 className="text-sm font-medium text-gray-600 mb-2">{t('invoices.notes')}</h3>
                        <p className="text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{t('invoices.confirmDelete')}</h3>
                        <p className="text-gray-600 mb-6">
                            {t('invoices.confirmDeleteMessage')}
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={() => {
                                    deleteInvoiceMutation.mutate();
                                    setShowDeleteConfirm(false);
                                }}
                                disabled={deleteInvoiceMutation.isPending}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                            >
                                {deleteInvoiceMutation.isPending ? t('common.deleting') : t('common.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceDetail;
