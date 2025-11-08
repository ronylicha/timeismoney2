import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
    ServerIcon,
    CpuChipIcon,
    CircleStackIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const AdminMonitoring: React.FC = () => {
    const { t } = useTranslation();
    const [systemStatus, setSystemStatus] = useState({
        database: 'healthy',
        cache: 'healthy',
        storage: 'healthy',
        queue: 'healthy',
    });

    // Simulated system metrics (in production, this would come from real monitoring)
    const { data: metrics, isLoading } = useQuery({
        queryKey: ['system-metrics'],
        queryFn: async () => {
            // This would be replaced with actual API call
            return {
                cpu: 45,
                memory: 62,
                disk: 38,
                database_connections: 12,
                active_users: 47,
                requests_per_minute: 120,
                average_response_time: 145,
                uptime: 99.98,
            };
        },
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    // Simulated time-series data for charts
    const generateTimeSeriesData = () => {
        const data = [];
        const now = new Date();
        for (let i = 23; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 60000); // Last 24 minutes
            data.push({
                time: format(time, 'HH:mm'),
                requests: Math.floor(Math.random() * 200) + 50,
                responseTime: Math.floor(Math.random() * 100) + 100,
            });
        }
        return data;
    };

    const [chartData, setChartData] = useState(generateTimeSeriesData());

    useEffect(() => {
        const interval = setInterval(() => {
            setChartData(generateTimeSeriesData());
        }, 60000); // Update every minute

        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy':
                return 'text-green-600 bg-green-100';
            case 'warning':
                return 'text-yellow-600 bg-yellow-100';
            case 'critical':
                return 'text-red-600 bg-red-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'healthy':
                return <CheckCircleIcon className="h-5 w-5" />;
            case 'warning':
                return <ExclamationTriangleIcon className="h-5 w-5" />;
            case 'critical':
                return <XCircleIcon className="h-5 w-5" />;
            default:
                return <ClockIcon className="h-5 w-5" />;
        }
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
                    <h1 className="text-3xl font-bold text-gray-900">{t('admin.monitoring.title')}</h1>
                    <p className="mt-2 text-gray-600">{t('admin.monitoring.subtitle')}</p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <ArrowPathIcon className="h-5 w-5" />
                    {t('common.refresh')}
                </button>
            </div>

            {/* System Status */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">{t('admin.monitoring.services.database')}</h3>
                        <CircleStackIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getStatusColor(systemStatus.database)}`}>
                        {getStatusIcon(systemStatus.database)}
                        <span className="text-sm font-semibold">{t('admin.monitoring.services.operational')}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">{t('admin.monitoring.services.connections', { count: metrics?.database_connections })}</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">{t('admin.monitoring.services.cache')}</h3>
                        <ServerIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getStatusColor(systemStatus.cache)}`}>
                        {getStatusIcon(systemStatus.cache)}
                        <span className="text-sm font-semibold">{t('admin.monitoring.services.operational')}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">{t('admin.monitoring.services.redisActive')}</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">{t('admin.monitoring.services.storage')}</h3>
                        <CircleStackIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getStatusColor(systemStatus.storage)}`}>
                        {getStatusIcon(systemStatus.storage)}
                        <span className="text-sm font-semibold">{t('admin.monitoring.services.operational')}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">{t('admin.monitoring.services.diskUsed', { percent: metrics?.disk })}</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">{t('admin.monitoring.services.queue')}</h3>
                        <ClockIcon className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getStatusColor(systemStatus.queue)}`}>
                        {getStatusIcon(systemStatus.queue)}
                        <span className="text-sm font-semibold">{t('admin.monitoring.services.operational')}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">{t('admin.monitoring.services.queueWorkers')}</p>
                </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">{t('admin.monitoring.metrics.cpu')}</h3>
                        <CpuChipIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{metrics?.cpu}%</p>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${metrics?.cpu}%` }}
                        ></div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">{t('admin.monitoring.metrics.memory')}</h3>
                        <ServerIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{metrics?.memory}%</p>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-green-600 h-2 rounded-full transition-all"
                            style={{ width: `${metrics?.memory}%` }}
                        ></div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">{t('admin.monitoring.metrics.activeUsers')}</h3>
                        <ServerIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{metrics?.active_users}</p>
                    <p className="text-sm text-gray-600 mt-2">{t('admin.monitoring.metrics.onlineNow')}</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">{t('admin.monitoring.metrics.responseTime')}</h3>
                        <ClockIcon className="h-5 w-5 text-orange-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{metrics?.average_response_time}ms</p>
                    <p className="text-sm text-gray-600 mt-2">{t('admin.monitoring.metrics.average')}</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Requests Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        {t('admin.monitoring.charts.requestsPerMinute')}
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="requests"
                                stroke="#3B82F6"
                                strokeWidth={2}
                                name={t('admin.monitoring.charts.requests')}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Response Time Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        {t('admin.monitoring.charts.responseTimeMs')}
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="responseTime"
                                stroke="#10B981"
                                strokeWidth={2}
                                name={t('admin.monitoring.charts.responseTime')}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* System Information */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.monitoring.systemInfo.title')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">{t('admin.monitoring.systemInfo.uptime')}</p>
                        <p className="text-2xl font-bold text-green-600">{metrics?.uptime}%</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">{t('admin.monitoring.systemInfo.requestsPerMinute')}</p>
                        <p className="text-2xl font-bold text-blue-600">{metrics?.requests_per_minute}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">{t('admin.monitoring.systemInfo.laravelVersion')}</p>
                        <p className="text-2xl font-bold text-gray-900">11.x</p>
                    </div>
                </div>
            </div>

            {/* Recent Alerts */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.monitoring.alerts.title')}</h2>
                <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-green-900">
                                {t('admin.monitoring.alerts.systemOperational')}
                            </p>
                            <p className="text-xs text-green-700">
                                {t('admin.monitoring.alerts.allServicesNormal')}
                            </p>
                        </div>
                        <span className="text-xs text-green-600">{t('admin.monitoring.alerts.timeAgo', { time: '2 min' })}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminMonitoring;
