import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
    ChartBarIcon,
    UserGroupIcon,
    BuildingOfficeIcon,
    CurrencyEuroIcon,
    ArrowTrendingUpIcon,
    ArrowDownTrayIcon,
    CalendarIcon
} from '@heroicons/react/24/outline';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

const AdminReports: React.FC = () => {
    const { t } = useTranslation();
    const [dateRange, setDateRange] = useState('30days');

    // Fetch admin stats
    const { data: stats, isLoading } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            const response = await axios.get('/admin/stats');
            return response.data;
        },
    });

    // Generate growth chart data
    const generateGrowthData = () => {
        const data = [];
        for (let i = 11; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            data.push({
                month: format(date, 'MMM yyyy', { locale: fr }),
                users: Math.floor(Math.random() * 50) + 100 + (11 - i) * 10,
                tenants: Math.floor(Math.random() * 10) + 20 + (11 - i) * 2,
                revenue: Math.floor(Math.random() * 5000) + 10000 + (11 - i) * 1000,
            });
        }
        return data;
    };

    // Generate user activity data
    const generateActivityData = () => {
        const data = [];
        for (let i = 29; i >= 0; i--) {
            const date = subDays(new Date(), i);
            data.push({
                date: format(date, 'dd MMM', { locale: fr }),
                activeUsers: Math.floor(Math.random() * 100) + 50,
                newUsers: Math.floor(Math.random() * 20) + 5,
            });
        }
        return data;
    };

    const growthData = generateGrowthData();
    const activityData = generateActivityData();

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    const planDistribution = [
        { name: t('admin.reports.plans.free'), value: 45, color: '#9CA3AF' },
        { name: t('admin.reports.plans.starter'), value: 30, color: '#3B82F6' },
        { name: t('admin.reports.plans.professional'), value: 20, color: '#8B5CF6' },
        { name: t('admin.reports.plans.enterprise'), value: 5, color: '#F59E0B' },
    ];

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{t('admin.reports.title')}</h1>
                    <p className="mt-2 text-gray-600">{t('admin.reports.description')}</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="7days">{t('admin.reports.dateRanges.last7Days')}</option>
                        <option value="30days">{t('admin.reports.dateRanges.last30Days')}</option>
                        <option value="90days">{t('admin.reports.dateRanges.last90Days')}</option>
                        <option value="12months">{t('admin.reports.dateRanges.last12Months')}</option>
                    </select>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <ArrowDownTrayIcon className="h-5 w-5" />
                        {t('admin.reports.export')}
                    </button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">{t('admin.reports.metrics.totalUsers')}</h3>
                        <UserGroupIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats?.total_users || 1247}</p>
                    <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                        <ArrowTrendingUpIcon className="h-4 w-4" />
                        <span>+12.5%</span>
                        <span className="text-gray-500">{t('admin.reports.vsLastMonth')}</span>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">{t('admin.reports.metrics.organizations')}</h3>
                        <BuildingOfficeIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats?.total_tenants || 178}</p>
                    <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                        <ArrowTrendingUpIcon className="h-4 w-4" />
                        <span>+8.3%</span>
                        <span className="text-gray-500">{t('admin.reports.vsLastMonth')}</span>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">{t('admin.reports.metrics.monthlyRevenue')}</h3>
                        <CurrencyEuroIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(stats?.monthly_revenue || 18750)}</p>
                    <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                        <ArrowTrendingUpIcon className="h-4 w-4" />
                        <span>+15.7%</span>
                        <span className="text-gray-500">{t('admin.reports.vsLastMonth')}</span>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">{t('admin.reports.metrics.retentionRate')}</h3>
                        <ChartBarIcon className="h-5 w-5 text-orange-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">94.2%</p>
                    <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                        <ArrowTrendingUpIcon className="h-4 w-4" />
                        <span>+2.1%</span>
                        <span className="text-gray-500">{t('admin.reports.vsLastMonth')}</span>
                    </div>
                </div>
            </div>

            {/* Growth Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Growth */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        {t('admin.reports.charts.userGrowth')}
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={growthData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="users" stroke="#3B82F6" strokeWidth={2} name={t('admin.reports.charts.users')} />
                            <Line type="monotone" dataKey="tenants" stroke="#8B5CF6" strokeWidth={2} name={t('admin.reports.charts.organizations')} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Revenue Growth */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        {t('admin.reports.charts.revenueGrowth')}
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={growthData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                            <Bar dataKey="revenue" fill="#10B981" name={t('admin.reports.charts.revenue')} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Activity and Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Activity */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        {t('admin.reports.charts.dailyActivity')}
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={activityData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="activeUsers" fill="#3B82F6" name={t('admin.reports.charts.activeUsers')} />
                            <Bar dataKey="newUsers" fill="#10B981" name={t('admin.reports.charts.newUsers')} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Plan Distribution */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        {t('admin.reports.charts.planDistribution')}
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={planDistribution}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry) => `${entry.name}: ${entry.value}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {planDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Tenants */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.reports.topOrganizations')}</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.reports.table.organization')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.reports.table.plan')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.reports.table.users')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.reports.table.monthlyRevenue')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.reports.table.activity')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {[
                                { name: 'Acme Corp', plan: 'Enterprise', users: 45, revenue: 199, activity: 98 },
                                { name: 'Tech Solutions', plan: 'Professional', users: 28, revenue: 79, activity: 95 },
                                { name: 'Digital Agency', plan: 'Professional', users: 22, revenue: 79, activity: 87 },
                                { name: 'StartupX', plan: 'Starter', users: 12, revenue: 29, activity: 92 },
                                { name: 'Freelance Hub', plan: 'Starter', users: 8, revenue: 29, activity: 84 },
                            ].map((tenant, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {tenant.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                            {tenant.plan}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {t('admin.reports.table.usersCount', { count: tenant.users })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                                        {formatCurrency(tenant.revenue)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full"
                                                    style={{ width: `${tenant.activity}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-sm text-gray-600">{tenant.activity}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* System Health */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-3">{t('admin.reports.health.systemPerformance')}</h3>
                    <div className="space-y-2">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">{t('admin.reports.health.cpu')}</span>
                                <span className="font-semibold">45%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">{t('admin.reports.health.memory')}</span>
                                <span className="font-semibold">62%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-green-600 h-2 rounded-full" style={{ width: '62%' }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">{t('admin.reports.health.storage')}</span>
                                <span className="font-semibold">38%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '38%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-3">{t('admin.reports.conversion.title')}</h3>
                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-gray-600">{t('admin.reports.conversion.trialToPaid')}</span>
                                <span className="text-lg font-bold text-green-600">32%</span>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-gray-600">{t('admin.reports.conversion.freeToPaid')}</span>
                                <span className="text-lg font-bold text-blue-600">18%</span>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-gray-600">{t('admin.reports.conversion.planUpgrade')}</span>
                                <span className="text-lg font-bold text-purple-600">25%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-3">{t('admin.reports.support.title')}</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{t('admin.reports.support.openTickets')}</span>
                            <span className="text-lg font-bold text-orange-600">12</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{t('admin.reports.support.avgResponseTime')}</span>
                            <span className="text-lg font-bold text-blue-600">2.3h</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{t('admin.reports.support.satisfaction')}</span>
                            <span className="text-lg font-bold text-green-600">4.8/5</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminReports;
