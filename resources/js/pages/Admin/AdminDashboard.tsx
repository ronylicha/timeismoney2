import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
    UsersIcon,
    BuildingOfficeIcon,
    CogIcon,
    ChartBarIcon,
    DocumentChartBarIcon,
    ShieldCheckIcon,
    ServerIcon,
    CreditCardIcon,
    BellIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ArrowUpIcon,
    ArrowDownIcon
} from '@heroicons/react/24/outline';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SystemStats {
    users: {
        total: number;
        active: number;
        new_this_month: number;
        growth: number;
    };
    tenants: {
        total: number;
        by_plan: {
            individual: number;
            team: number;
            enterprise: number;
        };
        revenue: number;
    };
    usage: {
        time_entries_today: number;
        invoices_this_month: number;
        total_revenue_this_month: number;
        storage_used_gb: number;
    };
    system: {
        cpu_percent: number;
        memory_percent: number;
        disk_percent: number;
        uptime_days: number;
    };
    health: {
        status: 'healthy' | 'degraded' | 'critical';
        issues: Array<{
            type: string;
            message: string;
            severity: 'low' | 'medium' | 'high';
        }>;
    };
}

const AdminDashboard: React.FC = () => {
    const [timeRange, setTimeRange] = useState('7d');

    // Fetch system stats
    const { data: stats, isLoading: loadingStats } = useQuery<SystemStats>({
        queryKey: ['admin-stats', timeRange],
        queryFn: async () => {
            const response = await axios.get('/api/admin/stats', {
                params: { range: timeRange }
            });
            return response.data;
        },
        refetchInterval: 30000 // Refresh every 30 seconds
    });

    // Fetch recent activity
    const { data: recentActivity = [] } = useQuery({
        queryKey: ['admin-activity'],
        queryFn: async () => {
            const response = await axios.get('/api/admin/activity');
            return response.data;
        }
    });

    // Fetch revenue chart data
    const { data: revenueData } = useQuery({
        queryKey: ['admin-revenue', timeRange],
        queryFn: async () => {
            const response = await axios.get('/api/admin/revenue-chart', {
                params: { range: timeRange }
            });
            return response.data;
        }
    });

    // Fetch user growth chart data
    const { data: userGrowthData } = useQuery({
        queryKey: ['admin-user-growth', timeRange],
        queryFn: async () => {
            const response = await axios.get('/api/admin/user-growth-chart', {
                params: { range: timeRange }
            });
            return response.data;
        }
    });

    if (loadingStats) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const getHealthIcon = () => {
        switch (stats?.health.status) {
            case 'healthy':
                return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
            case 'degraded':
                return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />;
            case 'critical':
                return <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />;
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
                    <p className="text-gray-600 mt-1">Vue d'ensemble du système</p>
                </div>

                <div className="flex items-center space-x-4">
                    {/* Health Status */}
                    <div className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow">
                        {getHealthIcon()}
                        <span className="text-sm font-medium capitalize">
                            {stats?.health.status}
                        </span>
                    </div>

                    {/* Time Range Selector */}
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="24h">24 heures</option>
                        <option value="7d">7 jours</option>
                        <option value="30d">30 jours</option>
                        <option value="90d">90 jours</option>
                    </select>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Users */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Utilisateurs</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {stats?.users.total.toLocaleString()}
                            </p>
                            <div className="flex items-center mt-2">
                                {stats?.users.growth > 0 ? (
                                    <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                                ) : (
                                    <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
                                )}
                                <span className={`text-sm ${stats?.users.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {Math.abs(stats?.users.growth || 0)}%
                                </span>
                                <span className="text-sm text-gray-500 ml-1">ce mois</span>
                            </div>
                        </div>
                        <UsersIcon className="h-10 w-10 text-indigo-600" />
                    </div>
                </div>

                {/* Tenants */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Organisations</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {stats?.tenants.total.toLocaleString()}
                            </p>
                            <div className="mt-2 space-y-1">
                                <div className="text-xs text-gray-500">
                                    Individual: {stats?.tenants.by_plan.individual}
                                </div>
                                <div className="text-xs text-gray-500">
                                    Team: {stats?.tenants.by_plan.team}
                                </div>
                                <div className="text-xs text-gray-500">
                                    Enterprise: {stats?.tenants.by_plan.enterprise}
                                </div>
                            </div>
                        </div>
                        <BuildingOfficeIcon className="h-10 w-10 text-purple-600" />
                    </div>
                </div>

                {/* Revenue */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Revenu mensuel</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {stats?.tenants.revenue.toLocaleString()}€
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                                MRR actuel
                            </p>
                        </div>
                        <CreditCardIcon className="h-10 w-10 text-green-600" />
                    </div>
                </div>

                {/* System Health */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Système</p>
                            <div className="mt-2 space-y-1">
                                <div className="flex items-center">
                                    <span className="text-xs text-gray-500 w-12">CPU:</span>
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${
                                                (stats?.system.cpu_percent || 0) > 80 ? 'bg-red-500' :
                                                (stats?.system.cpu_percent || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                                            }`}
                                            style={{width: `${stats?.system.cpu_percent}%`}}
                                        />
                                    </div>
                                    <span className="text-xs ml-2">{stats?.system.cpu_percent}%</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-xs text-gray-500 w-12">RAM:</span>
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${
                                                (stats?.system.memory_percent || 0) > 80 ? 'bg-red-500' :
                                                (stats?.system.memory_percent || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                                            }`}
                                            style={{width: `${stats?.system.memory_percent}%`}}
                                        />
                                    </div>
                                    <span className="text-xs ml-2">{stats?.system.memory_percent}%</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-xs text-gray-500 w-12">Disk:</span>
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${
                                                (stats?.system.disk_percent || 0) > 80 ? 'bg-red-500' :
                                                (stats?.system.disk_percent || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                                            }`}
                                            style={{width: `${stats?.system.disk_percent}%`}}
                                        />
                                    </div>
                                    <span className="text-xs ml-2">{stats?.system.disk_percent}%</span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Uptime: {stats?.system.uptime_days} jours
                            </p>
                        </div>
                        <ServerIcon className="h-10 w-10 text-gray-600" />
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution du revenu</h3>
                    {revenueData && (
                        <Line
                            data={{
                                labels: revenueData.labels,
                                datasets: [{
                                    label: 'Revenu',
                                    data: revenueData.values,
                                    borderColor: 'rgb(99, 102, 241)',
                                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                    tension: 0.1
                                }]
                            }}
                            options={{
                                responsive: true,
                                plugins: {
                                    legend: {
                                        display: false
                                    }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        ticks: {
                                            callback: (value) => `${value}€`
                                        }
                                    }
                                }
                            }}
                        />
                    )}
                </div>

                {/* User Growth Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Croissance des utilisateurs</h3>
                    {userGrowthData && (
                        <Bar
                            data={{
                                labels: userGrowthData.labels,
                                datasets: [{
                                    label: 'Nouveaux utilisateurs',
                                    data: userGrowthData.values,
                                    backgroundColor: 'rgba(34, 197, 94, 0.5)',
                                    borderColor: 'rgb(34, 197, 94)',
                                    borderWidth: 1
                                }]
                            }}
                            options={{
                                responsive: true,
                                plugins: {
                                    legend: {
                                        display: false
                                    }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true
                                    }
                                }
                            }}
                        />
                    )}
                </div>
            </div>

            {/* System Issues & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* System Issues */}
                {stats?.health.issues && stats.health.issues.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Problèmes système</h3>
                        <div className="space-y-3">
                            {stats.health.issues.map((issue, index) => (
                                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                    <ExclamationTriangleIcon className={`h-5 w-5 mt-0.5 ${
                                        issue.severity === 'high' ? 'text-red-500' :
                                        issue.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                                    }`} />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{issue.type}</p>
                                        <p className="text-sm text-gray-600">{issue.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Activity */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Activité récente</h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {recentActivity.map((activity: any, index: number) => (
                            <div key={index} className="flex items-start space-x-3">
                                <ClockIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm text-gray-900">{activity.description}</p>
                                    <p className="text-xs text-gray-500">
                                        {formatDistanceToNow(new Date(activity.created_at), {
                                            addSuffix: true,
                                            locale: fr
                                        })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <a
                        href="/admin/users"
                        className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <UsersIcon className="h-8 w-8 text-indigo-600 mb-2" />
                        <span className="text-sm font-medium text-gray-900">Gérer utilisateurs</span>
                    </a>
                    <a
                        href="/admin/tenants"
                        className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <BuildingOfficeIcon className="h-8 w-8 text-purple-600 mb-2" />
                        <span className="text-sm font-medium text-gray-900">Gérer organisations</span>
                    </a>
                    <a
                        href="/admin/billing"
                        className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <CreditCardIcon className="h-8 w-8 text-green-600 mb-2" />
                        <span className="text-sm font-medium text-gray-900">Facturation</span>
                    </a>
                    <a
                        href="/admin/settings"
                        className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <CogIcon className="h-8 w-8 text-gray-600 mb-2" />
                        <span className="text-sm font-medium text-gray-900">Paramètres système</span>
                    </a>
                    <a
                        href="/admin/audit"
                        className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <ShieldCheckIcon className="h-8 w-8 text-red-600 mb-2" />
                        <span className="text-sm font-medium text-gray-900">Audit & Sécurité</span>
                    </a>
                    <a
                        href="/admin/reports"
                        className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <DocumentChartBarIcon className="h-8 w-8 text-blue-600 mb-2" />
                        <span className="text-sm font-medium text-gray-900">Rapports</span>
                    </a>
                    <a
                        href="/admin/notifications"
                        className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <BellIcon className="h-8 w-8 text-yellow-600 mb-2" />
                        <span className="text-sm font-medium text-gray-900">Notifications</span>
                    </a>
                    <a
                        href="/admin/monitoring"
                        className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <ChartBarIcon className="h-8 w-8 text-cyan-600 mb-2" />
                        <span className="text-sm font-medium text-gray-900">Monitoring</span>
                    </a>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;