import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeftIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Project, Client, PaginatedResponse } from '../types';

interface ProjectFormData {
    name: string;
    description: string;
    client_id: string;
    status: 'active' | 'on_hold' | 'completed' | 'cancelled' | 'archived';
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

const EditProject: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState<ProjectFormData>({
        name: '',
        description: '',
        client_id: '',
        status: 'active',
        billing_type: 'hourly',
        hourly_rate: 0,
        daily_rate: 0,
        budget: 0,
        estimated_hours: 0,
        estimated_days: 0,
        monthly_amount: 0,
        contract_duration: 0,
        billing_frequency: 'monthly',
        start_date: '',
        end_date: '',
        color: '#3B82F6',
        is_billable: true
    });

    // Fetch existing project
    const { data: project, isLoading: isLoadingProject } = useQuery<Project>({
        queryKey: ['project', id],
        queryFn: async () => {
            const response = await axios.get(`/projects/${id}`);
            return response.data;
        },
        enabled: !!id
    });

    // Fetch clients for dropdown
    const { data: clientsData } = useQuery<PaginatedResponse<Client>>({
        queryKey: ['clients'],
        queryFn: async () => {
            const response = await axios.get('/clients');
            return response.data;
        }
    });

    // Pre-fill form when project data loads
    useEffect(() => {
        if (project) {
            setFormData({
                name: project.name || '',
                description: project.description || '',
                client_id: project.client_id?.toString() || '',
                status: project.status || 'active',
                billing_type: project.billing_type || 'hourly',
                hourly_rate: project.hourly_rate || 0,
                daily_rate: project.daily_rate || 0,
                budget: project.budget || 0,
                estimated_hours: project.estimated_hours || 0,
                estimated_days: project.estimated_days || 0,
                monthly_amount: project.monthly_amount || 0,
                contract_duration: project.contract_duration || 0,
                billing_frequency: project.billing_frequency || 'monthly',
                start_date: project.start_date || '',
                end_date: project.end_date || '',
                color: project.color || '#3B82F6',
                is_billable: project.is_billable !== undefined ? project.is_billable : true
            });
        }
    }, [project]);

    // Update project mutation
    const updateProjectMutation = useMutation({
        mutationFn: async (data: ProjectFormData) => {
            const response = await axios.put(`/projects/${id}`, data);
            return response.data;
        },
        onSuccess: (response) => {
            toast.success(t('projects.updateSuccess'));
            queryClient.invalidateQueries({ queryKey: ['project', id] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            navigate(`/projects/${id}`);
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || t('projects.updateError');
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
        } else if (type === 'checkbox') {
            const target = e.target as HTMLInputElement;
            setFormData(prev => ({
                ...prev,
                [name]: target.checked
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

        updateProjectMutation.mutate(formData);
    };

    if (isLoadingProject) {
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
                        to="/projects"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-2"
                    >
                        <ArrowLeftIcon className="w-4 h-4 mr-1" />
                        {t('common.back')}
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {t('projects.editProject')}
                    </h1>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        {t('projects.generalInfo')}
                    </h2>
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
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                                rows={4}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('projects.client')} *
                            </label>
                            <select
                                name="client_id"
                                value={formData.client_id}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">{t('projects.selectClient')}</option>
                                {clientsData?.data?.map((client) => (
                                    <option key={client.id} value={client.id}>
                                        {client.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('projects.status')}
                            </label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="active">{t('projects.active')}</option>
                                <option value="on_hold">{t('projects.onHold')}</option>
                                <option value="completed">{t('projects.completed')}</option>
                                <option value="cancelled">{t('projects.cancelled')}</option>
                                <option value="archived">{t('projects.archived')}</option>
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
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="hourly">{t('projects.hourly')}</option>
                                <option value="fixed">{t('projects.fixed')}</option>
                                <option value="retainer">{t('projects.retainer')}</option>
                                <option value="maintenance">{t('projects.maintenance')}</option>
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

                {/* Financial Information - Dynamic based on billing_type */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        {t('projects.financialInformation')}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Hourly */}
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.budget')} (€)
                                        <span className="text-xs text-gray-500 ml-2">({t('projects.optionalBudget')})</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="budget"
                                        value={formData.budget}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        min="0"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </>
                        )}

                        {/* Fixed/TJM */}
                        {formData.billing_type === 'fixed' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.dailyRate')} (€) *
                                        <span className="text-xs text-gray-500 ml-2">({t('projects.tjmHelp')})</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="daily_rate"
                                        value={formData.daily_rate}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        min="0"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </>
                        )}

                        {/* Retainer */}
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.contractDuration')}
                                        <span className="text-xs text-gray-500 ml-2">({t('projects.months')})</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="contract_duration"
                                        value={formData.contract_duration}
                                        onChange={handleInputChange}
                                        step="1"
                                        min="0"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="monthly">{t('projects.monthly')}</option>
                                        <option value="quarterly">{t('projects.quarterly')}</option>
                                        <option value="yearly">{t('projects.yearly')}</option>
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="monthly">{t('projects.monthly')}</option>
                                        <option value="quarterly">{t('projects.quarterly')}</option>
                                        <option value="yearly">{t('projects.yearly')}</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('projects.estimatedHours')}
                                        <span className="text-xs text-gray-500 ml-2">({t('projects.monthlyHoursHelp')})</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="estimated_hours"
                                        value={formData.estimated_hours}
                                        onChange={handleInputChange}
                                        step="0.5"
                                        min="0"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </>
                        )}

                        <div className="md:col-span-2">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="is_billable"
                                    checked={formData.is_billable}
                                    onChange={handleInputChange}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">
                                    {t('projects.billable')}
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        {t('projects.planning')}
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
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4">
                    <Link
                        to="/projects"
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                        {t('common.cancel')}
                    </Link>
                    <button
                        type="submit"
                        disabled={updateProjectMutation.isPending}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                    >
                        {updateProjectMutation.isPending ? (
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

export default EditProject;
