import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
    CreditCardIcon,
    BuildingOfficeIcon,
    ChartBarIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const AdminBilling: React.FC = () => {
    const [selectedPlan, setSelectedPlan] = useState('all');

    // Fetch tenants with billing info
    const { data: tenants, isLoading } = useQuery({
        queryKey: ['admin-tenants-billing'],
        queryFn: async () => {
            const response = await axios.get('/admin/tenants');
            return response.data.data;
        },
    });

    const plans = [
        { id: 'free', name: 'Gratuit', color: 'gray', price: 0 },
        { id: 'starter', name: 'Starter', color: 'blue', price: 29 },
        { id: 'professional', name: 'Professional', color: 'purple', price: 79 },
        { id: 'enterprise', name: 'Enterprise', color: 'orange', price: 199 },
    ];

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount);
    };

    const getBillingStats = () => {
        if (!tenants) return { total: 0, monthly: 0, annual: 0 };

        const monthlyRevenue = tenants.reduce((sum: number, tenant: any) => {
            const plan = plans.find(p => p.id === tenant.plan);
            return sum + (plan?.price || 0);
        }, 0);

        return {
            total: tenants.length,
            monthly: monthlyRevenue,
            annual: monthlyRevenue * 12,
        };
    };

    const stats = getBillingStats();

    const filteredTenants = selectedPlan === 'all'
        ? tenants
        : tenants?.filter((t: any) => t.plan === selectedPlan);

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="bg-white rounded-lg shadow p-6 h-32"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Facturation & Abonnements</h1>
                <p className="mt-2 text-gray-600">Gestion des plans et facturation des tenants</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Tenants actifs</h3>
                        <BuildingOfficeIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    <p className="text-sm text-gray-600 mt-2">Total d'organisations</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Revenu mensuel</h3>
                        <CreditCardIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.monthly)}</p>
                    <p className="text-sm text-gray-600 mt-2">Récurrent mensuel (MRR)</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Revenu annuel</h3>
                        <ChartBarIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.annual)}</p>
                    <p className="text-sm text-gray-600 mt-2">Projection annuelle (ARR)</p>
                </div>
            </div>

            {/* Plans Filter */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setSelectedPlan('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                            selectedPlan === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        Tous ({tenants?.length || 0})
                    </button>
                    {plans.map((plan) => {
                        const count = tenants?.filter((t: any) => t.plan === plan.id).length || 0;
                        return (
                            <button
                                key={plan.id}
                                onClick={() => setSelectedPlan(plan.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                    selectedPlan === plan.id
                                        ? `bg-${plan.color}-600 text-white`
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {plan.name} ({count})
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tenants List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Organisation
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Plan
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Montant mensuel
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Statut
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Utilisateurs
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Membre depuis
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTenants?.map((tenant: any) => {
                                const plan = plans.find(p => p.id === (tenant.plan || 'free'));
                                return (
                                    <tr key={tenant.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {tenant.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">{tenant.slug}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-${plan?.color}-100 text-${plan?.color}-800`}>
                                                {plan?.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                            {formatCurrency(plan?.price || 0)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {tenant.is_active ? (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                                                    Actif
                                                </span>
                                            ) : (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                    <XCircleIcon className="h-4 w-4 mr-1" />
                                                    Suspendu
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {tenant.users_count || 0} utilisateurs
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {format(new Date(tenant.created_at), 'dd MMM yyyy', { locale: fr })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button className="text-blue-600 hover:text-blue-900 mr-3">
                                                Modifier plan
                                            </button>
                                            <button className="text-gray-600 hover:text-gray-900">
                                                Voir détails
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Plans Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {plans.map((plan) => {
                    const count = tenants?.filter((t: any) => t.plan === plan.id).length || 0;
                    const revenue = count * plan.price;
                    return (
                        <div key={plan.id} className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{plan.name}</h3>
                            <p className="text-3xl font-bold text-gray-900 mb-1">
                                {formatCurrency(plan.price)}<span className="text-sm text-gray-600">/mois</span>
                            </p>
                            <p className="text-sm text-gray-600 mb-4">{count} tenants actifs</p>
                            <p className="text-sm font-semibold text-green-600">
                                MRR: {formatCurrency(revenue)}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminBilling;
