import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeftIcon,
    DocumentTextIcon,
    PlusIcon,
    TrashIcon,
    CalendarIcon,
    CurrencyEuroIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Quote, QuoteItem, Client, Project, PaginatedResponse } from '../types';

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

const CreateQuote: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
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

    // Fetch clients for dropdown
    const { data: clientsData } = useQuery<PaginatedResponse<Client>>({
        queryKey: ['clients'],
        queryFn: async () => {
            const response = await axios.get('/api/clients');
            return response.data;
        }
    });

    // Fetch projects when client is selected
    const { data: projectsData } = useQuery<PaginatedResponse<Project>>({
        queryKey: ['projects', formData.client_id],
        queryFn: async () => {
            const response = await axios.get(`/api/projects?client_id=${formData.client_id}`);
            return response.data;
        },
        enabled: !!formData.client_id
    });

    // Create quote mutation
    const createQuoteMutation = useMutation({
        mutationFn: async (data: QuoteFormData) => {
            const response = await axios.post('/api/quotes', data);
            return response.data;
        },
        onSuccess: (quote) => {
            toast.success(t('quotes.createSuccess'));
            navigate(`/quotes/${quote.id}`);
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || t('quotes.createError');
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
        
        formData.items.forEach(item => {
            const itemSubtotal = item.quantity * item.unit_price;
            const discount = item.discount || 0;
            const itemSubtotalAfterDiscount = itemSubtotal - discount;
            subtotal += itemSubtotalAfterDiscount;
            
            if (item.tax_rate) {
                totalTax += (itemSubtotalAfterDiscount * item.tax_rate) / 100;
            }
        });
        
        const total = subtotal + totalTax;
        
        return { subtotal, taxAmount: totalTax, total };
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
                        <span>Retour aux devis</span>
                    </Link>
                </div>
                <div className="flex items-center">
                    <DocumentTextIcon className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Nouveau devis</h1>
                        <p className="text-gray-600">Créez un nouveau devis pour votre client</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Quote Information */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations du devis</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Client *
                                    </label>
                                    <select
                                        name="client_id"
                                        value={formData.client_id}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    >
                                        <option value="">Sélectionnez un client...</option>
                                        {clientsData?.data?.map(client => (
                                            <option key={client.id} value={client.id}>
                                                {client.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Projet
                                    </label>
                                    <select
                                        name="project_id"
                                        value={formData.project_id}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        disabled={!formData.client_id}
                                    >
                                        <option value="">Sélectionnez un projet...</option>
                                        {projectsData?.data?.map(project => (
                                            <option key={project.id} value={project.id}>
                                                {project.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Sujet du devis *
                                    </label>
                                    <input
                                        type="text"
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Sujet du devis"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Date du devis *
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
                                        Valide jusqu'au *
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
                                <h2 className="text-lg font-semibold text-gray-900">Articles</h2>
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="flex items-center px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    <PlusIcon className="h-4 w-4 mr-1" />
                                    Ajouter un article
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                {formData.items.map((item, index) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Description
                                                </label>
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    placeholder="Description de l'article..."
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Quantité
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
                                                    Prix unitaire (€)
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
                                            
                                            <div className="flex items-end">
                                                <div className="flex-1">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Total
                                                    </label>
                                                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                                                        €{(item.quantity * item.unit_price - (item.discount || 0)).toFixed(2)}
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
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes et conditions</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Conditions générales
                                    </label>
                                    <textarea
                                        name="terms_conditions"
                                        value={formData.terms}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Conditions générales de vente..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Notes (visibles par le client)
                                    </label>
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Notes à afficher sur le devis..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Notes internes
                                    </label>
                                    <textarea
                                        name="internal_notes"
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Notes internes uniquement..."
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
                                Résumé
                            </h2>

                            {/* Tax and Discount */}

                            {/* Totals */}
                            <div className="space-y-2 border-t border-gray-200 pt-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Sous-total</span>
                                    <span className="font-medium">€{totals.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">TVA</span>
                                    <span className="font-medium">€{totals.taxAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-semibold border-t border-gray-200 pt-2">
                                    <span>Total</span>
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
                                            Création...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircleIcon className="h-5 w-5 mr-2" />
                                            Créer le devis
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CreateQuote;