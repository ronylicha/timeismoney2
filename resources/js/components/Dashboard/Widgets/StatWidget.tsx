import React from 'react';
import { LucideIcon, ArrowUp, ArrowDown, TrendingUp, TrendingDown } from 'lucide-react';

interface StatWidgetProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    iconColor?: string;
    iconBgColor?: string;
    trend?: number;
    trendLabel?: string;
    badge?: string;
    badgeColor?: string;
    onClick?: () => void;
}

const StatWidget: React.FC<StatWidgetProps> = ({
    title,
    value,
    subtitle,
    icon: Icon,
    iconColor = 'text-blue-600 dark:text-blue-400',
    iconBgColor = 'bg-blue-100 dark:bg-blue-900',
    trend,
    trendLabel,
    badge,
    badgeColor = 'bg-red-500',
    onClick,
}) => {
    const hasPositiveTrend = trend !== undefined && trend > 0;
    const hasNegativeTrend = trend !== undefined && trend < 0;

    return (
        <div
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${
                onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''
            }`}
            onClick={onClick}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 ${iconBgColor} rounded-lg`}>
                    <Icon className={iconColor} size={24} />
                </div>
                <div className="flex items-center space-x-2">
                    {badge && (
                        <span
                            className={`${badgeColor} text-white text-xs font-semibold px-2 py-1 rounded-full`}
                        >
                            {badge}
                        </span>
                    )}
                    <span className="text-sm text-gray-500 dark:text-gray-400">{title}</span>
                </div>
            </div>

            {/* Value */}
            <div className="mb-2">
                <div className="text-2xl font-bold text-gray-800 dark:text-white">{value}</div>
            </div>

            {/* Subtitle and Trend */}
            <div className="flex items-center justify-between">
                {subtitle && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</div>
                )}

                {trend !== undefined && (
                    <div className="flex items-center">
                        {hasPositiveTrend ? (
                            <ArrowUp className="text-green-500 mr-1" size={16} />
                        ) : hasNegativeTrend ? (
                            <ArrowDown className="text-red-500 mr-1" size={16} />
                        ) : (
                            <TrendingUp className="text-gray-400 mr-1" size={16} />
                        )}
                        <span
                            className={`text-sm font-medium ${
                                hasPositiveTrend
                                    ? 'text-green-500'
                                    : hasNegativeTrend
                                    ? 'text-red-500'
                                    : 'text-gray-400'
                            }`}
                        >
                            {Math.abs(trend).toFixed(1)}%
                        </span>
                        {trendLabel && (
                            <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                                {trendLabel}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatWidget;
