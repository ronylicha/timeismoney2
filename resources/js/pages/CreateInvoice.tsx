import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeftIcon,
    DocumentTextIcon,
    PlusIcon,
    TrashIcon,
    CurrencyEuroIcon,
    CheckCircleIcon,
    ClockIcon,
    BanknotesIcon,
    ReceiptPercentIcon,
    ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';
import {
    TimeEntry,
    Expense,
} from '../types';
import { formatDuration, formatDate, formatDateForApi } from '../utils/time';
import { toast } from 'react-toastify';
import ClientSearchSelect from '../components/ClientSearchSelect';
import ProjectSearchSelect from '../components/ProjectSearchSelect';
import AdvanceCalculator from '../components/Invoice/AdvanceCalculator';

interface InvoiceFormData {
    type: 'invoice' | 'advance' | 'final';
    client_id: string;
    project_id?: string;
    quote_id?: string;
    date: string;
    due_date: string;
    payment_terms: number;
    tax_rate: number;
    discount_amount?: number;
    discount_type: 'fixed' | 'percentage';
    advance_percentage?: number;
    advance_ids?: string[];
    notes?: string;
    footer?: string;
    conditions?: string;
    time_entry_ids: string[];
    expense_ids: string[];
    custom_items: Array<{
        description: string;
        quantity: number;
        unit_price: number;
        tax_rate: number;
    }>;
}

const CreateInvoice: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const clientIdFromUrl = searchParams.get('client_id') || '';
    
    // Determine if we're in edit mode
    const isEditMode = !!id && id !== 'new';
    const pageTitle = isEditMode ? t('invoices.editInvoice') : t('invoices.newInvoice');
    const pageDescription = isEditMode ? 'Modifier la facture' : t('invoices.createNewInvoiceDescription');

    const [formData, setFormData] = useState<InvoiceFormData>({
        type: 'invoice',
        client_id: clientIdFromUrl,
        project_id: '',
        date: formatDateForApi(new Date()),
        due_date: formatDateForApi(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days
        payment_terms: 30,
        tax_rate: 20, // Default 20% VAT for France
        discount_amount: 0,
        discount_type: 'fixed',
        advance_percentage: 30,
        notes: '',
        footer: '',
        conditions: '',
        time_entry_ids: [],
        expense_ids: [],
        custom_items: [{
            description: '',
            quantity: 1,
            unit_price: 0,
            tax_rate: 20
        }]
    });

    const [selectedTimeEntries, setSelectedTimeEntries] = useState<Set<string>>(new Set());
    const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
    const [selectedAdvances, setSelectedAdvances] = useState<Set<string>>(new Set());
    const [availableAdvances, setAvailableAdvances] = useState<any[]>([]);

    // Fetch billing settings for default conditions
    const { data: billingSettings } = useQuery({
        queryKey: ['billing-settings'],
        queryFn: async () => {
            const response = await axios.get('/settings/billing');
            return response.data.data;
        },
    });

    // Fetch existing invoice data if in edit mode
    const { data: existingInvoice, isLoading: isLoadingInvoice } = useQuery({
        queryKey: ['invoice', id],
        queryFn: async () => {
            const response = await axios.get(`/invoices/${id}`);
            return response.data.data;
        },
        enabled: isEditMode,
    });

    // Check if invoice can be edited
    useEffect(() => {
        if (existingInvoice && isEditMode) {
            if (['paid', 'cancelled'].includes(existingInvoice.status)) {
                toast.error('Les factures payées ou annulées ne peuvent pas être modifiées');
                navigate(`/invoices/${id}`);
                return;
            }
        }
    }, [existingInvoice, isEditMode, navigate, id]);

    // Populate form with existing invoice data
    useEffect(() => {
        if (existingInvoice && isEditMode) {
            setFormData({
                type: existingInvoice.type || 'invoice',
                client_id: existingInvoice.client_id?.toString() || '',
                project_id: existingInvoice.project_id?.toString() || '',
                date: existingInvoice.date || formatDateForApi(new Date()),
                due_date: existingInvoice.due_date || formatDateForApi(new Date()),
                payment_terms: existingInvoice.payment_terms || 30,
                tax_rate: existingInvoice.tax_rate ?? 20,
                discount_amount: existingInvoice.discount_amount || 0,
                discount_type: existingInvoice.discount_type || 'fixed',
                advance_percentage: existingInvoice.advance_percentage || 30,
                notes: existingInvoice.notes || '',
                footer: existingInvoice.footer || '',
                conditions: existingInvoice.payment_conditions || existingInvoice.conditions || '',
                time_entry_ids: [],
                expense_ids: [],
                custom_items: existingInvoice.items?.map((item: any) => ({
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    tax_rate: item.tax_rate ?? 20,
                })) || [{
                    description: '',
                    quantity: 1,
                    unit_price: 0,
                    tax_rate: 20
                }]
            });
        }
    }, [existingInvoice, isEditMode]);

    // Initialize client_id from URL parameter
    useEffect(() => {
        if (clientIdFromUrl) {
            setFormData(prev => ({
                ...prev,
                client_id: clientIdFromUrl
            }));
        }
    }, [clientIdFromUrl]);

    // Pre-fill conditions with default invoice conditions
    useEffect(() => {
        if (billingSettings?.default_invoice_conditions && !formData.conditions) {
            setFormData(prev => ({
                ...prev,
                conditions: billingSettings.default_invoice_conditions
            }));
        }
    }, [billingSettings]);

    // Fetch unbilled time entries
    const { data: timeEntriesData } = useQuery<TimeEntry[]>({
        queryKey: ['unbilledTimeEntries', formData.client_id, formData.project_id],
        queryFn: async () => {
            const params = new URLSearchParams({
                unbilled_only: 'true',
                is_billable: 'true',
                ...(formData.client_id && { client_id: formData.client_id }),
                ...(formData.project_id && { project_id: formData.project_id })
            });
            const response = await axios.get(`/time-entries?${params}`);
            return response.data.data;
        },
        enabled: !!formData.client_id
    });

    // Fetch unbilled expenses
    const { data: expensesData } = useQuery<Expense[]>({
        queryKey: ['unbilledExpenses', formData.client_id, formData.project_id],
        queryFn: async () => {
            const params = new URLSearchParams({
                unbilled_only: 'true',
                is_billable: 'true',
                ...(formData.client_id && { client_id: formData.client_id }),
                ...(formData.project_id && { project_id: formData.project_id })
            });
            const response = await axios.get(`/expenses?${params}`);
            return response.data.data;
        },
        enabled: !!formData.client_id
    });

    // Fetch available advances when client changes and type is 'final'
    const { data: advancesData } = useQuery({
        queryKey: ['available-advances', formData.client_id],
        queryFn: async () => {
            if (!formData.client_id || formData.type !== 'final') return [];
            const response = await axios.get(`/invoices/available-advances/${formData.client_id}`);
            return response.data;
        },
        enabled: !!formData.client_id && formData.type === 'final',
    });

    useEffect(() => {
        if (advancesData) {
            setAvailableAdvances(advancesData);
        }
    }, [advancesData]);

    // Fetch accepted quotes for the selected client
    const { data: acceptedQuotes } = useQuery({
        queryKey: ['accepted-quotes', formData.client_id],
        queryFn: async () => {
            if (!formData.client_id) return { data: [] };
            const response = await axios.get('/quotes', {
                params: {
                    client_id: formData.client_id,
                    status: 'accepted',
                    per_page: 100
                }
            });
            return response.data;
        },
        enabled: !!formData.client_id,
    });

    // Create/Update invoice mutation
    const createInvoiceMutation = useMutation({
        mutationFn: async ({ endpoint, payload }: { endpoint: string; payload: any }) => {
            if (isEditMode) {
                const response = await axios.put(`/invoices/${id}`, payload);
                return response.data;
            } else {
                const response = await axios.post(endpoint, payload);
                return response.data;
            }
        },
        onSuccess: (response) => {
            const successMessage = isEditMode ? 'Facture mise à jour avec succès' : t('invoices.createSuccess');
            toast.success(successMessage);
            const invoiceId = isEditMode ? id : response.invoice.id;
            navigate(`/invoices/${invoiceId}`);
        },
        onError: (error: any) => {
            const defaultMessage = isEditMode ? 'Erreur lors de la mise à jour de la facture' : t('invoices.createError');
            const message = error.response?.data?.message || defaultMessage;
            toast.error(message);
        }
    });

    // Calculate totals
    const calculateTotals = () => {
        let subtotal = 0;
        const taxByRate: { [key: number]: { base: number; amount: number } } = {};

        // Add time entries (use default tax rate of 20%)
        if (timeEntriesData) {
            const selectedEntries = timeEntriesData.filter(e => selectedTimeEntries.has(e.id));
            selectedEntries.forEach(entry => {
                const hours = (entry.duration_seconds || 0) / 3600;
                const amount = hours * entry.hourly_rate;
                subtotal += amount;
                
                // Group by tax rate (default 20% for time entries)
                const rate = 20;
                if (!taxByRate[rate]) {
                    taxByRate[rate] = { base: 0, amount: 0 };
                }
                taxByRate[rate].base += amount;
            });
        }

        // Add expenses (use default tax rate of 20%)
        if (expensesData) {
            const selectedExpensesList = expensesData.filter(e => selectedExpenses.has(e.id));
            selectedExpensesList.forEach(expense => {
                subtotal += expense.amount;
                
                // Group by tax rate (default 20% for expenses)
                const rate = 20;
                if (!taxByRate[rate]) {
                    taxByRate[rate] = { base: 0, amount: 0 };
                }
                taxByRate[rate].base += expense.amount;
            });
        }

        // Add custom items (each with its own tax rate)
        formData.custom_items.forEach(item => {
            const itemSubtotal = item.quantity * item.unit_price;
            subtotal += itemSubtotal;
            
            // Group by tax rate
            const rate = item.tax_rate ?? 20;
            if (!taxByRate[rate]) {
                taxByRate[rate] = { base: 0, amount: 0 };
            }
            taxByRate[rate].base += itemSubtotal;
        });

        // Calculate discount (proportionally distributed across all items)
        let discountAmount = 0;
        if (formData.discount_amount) {
            if (formData.discount_type === 'percentage') {
                discountAmount = subtotal * (formData.discount_amount / 100);
            } else {
                discountAmount = formData.discount_amount;
            }
            
            // Apply discount proportionally to each tax rate
            const discountRatio = discountAmount / subtotal;
            Object.keys(taxByRate).forEach(rate => {
                const rateNum = parseFloat(rate);
                taxByRate[rateNum].base -= taxByRate[rateNum].base * discountRatio;
            });
        }

        // Calculate tax for each rate
        let totalTax = 0;
        Object.keys(taxByRate).forEach(rate => {
            const rateNum = parseFloat(rate);
            taxByRate[rateNum].amount = taxByRate[rateNum].base * (rateNum / 100);
            totalTax += taxByRate[rateNum].amount;
        });

        // Calculate total
        const taxableAmount = subtotal - discountAmount;
        const total = taxableAmount + totalTax;

        return {
            subtotal,
            discountAmount,
            taxAmount: totalTax,
            total,
            taxByRate
        };
    };

    const totals = calculateTotals();

    // Handle form changes
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

    // Handle time entry selection
    const toggleTimeEntry = (id: string) => {
        setSelectedTimeEntries(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    // Handle expense selection
    const toggleExpense = (id: string) => {
        setSelectedExpenses(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    // Handle advance selection (for final invoices)
    const toggleAdvance = (advanceId: string) => {
        setSelectedAdvances(prev => {
            const newSet = new Set(prev);
            if (newSet.has(advanceId)) {
                newSet.delete(advanceId);
            } else {
                newSet.add(advanceId);
            }
            return newSet;
        });
    };

    // Calculate total of selected advances
    const calculateAdvancesTotal = () => {
        return availableAdvances
            .filter(advance => selectedAdvances.has(advance.id.toString()))
            .reduce((sum, advance) => sum + parseFloat(advance.total), 0);
    };

    // Add custom item
    const addCustomItem = () => {
        setFormData(prev => ({
            ...prev,
            custom_items: [
                ...prev.custom_items,
                {
                    description: '',
                    quantity: 1,
                    unit_price: 0,
                    tax_rate: 20
                }
            ]
        }));
    };

    // Update custom item
    const updateCustomItem = (index: number, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            custom_items: prev.custom_items.map((item, i) =>
                i === index ? { 
                    ...item, 
                    [field]: field === 'quantity' || field === 'unit_price' || field === 'tax_rate'
                        ? parseFloat(value) || 0 
                        : value 
                } : item
            )
        }));
    };

    // Remove custom item
    const removeCustomItem = (index: number) => {
        if (formData.custom_items.length > 1) {
            setFormData(prev => ({
                ...prev,
                custom_items: prev.custom_items.filter((_, i) => i !== index)
            }));
        }
    };

    // Save as draft
    const handleSubmit = (status: 'draft' | 'sent') => {
        if (!formData.client_id) {
            toast.error(t('invoices.selectClientError'));
            return;
        }

        // Validation spécifique par type
        if (formData.type === 'advance' && !formData.advance_percentage) {
            toast.error('Veuillez indiquer le pourcentage d\'acompte');
            return;
        }

        if (formData.type === 'final' && selectedAdvances.size === 0) {
            toast.warning('Aucun acompte sélectionné. La facture sera créée comme une facture normale.');
        }

        const hasItems = selectedTimeEntries.size > 0 || 
                        selectedExpenses.size > 0 || 
                        formData.custom_items.some(item => item.description.trim() && item.quantity > 0 && item.unit_price > 0);

        if (!hasItems) {
            toast.error(t('invoices.validItemRequired'));
            return;
        }

        // Déterminer l'endpoint selon le type
        let endpoint = '/invoices';
        let payload: any = {};

        if (formData.type === 'advance' || formData.type === 'final') {
            // Format pour InvoiceTypeController (advance/final)
            const items = formData.custom_items
                .filter(item => item.description.trim() && item.quantity > 0)
                .map(item => ({
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    tax_rate: item.tax_rate ?? 20
                }));

            payload = {
                client_id: formData.client_id,
                project_id: formData.project_id,
                quote_id: formData.quote_id,
                date: formData.date,
                due_date: formData.due_date,
                payment_terms: formData.payment_terms,
                items: items,
                subtotal: totals.subtotal,
                tax_amount: totals.taxAmount,
                total: totals.total,
                notes: formData.notes,
                footer: formData.footer,
                payment_conditions: formData.conditions,
                status,
                time_entry_ids: Array.from(selectedTimeEntries),
                expense_ids: Array.from(selectedExpenses)
            };

            if (formData.type === 'advance') {
                endpoint = '/invoices/advance';
                payload.advance_percentage = formData.advance_percentage;
            } else if (formData.type === 'final' && selectedAdvances.size > 0) {
                endpoint = '/invoices/final';
                payload.advance_ids = Array.from(selectedAdvances);
            }
        } else {
            // Format pour InvoiceController normal
            payload = {
                client_id: formData.client_id,
                project_id: formData.project_id,
                quote_id: formData.quote_id,
                date: formData.date,
                due_date: formData.due_date,
                payment_terms: formData.payment_terms,
                discount_amount: formData.discount_amount,
                discount_type: formData.discount_type,
                notes: formData.notes,
                footer: formData.footer,
                conditions: formData.conditions,
                status,
                time_entry_ids: Array.from(selectedTimeEntries),
                expense_ids: Array.from(selectedExpenses),
                custom_items: formData.custom_items.filter(item => item.description.trim() && item.quantity > 0)
            };
        }

        createInvoiceMutation.mutate({ endpoint, payload });
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center mb-4">
                    <Link
                        to="/invoices"
                        className="flex items-center text-gray-600 hover:text-gray-900 transition mr-4"
                    >
                        <ArrowLeftIcon className="h-5 w-5 mr-1" />
                        <span>{t('invoices.backToInvoices')}</span>
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
            {isEditMode && isLoadingInvoice && (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            )}

            {/* Only show form when not loading or not in edit mode */}
            {(!isEditMode || !isLoadingInvoice) && (

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Invoice Type Selection */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            {t('invoices.invoiceType')}
                        </h2>
                        
                        <div className="grid grid-cols-3 gap-4">
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, type: 'invoice' }))}
                                className={`p-4 border-2 rounded-lg transition ${
                                    formData.type === 'invoice'
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <DocumentTextIcon className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                                <div className="font-medium text-sm">{t('invoices.invoiceTypeNormal')}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {t('invoices.invoiceTypeNormalDesc')}
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, type: 'advance' }))}
                                className={`p-4 border-2 rounded-lg transition ${
                                    formData.type === 'advance'
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <ReceiptPercentIcon className="h-8 w-8 mx-auto mb-2 text-green-600" />
                                <div className="font-medium text-sm">{t('invoices.invoiceTypeAdvance')}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {t('invoices.invoiceTypeAdvanceDesc')}
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    if (!formData.client_id) {
                                        toast.warning(t('invoices.selectClientFirst'));
                                        return;
                                    }
                                    setFormData(prev => ({ ...prev, type: 'final' }));
                                }}
                                className={`p-4 border-2 rounded-lg transition ${
                                    formData.type === 'final'
                                        ? 'border-purple-500 bg-purple-50'
                                        : !formData.client_id
                                        ? 'border-gray-200 opacity-50 cursor-not-allowed'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <ClipboardDocumentCheckIcon className={`h-8 w-8 mx-auto mb-2 ${!formData.client_id ? 'text-gray-400' : 'text-purple-600'}`} />
                                <div className="font-medium text-sm">{t('invoices.invoiceTypeFinal')}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {t('invoices.invoiceTypeFinalDesc')}
                                </div>
                            </button>
                        </div>

                        {/* Champ pourcentage pour acompte */}
                        {formData.type === 'advance' && (
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('invoices.advancePercentage')} *
                                </label>
                                <div className="flex items-center space-x-4">
                                    <input
                                        type="range"
                                        name="advance_percentage"
                                        min="10"
                                        max="90"
                                        step="5"
                                        value={formData.advance_percentage || 30}
                                        onChange={handleInputChange}
                                        className="flex-1"
                                    />
                                    <span className="text-lg font-semibold text-green-600 w-16 text-right">
                                        {formData.advance_percentage || 30}%
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {t('invoices.advancePercentageHelp')}
                                </p>
                            </div>
                        )}

                        {/* Section sélection d'acomptes pour solde */}
                        {formData.type === 'final' && (
                            <div className="mt-4">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">
                                    {t('invoices.availableAdvances')}
                                </h3>
                                
                                {!formData.client_id ? (
                                    <p className="text-sm text-gray-500 italic">
                                        {t('invoices.selectClientFirst')}
                                    </p>
                                ) : availableAdvances.length === 0 ? (
                                    <p className="text-sm text-gray-500 italic">
                                        {t('invoices.noAdvancesAvailable')}
                                    </p>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {availableAdvances.map(advance => (
                                            <label
                                                key={advance.id}
                                                className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${
                                                    selectedAdvances.has(advance.id.toString())
                                                        ? 'border-purple-500 bg-purple-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedAdvances.has(advance.id.toString())}
                                                    onChange={() => toggleAdvance(advance.id.toString())}
                                                    className="h-4 w-4 text-purple-600 rounded"
                                                />
                                                <div className="ml-3 flex-1">
                                                    <div className="font-medium text-sm">
                                                        {advance.invoice_number}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {new Date(advance.date).toLocaleDateString('fr-FR')}
                                                        {advance.advance_percentage && ` - ${advance.advance_percentage}%`}
                                                    </div>
                                                </div>
                                                <div className="text-sm font-semibold text-gray-900">
                                                    {new Intl.NumberFormat('fr-FR', {
                                                        style: 'currency',
                                                        currency: 'EUR'
                                                    }).format(advance.total)}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {selectedAdvances.size > 0 && (
                                    <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-gray-700">
                                                {t('invoices.totalSelectedAdvances')}
                                            </span>
                                            <span className="text-lg font-bold text-purple-600">
                                                {new Intl.NumberFormat('fr-FR', {
                                                    style: 'currency',
                                                    currency: 'EUR'
                                                }).format(calculateAdvancesTotal())}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-700">
                                                {t('invoices.remainingBalance')}
                                            </span>
                                            <span className="text-lg font-bold text-green-600">
                                                {new Intl.NumberFormat('fr-FR', {
                                                    style: 'currency',
                                                    currency: 'EUR'
                                                }).format(Math.max(0, totals.total - calculateAdvancesTotal()))}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Advance Calculator for Final Invoices */}
                        {formData.type === 'final' && selectedAdvances.size > 0 && (
                            <div className="mt-4">
                                <AdvanceCalculator
                                    selectedAdvances={availableAdvances.filter(adv => selectedAdvances.has(adv.id.toString()))}
                                    currentTotal={totals.total}
                                />
                            </div>
                        )}
                    </div>

                    {/* Invoice Information */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('invoices.invoiceInformation')}</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <ClientSearchSelect
                                    value={formData.client_id}
                                    onChange={(clientId) => setFormData(prev => ({ ...prev, client_id: clientId }))}
                                    label={t('invoices.client')}
                                    placeholder={t('invoices.selectClient') || 'Sélectionner un client...'}
                                    required
                                />
                            </div>

                            <div>
                                <ProjectSearchSelect
                                    value={formData.project_id || ''}
                                    onChange={(projectId) => setFormData(prev => ({ ...prev, project_id: projectId }))}
                                    clientId={formData.client_id}
                                    label={t('invoices.project')}
                                    placeholder={t('invoices.selectProject') || 'Sélectionner un projet...'}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Devis de référence (optionnel)
                                </label>
                                <select
                                    value={formData.quote_id || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, quote_id: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={!formData.client_id}
                                >
                                    <option value="">Aucun devis sélectionné</option>
                                    {acceptedQuotes?.data?.map((quote: any) => (
                                        <option key={quote.id} value={quote.id}>
                                            {quote.quote_number} - {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(quote.total)}
                                        </option>
                                    ))}
                                </select>
                                {formData.client_id && acceptedQuotes?.data?.length === 0 && (
                                    <p className="text-xs text-gray-500 mt-1">Aucun devis accepté pour ce client</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('invoices.invoiceDate')} *
                                </label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('invoices.dueDate')} *
                                </label>
                                <input
                                    type="date"
                                    name="due_date"
                                    value={formData.due_date}
                                    onChange={handleInputChange}
                                    min={formData.date}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('invoices.paymentTerms')}
                                </label>
                                <input
                                    type="number"
                                    name="payment_terms"
                                    value={formData.payment_terms}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="30"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Time Entries */}
                    {timeEntriesData && timeEntriesData.length > 0 && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <ClockIcon className="h-5 w-5 mr-2" />
                                {t('invoices.unbilledTimeEntries')}
                            </h2>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {timeEntriesData.map(entry => {
                                    const hours = (entry.duration_seconds || 0) / 3600;
                                    const amount = hours * entry.hourly_rate;
                                    return (
                                        <label
                                            key={entry.id}
                                            className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-200"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedTimeEntries.has(entry.id)}
                                                onChange={() => toggleTimeEntry(entry.id)}
                                                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {entry.project?.name} - {entry.task?.title || entry.description}
                                                    </span>
                                                    <span className="text-sm text-gray-600">
                                                        €{amount.toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {formatDate(entry.started_at)} - {formatDuration(entry.duration_seconds || 0)}
                                                    @ €{entry.hourly_rate}/h
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Expenses */}
                    {expensesData && expensesData.length > 0 && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <BanknotesIcon className="h-5 w-5 mr-2" />
                                {t('invoices.unbilledExpenses')}
                            </h2>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {expensesData.map(expense => (
                                    <label
                                        key={expense.id}
                                        className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-200"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedExpenses.has(expense.id)}
                                            onChange={() => toggleExpense(expense.id)}
                                            className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {expense.description}
                                                </span>
                                                <span className="text-sm text-gray-600">
                                                    €{expense.amount.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {formatDate(expense.expense_date)} - {expense.category?.name}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Custom Items */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">{t('invoices.items')}</h2>
                            <button
                                type="button"
                                onClick={addCustomItem}
                                className="flex items-center px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                <PlusIcon className="h-4 w-4 mr-1" />
                                {t('invoices.addItem')}
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            {formData.custom_items.map((item, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                {t('invoices.description')}
                                            </label>
                                            <input
                                                type="text"
                                                value={item.description}
                                                onChange={(e) => updateCustomItem(index, 'description', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder={t('invoices.descriptionPlaceholder')}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                {t('invoices.quantity')}
                                            </label>
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => updateCustomItem(index, 'quantity', e.target.value)}
                                                step="0.01"
                                                min="0"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                {t('invoices.unitPrice')}
                                            </label>
                                            <input
                                                type="number"
                                                value={item.unit_price}
                                                onChange={(e) => updateCustomItem(index, 'unit_price', e.target.value)}
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
                                                onChange={(e) => updateCustomItem(index, 'tax_rate', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="0">0% (Exonéré)</option>
                                                <option value="5.5">5.5% (Taux réduit)</option>
                                                <option value="10">10% (Taux intermédiaire)</option>
                                                <option value="20">20% (Taux normal)</option>
                                            </select>
                                        </div>

                                        <div className="flex items-end">
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    {t('invoices.total')}
                                                </label>
                                                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                                                    €{(item.quantity * item.unit_price).toFixed(2)}
                                                </div>
                                            </div>

                                            {formData.custom_items.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeCustomItem(index)}
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

                    {/* Notes and Conditions */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('invoices.notesAndConditions')}</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('invoices.conditions')}
                                </label>
                                <textarea
                                    name="conditions"
                                    value={formData.conditions}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder={t('invoices.conditionsPlaceholder')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('invoices.notes')}
                                </label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder={t('invoices.notesPlaceholder')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('invoices.footer')}
                                </label>
                                <textarea
                                    name="footer"
                                    value={formData.footer}
                                    onChange={handleInputChange}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder={t('invoices.footerPlaceholder')}
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
                            {t('invoices.summary')}
                        </h2>

                        {/* Discount */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('invoices.discount')}
                            </label>
                            <div className="flex space-x-2">
                                <input
                                    type="number"
                                    name="discount_amount"
                                    value={formData.discount_amount}
                                    onChange={handleInputChange}
                                    step="0.01"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <select
                                    name="discount_type"
                                    value={formData.discount_type}
                                    onChange={handleInputChange}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="fixed">€</option>
                                    <option value="percentage">%</option>
                                </select>
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="space-y-2 border-t border-gray-200 pt-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">{t('invoices.subtotal')}</span>
                                <span className="font-medium">€{totals.subtotal.toFixed(2)}</span>
                            </div>
                            {totals.discountAmount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">{t('invoices.discount')}</span>
                                    <span className="font-medium text-red-600">
                                        -€{totals.discountAmount.toFixed(2)}
                                    </span>
                                </div>
                            )}
                            
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
                                <span className="text-gray-600">{t('invoices.tax')} Total</span>
                                <span>€{totals.taxAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-semibold border-t border-gray-200 pt-2">
                                <span>{t('invoices.total')}</span>
                                <span className="text-blue-600">€{totals.total.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-6 space-y-2">
                            <button
                                type="button"
                                onClick={() => handleSubmit('draft')}
                                disabled={createInvoiceMutation.isPending}
                                className="w-full flex items-center justify-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                {createInvoiceMutation.isPending && (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                )}
                                {t('invoices.saveAsDraft')}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSubmit('sent')}
                                disabled={createInvoiceMutation.isPending}
                                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                {createInvoiceMutation.isPending ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        {t('invoices.creating')}
                                    </>
                                ) : (
                                    <>
                                        <CheckCircleIcon className="h-5 w-5 mr-2" />
                                        {isEditMode ? 'Mettre à jour la facture' : t('invoices.createInvoice')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            )}
        </div>
    );
};

export default CreateInvoice;
