import React from 'react';
import WidgetContainer from './WidgetContainer';
import { Wallet, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ExpenseStats {
    this_month: number;
    last_month: number;
    pending: number;
    categories: Array<{ name: string; amount: number }>;
}

interface ExpensesSummaryWidgetProps {
    stats?: ExpenseStats;
    isLoading?: boolean;
}

const ExpensesSummaryWidget: React.FC<ExpensesSummaryWidgetProps> = ({
    stats,
    isLoading = false,
}) => {
    if (!stats) {
        return null;
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount);
    };

    const trend =
        stats.last_month > 0
            ? ((stats.this_month - stats.last_month) / stats.last_month) * 100
            : 0;
    const hasIncrease = trend > 0;

    return (
        <WidgetContainer
            title="Dépenses"
            icon={Wallet}
            iconColor="text-red-600 dark:text-red-400"
            iconBgColor="bg-red-100 dark:bg-red-900"
            isLoading={isLoading}
            actions={
                <Link
                    to="/expenses"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                    Voir toutes
                </Link>
            }
        >
            <div className="space-y-4">
                {/* This Month */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-2xl font-bold text-gray-800 dark:text-white">
                            {formatCurrency(stats.this_month)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Ce mois-ci</p>
                    </div>
                    <div className="flex items-center space-x-1">
                        {hasIncrease ? (
                            <TrendingUp className="text-red-500" size={20} />
                        ) : (
                            <TrendingDown className="text-green-500" size={20} />
                        )}
                        <span
                            className={`text-sm font-semibold ${
                                hasIncrease ? 'text-red-500' : 'text-green-500'
                            }`}
                        >
                            {Math.abs(trend).toFixed(1)}%
                        </span>
                    </div>
                </div>

                {/* Pending Expenses */}
                {stats.pending > 0 && (
                    <div className="flex items-center space-x-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <AlertCircle className="text-yellow-600 dark:text-yellow-400" size={16} />
                        <span className="text-sm text-yellow-800 dark:text-yellow-300">
                            {formatCurrency(stats.pending)} en attente
                        </span>
                    </div>
                )}

                {/* Top Categories */}
                <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                        Principales catégories
                    </p>
                    {stats.categories.slice(0, 3).map((category, index) => (
                        <div key={index} className="flex justify-between items-center">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                {category.name}
                            </span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(category.amount)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </WidgetContainer>
    );
};

export default ExpensesSummaryWidget;
