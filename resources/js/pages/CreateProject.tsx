import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeftIcon,
    FolderIcon,
    UserGroupIcon,
    CurrencyEuroIcon,
    CalendarIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Project, Client, PaginatedResponse } from '../types';
import ClientSearchSelect from '../components/ClientSearchSelect';

interface ProjectFormData {
    name: string;
    description: string;
    client_id: string;
    status: 'active' | 'on_hold' | 'completed' | 'archived' | 'cancelled';
    billing_type: 'hourly' | 'fixed' | 'retainer' | 'maintenance';
    hourly_rate: number;
    daily_rate: number;
    budget: number;
    estimated_hours: number;
    estimated_days: number;
    monthly_amount: number;
    contract_duration: number;
    billing_frequency: 'monthly' | 'quarterly' | 'yearly';
    start_date: string;
    end_date: string;
    color: string;
    is_billable: boolean;
}

const CreateProject: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const clientIdFromUrl = searchParams.get('client_id') || '';

    const [formData, setFormData] = useState<ProjectFormData>({
        name: '',
        description: '',
        client_id: clientIdFromUrl,
        status: 'active',
        billing_type: 'hourly',
        hourly_rate: 0,
        daily_rate: 0,
        budget: 0,
        estimated_hours: 0,
        estimated_days: 0,
        monthly_amount: 0,
        contract_duration: 12,
        billing_frequency: 'monthly',
        start_date: '',
        end_date: '',
        color: '#3B82F6',
        is_billable: true
    });

    // Initialize client_id from URL parameter
    useEffect(() => {
        if (clientIdFromUrl) {
            setFormData(prev => ({
                ...prev,
                client_id: clientIdFromUrl
            }));
        }
    }, [clientIdFromUrl]);

    // Create project mutation
    const createProjectMutation = useMutation({
        mutationFn: async (data: ProjectFormData) => {
            const response = await axios.post('/projects', data);
            return response.data;
        },
        onSuccess: (project) => {
            toast.success(t('projects.createSuccess'));
            navigate(`/projects/${project.id}`);
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || t('projects.createError');
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error(t('projects.nameRequired'));
            return;
        }

        if (!formData.client_id) {
            toast.error(t('projects.clientRequired'));
            return;
        }

        createProjectMutation.mutate(formData);
    };

    const statusOptions = [
        { value: 'active', label: t('projects.active'), color: 'bg-green-100 text-green-800' },
        { value: 'on_hold', label: t('projects.onHold'), color: 'bg-yellow-100 text-yellow-800' },
        { value: 'completed', label: t('projects.completed'), color: 'bg-blue-100 text-blue-800' },
        { value: 'archived', label: t('projects.archived'), color: 'bg-gray-100 text-gray-800' },
        { value: 'cancelled', label: t('projects.cancelled'), color: 'bg-red-100 text-red-800' }
    ];

    const billingTypeOptions = [
        { value: 'hourly', label: t('projects.hourly') },
        { value: 'fixed', label: t('projects.fixed') },
        { value: 'retainer', label: t('projects.retainer') },
        { value: 'maintenance', label: t('projects.maintenance') }
    ];

    const billingFrequencyOptions = [
        { value: 'monthly', label: t('projects.monthly') },
        { value: 'quarterly', label: t('projects.quarterly') },
        { value: 'yearly', label: t('projects.yearly') }
    ];

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center mb-4">
                    <Link
                        to="/projects"
                        className="flex items-center text-gray-600 hover:text-gray-900 transition mr-4"
                    >
                        <ArrowLeftIcon className="h-5 w-5 mr-1" />
                        <span>{t('projects.backToProjects')}</span>
                    </Link>
                </div>
                <div className="flex items-center">
                    <FolderIcon className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('projects.newProject')}</h1>
                        <p className="text-gray-600">{t('projects.createProjectDescription')}</p>
                    </div>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('projects.generalInfo')}</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('projects.projectName')} *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={t('projects.enterProjectName')}
                                required
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('projects.description')}
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={t('projects.describeProject')}
                            />
                        </div>

                        <div>
                            <ClientSearchSelect
                                value={formData.client_id}
                                onChange={(clientId) => setFormData(prev => ({ ...prev, client_id: clientId }))}
                                label={t('projects.client')}
                                placeholder={t('projects.selectClient') || 'Sélectionner un client...'}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('projects.status')}
                            </label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {statusOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('projects.billingType')}
                            </label>
                            <select
                                name="billing_type"
                                value={formData.billing_type}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {billingTypeOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('projects.color')}
                            </label>
                            <input
                                type="color"
                                name="color"
                                value={formData.color}
                                onChange={handleInputChange}
                                className="w-full h-10 px-1 py-1 border border-gray-300 rounded-lg"
                            />
                        </div>
                    </div>
                </div>

                {/* Financial Information */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <CurrencyEuroIcon className="h-5 w-5 mr-2" />
                        {t('projects.financialInfo')}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Hourly - Taux horaire */}
                        {formData.billing_type === 'hourly' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.hourlyRate')} (€) *
                                    </label>
                                    <input
                                        type="number"
                                        name="hourly_rate"
                                        value={formData.hourly_rate}
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
                                        {t('projects.estimatedHours')}
                                    </label>
                                    <input
                                        type="number"
                                        name="estimated_hours"
                                        value={formData.estimated_hours}
                                        onChange={handleInputChange}
                                        step="0.5"
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.budget')} (€)
                                    </label>
                                    <input
                                        type="number"
                                        name="budget"
                                        value={formData.budget}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="0.00"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">{t('projects.optionalBudget')}</p>
                                </div>
                            </>
                        )}

                        {/* Fixed - Forfait / TJM */}
                        {formData.billing_type === 'fixed' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.dailyRate')} (€) *
                                    </label>
                                    <input
                                        type="number"
                                        name="daily_rate"
                                        value={formData.daily_rate}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="0.00"
                                        required
                                    />
                                    <p className="mt-1 text-xs text-gray-500">{t('projects.tjmHelp')}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.estimatedDays')}
                                    </label>
                                    <input
                                        type="number"
                                        name="estimated_days"
                                        value={formData.estimated_days}
                                        onChange={handleInputChange}
                                        step="0.5"
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.totalBudget')} (€)
                                    </label>
                                    <input
                                        type="number"
                                        name="budget"
                                        value={formData.budget}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="0.00"
                                    />
                                </div>
                            </>
                        )}

                        {/* Retainer - Abonnement */}
                        {formData.billing_type === 'retainer' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.monthlyAmount')} (€) *
                                    </label>
                                    <input
                                        type="number"
                                        name="monthly_amount"
                                        value={formData.monthly_amount}
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
                                        {t('projects.contractDuration')} ({t('projects.months')})
                                    </label>
                                    <input
                                        type="number"
                                        name="contract_duration"
                                        value={formData.contract_duration}
                                        onChange={handleInputChange}
                                        step="1"
                                        min="1"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="12"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.billingFrequency')}
                                    </label>
                                    <select
                                        name="billing_frequency"
                                        value={formData.billing_frequency}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        {billingFrequencyOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        {/* Maintenance */}
                        {formData.billing_type === 'maintenance' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.maintenanceFee')} (€) *
                                    </label>
                                    <input
                                        type="number"
                                        name="monthly_amount"
                                        value={formData.monthly_amount}
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
                                        {t('projects.billingFrequency')}
                                    </label>
                                    <select
                                        name="billing_frequency"
                                        value={formData.billing_frequency}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        {billingFrequencyOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.estimatedHours')}
                                    </label>
                                    <input
                                        type="number"
                                        name="estimated_hours"
                                        value={formData.estimated_hours}
                                        onChange={handleInputChange}
                                        step="0.5"
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="0"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">{t('projects.monthlyHoursHelp')}</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Dates */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <CalendarIcon className="h-5 w-5 mr-2" />
                        {t('projects.dates')}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('projects.startDate')}
                            </label>
                            <input
                                type="date"
                                name="start_date"
                                value={formData.start_date}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('projects.endDate')}
                            </label>
                            <input
                                type="date"
                                name="end_date"
                                value={formData.end_date}
                                onChange={handleInputChange}
                                min={formData.start_date}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4">
                    <Link
                        to="/projects"
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    >
                        {t('common.cancel')}
                    </Link>
                    <button
                        type="submit"
                        disabled={createProjectMutation.isPending}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center"
                    >
                        {createProjectMutation.isPending ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                {t('projects.creating')}
                            </>
                        ) : (
                            <>
                                <CheckCircleIcon className="h-5 w-5 mr-2" />
                                {t('projects.createProject')}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateProject;