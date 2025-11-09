import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
    CheckCircleIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    ReceiptPercentIcon,
} from '@heroicons/react/24/outline';
import { Invoice } from '../../types';

interface AdvanceSelectorProps {
    clientId: string;
    selectedAdvances: string[];
    onAdvancesChange: (advanceIds: string[]) => void;
    invoiceTotal: number;
    disabled?: boolean;
}

const AdvanceSelector: React.FC<AdvanceSelectorProps> = ({
    clientId,
    selectedAdvances,
    onAdvancesChange,
    invoiceTotal,
    disabled = false,
}) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch available advance invoices for the client
    const { data: availableAdvances, isLoading } = useQuery<Invoice[]>({
        queryKey: ['available-advances', clientId],
        queryFn: async () => {
            if (!clientId) return [];
            const response = await axios.get(`/invoices/available-advances/${clientId}`);
            return response.data;
        },
        enabled: !!clientId,
    });

    // Calculate total of selected advances
    const selectedTotal = availableAdvances
        ?.filter((advance) => selectedAdvances.includes(advance.id))
        .reduce((sum, advance) => sum + (advance.total || 0), 0) || 0;

    const remainingBalance = invoiceTotal - selectedTotal;
    const isOverLimit = selectedTotal > invoiceTotal;

    // Handle advance selection toggle
    const handleToggleAdvance = (advanceId: string) => {
        if (disabled) return;

        if (selectedAdvances.includes(advanceId)) {
            // Remove from selection
            onAdvancesChange(selectedAdvances.filter((id) => id !== advanceId));
        } else {
            // Add to selection
            onAdvancesChange([...selectedAdvances, advanceId]);
        }
    };

    // Handle select all / deselect all
    const handleSelectAll = () => {
        if (disabled || !availableAdvances) return;
        onAdvancesChange(availableAdvances.map((advance) => advance.id));
    };

    const handleDeselectAll = () => {
        if (disabled) return;
        onAdvancesChange([]);
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount);
    };

    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    // Filter advances by search term
    const filteredAdvances = availableAdvances?.filter((advance) => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            advance.invoice_number?.toLowerCase().includes(searchLower) ||
            advance.client?.name?.toLowerCase().includes(searchLower) ||
            formatCurrency(advance.total).toLowerCase().includes(searchLower)
        );
    });

    if (!clientId) {
        return (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                    <InformationCircleIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Sélectionnez d'abord un client pour voir les acomptes disponibles.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Title and Actions */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <ReceiptPercentIcon className="w-5 h-5 text-purple-600" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Acomptes à déduire
                    </h3>
                </div>
                {availableAdvances && availableAdvances.length > 0 && (
                    <div className="flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={handleSelectAll}
                            disabled={disabled}
                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 disabled:opacity-50"
                        >
                            Tout sélectionner
                        </button>
                        <span className="text-gray-300 dark:text-gray-600">|</span>
                        <button
                            type="button"
                            onClick={handleDeselectAll}
                            disabled={disabled}
                            className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 disabled:opacity-50"
                        >
                            Tout désélectionner
                        </button>
                    </div>
                )}
            </div>

            {/* Search */}
            {availableAdvances && availableAdvances.length > 3 && (
                <div>
                    <input
                        type="text"
                        placeholder="Rechercher une facture d'acompte..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        disabled={disabled}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white text-sm"
                    />
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && (!availableAdvances || availableAdvances.length === 0) && (
                <div className="bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
                    <ReceiptPercentIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Aucune facture d'acompte disponible pour ce client.
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Les acomptes déjà liés à une facture de solde ne sont pas affichés.
                    </p>
                </div>
            )}

            {/* Advances List */}
            {!isLoading && filteredAdvances && filteredAdvances.length > 0 && (
                <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
                    {filteredAdvances.map((advance) => {
                        const isSelected = selectedAdvances.includes(advance.id);
                        const percentage = advance.advance_percentage || 0;

                        return (
                            <div
                                key={advance.id}
                                onClick={() => handleToggleAdvance(advance.id)}
                                className={`
                                    p-4 cursor-pointer transition-colors
                                    ${isSelected ? 'bg-purple-50 dark:bg-purple-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}
                                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                            >
                                <div className="flex items-start space-x-3">
                                    {/* Checkbox */}
                                    <div className="flex-shrink-0 pt-0.5">
                                        <div
                                            className={`
                                                w-5 h-5 rounded border-2 flex items-center justify-center
                                                ${
                                                    isSelected
                                                        ? 'bg-purple-600 border-purple-600'
                                                        : 'border-gray-300 dark:border-gray-600'
                                                }
                                            `}
                                        >
                                            {isSelected && (
                                                <CheckCircleIcon className="w-4 h-4 text-white" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Invoice Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                    {advance.invoice_number}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                    {formatDate(advance.invoice_date)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                                    {formatCurrency(advance.total)}
                                                </p>
                                                {percentage > 0 && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        ({percentage}%)
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        {advance.payment_status === 'paid' && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 mt-2">
                                                Payé
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Summary */}
            {selectedAdvances.length > 0 && (
                <div
                    className={`
                        border-2 rounded-lg p-4
                        ${
                            isOverLimit
                                ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800'
                                : 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                        }
                    `}
                >
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-700 dark:text-gray-300">Montant total de la facture:</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(invoiceTotal)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-700 dark:text-gray-300">
                                Total acomptes sélectionnés ({selectedAdvances.length}):
                            </span>
                            <span className="font-semibold text-purple-600 dark:text-purple-400">
                                - {formatCurrency(selectedTotal)}
                            </span>
                        </div>
                        <div className="pt-2 border-t border-gray-300 dark:border-gray-600">
                            <div className="flex items-center justify-between">
                                <span className="text-base font-semibold text-gray-900 dark:text-white">
                                    Solde restant à payer:
                                </span>
                                <span
                                    className={`text-lg font-bold ${
                                        isOverLimit
                                            ? 'text-red-600 dark:text-red-400'
                                            : 'text-green-600 dark:text-green-400'
                                    }`}
                                >
                                    {formatCurrency(remainingBalance)}
                                </span>
                            </div>
                        </div>

                        {/* Warning if over limit */}
                        {isOverLimit && (
                            <div className="flex items-start space-x-2 mt-3 p-3 bg-red-100 dark:bg-red-900/40 rounded-lg">
                                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    <strong>Attention:</strong> Le total des acomptes sélectionnés dépasse le montant de la facture de solde.
                                    Veuillez désélectionner certains acomptes ou augmenter le montant de la facture.
                                </p>
                            </div>
                        )}

                        {/* Success message */}
                        {!isOverLimit && remainingBalance >= 0 && (
                            <div className="flex items-start space-x-2 mt-3 p-3 bg-green-100 dark:bg-green-900/40 rounded-lg">
                                <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-green-700 dark:text-green-300">
                                    Les acomptes sélectionnés seront automatiquement déduits et référencés sur la facture de solde.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Info */}
            {selectedAdvances.length === 0 && availableAdvances && availableAdvances.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                        <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            Sélectionnez les factures d'acompte que vous souhaitez déduire de cette facture de solde.
                            Vous pouvez en sélectionner plusieurs.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvanceSelector;
