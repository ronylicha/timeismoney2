import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    DocumentTextIcon,
    BanknotesIcon,
    ReceiptPercentIcon,
    DocumentMinusIcon,
    ArrowPathIcon,
    ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { InvoiceType } from '../../types';

interface InvoiceTypeSelectorProps {
    value: InvoiceType;
    onChange: (type: InvoiceType) => void;
    advancePercentage?: number;
    onAdvancePercentageChange?: (percentage: number) => void;
    disabled?: boolean;
    showAdvancePercentage?: boolean;
}

interface InvoiceTypeOption {
    value: InvoiceType;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
}

const InvoiceTypeSelector: React.FC<InvoiceTypeSelectorProps> = ({
    value,
    onChange,
    advancePercentage = 30,
    onAdvancePercentageChange,
    disabled = false,
    showAdvancePercentage = true,
}) => {
    const { t } = useTranslation();

    const invoiceTypes: InvoiceTypeOption[] = [
        {
            value: 'invoice',
            label: 'Facture standard',
            description: 'Facture classique pour un paiement complet',
            icon: DocumentTextIcon,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
            value: 'advance',
            label: "Facture d'acompte",
            description: 'Facture partielle avant livraison/achèvement (30%, 40%, etc.)',
            icon: ReceiptPercentIcon,
            color: 'text-green-600',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
        },
        {
            value: 'final',
            label: 'Facture de solde',
            description: 'Facture finale après un ou plusieurs acomptes',
            icon: ClipboardDocumentCheckIcon,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        },
        {
            value: 'credit_note',
            label: "Avoir (facture d'avoir)",
            description: 'Document pour remboursement ou annulation partielle/totale',
            icon: DocumentMinusIcon,
            color: 'text-red-600',
            bgColor: 'bg-red-50 dark:bg-red-900/20',
        },
        {
            value: 'quote',
            label: 'Devis',
            description: 'Proposition commerciale sans engagement',
            icon: BanknotesIcon,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        },
        {
            value: 'recurring',
            label: 'Facture récurrente',
            description: 'Facture automatique (abonnement, mensuel, etc.)',
            icon: ArrowPathIcon,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
        },
    ];

    const handleTypeSelect = (type: InvoiceType) => {
        if (!disabled) {
            onChange(type);
        }
    };

    const handlePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const percentage = parseFloat(e.target.value) || 0;
        if (onAdvancePercentageChange) {
            onAdvancePercentageChange(percentage);
        }
    };

    return (
        <div className="space-y-4">
            {/* Title */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Type de facture *
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Sélectionnez le type de document conformément à la réglementation française
                </p>
            </div>

            {/* Type Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {invoiceTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = value === type.value;

                    return (
                        <button
                            key={type.value}
                            type="button"
                            onClick={() => handleTypeSelect(type.value)}
                            disabled={disabled}
                            className={`
                                relative p-4 rounded-lg border-2 transition-all duration-200
                                ${
                                    isSelected
                                        ? `border-${type.color.replace('text-', '')} ${type.bgColor} ring-2 ring-${type.color.replace('text-', '')}/20`
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }
                                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                text-left
                            `}
                        >
                            {/* Selection indicator */}
                            {isSelected && (
                                <div className="absolute top-2 right-2">
                                    <div className={`w-6 h-6 rounded-full ${type.color.replace('text-', 'bg-')} flex items-center justify-center`}>
                                        <svg
                                            className="w-4 h-4 text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            )}

                            {/* Icon */}
                            <div className="flex items-start space-x-3">
                                <div className={`p-2 rounded-lg ${type.bgColor}`}>
                                    <Icon className={`w-6 h-6 ${type.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={`text-sm font-semibold ${isSelected ? type.color : 'text-gray-900 dark:text-white'}`}>
                                        {type.label}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {type.description}
                                    </p>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Advance Percentage Input */}
            {value === 'advance' && showAdvancePercentage && (
                <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
                    <div className="flex items-center space-x-2 mb-3">
                        <ReceiptPercentIcon className="w-5 h-5 text-green-600" />
                        <h4 className="text-sm font-semibold text-green-900 dark:text-green-100">
                            Pourcentage d'acompte
                        </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Pourcentage (%) *
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={advancePercentage}
                                onChange={handlePercentageChange}
                                disabled={disabled}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                                placeholder="30"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Exemple: 30% pour un acompte de 30%
                            </p>
                        </div>
                        <div className="flex items-center">
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 w-full">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    Acomptes courants en France:
                                </p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {[30, 40, 50].map((percent) => (
                                        <button
                                            key={percent}
                                            type="button"
                                            onClick={() => onAdvancePercentageChange?.(percent)}
                                            disabled={disabled}
                                            className="px-3 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50"
                                        >
                                            {percent}%
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Legal Notice for Final Invoice */}
            {value === 'final' && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4 mt-4">
                    <div className="flex items-start space-x-2">
                        <ClipboardDocumentCheckIcon className="w-5 h-5 text-purple-600 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-1">
                                Facture de solde
                            </h4>
                            <p className="text-xs text-purple-700 dark:text-purple-300">
                                Cette facture doit mentionner les acomptes précédents. Vous pourrez sélectionner les factures d'acompte à déduire lors de la création.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Legal Notice for Credit Note */}
            {value === 'credit_note' && (
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
                    <div className="flex items-start space-x-2">
                        <DocumentMinusIcon className="w-5 h-5 text-red-600 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                                Avoir (Facture d'avoir)
                            </h4>
                            <p className="text-xs text-red-700 dark:text-red-300">
                                Un avoir doit obligatoirement faire référence à la facture d'origine. Il permet d'annuler tout ou partie d'une facture déjà émise.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceTypeSelector;
