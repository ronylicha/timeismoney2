import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
    BuildingOfficeIcon,
    UserGroupIcon,
    CreditCardIcon,
    CalendarIcon,
    ChartBarIcon,
    CogIcon,
    PencilIcon,
    TrashIcon,
    EyeIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    DocumentTextIcon,
    ServerIcon,
    CloudIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Tenant {
    id: number;
    name: string;
    slug: string;
    owner_id: number;
    owner?: {
        id: number;
        name: string;
        email: string;
    };
    plan: 'individual' | 'team' | 'enterprise';
    max_users: number;
    current_users: number;
    max_projects: number;
    current_projects: number;
    max_storage_gb: number;
    used_storage_gb: number;
    billing_email: string;
    billing_cycle: 'monthly' | 'yearly';
    subscription_status: 'active' | 'trial' | 'suspended' | 'cancelled';
    trial_ends_at: string | null;
    subscription_ends_at: string | null;
    settings: any;
    created_at: string;
    updated_at: string;
    stats?: {
        total_invoices: number;
        total_revenue: number;
        active_users: number;
        time_entries_this_month: number;
    };
}

const TenantManagement: React.FC = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPlan, setFilterPlan] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // Fetch tenants
    const { data: tenantsData, isLoading } = useQuery({
        queryKey: ['admin-tenants', searchTerm, filterPlan, filterStatus, currentPage],
        queryFn: async () => {
            const response = await axios.get('/api/admin/tenants', {
                params: {
                    search: searchTerm,
                    plan: filterPlan,
                    status: filterStatus,
                    page: currentPage,
                    per_page: 20
                }
            });
            return response.data;
        }
    });

    // Suspend tenant mutation
    const suspendTenantMutation = useMutation({
        mutationFn: async (tenantId: number) => {
            await axios.post(`/api/admin/tenants/${tenantId}/suspend`);
        },
        onSuccess: () => {
            toast.success('Organisation suspendue');
            queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
        }
    });

    // Activate tenant mutation
    const activateTenantMutation = useMutation({
        mutationFn: async (tenantId: number) => {
            await axios.post(`/api/admin/tenants/${tenantId}/activate`);
        },
        onSuccess: () => {
            toast.success('Organisation activée');
            queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
        }
    });

    // Update plan mutation
    const updatePlanMutation = useMutation({
        mutationFn: async ({ tenantId, plan }: { tenantId: number; plan: string }) => {
            await axios.put(`/api/admin/tenants/${tenantId}/plan`, { plan });
        },
        onSuccess: () => {
            toast.success('Plan mis à jour');
            queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
            setShowEditModal(false);
        }
    });

    // Delete tenant mutation
    const deleteTenantMutation = useMutation({
        mutationFn: async (tenantId: number) => {
            await axios.delete(`/api/admin/tenants/${tenantId}`);
        },
        onSuccess: () => {
            toast.success('Organisation supprimée');
            queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
        }
    });

    // Get plan badge color
    const getPlanBadgeColor = (plan: string) => {
        switch (plan) {
            case 'enterprise':
                return 'bg-purple-100 text-purple-800';
            case 'team':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    // Get status badge color
    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800';
            case 'trial':
                return 'bg-yellow-100 text-yellow-800';
            case 'suspended':
                return 'bg-red-100 text-red-800';
            case 'cancelled':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    // Calculate usage percentage
    const getUsagePercentage = (used: number, max: number) => {
        if (max === 0) return 0;
        return Math.round((used / max) * 100);
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Gestion des organisations</h1>
                        <p className="text-gray-600 mt-1">
                            {tenantsData?.total || 0} organisations au total
                        </p>
                    </div>
                    <button
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                        Nouvelle organisation
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total actif</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {tenantsData?.stats?.active || 0}
                            </p>
                        </div>
                        <CheckCircleIcon className="h-8 w-8 text-green-500" />
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">En essai</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {tenantsData?.stats?.trial || 0}
                            </p>
                        </div>
                        <CalendarIcon className="h-8 w-8 text-yellow-500" />
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Enterprise</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {tenantsData?.stats?.enterprise || 0}
                            </p>
                        </div>
                        <BuildingOfficeIcon className="h-8 w-8 text-purple-500" />
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">MRR Total</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {(tenantsData?.stats?.mrr || 0).toLocaleString()}€
                            </p>
                        </div>
                        <CreditCardIcon className="h-8 w-8 text-green-500" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Rechercher..."
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <select
                        value={filterPlan}
                        onChange={(e) => setFilterPlan(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">Tous les plans</option>
                        <option value="individual">Individual</option>
                        <option value="team">Team</option>
                        <option value="enterprise">Enterprise</option>
                    </select>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">Tous les statuts</option>
                        <option value="active">Actif</option>
                        <option value="trial">En essai</option>
                        <option value="suspended">Suspendu</option>
                        <option value="cancelled">Annulé</option>
                    </select>
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setFilterPlan('all');
                            setFilterStatus('all');
                        }}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Réinitialiser
                    </button>
                </div>
            </div>

            {/* Tenants Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {isLoading ? (
                    <div className="col-span-2 text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    </div>
                ) : tenantsData?.data?.length === 0 ? (
                    <div className="col-span-2 text-center py-8 text-gray-500">
                        Aucune organisation trouvée
                    </div>
                ) : (
                    tenantsData?.data?.map((tenant: Tenant) => (
                        <div key={tenant.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                            {/* Tenant Header */}
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {tenant.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {tenant.slug}
                                        </p>
                                        <div className="flex items-center mt-2 space-x-3">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPlanBadgeColor(tenant.plan)}`}>
                                                {tenant.plan}
                                            </span>
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(tenant.subscription_status)}`}>
                                                {tenant.subscription_status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => {
                                                setSelectedTenant(tenant);
                                                setShowDetailsModal(true);
                                            }}
                                            className="p-2 text-gray-600 hover:text-gray-900"
                                        >
                                            <EyeIcon className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedTenant(tenant);
                                                setShowEditModal(true);
                                            }}
                                            className="p-2 text-indigo-600 hover:text-indigo-900"
                                        >
                                            <PencilIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Tenant Stats */}
                            <div className="p-6">
                                {/* Owner Info */}
                                <div className="flex items-center mb-4">
                                    <UserGroupIcon className="h-5 w-5 text-gray-400 mr-2" />
                                    <div>
                                        <p className="text-sm text-gray-600">Propriétaire</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {tenant.owner?.name} ({tenant.owner?.email})
                                        </p>
                                    </div>
                                </div>

                                {/* Usage Bars */}
                                <div className="space-y-3">
                                    {/* Users */}
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-600">Utilisateurs</span>
                                            <span className="text-gray-900 font-medium">
                                                {tenant.current_users} / {tenant.max_users === -1 ? '∞' : tenant.max_users}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${
                                                    getUsagePercentage(tenant.current_users, tenant.max_users) > 90
                                                        ? 'bg-red-500'
                                                        : getUsagePercentage(tenant.current_users, tenant.max_users) > 70
                                                        ? 'bg-yellow-500'
                                                        : 'bg-green-500'
                                                }`}
                                                style={{
                                                    width: `${tenant.max_users === -1 ? 0 : getUsagePercentage(tenant.current_users, tenant.max_users)}%`
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Projects */}
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-600">Projets</span>
                                            <span className="text-gray-900 font-medium">
                                                {tenant.current_projects} / {tenant.max_projects === -1 ? '∞' : tenant.max_projects}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${
                                                    getUsagePercentage(tenant.current_projects, tenant.max_projects) > 90
                                                        ? 'bg-red-500'
                                                        : getUsagePercentage(tenant.current_projects, tenant.max_projects) > 70
                                                        ? 'bg-yellow-500'
                                                        : 'bg-green-500'
                                                }`}
                                                style={{
                                                    width: `${tenant.max_projects === -1 ? 0 : getUsagePercentage(tenant.current_projects, tenant.max_projects)}%`
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Storage */}
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-600">Stockage</span>
                                            <span className="text-gray-900 font-medium">
                                                {tenant.used_storage_gb.toFixed(1)} GB / {tenant.max_storage_gb === -1 ? '∞' : `${tenant.max_storage_gb} GB`}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${
                                                    getUsagePercentage(tenant.used_storage_gb, tenant.max_storage_gb) > 90
                                                        ? 'bg-red-500'
                                                        : getUsagePercentage(tenant.used_storage_gb, tenant.max_storage_gb) > 70
                                                        ? 'bg-yellow-500'
                                                        : 'bg-green-500'
                                                }`}
                                                style={{
                                                    width: `${tenant.max_storage_gb === -1 ? 0 : getUsagePercentage(tenant.used_storage_gb, tenant.max_storage_gb)}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Stats */}
                                {tenant.stats && (
                                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                                        <div>
                                            <p className="text-xs text-gray-600">Factures</p>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {tenant.stats.total_invoices}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">Revenu total</p>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {tenant.stats.total_revenue.toLocaleString()}€
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">Utilisateurs actifs</p>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {tenant.stats.active_users}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">Entrées ce mois</p>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {tenant.stats.time_entries_this_month}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Dates */}
                                <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                                    {tenant.trial_ends_at && (
                                        <p>
                                            Essai jusqu'au {format(new Date(tenant.trial_ends_at), 'dd/MM/yyyy', { locale: fr })}
                                        </p>
                                    )}
                                    {tenant.subscription_ends_at && (
                                        <p>
                                            Abonnement jusqu'au {format(new Date(tenant.subscription_ends_at), 'dd/MM/yyyy', { locale: fr })}
                                        </p>
                                    )}
                                    <p>
                                        Créé {formatDistanceToNow(new Date(tenant.created_at), { addSuffix: true, locale: fr })}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end space-x-2 mt-4">
                                    {tenant.subscription_status === 'suspended' ? (
                                        <button
                                            onClick={() => activateTenantMutation.mutate(tenant.id)}
                                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                                        >
                                            Activer
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => suspendTenantMutation.mutate(tenant.id)}
                                            className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
                                        >
                                            Suspendre
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (confirm('Êtes-vous sûr de vouloir supprimer cette organisation ?')) {
                                                deleteTenantMutation.mutate(tenant.id);
                                            }
                                        }}
                                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                                    >
                                        Supprimer
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {tenantsData && tenantsData.last_page > 1 && (
                <div className="mt-6 flex justify-center">
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Précédent
                        </button>
                        {Array.from({ length: Math.min(5, tenantsData.last_page) }, (_, i) => {
                            const page = currentPage - 2 + i;
                            if (page < 1 || page > tenantsData.last_page) return null;
                            return (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                        page === currentPage
                                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                    }`}
                                >
                                    {page}
                                </button>
                            );
                        }).filter(Boolean)}
                        <button
                            onClick={() => setCurrentPage(Math.min(tenantsData.last_page, currentPage + 1))}
                            disabled={currentPage === tenantsData.last_page}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Suivant
                        </button>
                    </nav>
                </div>
            )}
        </div>
    );
};

export default TenantManagement;