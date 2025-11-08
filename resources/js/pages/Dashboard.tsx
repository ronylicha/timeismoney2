import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
    Clock,
    TrendingUp,
    DollarSign,
    FileText,
    AlertCircle,
    Briefcase,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTimer } from '../hooks/useTimer';
import { formatDuration, formatDate } from '../utils/time';

// Import widgets
import {
    StatWidget,
    TimeTrackingChart,
    ProjectDistributionChart,
    MonthlyRevenueChart,
    RecentActivityWidget,
    QuickActionsWidget,
    TasksSummaryWidget,
} from '../components/Dashboard/Widgets';

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
    const { t } = useTranslation();
    const { user } = useAuth();
    const { activeTimer, isRunning } = useTimer();

    // Fetch dashboard statistics
    const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
        queryKey: ['dashboardStats'],
        queryFn: async () => {
            const response = await axios.get('/dashboard/stats');
            return response.data;
        },
        refetchInterval: 60000, // Refresh every minute
    });

    // Fetch recent activity
    const { data: activities, isLoading: activitiesLoading } = useQuery<RecentActivity[]>({
        queryKey: ['recentActivity'],
        queryFn: async () => {
            const response = await axios.get('/dashboard/activity');
            return response.data;
        },
        refetchInterval: 60000,
    });

    // Fetch chart data
    const { data: chartData, isLoading: chartsLoading } = useQuery<ChartData>({
        queryKey: ['dashboardCharts'],
        queryFn: async () => {
            const response = await axios.get('/dashboard/charts?range=week');
            return response.data;
        },
    });

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount);
    };

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
                        {t('dashboard.unableToLoad')}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                    {t('dashboard.welcome')}, {user?.name}!
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    {formatDate(new Date(), 'fr-FR')}
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Today's Hours Widget */}
                <StatWidget
                    title={t('dashboard.stats.today')}
                    value={formatDuration((stats?.today?.hours || 0) * 3600)}
                    subtitle={`${stats?.today?.entries || 0} ${t('dashboard.stats.entries')}`}
                    icon={Clock}
                    iconColor="text-blue-600 dark:text-blue-400"
                    iconBgColor="bg-blue-100 dark:bg-blue-900"
                />

                {/* This Week Widget */}
                <StatWidget
                    title={t('dashboard.stats.thisWeek')}
                    value={formatDuration((stats.week.hours || 0) * 3600)}
                    subtitle={`${stats.week.entries || 0} ${t('dashboard.stats.entries')}`}
                    icon={TrendingUp}
                    iconColor="text-green-600 dark:text-green-400"
                    iconBgColor="bg-green-100 dark:bg-green-900"
                    trend={stats.week.trend}
                    trendLabel={t('dashboard.stats.vsLastWeek')}
                />

                {/* Pending Invoices Widget */}
                <StatWidget
                    title={t('dashboard.stats.pending')}
                    value={formatCurrency(stats.invoices.pending_amount || 0)}
                    subtitle={`${stats.invoices.pending || 0} ${t('dashboard.stats.invoices')}`}
                    icon={FileText}
                    iconColor="text-yellow-600 dark:text-yellow-400"
                    iconBgColor="bg-yellow-100 dark:bg-yellow-900"
                    badge={
                        stats.invoices.overdue && stats.invoices.overdue > 0
                            ? `${stats.invoices.overdue} ${t('dashboard.stats.overdue')}`
                            : undefined
                    }
                    badgeColor="bg-red-500"
                />

                {/* Active Projects Widget */}
                <StatWidget
                    title={t('projects.title')}
                    value={stats?.projects.active || 0}
                    subtitle={t('dashboard.stats.activeProjects')}
                    icon={Briefcase}
                    iconColor="text-purple-600 dark:text-purple-400"
                    iconBgColor="bg-purple-100 dark:bg-purple-900"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Time Tracking Chart */}
                <TimeTrackingChart
                    data={chartData?.daily_hours || []}
                    isLoading={chartsLoading}
                />

                {/* Project Distribution Chart */}
                <ProjectDistributionChart
                    data={chartData?.project_distribution || []}
                    isLoading={chartsLoading}
                />
            </div>

            {/* Monthly Revenue Chart */}
            <div className="mb-8">
                <MonthlyRevenueChart
                    data={chartData?.monthly_revenue || []}
                    isLoading={chartsLoading}
                />
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity Widget */}
                <RecentActivityWidget
                    activities={activities || []}
                    isLoading={activitiesLoading}
                />

                {/* Quick Actions and Tasks */}
                <div className="space-y-6">
                    <QuickActionsWidget />
                    <TasksSummaryWidget tasks={stats?.tasks} isLoading={statsLoading} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
