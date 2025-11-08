import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { PlusIcon, MagnifyingGlassIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Expense {
    id: number;
    description: string;
    amount: number;
    date: string;
    category?: {
        name: string;
    };
    project?: {
        name: string;
    };
}

const Expenses: React.FC = () => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');

    const { data: expenses, isLoading } = useQuery({
        queryKey: ['expenses', searchTerm],
        queryFn: async () => {
            const response = await axios.get('/expenses', {
                params: { search: searchTerm },
            });
            return response.data.data;
        },
    });

    const getTotalExpenses = () => {
        if (!expenses) return 0;
        return expenses.reduce((acc: number, expense: Expense) => acc + expense.amount, 0);
    };

    return (
        <div className="p-6">
            <div className="mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('expenses.title')}</h1>
                        <p className="mt-2 text-gray-600">{t('expenses.subtitle')}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Link
                            to="/expense-categories"
                            className="flex items-center space-x-2 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition"
                        >
                            <span>{t('expenses.categories')}</span>
                        </Link>
                        <Link
                            to="/expenses/new"
                            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                        >
                            <PlusIcon className="h-5 w-5" />
                            <span>{t('expenses.newExpense')}</span>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-600">{t('expenses.totalExpenses')}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                            {new Intl.NumberFormat('fr-FR', {
                                style: 'currency',
                                currency: 'EUR',
                            }).format(getTotalExpenses())}
                        </p>
                    </div>
                    <div className="p-4 bg-red-100 rounded-lg">
                        <BanknotesIcon className="h-8 w-8 text-red-600" />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t('expenses.searchPlaceholder')}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">{t('common.loading')}</p>
                </div>
            ) : expenses?.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <BanknotesIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('expenses.noExpenses')}</h3>
                    <p className="text-gray-600 mb-6">{t('expenses.noExpensesDescription')}</p>
                    <Link
                        to="/expenses/new"
                        className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <PlusIcon className="h-5 w-5" />
                        <span>{t('expenses.addExpense')}</span>
                    </Link>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('expenses.date')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('expenses.description')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('expenses.category')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('expenses.project')}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('expenses.amount')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {expenses?.map((expense: Expense) => (
                                <tr
                                    key={expense.id}
                                    onClick={() => window.location.href = `/expenses/${expense.id}`}
                                    className="hover:bg-gray-50 cursor-pointer transition"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {format(new Date(expense.date), 'dd MMM yyyy', { locale: fr })}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {expense.description}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {expense.category?.name || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {expense.project?.name || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                                        {new Intl.NumberFormat('fr-FR', {
                                            style: 'currency',
                                            currency: 'EUR',
                                        }).format(expense.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Expenses;
