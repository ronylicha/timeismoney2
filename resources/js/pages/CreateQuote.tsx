import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeftIcon,
    DocumentTextIcon,
    PlusIcon,
    TrashIcon,
    CurrencyEuroIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
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
    tax_rate: number;
    items: Array<{
        description: string;
        quantity: number;
        unit_price: number;
        tax_rate?: number;
        discount?: number;
        total?: number;
    }>;
}

const CreateQuote: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const clientIdFromUrl = searchParams.get('client_id') || '';
    
    // Determine if we're in edit mode
    const isEditMode = !!id && id !== 'new';
    const pageTitle = isEditMode ? 'Modifier le devis' : t('quotes.newQuote');
    const pageDescription = isEditMode ? 'Mettre à jour les informations du devis' : t('quotes.createNewQuoteDescription');

    const [formData, setFormData] = useState<QuoteFormData>({
        client_id: clientIdFromUrl,
        project_id: '',
        subject: '',
        issue_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
        terms: '',
        tax_rate: 20,
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

    // Fetch billing settings for default conditions
    const { data: billingSettings } = useQuery({
        queryKey: ['billing-settings'],
        queryFn: async () => {
            const response = await axios.get('/settings/billing');
            return response.data.data;
        },
    });

    // Fetch existing quote data if in edit mode
    const { data: existingQuote, isLoading: isLoadingQuote } = useQuery({
        queryKey: ['quote', id],
        queryFn: async () => {
            const response = await axios.get(`/quotes/${id}`);
            return response.data.data;
        },
        enabled: isEditMode,
    });

    // Check if quote can be edited
    useEffect(() => {
        if (existingQuote && isEditMode) {
            // Quotes can be edited if draft or sent
            if (!['draft', 'sent'].includes(existingQuote.status)) {
                toast.error('Ce devis ne peut plus être modifié (statut: ' + existingQuote.status + ')');
                navigate(`/quotes/${id}`);
                return;
            }
        }
    }, [existingQuote, isEditMode, navigate, id]);

    // Populate form with existing quote data
    useEffect(() => {
        if (existingQuote && isEditMode) {
            setFormData({
                client_id: existingQuote.client_id?.toString() || '',
                project_id: existingQuote.project_id?.toString() || '',
                subject: existingQuote.subject || '',
                issue_date: existingQuote.issue_date || new Date().toISOString().split('T')[0],
                valid_until: existingQuote.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                notes: existingQuote.notes || '',
                terms: existingQuote.conditions || existingQuote.terms || '',
                tax_rate: existingQuote.tax_rate ?? 20,
                items: existingQuote.items?.map((item: any) => ({
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    tax_rate: item.tax_rate ?? 20,
                    discount: item.discount || 0,
                })) || [{
                    description: '',
                    quantity: 1,
                    unit_price: 0,
                    tax_rate: 20,
                    discount: 0
                }]
            });
        }
    }, [existingQuote, isEditMode]);

    // Initialize client_id from URL parameter
    useEffect(() => {
        if (clientIdFromUrl) {
            setFormData(prev => ({
                ...prev,
                client_id: clientIdFromUrl
            }));
        }
    }, [clientIdFromUrl]);

    // Pre-fill terms with default quote conditions
    useEffect(() => {
        if (billingSettings?.default_quote_conditions && !formData.terms) {
            setFormData(prev => ({
                ...prev,
                terms: billingSettings.default_quote_conditions
            }));
        }
    }, [billingSettings]);



    // Create quote mutation
    const createQuoteMutation = useMutation({
        mutationFn: async (data: QuoteFormData) => {
            // Map frontend field names to backend field names
            const backendData = {
                ...data,
                description: data.subject, // subject → description
                quote_date: data.issue_date, // issue_date → quote_date
                terms_conditions: data.terms, // terms → terms_conditions
            };
            
            // Remove old field names
            delete (backendData as any).subject;
            delete (backendData as any).issue_date;
            delete (backendData as any).terms;
            
            if (isEditMode) {
                const response = await axios.put(`/quotes/${id}`, backendData);
                return response.data;
            } else {
                const response = await axios.post('/quotes', backendData);
                return response.data;
            }
        },
        onSuccess: (response) => {
            const successMessage = isEditMode ? 'Devis mis à jour avec succès' : t('quotes.createSuccess');
            toast.success(successMessage);
            // The backend returns { message, data: quote }
            const quoteId = isEditMode ? id : (response.data?.id || response.quote?.id);
            navigate(`/quotes/${quoteId}`);
        },
        onError: (error: any) => {
            const defaultMessage = isEditMode ? 'Erreur lors de la mise à jour du devis' : t('quotes.createError');
            const message = error.response?.data?.message || defaultMessage;
            toast.error(message);
        }
    });


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'number') {
            setFormData(prev => ({
                ...prev,
                [name]: parseFloat(value) || 0
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const updatedItems = [...formData.items];
        updatedItems[index] = {
            ...updatedItems[index],
            [field]: field === 'quantity' || field === 'unit_price' || field === 'tax_rate' || field === 'discount'
                ? parseFloat(value) || 0
                : value
        };
        
        setFormData(prev => ({
            ...prev,
            items: updatedItems
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
                    tax_rate: formData.tax_rate,
                    total: 0
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

    const calculateTotals = () => {
        let subtotal = 0;
        let totalTax = 0;
        const taxByRate: { [key: number]: { base: number; amount: number } } = {};
        
        formData.items.forEach(item => {
            const itemSubtotal = item.quantity * item.unit_price;
            const discount = item.discount || 0;
            const itemSubtotalAfterDiscount = itemSubtotal - discount;
            subtotal += itemSubtotalAfterDiscount;
            
            if (item.tax_rate) {
                const taxAmount = (itemSubtotalAfterDiscount * item.tax_rate) / 100;
                totalTax += taxAmount;
                
                // Group by tax rate
                if (!taxByRate[item.tax_rate]) {
                    taxByRate[item.tax_rate] = { base: 0, amount: 0 };
                }
                taxByRate[item.tax_rate].base += itemSubtotalAfterDiscount;
                taxByRate[item.tax_rate].amount += taxAmount;
            }
        });
        
        const total = subtotal + totalTax;
        
        return { subtotal, taxAmount: totalTax, total, taxByRate };
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.client_id) {
            toast.error(t('quotes.selectClientError'));
            return;
        }

        if (!formData.subject.trim()) {
            toast.error(t('quotes.subjectRequired'));
            return;
        }

        const hasValidItems = formData.items.some(item =>
            item.description.trim() && item.quantity > 0 && item.unit_price > 0
        );

        if (!hasValidItems) {
            toast.error(t('quotes.validItemRequired'));
            return;
        }

        createQuoteMutation.mutate(formData);
    };

    const totals = calculateTotals();

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center mb-4">
                    <Link
                        to="/quotes"
                        className="flex items-center text-gray-600 hover:text-gray-900 transition mr-4"
                    >
                        <ArrowLeftIcon className="h-5 w-5 mr-1" />
                        <span>{t('quotes.backToQuotes')}</span>
                    </Link>
                </div>
                <div className="flex items-center">
                    <DocumentTextIcon className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
                        <p className="text-gray-600">{pageDescription}</p>
                    </div>
                </div>
            </div>

            {/* Loading state for edit mode */}
            {isEditMode && isLoadingQuote && (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            )}

            {/* Only show form when not loading or not in edit mode */}
            {(!isEditMode || !isLoadingQuote) && (
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Quote Information */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('quotes.quoteInformation')}</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('quotes.subject')} *
                                    </label>
                                    <input
                                        type="text"
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder={t('quotes.subjectPlaceholder')}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('quotes.issueDate')} *
                                    </label>
                                    <input
                                        type="date"
                                        name="issue_date"
                                        value={formData.issue_date}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('quotes.validUntil')} *
                                    </label>
                                    <input
                                        type="date"
                                        name="valid_until"
                                        value={formData.valid_until}
                                        onChange={handleInputChange}
                                        min={formData.issue_date}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                            </div>

                        </div>

                        {/* Items */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">{t('quotes.items')}</h2>
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="flex items-center px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    <PlusIcon className="h-4 w-4 mr-1" />
                                    {t('quotes.addItem')}
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                {formData.items.map((item, index) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    {t('quotes.description')}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    placeholder={t('quotes.descriptionPlaceholder')}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    {t('quotes.quantity')}
                                                </label>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                    step="0.01"
                                                    min="0"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    {t('quotes.unitPrice')}
                                                </label>
                                                <input
                                                    type="number"
                                                    value={item.unit_price}
                                                    onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                                    step="0.01"
                                                    min="0"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    TVA (%)
                                                </label>
                                                <select
                                                    value={item.tax_rate ?? 20}
                                                    onChange={(e) => handleItemChange(index, 'tax_rate', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                >
                                                    <option value="0">0% (Exonéré)</option>
                                                    <option value="5.5">5,5% (Taux réduit)</option>
                                                    <option value="10">10% (Taux intermédiaire)</option>
                                                    <option value="20">20% (Taux normal)</option>
                                                </select>
                                            </div>

                                            <div className="flex items-end">
                                                <div className="flex-1">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        {t('quotes.total')}
                                                    </label>
                                                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                                                        <div className="font-medium">
                                                            €{(item.quantity * item.unit_price - (item.discount || 0)).toFixed(2)}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            +€{((item.quantity * item.unit_price - (item.discount || 0)) * ((item.tax_rate ?? 20) / 100)).toFixed(2)} TVA
                                                        </div>
                                                    </div>
                                                </div>

                                                {formData.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('quotes.notesAndTerms')}</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('quotes.terms')}
                                    </label>
                                    <textarea
                                        name="terms_conditions"
                                        value={formData.terms}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder={t('quotes.termsPlaceholder')}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('quotes.notes')}
                                    </label>
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder={t('quotes.notesPlaceholder')}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('quotes.internalNotes')}
                                    </label>
                                    <textarea
                                        name="internal_notes"
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder={t('quotes.internalNotesPlaceholder')}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow p-6 sticky top-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <CurrencyEuroIcon className="h-5 w-5 mr-2" />
                                {t('quotes.summary')}
                            </h2>

                            {/* Tax and Discount */}

                            {/* Totals */}
                            <div className="space-y-2 border-t border-gray-200 pt-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">{t('quotes.subtotal')}</span>
                                    <span className="font-medium">€{totals.subtotal.toFixed(2)}</span>
                                </div>
                                
                                {/* Tax breakdown by rate */}
                                {totals.taxByRate && Object.keys(totals.taxByRate).length > 0 && (
                                    <div className="border-t border-gray-100 pt-2 mt-2">
                                        <div className="text-xs text-gray-500 mb-1">Détail TVA:</div>
                                        {Object.keys(totals.taxByRate).sort((a, b) => parseFloat(b) - parseFloat(a)).map(rate => {
                                            const rateNum = parseFloat(rate);
                                            const taxInfo = totals.taxByRate[rateNum];
                                            return (
                                                <div key={rate} className="flex justify-between text-xs text-gray-600 ml-2">
                                                    <span>TVA {rateNum}% sur €{taxInfo.base.toFixed(2)}</span>
                                                    <span className="font-medium">€{taxInfo.amount.toFixed(2)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                
                                <div className="flex justify-between text-sm font-medium border-t border-gray-100 pt-2">
                                    <span className="text-gray-600">{t('quotes.tax')} Total</span>
                                    <span>€{totals.taxAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-semibold border-t border-gray-200 pt-2">
                                    <span>{t('quotes.total')}</span>
                                    <span className="text-blue-600">€{totals.total.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-6 space-y-2">
                                <button
                                    type="submit"
                                    disabled={createQuoteMutation.isPending}
                                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    {createQuoteMutation.isPending ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            {t('quotes.creating')}
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircleIcon className="h-5 w-5 mr-2" />
                                            {isEditMode ? 'Mettre à jour le devis' : t('quotes.createQuote')}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
            )}
        </div>
    );
};

export default CreateQuote;