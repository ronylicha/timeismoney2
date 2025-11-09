import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
    FileText,
    Plus,
    Trash2,
    Calendar,
    DollarSign,
    Clock,
    Package,
    AlertTriangle,
    Save,
    Send
} from 'lucide-react';
import {
    Client,
    Project,
    TimeEntry,
    Expense,
    Invoice,
    PaginatedResponse
} from '../types';
import { formatDuration, formatDate, formatDateForApi } from '../utils/time';
import { toast } from 'react-toastify';
import ClientSearchSelect from '../components/ClientSearchSelect';

interface InvoiceFormData {
    client_id: string;
    project_id?: string;
    invoice_date: string;
    due_date: string;
    payment_terms: number;
    tax_rate: number;
    discount_amount?: number;
    discount_type: 'fixed' | 'percentage';
    notes?: string;
    footer?: string;
    time_entry_ids: string[];
    expense_ids: string[];
    custom_items: Array<{
        description: string;
        quantity: number;
        unit_price: number;
    }>;
}

const CreateInvoice: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const clientIdFromUrl = searchParams.get('client_id') || '';

    const [formData, setFormData] = useState<InvoiceFormData>({
        client_id: clientIdFromUrl,
        project_id: '',
        invoice_date: formatDateForApi(new Date()),
        due_date: formatDateForApi(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days
        payment_terms: 30,
        tax_rate: 20, // Default 20% VAT for France
        discount_amount: 0,
        discount_type: 'fixed',
        notes: '',
        footer: 'Facture conforme aux exigences de la loi anti-fraude NF525',
        time_entry_ids: [],
        expense_ids: [],
        custom_items: []
    });

    const [selectedTimeEntries, setSelectedTimeEntries] = useState<Set<string>>(new Set());
    const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
    const [showNF525Warning, setShowNF525Warning] = useState(false);

    // Initialize client_id from URL parameter
    useEffect(() => {
        if (clientIdFromUrl) {
            setFormData(prev => ({
                ...prev,
                client_id: clientIdFromUrl
            }));
        }
    }, [clientIdFromUrl]);

    // Fetch projects when client is selected
    const { data: projectsData } = useQuery<PaginatedResponse<Project>>({
        queryKey: ['projects', formData.client_id],
        queryFn: async () => {
            const response = await axios.get(`/api/projects?client_id=${formData.client_id}`);
            return response.data;
        },
        enabled: !!formData.client_id
    });

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
            const response = await axios.get(`/api/time-entries?${params}`);
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
            const response = await axios.get(`/api/expenses?${params}`);
            return response.data.data;
        },
        enabled: !!formData.client_id
    });

    // Create invoice mutation
    const createInvoiceMutation = useMutation({
        mutationFn: async (data: InvoiceFormData & { status: 'draft' | 'sent' }) => {
            const response = await axios.post('/api/invoices', {
                ...data,
                time_entry_ids: Array.from(selectedTimeEntries),
                expense_ids: Array.from(selectedExpenses)
            });
            return response.data.invoice;
        },
        onSuccess: (invoice) => {
            toast.success(t('invoices.createSuccess'));
            navigate(`/invoices/${invoice.id}`);
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || t('invoices.createError');
            toast.error(message);
        }
    });

    // Calculate totals
    const calculateTotals = () => {
        let subtotal = 0;

        // Add time entries
        if (timeEntriesData) {
            const selectedEntries = timeEntriesData.filter(e => selectedTimeEntries.has(e.id));
            selectedEntries.forEach(entry => {
                const hours = (entry.duration_seconds || 0) / 3600;
                subtotal += hours * entry.hourly_rate;
            });
        }

        // Add expenses
        if (expensesData) {
            const selectedExpensesList = expensesData.filter(e => selectedExpenses.has(e.id));
            selectedExpensesList.forEach(expense => {
                subtotal += expense.amount;
            });
        }

        // Add custom items
        formData.custom_items.forEach(item => {
            subtotal += item.quantity * item.unit_price;
        });

        // Calculate discount
        let discountAmount = 0;
        if (formData.discount_amount) {
            if (formData.discount_type === 'percentage') {
                discountAmount = subtotal * (formData.discount_amount / 100);
            } else {
                discountAmount = formData.discount_amount;
            }
        }

        // Calculate tax
        const taxableAmount = subtotal - discountAmount;
        const taxAmount = taxableAmount * (formData.tax_rate / 100);

        // Calculate total
        const total = taxableAmount + taxAmount;

        return {
            subtotal,
            discountAmount,
            taxAmount,
            total
        };
    };

    const totals = calculateTotals();

    // Handle form changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
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

    // Add custom item
    const addCustomItem = () => {
        setFormData(prev => ({
            ...prev,
            custom_items: [
                ...prev.custom_items,
                {
                    description: '',
                    quantity: 1,
                    unit_price: 0
                }
            ]
        }));
    };

    // Update custom item
    const updateCustomItem = (index: number, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            custom_items: prev.custom_items.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        }));
    };

    // Remove custom item
    const removeCustomItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            custom_items: prev.custom_items.filter((_, i) => i !== index)
        }));
    };

    // Save as draft
    const saveAsDraft = () => {
        if (!formData.client_id) {
            toast.error(t('invoices.selectClientError'));
            return;
        }

        createInvoiceMutation.mutate({
            ...formData,
            status: 'draft'
        });
    };

    // Save and send
    const saveAndSend = () => {
        if (!formData.client_id) {
            toast.error(t('invoices.selectClientError'));
            return;
        }

        // Show NF525 warning
        setShowNF525Warning(true);
    };

    const confirmSend = () => {
        setShowNF525Warning(false);
        createInvoiceMutation.mutate({
            ...formData,
            status: 'sent'
        });
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
                        <FileText className="mr-2" />
                        {t('invoices.createNewInvoice')}
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {t('invoices.nf525Compliant')}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Client and Project Selection */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                                {t('invoices.clientInformation')}
                            </h2>
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
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('invoices.project')}
                                    </label>
                                    <select
                                        name="project_id"
                                        value={formData.project_id}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        disabled={!formData.client_id}
                                    >
                                        <option value="">{t('invoices.allProjects')}</option>
                                        {projectsData?.data?.map(project => (
                                            <option key={project.id} value={project.id}>
                                                {project.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Invoice Details */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                                {t('invoices.invoiceDetails')}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('invoices.invoiceDate')} *
                                    </label>
                                    <input
                                        type="date"
                                        name="invoice_date"
                                        value={formData.invoice_date}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('invoices.dueDate')} *
                                    </label>
                                    <input
                                        type="date"
                                        name="due_date"
                                        value={formData.due_date}
                                        onChange={handleInputChange}
                                        min={formData.invoice_date}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('invoices.paymentTerms')}
                                    </label>
                                    <input
                                        type="number"
                                        name="payment_terms"
                                        value={formData.payment_terms}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('invoices.taxRate')}
                                    </label>
                                    <input
                                        type="number"
                                        name="tax_rate"
                                        value={formData.tax_rate}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Time Entries */}
                        {timeEntriesData && timeEntriesData.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
                                    <Clock className="mr-2" />
                                    {t('invoices.timeEntries')}
                                </h2>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {timeEntriesData.map(entry => {
                                        const hours = (entry.duration_seconds || 0) / 3600;
                                        const amount = hours * entry.hourly_rate;
                                        return (
                                            <label
                                                key={entry.id}
                                                className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTimeEntries.has(entry.id)}
                                                    onChange={() => toggleTimeEntry(entry.id)}
                                                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {entry.project?.name} - {entry.task?.title || entry.description}
                                                        </span>
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                                            €{amount.toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
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
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
                                    <Package className="mr-2" />
                                    {t('invoices.expenses')}
                                </h2>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {expensesData.map(expense => (
                                        <label
                                            key={expense.id}
                                            className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedExpenses.has(expense.id)}
                                                onChange={() => toggleExpense(expense.id)}
                                                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {expense.description}
                                                    </span>
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                                        €{expense.amount.toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {formatDate(expense.expense_date)} - {expense.category?.name}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Custom Items */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                                    {t('invoices.customItems')}
                                </h2>
                                <button
                                    type="button"
                                    onClick={addCustomItem}
                                    className="flex items-center px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    <Plus size={16} className="mr-1" />
                                    {t('invoices.addItem')}
                                </button>
                            </div>
                            <div className="space-y-3">
                                {formData.custom_items.map((item, index) => (
                                    <div key={index} className="flex items-center space-x-2">
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => updateCustomItem(index, 'description', e.target.value)}
                                            placeholder={t('invoices.description')}
                                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        />
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => updateCustomItem(index, 'quantity', parseFloat(e.target.value))}
                                            placeholder={t('invoices.quantity')}
                                            step="0.01"
                                            className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        />
                                        <input
                                            type="number"
                                            value={item.unit_price}
                                            onChange={(e) => updateCustomItem(index, 'unit_price', parseFloat(e.target.value))}
                                            placeholder={t('invoices.price')}
                                            step="0.01"
                                            className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeCustomItem(index)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                                {t('invoices.additionalInformation')}
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('invoices.notes')}
                                    </label>
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('invoices.footerText')}
                                    </label>
                                    <textarea
                                        name="footer"
                                        value={formData.footer}
                                        onChange={handleInputChange}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar - Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sticky top-6">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                                {t('invoices.invoiceSummary')}
                            </h2>

                            {/* Discount */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('invoices.discount')}
                                </label>
                                <div className="flex space-x-2">
                                    <input
                                        type="number"
                                        name="discount_amount"
                                        value={formData.discount_amount}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                    <select
                                        name="discount_type"
                                        value={formData.discount_type}
                                        onChange={handleInputChange}
                                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="fixed">€</option>
                                        <option value="percentage">%</option>
                                    </select>
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">{t('invoices.subtotal')}</span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        €{totals.subtotal.toFixed(2)}
                                    </span>
                                </div>
                                {totals.discountAmount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">{t('invoices.discount')}</span>
                                        <span className="font-medium text-red-600">
                                            -€{totals.discountAmount.toFixed(2)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">
                                        {t('invoices.tax')} ({formData.tax_rate}%)
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        €{totals.taxAmount.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-lg font-semibold border-t border-gray-200 dark:border-gray-700 pt-2">
                                    <span className="text-gray-900 dark:text-white">{t('invoices.total')}</span>
                                    <span className="text-blue-600">
                                        €{totals.total.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* NF525 Compliance Note */}
                            <div className="mt-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                <div className="flex items-start">
                                    <AlertTriangle className="text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0 mt-0.5" size={16} />
                                    <div className="text-xs text-yellow-700 dark:text-yellow-300">
                                        <p className="font-semibold mb-1">{t('invoices.nf525ComplianceTitle')}</p>
                                        <p>{t('invoices.nf525ComplianceNote')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-6 space-y-2">
                                <button
                                    type="button"
                                    onClick={saveAsDraft}
                                    disabled={createInvoiceMutation.isLoading}
                                    className="w-full flex items-center justify-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Save className="mr-2" size={18} />
                                    {t('invoices.saveAsDraft')}
                                </button>
                                <button
                                    type="button"
                                    onClick={saveAndSend}
                                    disabled={createInvoiceMutation.isLoading}
                                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send className="mr-2" size={18} />
                                    {t('invoices.saveAndSend')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* NF525 Warning Modal */}
            {showNF525Warning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-start mb-4">
                            <AlertTriangle className="text-yellow-600 mr-3 flex-shrink-0 mt-1" size={24} />
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    {t('invoices.nf525WarningTitle')}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t('invoices.nf525WarningMessage')}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                    {t('invoices.nf525WarningConfirm')}
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowNF525Warning(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={confirmSend}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                {t('invoices.sendInvoice')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateInvoice;