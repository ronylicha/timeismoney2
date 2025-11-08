import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
    Clock,
    TrendingUp,
    DollarSign,
    Users,
    Calendar,
    ArrowUp,
    ArrowDown,
    Activity,
    FileText,
    AlertCircle,
    CheckCircle,
    Timer,
    Briefcase
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTimer } from '../hooks/useTimer';
import {
    formatDuration,
    formatDate,
    formatDateTime,
    getRelativeTime,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    formatDateForApi
} from '../utils/time';
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

interface DashboardStats {
    today: {
        hours: number;
        earnings: number;
        entries: number;
    };
    week: {
        hours: number;
        earnings: number;
        entries: number;
        trend: number;
    };
    month: {
        hours: number;
        earnings: number;
        entries: number;
        trend: number;
    };
    projects: {
        active: number;
        completed: number;
        on_hold: number;
    };
    invoices: {
        pending: number;
        pending_amount: number;
        overdue: number;
        overdue_amount: number;
        paid_this_month: number;
        paid_amount: number;
    };
    tasks: {
        todo: number;
        in_progress: number;
        completed: number;
        overdue: number;
    };
}

interface RecentActivity {
    id: string;
    type: 'time_entry' | 'invoice' | 'project' | 'task' | 'payment';
    description: string;
    created_at: string;
    metadata?: any;
}

interface ChartData {
    daily_hours: Array<{ date: string; hours: number; amount: number }>;
    project_distribution: Array<{ name: string; value: number; hours: number }>;
    monthly_revenue: Array<{ month: string; invoiced: number; paid: number }>;
}

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const { activeTimer, isRunning } = useTimer();
    const [dateRange, setDateRange] = useState<'week' | 'month'>('week');

    // Fetch dashboard statistics
    const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
        queryKey: ['dashboardStats'],
        queryFn: async () => {
            const response = await axios.get('/api/dashboard/stats');
            return response.data;
        },
        refetchInterval: 60000, // Refresh every minute
    });

    // Fetch recent activity
    const { data: activities } = useQuery<RecentActivity[]>({
        queryKey: ['recentActivity'],
        queryFn: async () => {
            const response = await axios.get('/api/dashboard/activity');
            return response.data;
        },
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    // Fetch chart data
    const { data: chartData } = useQuery<ChartData>({
        queryKey: ['dashboardCharts', dateRange],
        queryFn: async () => {
            const response = await axios.get(`/api/dashboard/charts?range=${dateRange}`);
            return response.data;
        },
    });

    // Calculate percentage changes
    const calculateTrend = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    // Colors for charts
    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    // Show loading state
    if (statsLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Show error state if no data
    if (!stats || !stats.today || !stats.week || !stats.month) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                    <p className="text-gray-600 dark:text-gray-400">
                        Unable to load dashboard data
                    </p>
                </div>
            </div>
        );
    }

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount);
    };

    // Render activity icon
    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'time_entry':
                return <Clock className="text-blue-500" size={16} />;
            case 'invoice':
                return <FileText className="text-green-500" size={16} />;
            case 'project':
                return <Briefcase className="text-purple-500" size={16} />;
            case 'task':
                return <CheckCircle className="text-yellow-500" size={16} />;
            case 'payment':
                return <DollarSign className="text-emerald-500" size={16} />;
            default:
                return <Activity className="text-gray-500" size={16} />;
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                    Welcome back, {user?.name}!
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    {formatDate(new Date(), 'fr-FR')}
                </p>
            </div>

            {/* Active Timer Card */}
            {isRunning && (
                <div className="mb-8">
                    <Timer />
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Today's Hours */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                            <Clock className="text-blue-600 dark:text-blue-400" size={24} />
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Today</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-white">
                        {formatDuration((stats?.today?.hours || 0) * 3600)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {stats?.today?.entries || 0} entries
                    </div>
                </div>

                {/* This Week */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                            <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">This Week</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-white">
                        {formatDuration((stats.week.hours || 0) * 3600)}
                    </div>
                    <div className="flex items-center mt-1">
                        {stats.week.trend !== undefined && (
                            <>
                                {stats.week.trend > 0 ? (
                                    <ArrowUp className="text-green-500 mr-1" size={16} />
                                ) : (
                                    <ArrowDown className="text-red-500 mr-1" size={16} />
                                )}
                                <span
                                    className={`text-sm ${
                                        stats.week.trend > 0 ? 'text-green-500' : 'text-red-500'
                                    }`}
                                >
                                    {Math.abs(stats.week.trend).toFixed(1)}%
                                </span>
                            </>
                        )}
                        <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                            vs last week
                        </span>
                    </div>
                </div>

                {/* Pending Invoices */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                            <FileText className="text-yellow-600 dark:text-yellow-400" size={24} />
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Pending</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-white">
                        {formatCurrency(stats.invoices.pending_amount || 0)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {stats.invoices.pending || 0} invoices
                    </div>
                    {stats.invoices.overdue && stats.invoices.overdue > 0 && (
                        <div className="flex items-center mt-2 text-red-600">
                            <AlertCircle size={14} className="mr-1" />
                            <span className="text-xs">{stats.invoices.overdue} overdue</span>
                        </div>
                    )}
                </div>

                {/* Active Projects */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                            <Briefcase className="text-purple-600 dark:text-purple-400" size={24} />
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Projects</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-white">
                        {stats?.projects.active || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Active projects
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Time Tracking Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                        Time Tracking Trend
                    </h2>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={chartData?.daily_hours || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                                dataKey="date"
                                stroke="#6b7280"
                                tick={{ fontSize: 12 }}
                                tickFormatter={(value) => {
                                    const date = new Date(value);
                                    return date.toLocaleDateString('fr-FR', {
                                        day: 'numeric',
                                        month: 'short',
                                    });
                                }}
                            />
                            <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                            <Tooltip
                                formatter={(value: any, name: string) => {
                                    if (name === 'hours') {
                                        return `${value.toFixed(2)}h`;
                                    }
                                    return formatCurrency(value);
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="hours"
                                stroke="#3B82F6"
                                strokeWidth={2}
                                dot={{ fill: '#3B82F6', r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Project Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                        Project Distribution
                    </h2>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={chartData?.project_distribution || []}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) =>
                                    `${name} (${(percent * 100).toFixed(0)}%)`
                                }
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {(chartData?.project_distribution || []).map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                        Recent Activity
                    </h2>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {activities?.map((activity) => (
                            <div
                                key={activity.id}
                                className="flex items-start space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <div className="flex-shrink-0 mt-1">
                                    {getActivityIcon(activity.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-800 dark:text-white">
                                        {activity.description}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {getRelativeTime(activity.created_at)}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {(!activities || activities.length === 0) && (
                            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                                No recent activity
                            </p>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                        Quick Actions
                    </h2>
                    <div className="space-y-3">
                        <Link
                            to="/time"
                            className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                            <div className="flex items-center">
                                <Timer className="text-blue-600 dark:text-blue-400 mr-3" size={20} />
                                <span className="text-sm font-medium text-gray-800 dark:text-white">
                                    Start Timer
                                </span>
                            </div>
                            <ArrowUp className="text-gray-400" size={16} />
                        </Link>
                        <Link
                            to="/invoices/new"
                            className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                        >
                            <div className="flex items-center">
                                <FileText
                                    className="text-green-600 dark:text-green-400 mr-3"
                                    size={20}
                                />
                                <span className="text-sm font-medium text-gray-800 dark:text-white">
                                    Create Invoice
                                </span>
                            </div>
                            <ArrowUp className="text-gray-400" size={16} />
                        </Link>
                        <Link
                            to="/projects"
                            className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                        >
                            <div className="flex items-center">
                                <Briefcase
                                    className="text-purple-600 dark:text-purple-400 mr-3"
                                    size={20}
                                />
                                <span className="text-sm font-medium text-gray-800 dark:text-white">
                                    New Project
                                </span>
                            </div>
                            <ArrowUp className="text-gray-400" size={16} />
                        </Link>
                        <Link
                            to="/timesheet"
                            className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                        >
                            <div className="flex items-center">
                                <Calendar
                                    className="text-yellow-600 dark:text-yellow-400 mr-3"
                                    size={20}
                                />
                                <span className="text-sm font-medium text-gray-800 dark:text-white">
                                    View Timesheet
                                </span>
                            </div>
                            <ArrowUp className="text-gray-400" size={16} />
                        </Link>
                    </div>

                    {/* Tasks Summary */}
                    {stats?.tasks && (
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">
                                Tasks Overview
                            </h3>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-600 dark:text-gray-400">
                                        To Do
                                    </span>
                                    <span className="text-xs font-semibold text-gray-800 dark:text-white">
                                        {stats.tasks.todo}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-600 dark:text-gray-400">
                                        In Progress
                                    </span>
                                    <span className="text-xs font-semibold text-blue-600">
                                        {stats.tasks.in_progress}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-600 dark:text-gray-400">
                                        Completed
                                    </span>
                                    <span className="text-xs font-semibold text-green-600">
                                        {stats.tasks.completed}
                                    </span>
                                </div>
                                {stats.tasks.overdue > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-600 dark:text-gray-400">
                                            Overdue
                                        </span>
                                        <span className="text-xs font-semibold text-red-600">
                                            {stats.tasks.overdue}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;