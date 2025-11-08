import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { PlusIcon, TagIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface ExpenseCategory {
    id: number;
    name: string;
    description: string | null;
    expenses_count?: number;
}

const ExpenseCategories: React.FC = () => {
    const queryClient = useQueryClient();
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: '', description: '' });

    const { data: categories, isLoading } = useQuery({
        queryKey: ['expense-categories'],
        queryFn: async () => {
            const response = await axios.get('/expense-categories');
            return response.data.data;
        },
    });

    const createCategoryMutation = useMutation({
        mutationFn: async (data: { name: string; description: string }) => {
            const response = await axios.post('/expense-categories', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
            toast.success('Catégorie créée avec succès');
            setShowAddModal(false);
            setNewCategory({ name: '', description: '' });
        },
        onError: () => {
            toast.error('Erreur lors de la création de la catégorie');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategory.name.trim()) {
            toast.error('Le nom de la catégorie est requis');
            return;
        }
        createCategoryMutation.mutate(newCategory);
    };

    return (
        <div className="p-6">
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

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Catégories de dépenses</h1>
                        <p className="mt-2 text-gray-600">Organisez vos dépenses par catégories</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <PlusIcon className="h-5 w-5" />
                        <span>Nouvelle catégorie</span>
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Chargement...</p>
                </div>
            ) : categories?.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <TagIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune catégorie</h3>
                    <p className="text-gray-600 mb-6">Créez votre première catégorie de dépense</p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <PlusIcon className="h-5 w-5" />
                        <span>Créer une catégorie</span>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories?.map((category: ExpenseCategory) => (
                        <div
                            key={category.id}
                            className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                        {category.name}
                                    </h3>
                                    {category.description && (
                                        <p className="text-sm text-gray-600">{category.description}</p>
                                    )}
                                </div>
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <TagIcon className="h-5 w-5 text-blue-600" />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-200">
                                <p className="text-sm text-gray-600">
                                    {category.expenses_count || 0} dépense(s)
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Category Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Nouvelle catégorie</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nom *
                                </label>
                                <input
                                    type="text"
                                    value={newCategory.name}
                                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={newCategory.description}
                                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={createCategoryMutation.isPending}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                                >
                                    {createCategoryMutation.isPending ? 'Création...' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpenseCategories;
