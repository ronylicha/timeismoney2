import React from 'react';
import WidgetContainer from './WidgetContainer';
import { Users, TrendingUp, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ClientStats {
    total: number;
    active: number;
    inactive: number;
    new_this_month: number;
    total_revenue: number;
}

interface ClientStatsWidgetProps {
    stats?: ClientStats;
    isLoading?: boolean;
}

const ClientStatsWidget: React.FC<ClientStatsWidgetProps> = ({ stats, isLoading = false }) => {
    if (!stats) {
        return null;
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount);
    };

    const activePercentage = stats.total > 0 ? (stats.active / stats.total) * 100 : 0;

    return (
        <WidgetContainer
            title="Clients"
            icon={Users}
            iconColor="text-indigo-600 dark:text-indigo-400"
            iconBgColor="bg-indigo-100 dark:bg-indigo-900"
            isLoading={isLoading}
            actions={
                <Link
                    to="/clients"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                    Voir tous
                </Link>
            }
        >
            <div className="space-y-4">
                {/* Total Clients */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-3xl font-bold text-gray-800 dark:text-white">
                            {stats.total}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total clients</p>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-semibold text-green-600">{stats.active}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Actifs</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>Taux d'activité</span>
                        <span>{activePercentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-indigo-600 h-2 rounded-full transition-all"
                            style={{ width: `${activePercentage}%` }}
                        ></div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                            <TrendingUp className="text-green-600 dark:text-green-400" size={16} />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                                Ce mois
                            </span>
                        </div>
                        <p className="text-lg font-semibold text-green-600 dark:text-green-400 mt-1">
                            +{stats.new_this_month}
                        </p>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                            <TrendingUp className="text-blue-600 dark:text-blue-400" size={16} />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                                Revenu total
                            </span>
                        </div>
                        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">
                            {formatCurrency(stats.total_revenue)}
                        </p>
                    </div>
                </div>
            </div>
        </WidgetContainer>
    );
};

export default ClientStatsWidget;
