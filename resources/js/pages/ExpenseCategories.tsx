import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { PlusIcon, TagIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useOffline } from '@/contexts/OfflineContext';
import { createLocalId } from '@/utils/offlineDB';

interface ExpenseCategory {
    id: number;
    name: string;
    description: string | null;
    expenses_count?: number;
}

const ExpenseCategories: React.FC = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: '', description: '' });
    const { isOnline, getOfflineData, saveOffline } = useOffline();
    const [offlineCategories, setOfflineCategories] = useState<ExpenseCategory[]>([]);
    const [cachedCategories, setCachedCategories] = useState<ExpenseCategory[]>([]);

    const { data: categories, isLoading } = useQuery({
        queryKey: ['expense-categories'],
        queryFn: async () => {
            const response = await axios.get('/expense-categories');
            return response.data.data;
        },
        enabled: isOnline,
    });

    useEffect(() => {
        if (isOnline && categories?.length) {
            setCachedCategories(categories);
        }
    }, [isOnline, categories]);

    useEffect(() => {
        if (!isOnline) {
            getOfflineData('expenseCategories')
                .then((data) => {
                    const normalized: ExpenseCategory[] = Array.isArray(data) ? data : data ? [data] : [];
                    setOfflineCategories(normalized);
                })
                .catch(() => setOfflineCategories([]));
        }
    }, [isOnline, getOfflineData]);

    const createCategoryMutation = useMutation({
        mutationFn: async (data: { name: string; description: string }) => {
            const response = await axios.post('/expense-categories', data);
            return response.data;
        },
        onSuccess: async (response) => {
            const payload = response?.category || response?.data || response;
            if (payload) {
                await saveOffline('expenseCategory', payload).catch(() => {});
            }
            queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
            toast.success(t('expenses.categoryCreated'));
            setShowAddModal(false);
            setNewCategory({ name: '', description: '' });
        },
        onError: () => {
            toast.error(t('expenses.categoryCreateError'));
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategory.name.trim()) {
            toast.error(t('expenses.categoryNameRequired'));
            return;
            return;
        }

        if (!isOnline) {
            const tempCategory = {
                id: createLocalId(),
                name: newCategory.name.trim(),
                description: newCategory.description || null,
            };
            saveOffline('expenseCategory', tempCategory).catch(() => {});
            setOfflineCategories((prev) => [tempCategory as ExpenseCategory, ...prev]);
            toast.success(t('expenses.categoryCreated'));
            setShowAddModal(false);
            setNewCategory({ name: '', description: '' });
            return;
        }

        createCategoryMutation.mutate(newCategory);
    };

    const displayedCategories = isOnline ? (categories ?? cachedCategories) : offlineCategories;

    return (
        <div className="p-6">
            <div className="mb-8">
                <div className="flex items-center mb-4">
                    <Link
                        to="/expenses"
                        className="flex items-center text-gray-600 hover:text-gray-900 transition mr-4"
                    >
                        <ArrowLeftIcon className="h-5 w-5 mr-1" />
                        <span>{t('expenses.backToExpenses')}</span>
                    </Link>
                </div>

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('expenses.categoriesTitle')}</h1>
                        <p className="mt-2 text-gray-600">{t('expenses.categoriesSubtitle')}</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <PlusIcon className="h-5 w-5" />
                        <span>{t('expenses.newCategory')}</span>
                    </button>
                </div>
            </div>

            {!isOnline && (
                <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
                    {t('expenses.offlineFormInfo') ||
                        'Mode hors ligne : les catégories sont chargées depuis votre cache local.'}
                </div>
            )}

            {isOnline && isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">{t('common.loading')}</p>
                </div>
            ) : displayedCategories?.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <TagIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('expenses.noCategories')}</h3>
                    <p className="text-gray-600 mb-6">{t('expenses.noCategoriesDescription')}</p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <PlusIcon className="h-5 w-5" />
                        <span>{t('expenses.createCategory')}</span>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedCategories?.map((category: ExpenseCategory) => (
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
                                    {category.expenses_count || 0} {t('expenses.expenseCount')}
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
                        <h3 className="text-lg font-bold text-gray-900 mb-4">{t('expenses.newCategory')}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('expenses.categoryName')} *
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
                                    {t('expenses.description')}
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
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={createCategoryMutation.isPending}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                                >
                                    {createCategoryMutation.isPending ? t('common.creating') : t('common.create')}
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
