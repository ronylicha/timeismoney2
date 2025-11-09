import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DocumentMinusIcon } from '@heroicons/react/24/outline';

interface CreateCreditNoteButtonProps {
    invoiceId: number;
    invoiceNumber: string;
    invoiceTotal: number;
    className?: string;
}

interface CreditNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: CreditNoteData) => void;
    invoiceTotal: number;
    isLoading: boolean;
}

interface CreditNoteData {
    type: 'total' | 'partial';
    amount?: number;
    reason: string;
    items?: Array<{
        invoice_item_id: number;
        quantity: number;
    }>;
}

const CreditNoteModal: React.FC<CreditNoteModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    invoiceTotal,
    isLoading,
}) => {
    const { t } = useTranslation();
    const [type, setType] = useState<'total' | 'partial'>('total');
    const [amount, setAmount] = useState<string>('');
    const [reason, setReason] = useState<string>('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!reason.trim()) {
            toast.error(t('creditNotes.reasonRequired', 'Veuillez indiquer un motif'));
            return;
        }

        if (type === 'partial') {
            const amountNum = parseFloat(amount);
            if (!amountNum || amountNum <= 0) {
                toast.error(t('creditNotes.amountRequired', 'Montant invalide'));
                return;
            }
            if (amountNum > invoiceTotal) {
                toast.error(t('creditNotes.amountTooHigh', 'Le montant ne peut pas dépasser le total de la facture'));
                return;
            }
        }

        const data: CreditNoteData = {
            type,
            reason: reason.trim(),
        };

        if (type === 'partial' && amount) {
            data.amount = parseFloat(amount);
        }

        onConfirm(data);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                    {t('creditNotes.create', 'Créer un avoir')}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Type selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('creditNotes.type', 'Type d\'avoir')}
                        </label>
                        <div className="space-y-2">
                            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                <input
                                    type="radio"
                                    value="total"
                                    checked={type === 'total'}
                                    onChange={(e) => setType(e.target.value as 'total')}
                                    className="mr-3"
                                />
                                <div>
                                    <div className="font-medium text-gray-900">
                                        {t('creditNotes.totalCredit', 'Avoir total')}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {t('creditNotes.totalCreditDesc', 'Annuler la totalité de la facture')}
                                    </div>
                                </div>
                            </label>

                            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                <input
                                    type="radio"
                                    value="partial"
                                    checked={type === 'partial'}
                                    onChange={(e) => setType(e.target.value as 'partial')}
                                    className="mr-3"
                                />
                                <div>
                                    <div className="font-medium text-gray-900">
                                        {t('creditNotes.partialCredit', 'Avoir partiel')}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {t('creditNotes.partialCreditDesc', 'Rembourser un montant spécifique')}
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Amount input for partial credit */}
                    {type === 'partial' && (
                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                                {t('creditNotes.amount', 'Montant (€)')}
                            </label>
                            <input
                                type="number"
                                id="amount"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                step="0.01"
                                min="0.01"
                                max={invoiceTotal}
                                required
                                placeholder="0.00"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                {t('creditNotes.maxAmount', 'Maximum')} : {invoiceTotal.toFixed(2)} €
                            </p>
                        </div>
                    )}

                    {/* Reason */}
                    <div>
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                            {t('creditNotes.reason', 'Motif')} <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                            rows={3}
                            placeholder={t('creditNotes.reasonPlaceholder', 'Ex: Produit défectueux, erreur de facturation...')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
                        >
                            {t('common.cancel', 'Annuler')}
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                        >
                            {isLoading 
                                ? t('creditNotes.creating', 'Création...')
                                : t('creditNotes.create', 'Créer l\'avoir')
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CreateCreditNoteButton: React.FC<CreateCreditNoteButtonProps> = ({
    invoiceId,
    invoiceTotal,
    className = '',
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);

    const createCreditNoteMutation = useMutation({
        mutationFn: async (data: CreditNoteData) => {
            const response = await axios.post(`/credit-notes`, {
                invoice_id: invoiceId,
                ...data,
            });
            return response.data;
        },
        onSuccess: (data) => {
            setShowModal(false);
            queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId.toString()] });
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
            
            toast.success(t('creditNotes.created', 'Avoir créé avec succès'));
            
            // Navigate to the credit note detail page
            if (data.data?.id) {
                navigate(`/credit-notes/${data.data.id}`);
            }
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || t('creditNotes.createError', 'Erreur lors de la création de l\'avoir');
            toast.error(message);
        },
    });

    const handleConfirm = (data: CreditNoteData) => {
        createCreditNoteMutation.mutate(data);
    };

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className={`flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm ${className}`}
            >
                <DocumentMinusIcon className="h-4 w-4" />
                <span>{t('creditNotes.create', 'Créer un avoir')}</span>
            </button>

            <CreditNoteModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onConfirm={handleConfirm}
                invoiceTotal={invoiceTotal}
                isLoading={createCreditNoteMutation.isPending}
            />
        </>
    );
};

export default CreateCreditNoteButton;
