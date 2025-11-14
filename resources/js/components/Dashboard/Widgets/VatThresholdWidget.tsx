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
            const response = await axios.get('/tenant/vat-threshold-status');
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
    const getProgressColor = () => {
        if (isAboveThreshold) return '#dc2626'; // red-600
        if (isNearThreshold) return '#f59e0b'; // amber-500
        return '#10b981'; // green-500
    };

    const getStatusInfo = () => {
        if (isAboveThreshold) {
            return {
                icon: AlertTriangle,
                color: '#dc2626',
                title: 'Seuil dépassé',
                message: data.autoApply
                    ? 'TVA à 20% appliquée automatiquement sur vos nouvelles factures'
                    : 'Vous devez passer en régime normal avec TVA à 20%'
            };
        } else if (isNearThreshold) {
            return {
                icon: Info,
                color: '#f59e0b',
                title: 'Attention, proche du seuil',
                message: 'Vous approchez du seuil de franchise. Préparez-vous au passage en TVA.'
            };
        } else {
            return {
                icon: CheckCircle,
                color: '#10b981',
                title: 'Franchise en base active',
                message: 'Vos factures sont à 0% de TVA. Tout va bien !'
            };
        }
    };

    const statusInfo = getStatusInfo();
    const StatusIcon = statusInfo.icon;

    const handleClick = () => {
        navigate('/settings/billing');
    };

    const widgetStyles: React.CSSProperties = {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        padding: '0',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
    };

    return (
        <div
            className="vat-threshold-widget"
            onClick={handleClick}
            style={widgetStyles}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.12)';
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            <style>
                {`
                    .vat-threshold-widget * {
                        box-sizing: border-box !important;
                    }
                    .vat-widget-header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                        padding: 20px 24px !important;
                    }
                    .vat-widget-header-icon {
                        background-color: rgba(255, 255, 255, 0.2) !important;
                        border-radius: 8px !important;
                        padding: 8px !important;
                        display: inline-flex !important;
                        margin-right: 12px !important;
                    }
                    .vat-widget-title {
                        font-size: 18px !important;
                        font-weight: 700 !important;
                        color: #ffffff !important;
                        margin: 0 0 4px 0 !important;
                        line-height: 1.2 !important;
                    }
                    .vat-widget-subtitle {
                        font-size: 13px !important;
                        color: rgba(255, 255, 255, 0.9) !important;
                        margin: 0 !important;
                    }
                    .vat-widget-body {
                        padding: 24px !important;
                    }
                    .vat-widget-progress-container {
                        display: flex !important;
                        align-items: center !important;
                        gap: 24px !important;
                        margin-bottom: 24px !important;
                    }
                    .vat-widget-circle {
                        flex-shrink: 0 !important;
                        position: relative !important;
                        width: 120px !important;
                        height: 120px !important;
                    }
                    .vat-widget-circle-text {
                        position: absolute !important;
                        top: 50% !important;
                        left: 50% !important;
                        transform: translate(-50%, -50%) !important;
                        text-align: center !important;
                    }
                    .vat-widget-percentage {
                        font-size: 32px !important;
                        font-weight: 800 !important;
                        line-height: 1 !important;
                        display: block !important;
                    }
                    .vat-widget-percentage-label {
                        font-size: 11px !important;
                        color: #6b7280 !important;
                        margin-top: 4px !important;
                        display: block !important;
                    }
                    .vat-widget-info {
                        flex: 1 !important;
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 12px !important;
                    }
                    .vat-widget-info-row {
                        display: flex !important;
                        justify-content: space-between !important;
                        align-items: center !important;
                        padding: 10px 0 !important;
                        border-bottom: 1px solid #e5e7eb !important;
                    }
                    .vat-widget-info-row:last-child {
                        border-bottom: none !important;
                    }
                    .vat-widget-info-label {
                        font-size: 14px !important;
                        color: #6b7280 !important;
                        font-weight: 500 !important;
                    }
                    .vat-widget-info-value {
                        font-size: 16px !important;
                        font-weight: 700 !important;
                        color: #111827 !important;
                    }
                    .vat-widget-status {
                        display: flex !important;
                        gap: 12px !important;
                        padding: 16px !important;
                        border-radius: 10px !important;
                        margin-bottom: 16px !important;
                    }
                    .vat-widget-status-icon {
                        flex-shrink: 0 !important;
                        width: 36px !important;
                        height: 36px !important;
                        border-radius: 50% !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                    }
                    .vat-widget-status-content {
                        flex: 1 !important;
                    }
                    .vat-widget-status-title {
                        font-size: 14px !important;
                        font-weight: 700 !important;
                        color: #111827 !important;
                        margin: 0 0 4px 0 !important;
                    }
                    .vat-widget-status-message {
                        font-size: 13px !important;
                        color: #4b5563 !important;
                        margin: 0 !important;
                        line-height: 1.5 !important;
                    }
                    .vat-widget-footer {
                        text-align: center !important;
                        padding: 12px !important;
                        background-color: #f9fafb !important;
                        border-radius: 6px !important;
                    }
                    .vat-widget-footer-text {
                        font-size: 12px !important;
                        color: #6b7280 !important;
                        margin: 0 !important;
                        font-weight: 500 !important;
                    }
                `}
            </style>

            {/* Header */}
            <div className="vat-widget-header">
                <span className="vat-widget-header-icon">
                    <TrendingUp size={24} color="#ffffff" />
                </span>
                <div style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                    <h3 className="vat-widget-title">Seuil de franchise TVA</h3>
                    <p className="vat-widget-subtitle">{data.thresholdLabel}</p>
                </div>
            </div>

            <div className="vat-widget-body">
                {/* Progress Section */}
                <div className="vat-widget-progress-container">
                    {/* Circular Progress */}
                    <div className="vat-widget-circle">
                        <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                            <circle
                                cx="60"
                                cy="60"
                                r="52"
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="10"
                            />
                            <circle
                                cx="60"
                                cy="60"
                                r="52"
                                fill="none"
                                stroke={getProgressColor()}
                                strokeWidth="10"
                                strokeDasharray={`${2 * Math.PI * 52}`}
                                strokeDashoffset={`${2 * Math.PI * 52 * (1 - Math.min(percentage, 100) / 100)}`}
                                strokeLinecap="round"
                                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                            />
                        </svg>
                        <div className="vat-widget-circle-text">
                            <span className="vat-widget-percentage" style={{ color: getProgressColor() }}>
                                {Math.round(percentage)}%
                            </span>
                            <span className="vat-widget-percentage-label">du seuil</span>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="vat-widget-info">
                        <div className="vat-widget-info-row">
                            <span className="vat-widget-info-label">CA actuel</span>
                            <span className="vat-widget-info-value">{formatCurrency(data.yearlyRevenue)}</span>
                        </div>
                        <div className="vat-widget-info-row">
                            <span className="vat-widget-info-label">Seuil</span>
                            <span className="vat-widget-info-value">{formatCurrency(data.threshold)}</span>
                        </div>
                        <div className="vat-widget-info-row">
                            <span className="vat-widget-info-label">Restant</span>
                            <span className="vat-widget-info-value" style={{ color: isAboveThreshold ? '#dc2626' : '#059669' }}>
                                {formatCurrency(Math.max(0, data.threshold - data.yearlyRevenue))}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Status Message */}
                <div
                    className="vat-widget-status"
                    style={{
                        backgroundColor: `${statusInfo.color}15`,
                        border: `2px solid ${statusInfo.color}30`
                    }}
                >
                    <div className="vat-widget-status-icon" style={{ backgroundColor: statusInfo.color }}>
                        <StatusIcon size={20} color="#ffffff" />
                    </div>
                    <div className="vat-widget-status-content">
                        <p className="vat-widget-status-title">{statusInfo.title}</p>
                        <p className="vat-widget-status-message">{statusInfo.message}</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="vat-widget-footer">
                    <p className="vat-widget-footer-text">💡 Cliquez pour accéder aux paramètres TVA</p>
                </div>
            </div>
        </div>
    );
};

export default VatThresholdWidget;
