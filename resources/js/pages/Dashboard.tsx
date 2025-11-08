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
    Settings,
    RotateCcw,
} from 'lucide-react';
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
} from '../components/Dashboard/Widgets';
import DashboardGrid from '../components/Dashboard/DashboardGrid';
import {
    defaultLayout,
    loadLayout,
    saveLayout,
    resetLayout,
} from '../components/Dashboard/defaultLayouts';

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
    const [editMode, setEditMode] = useState(false);
    const [layout, setLayout] = useState<Layout[]>(defaultLayout);

    // Load saved layout on mount
    useEffect(() => {
        if (user?.id) {
            const savedLayout = loadLayout(user.id);
            if (savedLayout) {
                setLayout(savedLayout);
            }
        }
    }, [user?.id]);

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
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    // Fetch chart data
    const { data: chartData, isLoading: chartsLoading } = useQuery<ChartData>({
        queryKey: ['dashboardCharts', dateRange],
        queryFn: async () => {
            const response = await axios.get(`/dashboard/charts?range=${dateRange}`);
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
        setLayout(newLayout);
        if (user?.id) {
            saveLayout(newLayout, user.id);
        }
    };

    // Toggle edit mode
    const toggleEditMode = () => {
        setEditMode(!editMode);
    };

    // Reset to default layout
    const handleResetLayout = () => {
        setLayout(defaultLayout);
        if (user?.id) {
            resetLayout(user.id);
        }
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
                        Unable to load dashboard data
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                        Bon retour, {user?.name} !
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        {formatDate(new Date(), 'fr-FR')}
                    </p>
                </div>

                {/* Dashboard Controls */}
                <div className="flex items-center space-x-3">
                    <button
                        onClick={handleResetLayout}
                        className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Réinitialiser la disposition"
                    >
                        <RotateCcw size={18} className="mr-2" />
                        Réinitialiser
                    </button>
                    <button
                        onClick={toggleEditMode}
                        className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                            editMode
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                        <Settings size={18} className="mr-2" />
                        {editMode ? 'Terminer' : 'Personnaliser'}
                    </button>
                </div>
            </div>

            {/* Dashboard Grid with Widgets */}
            <DashboardGrid
                layouts={layout}
                onLayoutChange={handleLayoutChange}
                editable={editMode}
            >
                {/* Today's Hours Widget */}
                <StatWidget
                    title="Aujourd'hui"
                    value={formatDuration((stats?.today?.hours || 0) * 3600)}
                    subtitle={`${stats?.today?.entries || 0} entrées`}
                    icon={Clock}
                    iconColor="text-blue-600 dark:text-blue-400"
                    iconBgColor="bg-blue-100 dark:bg-blue-900"
                />

                {/* This Week Widget */}
                <StatWidget
                    title="Cette semaine"
                    value={formatDuration((stats.week.hours || 0) * 3600)}
                    subtitle={`${stats.week.entries || 0} entrées`}
                    icon={TrendingUp}
                    iconColor="text-green-600 dark:text-green-400"
                    iconBgColor="bg-green-100 dark:bg-green-900"
                    trend={stats.week.trend}
                    trendLabel="vs semaine dernière"
                />

                {/* Pending Invoices Widget */}
                <StatWidget
                    title="En attente"
                    value={formatCurrency(stats.invoices.pending_amount || 0)}
                    subtitle={`${stats.invoices.pending || 0} factures`}
                    icon={FileText}
                    iconColor="text-yellow-600 dark:text-yellow-400"
                    iconBgColor="bg-yellow-100 dark:bg-yellow-900"
                    badge={
                        stats.invoices.overdue && stats.invoices.overdue > 0
                            ? `${stats.invoices.overdue} en retard`
                            : undefined
                    }
                    badgeColor="bg-red-500"
                />

                {/* Active Projects Widget */}
                <StatWidget
                    title="Projets"
                    value={stats?.projects.active || 0}
                    subtitle="Projets actifs"
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
