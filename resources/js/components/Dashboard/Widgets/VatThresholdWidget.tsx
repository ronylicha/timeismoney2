import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { AlertTriangle, CheckCircle, Info, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VatThresholdData {
    regime: string;
    subject: boolean;
    businessType: string;
    yearlyRevenue: number;
    threshold: number;
    percentage: number;
    exceededAt: string | null;
    autoApply: boolean;
    thresholdLabel: string;
}

const VatThresholdWidget: React.FC = () => {
    const navigate = useNavigate();

    const { data, isLoading, error } = useQuery<VatThresholdData>({
        queryKey: ['vatThreshold'],
        queryFn: async () => {
            const response = await axios.get('/api/tenant/vat-threshold-status');
            return response.data;
        },
        refetchInterval: 300000, // Refresh every 5 minutes
    });

    // Don't show widget if not in franchise_base regime
    if (!isLoading && (!data || data.regime !== 'franchise_base')) {
        return null;
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
        );
    }

    // Error state
    if (error || !data) {
        return null;
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const percentage = data.percentage;
    const isNearThreshold = percentage >= 90;
    const isAboveThreshold = percentage >= 100;

    // Determine color scheme based on threshold percentage
    const getColorScheme = () => {
        if (isAboveThreshold) {
            return {
                bg: 'bg-red-50 dark:bg-red-900/20',
                border: 'border-red-200 dark:border-red-800',
                text: 'text-red-900 dark:text-red-200',
                icon: 'text-red-600 dark:text-red-400',
                iconBg: 'bg-red-100 dark:bg-red-900',
                progressBar: 'bg-red-600',
            };
        } else if (isNearThreshold) {
            return {
                bg: 'bg-orange-50 dark:bg-orange-900/20',
                border: 'border-orange-200 dark:border-orange-800',
                text: 'text-orange-900 dark:text-orange-200',
                icon: 'text-orange-600 dark:text-orange-400',
                iconBg: 'bg-orange-100 dark:bg-orange-900',
                progressBar: 'bg-orange-500',
            };
        } else {
            return {
                bg: 'bg-blue-50 dark:bg-blue-900/20',
                border: 'border-blue-200 dark:border-blue-800',
                text: 'text-blue-900 dark:text-blue-200',
                icon: 'text-blue-600 dark:text-blue-400',
                iconBg: 'bg-blue-100 dark:bg-blue-900',
                progressBar: 'bg-blue-600',
            };
        }
    };

    const colors = getColorScheme();
    const Icon = isAboveThreshold ? AlertTriangle : isNearThreshold ? Info : CheckCircle;

    const handleClick = () => {
        navigate('/settings/billing');
    };

    return (
        <div
            className={`${colors.bg} border-2 ${colors.border} rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-all`}
            onClick={handleClick}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <div className={`p-3 ${colors.iconBg} rounded-lg`}>
                        <TrendingUp className={colors.icon} size={24} />
                    </div>
                    <div>
                        <h3 className={`text-lg font-semibold ${colors.text}`}>
                            Seuil de franchise TVA
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {data.thresholdLabel}
                        </p>
                    </div>
                </div>
                <Icon className={colors.icon} size={32} />
            </div>

            {/* Circular Progress Gauge */}
            <div className="relative w-32 h-32 mx-auto mb-6">
                <svg className="transform -rotate-90 w-32 h-32">
                    {/* Background circle */}
                    <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-gray-200 dark:text-gray-700"
                    />
                    {/* Progress circle */}
                    <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - Math.min(percentage, 100) / 100)}`}
                        className={colors.progressBar}
                        strokeLinecap="round"
                    />
                </svg>
                {/* Percentage text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-bold ${colors.text}`}>
                        {Math.round(percentage)}%
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">du seuil</span>
                </div>
            </div>

            {/* Revenue Info */}
            <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">CA actuel :</span>
                    <span className={`text-lg font-semibold ${colors.text}`}>
                        {formatCurrency(data.yearlyRevenue)}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Seuil :</span>
                    <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                        {formatCurrency(data.threshold)}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Restant :</span>
                    <span className={`text-lg font-semibold ${
                        isAboveThreshold ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                    }`}>
                        {formatCurrency(Math.max(0, data.threshold - data.yearlyRevenue))}
                    </span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
                <div
                    className={`${colors.progressBar} h-3 rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>

            {/* Status Message */}
            <div className={`p-3 rounded-lg ${colors.bg} border ${colors.border}`}>
                {isAboveThreshold ? (
                    <div className="flex items-start space-x-2">
                        <AlertTriangle className={`${colors.icon} flex-shrink-0 mt-0.5`} size={20} />
                        <div>
                            <p className={`text-sm font-semibold ${colors.text}`}>
                                Seuil dépassé !
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {data.autoApply 
                                    ? 'TVA à 20% appliquée automatiquement sur vos nouvelles factures'
                                    : 'Vous devez passer en régime normal avec TVA à 20%'
                                }
                            </p>
                        </div>
                    </div>
                ) : isNearThreshold ? (
                    <div className="flex items-start space-x-2">
                        <Info className={`${colors.icon} flex-shrink-0 mt-0.5`} size={20} />
                        <div>
                            <p className={`text-sm font-semibold ${colors.text}`}>
                                Attention, proche du seuil !
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                Vous approchez du seuil de franchise. Préparez-vous au passage en TVA.
                            </p>
                            <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
                                <p className="font-semibold text-yellow-800 dark:text-yellow-200">⚠️ Rappel légal important</p>
                                <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                                    En cas de dépassement, <strong>TOUS les encaissements du mois concerné</strong> sont assujettis à la TVA (Art. 293 B CGI).
                                    Consultez votre expert-comptable.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : percentage >= 80 ? (
                    <div className="flex items-start space-x-2">
                        <Info className={`${colors.icon} flex-shrink-0 mt-0.5`} size={20} />
                        <div>
                            <p className={`text-sm font-semibold ${colors.text}`}>
                                Surveillance recommandée
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                Vous avez atteint {Math.round(percentage)}% du seuil. Restez vigilant.
                            </p>
                            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs">
                                <p className="font-semibold text-blue-800 dark:text-blue-200">💡 Conseil</p>
                                <p className="text-blue-700 dark:text-blue-300 mt-1">
                                    Envisagez de facturer avec TVA dès maintenant pour éviter une régularisation rétroactive en cas de dépassement.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-start space-x-2">
                        <CheckCircle className={`${colors.icon} flex-shrink-0 mt-0.5`} size={20} />
                        <div>
                            <p className={`text-sm font-semibold ${colors.text}`}>
                                Franchise en base active
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                Vos factures sont à 0% de TVA. Tout va bien !
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer hint */}
            <div className="mt-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Cliquez pour accéder aux paramètres TVA
                </p>
            </div>
        </div>
    );
};

export default VatThresholdWidget;
