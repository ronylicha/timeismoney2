import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
    MagnifyingGlassIcon,
    DocumentTextIcon,
    EyeIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    ArrowDownTrayIcon,
    FunnelIcon,
    InboxIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SupplierInvoice {
    id: number;
    invoice_number: string;
    supplier_name: string;
    supplier_siret?: string;
    status: 'pending' | 'processing' | 'validated' | 'rejected' | 'paid';
    invoice_date: string;
    due_date: string;
    total_ht: number;
    total_tva: number;
    total_ttc: number;
    file_path: string;
    file_name: string;
    pdp_reference?: string;
    received_at: string;
    processed_at?: string;
    validated_at?: string;
    notes?: string;
    rejection_reason?: string;
}

const SupplierInvoices: React.FC = () => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null);

    const { data: invoices, isLoading } = useQuery({
        queryKey: ['supplier-invoices', searchTerm, statusFilter],
        queryFn: async () => {
            const response = await axios.get('/api/supplier-invoices', {
                params: {
                    search: searchTerm,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                },
            });
            return response.data.data;
        },
    });

    const getStatusBadge = (status: string) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800',
            processing: 'bg-blue-100 text-blue-800',
            validated: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
            paid: 'bg-emerald-100 text-emerald-800',
        };

        const icons = {
            pending: ClockIcon,
            processing: ClockIcon,
            validated: CheckCircleIcon,
            rejected: XCircleIcon,
            paid: CheckCircleIcon,
        };

        const Icon = icons[status as keyof typeof icons] || DocumentTextIcon;

        return (
            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
                <Icon className="h-3 w-3 mr-1" />
                {t(`supplierInvoices.statuses.${status}`, status)}
            </span>
        );
    };

    const validateMutation = useMutation({
        mutationFn: async (invoiceId: number) => {
            const response = await axios.post(`/api/supplier-invoices/${invoiceId}/validate`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['supplier-invoices'] });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: async ({ invoiceId, reason }: { invoiceId: number; reason: string }) => {
            const response = await axios.post(`/api/supplier-invoices/${invoiceId}/reject`, { reason });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['supplier-invoices'] });
            setSelectedInvoice(null);
        },
    });

    const downloadFile = async (invoice: SupplierInvoice) => {
        try {
            const response = await axios.get(`/api/supplier-invoices/${invoice.id}/download`, {
                responseType: 'blob',
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', invoice.file_name);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading file:', error);
        }
    };

    const queryClient = useQueryClient();

    return (
        <div className="p-6">
            <div className="mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Factures Fournisseurs</h1>
                        <p className="mt-2 text-gray-600">
                            Réception et traitement des factures fournisseurs via le Portail Public de Facturation
                        </p>
                    </div>
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
                            placeholder="Rechercher par N° facture, fournisseur..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <FunnelIcon className="h-5 w-5 text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">Tous les statuts</option>
                            <option value="pending">En attente</option>
                            <option value="processing">En traitement</option>
                            <option value="validated">Validées</option>
                            <option value="rejected">Rejetées</option>
                            <option value="paid">Payées</option>
                        </select>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Chargement...</p>
                </div>
            ) : invoices?.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <InboxIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune facture fournisseur</h3>
                    <p className="text-gray-600">
                        Les factures fournisseurs reçues via le PDP apparaîtront ici
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    N° Facture
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Fournisseur
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date facture
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date échéance
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total TTC
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Statut
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {invoices?.map((invoice: SupplierInvoice) => (
                                <tr key={invoice.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {invoice.invoice_number}
                                        </div>
                                        {invoice.pdp_reference && (
                                            <div className="text-xs text-gray-500">
                                                PDP: {invoice.pdp_reference}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{invoice.supplier_name}</div>
                                        {invoice.supplier_siret && (
                                            <div className="text-xs text-gray-500">SIRET: {invoice.supplier_siret}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {format(new Date(invoice.invoice_date), 'dd/MM/yyyy', { locale: fr })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {format(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: fr })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Intl.NumberFormat('fr-FR', {
                                            style: 'currency',
                                            currency: 'EUR',
                                        }).format(invoice.total_ttc)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(invoice.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => downloadFile(invoice)}
                                                className="text-blue-600 hover:text-blue-900"
                                                title="Télécharger"
                                            >
                                                <ArrowDownTrayIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => setSelectedInvoice(invoice)}
                                                className="text-green-600 hover:text-green-900"
                                                title="Voir les détails"
                                            >
                                                <EyeIcon className="h-5 w-5" />
                                            </button>
                                            {invoice.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => validateMutation.mutate(invoice.id)}
                                                        className="text-emerald-600 hover:text-emerald-900"
                                                        title="Valider"
                                                        disabled={validateMutation.isPending}
                                                    >
                                                        <CheckCircleIcon className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedInvoice(invoice)}
                                                        className="text-red-600 hover:text-red-900"
                                                        title="Rejeter"
                                                    >
                                                        <XCircleIcon className="h-5 w-5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal de validation/rejet */}
            {selectedInvoice && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                Détails de la facture
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">N° Facture</label>
                                    <p className="text-sm text-gray-900">{selectedInvoice.invoice_number}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Fournisseur</label>
                                    <p className="text-sm text-gray-900">{selectedInvoice.supplier_name}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Date facture</label>
                                    <p className="text-sm text-gray-900">
                                        {format(new Date(selectedInvoice.invoice_date), 'dd/MM/yyyy', { locale: fr })}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Date échéance</label>
                                    <p className="text-sm text-gray-900">
                                        {format(new Date(selectedInvoice.due_date), 'dd/MM/yyyy', { locale: fr })}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Total HT</label>
                                    <p className="text-sm text-gray-900">
                                        {new Intl.NumberFormat('fr-FR', {
                                            style: 'currency',
                                            currency: 'EUR',
                                        }).format(selectedInvoice.total_ht)}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Total TTC</label>
                                    <p className="text-sm text-gray-900">
                                        {new Intl.NumberFormat('fr-FR', {
                                            style: 'currency',
                                            currency: 'EUR',
                                        }).format(selectedInvoice.total_ttc)}
                                    </p>
                                </div>
                            </div>

                            {selectedInvoice.status === 'pending' && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Action
                                    </label>
                                    <div className="flex space-x-4">
                                        <button
                                            onClick={() => {
                                                validateMutation.mutate(selectedInvoice.id);
                                                setSelectedInvoice(null);
                                            }}
                                            disabled={validateMutation.isPending}
                                            className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                                        >
                                            Valider la facture
                                        </button>
                                        <button
                                            onClick={() => {
                                                const reason = prompt('Raison du rejet:');
                                                if (reason) {
                                                    rejectMutation.mutate({ invoiceId: selectedInvoice.id, reason });
                                                }
                                            }}
                                            disabled={rejectMutation.isPending}
                                            className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-400"
                                        >
                                            Rejeter la facture
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <button
                                    onClick={() => setSelectedInvoice(null)}
                                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplierInvoices;