import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeftIcon,
    PlusIcon,
    TrashIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Quote, QuoteItem } from '../types';
import ClientSearchSelect from '../components/ClientSearchSelect';
import ProjectSearchSelect from '../components/ProjectSearchSelect';

interface QuoteFormData {
    client_id: string;
    project_id?: string;
    subject: string;
    issue_date: string;
    valid_until: string;
    notes: string;
    terms: string;
    items: Array<{
        description: string;
        quantity: number;
        unit_price: number;
        tax_rate?: number;
        discount?: number;
    }>;
}

const EditQuote: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState<QuoteFormData>({
        client_id: '',
        project_id: '',
        subject: '',
        issue_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
        terms: '',
        items: [
            {
                description: '',
                quantity: 1,
                unit_price: 0,
                tax_rate: 20,
                discount: 0
            }
        ]
    });

    // Fetch existing quote
    const { data: quote, isLoading: isLoadingQuote } = useQuery<Quote>({
        queryKey: ['quote', id],
        queryFn: async () => {
            const response = await axios.get(`/quotes/${id}`);
            return response.data;
        },
        enabled: !!id
    });



    // Pre-fill form when quote data loads
    useEffect(() => {
        if (quote) {
            setFormData({
                client_id: quote.client_id?.toString() || '',
                project_id: quote.project_id?.toString() || '',
                subject: quote.description || '',
                issue_date: quote.quote_date || new Date().toISOString().split('T')[0],
                valid_until: quote.valid_until || '',
                notes: quote.notes || '',
                terms: quote.terms_conditions || '',
                items: quote.items && quote.items.length > 0
                    ? quote.items.map((item: QuoteItem) => ({
                        description: item.description || '',
                        quantity: item.quantity || 1,
                        unit_price: item.unit_price || 0,
                        tax_rate: item.tax_rate || 20,
                        discount: 0
                    }))
                    : [{
                        description: '',
                        quantity: 1,
                        unit_price: 0,
                        tax_rate: 20,
                        discount: 0
                    }]
            });
        }
    }, [quote]);

    // Update quote mutation
    const updateQuoteMutation = useMutation({
        mutationFn: async (data: QuoteFormData) => {
            // Map frontend field names to backend field names
            const backendData = {
                ...data,
                description: data.subject,
                quote_date: data.issue_date,
                terms_conditions: data.terms,
            };
            
            delete (backendData as any).subject;
            delete (backendData as any).issue_date;
            delete (backendData as any).terms;
            
            const response = await axios.put(`/quotes/${id}`, backendData);
            return response.data;
        },
        onSuccess: (updatedQuote) => {
            toast.success(t('quotes.updateSuccess'));
            queryClient.invalidateQueries({ queryKey: ['quote', id] });
            queryClient.invalidateQueries({ queryKey: ['quotes'] });
            navigate(`/quotes/${updatedQuote.id}`);
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || t('quotes.updateError');
            toast.error(message);
        }
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleItemChange = (index: number, field: string, value: string | number) => {
        const newItems = [...formData.items];
        newItems[index] = {
            ...newItems[index],
            [field]: value
        };
        setFormData(prev => ({
            ...prev,
            items: newItems
        }));
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    description: '',
                    quantity: 1,
                    unit_price: 0,
                    tax_rate: 20,
                    discount: 0
                }
            ]
        }));
    };

    const removeItem = (index: number) => {
        if (formData.items.length > 1) {
            setFormData(prev => ({
                ...prev,
                items: prev.items.filter((_, i) => i !== index)
            }));
        }
    };

    const calculateItemTotal = (item: QuoteFormData['items'][0]) => {
        const subtotal = item.quantity * item.unit_price;
        const discountAmount = subtotal * (item.discount || 0) / 100;
        const afterDiscount = subtotal - discountAmount;
        const taxAmount = afterDiscount * (item.tax_rate || 0) / 100;
        return afterDiscount + taxAmount;
    };

    const calculateTotals = () => {
        let subtotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;

        formData.items.forEach(item => {
            const itemSubtotal = item.quantity * item.unit_price;
            const discountAmount = itemSubtotal * (item.discount || 0) / 100;
            const afterDiscount = itemSubtotal - discountAmount;
            const taxAmount = afterDiscount * (item.tax_rate || 0) / 100;

            subtotal += itemSubtotal;
            totalDiscount += discountAmount;
            totalTax += taxAmount;
        });

        const total = subtotal - totalDiscount + totalTax;

        return { subtotal, totalDiscount, totalTax, total };
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.client_id) {
            toast.error(t('quotes.clientRequired'));
            return;
        }

        if (!formData.subject.trim()) {
            toast.error(t('quotes.subjectRequired'));
            return;
        }

        if (formData.items.length === 0) {
            toast.error(t('quotes.itemsRequired'));
            return;
        }

        updateQuoteMutation.mutate(formData);
    };

    const totals = calculateTotals();

    if (isLoadingQuote) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Link
                        to="/quotes"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 mb-2"
                    >
                        <ArrowLeftIcon className="w-4 h-4 mr-1" />
                        {t('common.back')}
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {t('quotes.editQuote')}
                    </h1>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {t('quotes.basicInformation')}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <ClientSearchSelect
                                value={formData.client_id}
                                onChange={(clientId) => setFormData(prev => ({ ...prev, client_id: clientId }))}
                                label={t('quotes.client')}
                                placeholder={t('quotes.selectClient') || 'Sélectionner un client...'}
                                required
                            />
                        </div>

                        <div>
                            <ProjectSearchSelect
                                value={formData.project_id || ''}
                                onChange={(projectId) => setFormData(prev => ({ ...prev, project_id: projectId }))}
                                clientId={formData.client_id}
                                label={t('quotes.project')}
                                placeholder={t('quotes.selectProject') || 'Sélectionner un projet...'}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('quotes.subject')} *
                            </label>
                            <input
                                type="text"
                                name="subject"
                                value={formData.subject}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('quotes.issueDate')} *
                            </label>
                            <input
                                type="date"
                                name="issue_date"
                                value={formData.issue_date}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('quotes.validUntil')} *
                            </label>
                            <input
                                type="date"
                                name="valid_until"
                                value={formData.valid_until}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {t('quotes.items')}
                        </h2>
                        <button
                            type="button"
                            onClick={addItem}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <PlusIcon className="w-5 h-5 mr-2" />
                            {t('quotes.addItem')}
                        </button>
                    </div>

                    <div className="space-y-4">
                        {formData.items.map((item, index) => (
                            <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('quotes.description')}
                                        </label>
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('quotes.quantity')}
                                        </label>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                            min="0"
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('quotes.unitPrice')} (€)
                                        </label>
                                        <input
                                            type="number"
                                            value={item.unit_price}
                                            onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                            min="0"
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('quotes.taxRate')} (%)
                                        </label>
                                        <input
                                            type="number"
                                            value={item.tax_rate}
                                            onChange={(e) => handleItemChange(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('quotes.discount')} (%)
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                value={item.discount}
                                                onChange={(e) => handleItemChange(index, 'discount', parseFloat(e.target.value) || 0)}
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                className="p-2 text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                                                disabled={formData.items.length === 1}
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-2 text-right">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {t('quotes.total')}:
                                    </span>
                                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                        {calculateItemTotal(item).toFixed(2)} €
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Totals */}
                    <div className="mt-6 border-t border-gray-200 dark:border-gray-600 pt-4">
                        <div className="flex justify-end">
                            <div className="w-64 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">{t('quotes.subtotal')}:</span>
                                    <span className="text-gray-900 dark:text-white">{totals.subtotal.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">{t('quotes.discount')}:</span>
                                    <span className="text-gray-900 dark:text-white">-{totals.totalDiscount.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">{t('quotes.tax')}:</span>
                                    <span className="text-gray-900 dark:text-white">{totals.totalTax.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-gray-600 pt-2">
                                    <span className="text-gray-900 dark:text-white">{t('quotes.total')}:</span>
                                    <span className="text-gray-900 dark:text-white">{totals.total.toFixed(2)} €</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notes and Terms */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {t('quotes.notesAndTerms')}
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('quotes.notes')}
                            </label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                rows={4}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('quotes.terms')}
                            </label>
                            <textarea
                                name="terms"
                                value={formData.terms}
                                onChange={handleInputChange}
                                rows={4}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4">
                    <Link
                        to="/quotes"
                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        {t('common.cancel')}
                    </Link>
                    <button
                        type="submit"
                        disabled={updateQuoteMutation.isPending}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                    >
                        {updateQuoteMutation.isPending ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                {t('common.saving')}
                            </>
                        ) : (
                            <>
                                <CheckCircleIcon className="w-5 h-5 mr-2" />
                                {t('common.save')}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditQuote;
