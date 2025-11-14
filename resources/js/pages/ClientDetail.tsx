import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeftIcon,
    PencilIcon,
    TrashIcon,
    EnvelopeIcon,
    PhoneIcon,
    MapPinIcon,
    BriefcaseIcon,
    FolderIcon,
    DocumentTextIcon,
    CurrencyEuroIcon,
    PlusIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useOffline } from '@/contexts/OfflineContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { deleteOfflineRecord } from '@/utils/offlineDB';

interface Client {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    company: string | null;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    country: string | null;
    notes: string | null;
    projects?: Project[];
    invoices?: Invoice[];
    quotes?: Quote[];
}

interface Project {
    id: number;
    name: string;
    status: string;
    budget: number;
    start_date: string;
    end_date: string | null;
}

interface Invoice {
    id: number;
    invoice_number: string;
    status: string;
    total: number;
    date: string;
    due_date: string;
}

interface Quote {
    id: number;
    quote_number: string;
    status: string;
    total: number;
    quote_date: string;
    valid_until: string;
}

const ClientDetail: React.FC = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const isNewClient = !id || id === 'new';
    const isOnline = useOnlineStatus();
    const { getOfflineData } = useOffline();
    const [offlineClient, setOfflineClient] = useState<Client | null>(null);
    const [offlineLoading, setOfflineLoading] = useState(false);
    const isLocalClient = id?.startsWith('local_');
    const shouldFetchOnline = !isNewClient && !!id && isOnline && !isLocalClient;

    // Fetch client details when online
    const { data: onlineClient, isLoading: loadingClient } = useQuery({
        queryKey: ['client', id],
        queryFn: async () => {
            const response = await axios.get(`/clients/${id}`);
            return response.data.data;
        },
        enabled: shouldFetchOnline,
    });

    // Load cached client when offline or dealing with a local draft
    useEffect(() => {
        if (!shouldFetchOnline && !isNewClient && id) {
            setOfflineLoading(true);
            getOfflineData('clients', id)
                .then((data) => setOfflineClient(data || null))
                .catch(() => setOfflineClient(null))
                .finally(() => setOfflineLoading(false));
        } else if (shouldFetchOnline) {
            setOfflineClient(null);
        }
    }, [shouldFetchOnline, isNewClient, id, getOfflineData]);

    const client = onlineClient ?? offlineClient;
    const isLoading = shouldFetchOnline ? loadingClient : offlineLoading;

    // Delete client mutation
    const deleteClientMutation = useMutation({
        mutationFn: async () => {
            await axios.delete(`/clients/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            if (id) {
                deleteOfflineRecord('client', id).catch(() => {});
            }
            toast.success(t('clients.clientDeletedSuccess'));
            navigate('/clients');
        },
        onError: () => {
            toast.error(t('clients.clientDeletedError'));
        },
    });

    const getStatusBadge = (status: string) => {
        const colors = {
            active: 'bg-green-100 text-green-800',
            completed: 'bg-blue-100 text-blue-800',
            on_hold: 'bg-yellow-100 text-yellow-800',
            cancelled: 'bg-red-100 text-red-800',
        };

        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
                {t(`projects.status.${status}`)}
            </span>
        );
    };

    const getInvoiceStatusBadge = (status: string) => {
        const colors = {
            draft: 'bg-gray-100 text-gray-800',
            sent: 'bg-blue-100 text-blue-800',
            paid: 'bg-green-100 text-green-800',
            overdue: 'bg-red-100 text-red-800',
            cancelled: 'bg-red-100 text-red-800',
        };

        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
                {t(`invoices.status.${status}`)}
            </span>
        );
    };

    const getQuoteStatusBadge = (status: string) => {
        const colors = {
            draft: 'bg-gray-100 text-gray-800',
            sent: 'bg-blue-100 text-blue-800',
            accepted: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
            expired: 'bg-orange-100 text-orange-800',
            converted: 'bg-purple-100 text-purple-800',
        };

        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
                {t(`quotes.status.${status}`)}
            </span>
        );
    };

    const getTotalRevenue = () => {
        if (!client?.invoices) return 0;
        return client.invoices
            .filter((invoice: Invoice) => invoice.status === 'paid')
            .reduce((acc: number, invoice: Invoice) => acc + (invoice.total || 0), 0);
    };

    const getOutstandingAmount = () => {
        if (!client?.invoices) return 0;
        return client.invoices
            .filter((invoice: Invoice) => invoice.status === 'sent' || invoice.status === 'overdue')
            .reduce((acc: number, invoice: Invoice) => acc + (invoice.total || 0), 0);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!client && !isLoading) {
        return (
            <div className="p-6">
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('clients.clientNotFound')}</h3>
                    <p className="text-gray-600 mb-6">{t('clients.clientNotFoundDescription')}</p>
                    <Link
                        to="/clients"
                        className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                        <span>{t('clients.backToClients')}</span>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center mb-4">
                    <Link
                        to="/clients"
                        className="flex items-center text-gray-600 hover:text-gray-900 transition mr-4"
                    >
                        <ArrowLeftIcon className="h-5 w-5 mr-1" />
                        <span>{t('common.back')}</span>
                    </Link>
                </div>

                <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{client.name}</h1>
                        {client.company && (
                            <p className="text-xl text-gray-600">{client.company}</p>
                        )}
                    </div>

                    <div className="flex items-center space-x-3 mt-4 md:mt-0">
                        <Link
                            to={`/clients/${id}/edit`}
                            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                        >
                            <PencilIcon className="h-5 w-5" />
                            <span>{t('common.edit')}</span>
                        </Link>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                        >
                            <TrashIcon className="h-5 w-5" />
                            <span>{t('common.delete')}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">{t('clients.activeProjects')}</h3>
                        <FolderIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {client.projects?.filter((p: Project) => p.status === 'active').length || 0}
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">{t('clients.totalRevenue')}</h3>
                        <CurrencyEuroIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                        }).format(getTotalRevenue())}
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">{t('clients.outstandingAmount')}</h3>
                        <DocumentTextIcon className="h-5 w-5 text-orange-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                        }).format(getOutstandingAmount())}
                    </p>
                </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">{t('clients.contactInfo')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                            <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="text-sm text-gray-600">{t('clients.email')}</p>
                                <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">
                                    {client.email}
                                </a>
                            </div>
                        </div>

                        {client.phone && (
                            <div className="flex items-center space-x-3">
                                <PhoneIcon className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-600">{t('clients.phone')}</p>
                                    <a href={`tel:${client.phone}`} className="text-blue-600 hover:underline">
                                        {client.phone}
                                    </a>
                                </div>
                            </div>
                        )}

                        {client.company && (
                            <div className="flex items-center space-x-3">
                                <BriefcaseIcon className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-600">{t('clients.companyName')}</p>
                                    <p className="text-gray-900">{client.company}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        {(client.address || client.city || client.postal_code || client.country) && (
                            <div className="flex items-start space-x-3">
                                <MapPinIcon className="h-5 w-5 text-gray-400 mt-1" />
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">{t('clients.address')}</p>
                                    <div className="text-gray-900">
                                        {client.address && <p>{client.address}</p>}
                                        {(client.postal_code || client.city) && (
                                            <p>{[client.postal_code, client.city].filter(Boolean).join(' ')}</p>
                                        )}
                                        {client.country && <p>{client.country}</p>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {client.notes && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <h3 className="text-sm font-medium text-gray-600 mb-2">{t('clients.notes')}</h3>
                        <p className="text-gray-900 whitespace-pre-wrap">{client.notes}</p>
                    </div>
                )}
            </div>

            {/* Projects Section */}
            <div className="bg-white rounded-lg shadow mb-8">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">{t('clients.projects')}</h2>
                    <Link
                        to={`/projects/new?client_id=${id}`}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                    >
                        <PlusIcon className="h-4 w-4" />
                        <span>{t('projects.newProject')}</span>
                    </Link>
                </div>

                <div className="divide-y divide-gray-200">
                    {client.projects?.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <FolderIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p>{t('clients.noProjectsForClient')}</p>
                        </div>
                    ) : (
                        client.projects?.map((project: Project) => (
                            <Link
                                key={project.id}
                                to={`/projects/${project.id}`}
                                className="p-6 hover:bg-gray-50 transition block"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h3 className="font-medium text-gray-900">{project.name}</h3>
                                            {getStatusBadge(project.status)}
                                        </div>
                                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                                            <span>
                                                {t('projects.start')}: {format(new Date(project.start_date), 'dd MMM yyyy', { locale: fr })}
                                            </span>
                                            {project.end_date && (
                                                <span>
                                                    {t('projects.end')}: {format(new Date(project.end_date), 'dd MMM yyyy', { locale: fr })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-gray-900">
                                            {new Intl.NumberFormat('fr-FR', {
                                                style: 'currency',
                                                currency: 'EUR',
                                            }).format(project.budget)}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>

            {/* Quotes Section */}
            <div className="bg-white rounded-lg shadow mb-8">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">{t('clients.quotes')}</h2>
                    <Link
                        to={`/quotes/new?client_id=${id}`}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                    >
                        <PlusIcon className="h-4 w-4" />
                        <span>{t('quotes.newQuote')}</span>
                    </Link>
                </div>

                <div className="divide-y divide-gray-200">
                    {client.quotes?.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p>{t('clients.noQuotesForClient')}</p>
                        </div>
                    ) : (
                        client.quotes?.map((quote: Quote) => (
                            <Link
                                key={quote.id}
                                to={`/quotes/${quote.id}`}
                                className="p-6 hover:bg-gray-50 transition block"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h3 className="font-medium text-gray-900">{quote.quote_number}</h3>
                                            {getQuoteStatusBadge(quote.status)}
                                        </div>
                                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                                            <span>
                                                {t('quotes.date')}: {format(new Date(quote.quote_date), 'dd MMM yyyy', { locale: fr })}
                                            </span>
                                            <span>
                                                {t('quotes.validUntil')}: {format(new Date(quote.valid_until), 'dd MMM yyyy', { locale: fr })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-gray-900">
                                            {new Intl.NumberFormat('fr-FR', {
                                                style: 'currency',
                                                currency: 'EUR',
                                            }).format(quote.total)}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>

            {/* Invoices Section */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">{t('clients.invoices')}</h2>
                    <Link
                        to={`/invoices/new?client_id=${id}`}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                    >
                        <PlusIcon className="h-4 w-4" />
                        <span>{t('invoices.newInvoice')}</span>
                    </Link>
                </div>

                <div className="divide-y divide-gray-200">
                    {client.invoices?.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p>{t('clients.noInvoicesForClient')}</p>
                        </div>
                    ) : (
                        client.invoices?.map((invoice: Invoice) => (
                            <Link
                                key={invoice.id}
                                to={`/invoices/${invoice.id}`}
                                className="p-6 hover:bg-gray-50 transition block"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h3 className="font-medium text-gray-900">{invoice.invoice_number}</h3>
                                            {getInvoiceStatusBadge(invoice.status)}
                                        </div>
                                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                                            <span>
                                                {t('invoices.issued')}: {invoice.date ? format(new Date(invoice.date), 'dd MMM yyyy', { locale: fr }) : '-'}
                                            </span>
                                            <span>
                                                {t('invoices.dueDate')}: {invoice.due_date ? format(new Date(invoice.due_date), 'dd MMM yyyy', { locale: fr }) : '-'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-gray-900">
                                            {new Intl.NumberFormat('fr-FR', {
                                                style: 'currency',
                                                currency: 'EUR',
                                            }).format(invoice.total || 0)}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{t('clients.confirmDelete')}</h3>
                        <p className="text-gray-600 mb-6">
                            {t('clients.confirmDeleteMessage')}
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
                                    deleteClientMutation.mutate();
                                    setShowDeleteConfirm(false);
                                }}
                                disabled={deleteClientMutation.isPending}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                            >
                                {deleteClientMutation.isPending ? t('common.deleting') : t('common.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientDetail;
