import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    XMarkIcon,
    BanknotesIcon,
    CreditCardIcon,
    CheckIcon,
    BuildingLibraryIcon,
} from '@heroicons/react/24/outline';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (paymentData: PaymentData) => void;
    invoiceTotal: number;
    isLoading?: boolean;
}

export interface PaymentData {
    payment_method: 'bank_transfer' | 'check' | 'cash' | 'card' | 'stripe_card' | 'stripe_sepa' | 'other';
    payment_reference?: string;
    paid_amount: number;
    send_confirmation: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    invoiceTotal,
    isLoading = false,
}) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState<PaymentData>({
        payment_method: 'bank_transfer',
        payment_reference: '',
        paid_amount: invoiceTotal,
        send_confirmation: true,
    });

    const paymentMethods = [
        { value: 'bank_transfer', label: t('payment.bankTransfer'), icon: BuildingLibraryIcon },
        { value: 'check', label: t('payment.check'), icon: CheckIcon },
        { value: 'cash', label: t('payment.cash'), icon: BanknotesIcon },
        { value: 'card', label: t('payment.card'), icon: CreditCardIcon },
        { value: 'stripe_card', label: t('payment.stripeCard'), icon: CreditCardIcon },
        { value: 'stripe_sepa', label: t('payment.stripeSepa'), icon: BuildingLibraryIcon },
        { value: 'other', label: t('payment.other'), icon: BanknotesIcon },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(formData);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else if (name === 'paid_amount') {
            setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {t('payment.recordPayment')}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {/* Payment Method */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('payment.paymentMethod')} *
                            </label>
                            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                                {paymentMethods.map((method) => {
                                    const Icon = method.icon;
                                    const isSelected = formData.payment_method === method.value;
                                    return (
                                        <button
                                            key={method.value}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ 
                                                ...prev, 
                                                payment_method: method.value as PaymentData['payment_method']
                                            }))}
                                            className={`
                                                p-3 border-2 rounded-lg transition flex items-center space-x-2
                                                ${isSelected 
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                                }
                                            `}
                                        >
                                            <Icon className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                                            <span className={`text-sm font-medium ${isSelected ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {method.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Amount */}
                        <div>
                            <label htmlFor="paid_amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('payment.amount')} *
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                    €
                                </span>
                                <input
                                    type="number"
                                    id="paid_amount"
                                    name="paid_amount"
                                    value={formData.paid_amount}
                                    onChange={handleInputChange}
                                    step="0.01"
                                    min="0"
                                    required
                                    className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t('payment.invoiceTotal')}: {new Intl.NumberFormat('fr-FR', { 
                                    style: 'currency', 
                                    currency: 'EUR' 
                                }).format(invoiceTotal)}
                            </p>
                        </div>

                        {/* Reference */}
                        <div>
                            <label htmlFor="payment_reference" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('payment.reference')} ({t('common.optional')})
                            </label>
                            <input
                                type="text"
                                id="payment_reference"
                                name="payment_reference"
                                value={formData.payment_reference}
                                onChange={handleInputChange}
                                placeholder={t('payment.referencePlaceholder')}
                                maxLength={100}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t('payment.referenceHelp')}
                            </p>
                        </div>

                        {/* Send Confirmation */}
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="send_confirmation"
                                name="send_confirmation"
                                checked={formData.send_confirmation}
                                onChange={handleInputChange}
                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <label htmlFor="send_confirmation" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                {t('payment.sendConfirmationEmail')}
                            </label>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isLoading}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                                        {t('payment.recording')}
                                    </>
                                ) : (
                                    <>
                                        <CheckIcon className="h-5 w-5 mr-2" />
                                        {t('payment.confirmPayment')}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
