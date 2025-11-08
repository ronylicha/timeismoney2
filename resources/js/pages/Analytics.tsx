import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
    ChartBarIcon,
    ArrowTrendingUpIcon,
    ClockIcon,
    CurrencyEuroIcon,
    FolderIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Analytics: React.FC = () => {
    const [chartRange, setChartRange] = useState<'week' | 'month'>('week');

    // Fetch dashboard stats
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const response = await axios.get('/dashboard/stats');
            return response.data;
        },
    });

    // Fetch chart data
    const { data: charts, isLoading: chartsLoading } = useQuery({
        queryKey: ['dashboard-charts', chartRange],
        queryFn: async () => {
            const response = await axios.get('/dashboard/charts', {
                params: { range: chartRange }
            });
            return response.data;
        },
    });

    const isLoading = statsLoading || chartsLoading;

    // Chart colors
    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount);
    };

    // Format hours
    const formatHours = (hours: number) => {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}h${m > 0 ? ` ${m}m` : ''}`;
    };

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        {[...Array(4)].map((_, i) => (
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
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Analytiques</h1>
                <p className="mt-2 text-gray-600">Tableaux de bord et indicateurs de performance</p>
            </div>

            {/* Stats Cards - Month */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Temps total (ce mois)</h3>
                        <ClockIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {formatHours(stats?.month?.hours || 0)}
                    </p>
                    <p className={`text-sm mt-2 ${stats?.month?.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stats?.month?.trend >= 0 ? '+' : ''}{stats?.month?.trend?.toFixed(1) || 0}% vs mois dernier
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Revenu facturé</h3>
                        <CurrencyEuroIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(stats?.month?.earnings || 0)}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                        {stats?.month?.entries || 0} entrées
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Projets actifs</h3>
                        <FolderIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {stats?.projects?.active || 0}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                        {stats?.projects?.completed || 0} complétés
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Factures</h3>
                        <DocumentTextIcon className="h-5 w-5 text-orange-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {stats?.invoices?.pending || 0}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                        {formatCurrency(stats?.invoices?.pending_amount || 0)} en attente
                    </p>
                </div>
            </div>

            {/* Range Selector */}
            <div className="flex justify-end space-x-2">
                <button
                    onClick={() => setChartRange('week')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        chartRange === 'week'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    7 jours
                </button>
                <button
                    onClick={() => setChartRange('month')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        chartRange === 'month'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    30 jours
                </button>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Hours Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Heures quotidiennes
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={charts?.daily_hours || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(value) => format(new Date(value), 'd MMM', { locale: fr })}
                            />
                            <YAxis />
                            <Tooltip
                                labelFormatter={(value) => format(new Date(value), 'dd MMMM yyyy', { locale: fr })}
                                formatter={(value: number) => [formatHours(value), 'Heures']}
                            />
                            <Legend />
                            <Bar dataKey="hours" fill="#3B82F6" name="Heures" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Daily Revenue Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Revenu quotidien
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={charts?.daily_hours || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(value) => format(new Date(value), 'd MMM', { locale: fr })}
                            />
                            <YAxis />
                            <Tooltip
                                labelFormatter={(value) => format(new Date(value), 'dd MMMM yyyy', { locale: fr })}
                                formatter={(value: number) => [formatCurrency(value), 'Montant']}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="amount"
                                stroke="#10B981"
                                strokeWidth={2}
                                name="Montant"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Project Distribution */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Répartition par projet (Top 5)
                    </h2>
                    {charts?.project_distribution?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={charts.project_distribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(entry) => entry.name}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {charts.project_distribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                            <p className="text-gray-500">Aucune donnée disponible</p>
                        </div>
                    )}
                </div>

                {/* Monthly Revenue Trend */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Revenu mensuel (6 derniers mois)
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={charts?.monthly_revenue || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                            <Bar dataKey="invoiced" fill="#F59E0B" name="Facturé" />
                            <Bar dataKey="paid" fill="#10B981" name="Payé" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Invoice Status */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">État des factures</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <ClockIcon className="h-5 w-5 text-yellow-500 mr-2" />
                                <span className="text-sm text-gray-600">En attente</span>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold">{stats?.invoices?.pending || 0}</p>
                                <p className="text-xs text-gray-500">
                                    {formatCurrency(stats?.invoices?.pending_amount || 0)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                                <span className="text-sm text-gray-600">En retard</span>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold">{stats?.invoices?.overdue || 0}</p>
                                <p className="text-xs text-gray-500">
                                    {formatCurrency(stats?.invoices?.overdue_amount || 0)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                                <span className="text-sm text-gray-600">Payées ce mois</span>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold">{stats?.invoices?.paid_this_month || 0}</p>
                                <p className="text-xs text-gray-500">
                                    {formatCurrency(stats?.invoices?.paid_amount || 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Task Status */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">État des tâches</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">À faire</span>
                            <span className="font-semibold text-gray-900">{stats?.tasks?.todo || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">En cours</span>
                            <span className="font-semibold text-blue-600">{stats?.tasks?.in_progress || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Complétées ce mois</span>
                            <span className="font-semibold text-green-600">{stats?.tasks?.completed || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">En retard</span>
                            <span className="font-semibold text-red-600">{stats?.tasks?.overdue || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Project Status */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">État des projets</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Actifs</span>
                            <span className="font-semibold text-blue-600">{stats?.projects?.active || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Complétés</span>
                            <span className="font-semibold text-green-600">{stats?.projects?.completed || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">En attente</span>
                            <span className="font-semibold text-yellow-600">{stats?.projects?.on_hold || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
