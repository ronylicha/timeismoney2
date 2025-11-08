import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
    ArrowLeftIcon,
    BanknotesIcon,
    CalendarIcon,
    FolderIcon,
    TagIcon,
    DocumentIcon,
    CheckCircleIcon,
    PhotoIcon
} from '@heroicons/react/24/outline';
import { Expense, ExpenseCategory, Project, PaginatedResponse } from '../types';

interface ExpenseFormData {
    description: string;
    amount: number;
    expense_date: string;
    category: string;
    vendor: string;
    project_id: string;
    billable: boolean;
    notes: string;
    receipt: File | null;
}

const CreateExpense: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<ExpenseFormData>({
        description: '',
        amount: 0,
        expense_date: new Date().toISOString().split('T')[0],
        category: '',
        vendor: '',
        project_id: '',
        billable: true,
        notes: '',
        receipt: null
    });

    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

    // Fetch expense categories
    const { data: categoriesData } = useQuery<PaginatedResponse<ExpenseCategory>>({
        queryKey: ['expense-categories'],
        queryFn: async () => {
            const response = await axios.get('/api/expense-categories');
            return response.data;
        }
    });

    // Fetch projects for dropdown
    const { data: projectsData } = useQuery<PaginatedResponse<Project>>({
        queryKey: ['projects'],
        queryFn: async () => {
            const response = await axios.get('/api/projects');
            return response.data;
        }
    });

    // Create expense mutation
    const createExpenseMutation = useMutation({
        mutationFn: async (data: ExpenseFormData) => {
            const formDataToSend = new FormData();
            
            // Append all form fields
            Object.keys(data).forEach(key => {
                if (key !== 'receipt' && data[key as keyof ExpenseFormData] !== null) {
                    formDataToSend.append(key, String(data[key as keyof ExpenseFormData]));
                }
            });
            
            // Append receipt if exists
            if (data.receipt) {
                formDataToSend.append('receipt', data.receipt);
            }
            
            const response = await axios.post('/api/expenses', formDataToSend, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        },
        onSuccess: (expense) => {
            toast.success('Dépense créée avec succès');
            navigate(`/expenses/${expense.id}`);
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Erreur lors de la création de la dépense';
            toast.error(message);
        }
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const target = e.target as HTMLInputElement;
        const { name, value, type } = target;
        const checked = target.type === 'checkbox' ? target.checked : false;
        
        if (type === 'checkbox') {
            setFormData(prev => ({
                ...prev,
                [name]: checked
            }));
        } else if (type === 'number') {
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
            if (!allowedTypes.includes(file.type)) {
                toast.error('Veuillez sélectionner une image (JPG, PNG, GIF) ou un fichier PDF');
                return;
            }
            
            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                toast.error('La taille du fichier ne doit pas dépasser 5MB');
                return;
            }
            
            setFormData(prev => ({
                ...prev,
                receipt: file
            }));
            
            // Create preview for images
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setReceiptPreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            } else {
                setReceiptPreview(null);
            }
        }
    };

    const removeReceipt = () => {
        setFormData(prev => ({
            ...prev,
            receipt: null
        }));
        setReceiptPreview(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.description.trim()) {
            toast.error('La description est obligatoire');
            return;
        }
        
        if (formData.amount <= 0) {
            toast.error('Le montant doit être supérieur à 0');
            return;
        }
        
        if (!formData.expense_date) {
            toast.error('La date de dépense est obligatoire');
            return;
        }

        createExpenseMutation.mutate(formData);
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center mb-4">
                    <Link
                        to="/expenses"
                        className="flex items-center text-gray-600 hover:text-gray-900 transition mr-4"
                    >
                        <ArrowLeftIcon className="h-5 w-5 mr-1" />
                        <span>Retour aux dépenses</span>
                    </Link>
                </div>
                <div className="flex items-center">
                    <BanknotesIcon className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Nouvelle dépense</h1>
                        <p className="text-gray-600">Enregistrez une nouvelle dépense professionnelle</p>
                    </div>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations générales</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description *
                            </label>
                            <input
                                type="text"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Entrez la description de la dépense"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Montant (€) *
                            </label>
                            <input
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleInputChange}
                                step="0.01"
                                min="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0.00"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Date de dépense *
                            </label>
                            <input
                                type="date"
                                name="expense_date"
                                value={formData.expense_date}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Catégorie
                            </label>
                            <input
                                type="text"
                                name="category"
                                value={formData.category}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Nom de la catégorie"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Fournisseur
                            </label>
                            <input
                                type="text"
                                name="vendor"
                                value={formData.vendor}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Nom du fournisseur"
                            />
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
                            >
                                <option value="">Sélectionnez un projet...</option>
                                {projectsData?.data?.map(project => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Options */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Options</h2>
                    
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="billable"
                            name="billable"
                            checked={formData.billable}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="billable" className="ml-2 block text-sm text-gray-900">
                            Facturable au client
                        </label>
                    </div>
                </div>

                {/* Receipt */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <DocumentIcon className="h-5 w-5 mr-2" />
                        Reçu
                    </h2>
                    
                    <div className="space-y-4">
                        {!formData.receipt ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Télécharger un reçu (optionnel)
                                </label>
                                <div className="flex items-center justify-center w-full">
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <PhotoIcon className="w-8 h-8 mb-3 text-gray-400" />
                                            <p className="mb-2 text-sm text-gray-500">
                                                <span className="font-semibold">Cliquez pour télécharger</span> ou glissez-déposez
                                            </p>
                                            <p className="text-xs text-gray-500">PNG, JPG, GIF ou PDF (MAX. 5MB)</p>
                                        </div>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*,.pdf"
                                            onChange={handleFileChange}
                                        />
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center">
                                        <DocumentIcon className="h-8 w-8 text-gray-400 mr-3" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {formData.receipt.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {(formData.receipt.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={removeReceipt}
                                        className="text-red-600 hover:text-red-800 transition-colors"
                                    >
                                        Supprimer
                                    </button>
                                </div>
                                
                                {receiptPreview && (
                                    <div className="mt-4">
                                        <img
                                            src={receiptPreview}
                                            alt="Aperçu du reçu"
                                            className="max-w-full h-auto rounded-lg shadow-md"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Notes */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notes supplémentaires
                        </label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ajoutez des notes ou des détails supplémentaires sur cette dépense..."
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4">
                    <Link
                        to="/expenses"
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    >
                        Annuler
                    </Link>
                    <button
                        type="submit"
                        disabled={createExpenseMutation.isPending}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center"
                    >
                        {createExpenseMutation.isPending ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Création...
                            </>
                        ) : (
                            <>
                                <CheckCircleIcon className="h-5 w-5 mr-2" />
                                Créer la dépense
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateExpense;