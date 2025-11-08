import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Layout } from 'react-grid-layout';
import {
    Clock,
    TrendingUp,
    DollarSign,
    FileText,
    AlertCircle,
    Briefcase,
    Settings as SettingsIcon,
    RotateCcw,
    Sliders,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTimer } from '../hooks/useTimer';
import { formatDuration, formatDate } from '../utils/time';

// Import new widgets
import {
    StatWidget,
    TimeTrackingChart,
    ProjectDistributionChart,
    MonthlyRevenueChart,
    RecentActivityWidget,
    QuickActionsWidget,
    TasksSummaryWidget,
    ClientStatsWidget,
    ExpensesSummaryWidget,
    TopProjectsWidget,
} from '../components/Dashboard/Widgets';
import DashboardGrid from '../components/Dashboard/DashboardGrid';
import DashboardSettings from '../components/Dashboard/DashboardSettings';
import DateRangeFilter from '../components/Dashboard/DateRangeFilter';
import { useDashboardPreferences } from '../hooks/useDashboardPreferences';
import { DateRangeType, CustomDateRange, UserRole } from '../types/dashboard';

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

    // Dashboard preferences
    const {
        preferences,
        isLoading: preferencesLoading,
        getCurrentLayout,
        getVisibleWidgets,
        setCustomLayout,
        savePreferences,
        resetPreferences,
    } = useDashboardPreferences(user?.id || 0, (user?.role as UserRole) || 'employee');

    const [editMode, setEditMode] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [dateRange, setDateRange] = useState<DateRangeType>(
        preferences.defaultDateRange || 'week'
    );
    const [customDateRange, setCustomDateRange] = useState<CustomDateRange | undefined>(
        preferences.customDateRange
    );

    // Get current layout based on preferences
    const currentLayout = getCurrentLayout();
    const visibleWidgets = getVisibleWidgets();

    // Fetch dashboard statistics
    const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
        queryKey: ['dashboardStats'],
        queryFn: async () => {
            const response = await axios.get('/dashboard/stats');
            return response.data;
        },
        refetchInterval: preferences.refreshInterval || 60000,
    });

    // Fetch recent activity
    const { data: activities, isLoading: activitiesLoading } = useQuery<RecentActivity[]>({
        queryKey: ['recentActivity'],
        queryFn: async () => {
            const response = await axios.get('/dashboard/activity');
            return response.data;
        },
        refetchInterval: preferences.refreshInterval || 60000,
    });

    // Fetch chart data
    const { data: chartData, isLoading: chartsLoading } = useQuery<ChartData>({
        queryKey: ['dashboardCharts', dateRange, customDateRange],
        queryFn: async () => {
            let url = `/dashboard/charts?range=${dateRange}`;
            if (dateRange === 'custom' && customDateRange) {
                url += `&start=${customDateRange.start}&end=${customDateRange.end}`;
            }
            const response = await axios.get(url);
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

    // Handle layout change
    const handleLayoutChange = (newLayout: Layout[]) => {
        setCustomLayout(newLayout);
    };

    // Toggle edit mode
    const toggleEditMode = () => {
        setEditMode(!editMode);
    };

    // Handle date range change
    const handleDateRangeChange = (range: DateRangeType, custom?: CustomDateRange) => {
        setDateRange(range);
        if (custom) {
            setCustomDateRange(custom);
        }
    };

    // Handle settings save
    const handleSettingsSave = (newPreferences: typeof preferences) => {
        savePreferences(newPreferences);
        setDateRange(newPreferences.defaultDateRange);
        setCustomDateRange(newPreferences.customDateRange);
    };

    // Handle reset
    const handleReset = () => {
        resetPreferences();
    };

    // Helper to check if widget is visible
    const isWidgetVisible = (widgetId: string) => visibleWidgets.includes(widgetId as any);

    // Show loading state
    if (statsLoading || preferencesLoading) {
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
                <div className="flex items-center justify-between mb-4">
                    <div>
                        {preferences.showWelcomeMessage && (
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                                {t('dashboard.welcome')}, {user?.name} !
                            </h1>
                        )}
                        <p className="text-gray-600 dark:text-gray-400 mt-2">
                            {formatDate(new Date(), 'fr-FR')}
                        </p>
                    </div>

                    {/* Dashboard Controls */}
                    <div className="flex items-center space-x-3">
                        {/* Date Range Filter */}
                        <DateRangeFilter
                            value={dateRange}
                            customRange={customDateRange}
                            onChange={handleDateRangeChange}
                        />

                        <button
                            onClick={handleReset}
                            className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            title={t('common.reset')}
                        >
                            <RotateCcw size={18} className="mr-2" />
                            {t('common.reset')}
                        </button>
                        <button
                            onClick={() => setShowSettings(true)}
                            className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            <Sliders size={18} className="mr-2" />
                            {t('settings.title')}
                        </button>
                        <button
                            onClick={toggleEditMode}
                            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                                editMode
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            <SettingsIcon size={18} className="mr-2" />
                            {editMode ? t('common.finish') : 'Personnaliser'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Dashboard Grid with Widgets */}
            <DashboardGrid
                layouts={currentLayout}
                onLayoutChange={handleLayoutChange}
                editable={editMode}
            >
                {/* Today's Hours Widget */}
                {isWidgetVisible('today-hours') && (
                    <StatWidget
                        title={t('dashboard.stats.today')}
                        value={formatDuration((stats?.today?.hours || 0) * 3600)}
                        subtitle={`${stats?.today?.entries || 0} ${t('dashboard.stats.entries')}`}
                        icon={Clock}
                        iconColor="text-blue-600 dark:text-blue-400"
                        iconBgColor="bg-blue-100 dark:bg-blue-900"
                    />
                )}

                {/* This Week Widget */}
                {isWidgetVisible('week-hours') && (
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

                {/* Monthly Revenue Chart */}
                <MonthlyRevenueChart
                    data={chartData?.monthly_revenue || []}
                    isLoading={chartsLoading}
                />

                {/* Recent Activity Widget */}
                <RecentActivityWidget
                    activities={activities || []}
                    isLoading={activitiesLoading}
                />

                {/* Quick Actions Widget */}
                <QuickActionsWidget />

                {/* Tasks Summary Widget */}
                <TasksSummaryWidget tasks={stats?.tasks} isLoading={statsLoading} />
            </DashboardGrid>
        </div>
    );
};

export default Dashboard;
