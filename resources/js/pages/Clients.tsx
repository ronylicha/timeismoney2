import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
    PlusIcon,
    MagnifyingGlassIcon,
    UserGroupIcon,
    EnvelopeIcon,
    PhoneIcon,
    MapPinIcon,
    BriefcaseIcon,
    CurrencyEuroIcon,
} from '@heroicons/react/24/outline';

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
    projects_count?: number;
    active_projects_count?: number;
    inactive_projects_count?: number;
    total_revenue?: number;
}

const Clients: React.FC = () => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch clients
    const { data: clients, isLoading } = useQuery({
        queryKey: ['clients', searchTerm],
        queryFn: async () => {
            const response = await axios.get('/clients', {
                params: {
                    search: searchTerm,
                },
            });
            return response.data.data;
        },
    });

    const getTotalClients = () => clients?.length || 0;

    const getTotalRevenue = () => {
        if (!clients) return 0;
        return clients.reduce((acc: number, client: Client) => acc + (client.total_revenue || 0), 0);
    };

    const getActiveProjects = () => {
        if (!clients) return 0;
        return clients.reduce((acc: number, client: Client) => acc + (client.active_projects_count || 0), 0);
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('clients.title')}</h1>
                        <p className="mt-2 text-gray-600">{t('clients.managePortfolio')}</p>
                    </div>
                    <Link
                        to="/clients/new"
                        className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <PlusIcon className="h-5 w-5" />
                        <span>{t('clients.newClient')}</span>
                    </Link>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">{t('clients.totalClients')}</p>
                            <p className="text-2xl font-bold text-gray-900 mt-2">{getTotalClients()}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <UserGroupIcon className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">{t('clients.activeProjects')}</p>
                            <p className="text-2xl font-bold text-gray-900 mt-2">{getActiveProjects()}</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <BriefcaseIcon className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">{t('clients.totalRevenue')}</p>
                            <p className="text-2xl font-bold text-gray-900 mt-2">
                                {new Intl.NumberFormat('fr-FR', {
                                    style: 'currency',
                                    currency: 'EUR',
                                    notation: 'compact',
                                }).format(getTotalRevenue())}
                            </p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <CurrencyEuroIcon className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t('clients.searchClients')}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Clients Grid */}
            {isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">{t('common.loading')}</p>
                </div>
            ) : clients?.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('clients.noClients')}</h3>
                    <p className="text-gray-600 mb-6">{t('clients.addFirstClient')}</p>
                    <Link
                        to="/clients/new"
                        className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <PlusIcon className="h-5 w-5" />
                        <span>{t('clients.addClient')}</span>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {clients?.map((client: Client) => (
                        <Link
                            key={client.id}
                            to={`/clients/${client.id}`}
                            className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 block"
                        >
                            {/* Client Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                        {client.name}
                                    </h3>
                                    {client.company && (
                                        <p className="text-sm text-gray-600">{client.company}</p>
                                    )}
                                </div>
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <UserGroupIcon className="h-5 w-5 text-blue-600" />
                                </div>
                            </div>

                            {/* Contact Information */}
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <EnvelopeIcon className="h-4 w-4 flex-shrink-0" />
                                    <span className="truncate">{client.email}</span>
                                </div>

                                {client.phone && (
                                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                                        <PhoneIcon className="h-4 w-4 flex-shrink-0" />
                                        <span>{client.phone}</span>
                                    </div>
                                )}

                                {(client.city || client.country) && (
                                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                                        <MapPinIcon className="h-4 w-4 flex-shrink-0" />
                                        <span>
                                            {[client.city, client.country].filter(Boolean).join(', ')}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Statistics */}
                            <div className="pt-4 border-t border-gray-200">
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="text-center">
                                        <p className="text-xs text-gray-600 mb-1">{t('clients.activeProjects')}</p>
                                        <p className="text-sm font-semibold text-green-600">
                                            {client.active_projects_count || 0}
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-gray-600 mb-1">{t('clients.inactiveProjects')}</p>
                                        <p className="text-sm font-semibold text-gray-500">
                                            {client.inactive_projects_count || 0}
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-gray-600 mb-1">{t('clients.revenue')}</p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {new Intl.NumberFormat('fr-FR', {
                                                style: 'currency',
                                                currency: 'EUR',
                                                notation: 'compact',
                                            }).format(client.total_revenue || 0)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Clients;
