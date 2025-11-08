import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
    ArrowLeftIcon,
    FolderIcon,
    UserGroupIcon,
    CurrencyEuroIcon,
    CalendarIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Project, Client, PaginatedResponse } from '../types';

interface ProjectFormData {
    name: string;
    description: string;
    client_id: string;
    status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
    type: 'fixed' | 'hourly' | 'retainer' | 'maintenance';
    hourly_rate: number;
    budget_amount: number;
    estimated_hours: number;
    start_date: string;
    end_date: string;
    color: string;
    is_billable: boolean;
}

const CreateProject: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<ProjectFormData>({
        name: '',
        description: '',
        client_id: '',
        status: 'planning',
        type: 'hourly',
        hourly_rate: 0,
        budget_amount: 0,
        estimated_hours: 0,
        start_date: '',
        end_date: '',
        color: '#3B82F6',
        is_billable: true
    });

    // Fetch clients for dropdown
    const { data: clientsData } = useQuery<PaginatedResponse<Client>>({
        queryKey: ['clients'],
        queryFn: async () => {
            const response = await axios.get('/api/clients');
            return response.data;
        }
    });

    // Create project mutation
    const createProjectMutation = useMutation({
        mutationFn: async (data: ProjectFormData) => {
            const response = await axios.post('/api/projects', data);
            return response.data;
        },
        onSuccess: (project) => {
            toast.success('Projet créé avec succès');
            navigate(`/projects/${project.id}`);
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Erreur lors de la création du projet';
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
            toast.error('Le nom du projet est obligatoire');
            return;
        }
        
        if (!formData.client_id) {
            toast.error('Veuillez sélectionner un client');
            return;
        }

        createProjectMutation.mutate(formData);
    };

    const statusOptions = [
        { value: 'planning', label: 'Planification', color: 'bg-gray-100 text-gray-800' },
        { value: 'active', label: 'Actif', color: 'bg-green-100 text-green-800' },
        { value: 'on_hold', label: 'En pause', color: 'bg-yellow-100 text-yellow-800' },
        { value: 'completed', label: 'Terminé', color: 'bg-blue-100 text-blue-800' },
        { value: 'cancelled', label: 'Annulé', color: 'bg-red-100 text-red-800' }
    ];

    const billableTypeOptions = [
        { value: 'hourly', label: 'Au heure' },
        { value: 'fixed', label: 'Prix fixe' },
        { value: 'retainer', label: 'Mandat' },
        { value: 'maintenance', label: 'Maintenance' }
    ];

    const colorOptions = [
        { value: '#3B82F6', label: 'Bleu', class: 'bg-blue-500' },
        { value: '#10B981', label: 'Vert', class: 'bg-green-500' },
        { value: '#F59E0B', label: 'Orange', class: 'bg-yellow-500' },
        { value: '#EF4444', label: 'Rouge', class: 'bg-red-500' },
        { value: '#8B5CF6', label: 'Violet', class: 'bg-purple-500' },
        { value: '#EC4899', label: 'Rose', class: 'bg-pink-500' }
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
                        <span>Retour aux projets</span>
                    </Link>
                </div>
                <div className="flex items-center">
                    <FolderIcon className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Nouveau projet</h1>
                        <p className="text-gray-600">Créez un nouveau projet pour votre client</p>
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
                                Nom du projet *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Entrez le nom du projet"
                                required
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Décrivez le projet..."
                            />
                        </div>

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
                                Statut
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
                                Type de facturation
                            </label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {billableTypeOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Couleur
                            </label>
                            <div className="flex space-x-2">
                                {colorOptions.map(color => (
                                    <button
                                        key={color.value}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                                        className={`w-8 h-8 rounded-full ${color.class} ${formData.color === color.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                                        title={color.label}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Financial Information */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <CurrencyEuroIcon className="h-5 w-5 mr-2" />
                        Informations financières
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Taux horaire (€)
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
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Budget (€)
                            </label>
                            <input
                                type="number"
                                name="budget_amount"
                                value={formData.budget_amount}
                                onChange={handleInputChange}
                                step="0.01"
                                min="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Heures estimées
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
                    </div>
                </div>

                {/* Dates */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <CalendarIcon className="h-5 w-5 mr-2" />
                        Dates
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Date de début
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
                                Date de fin
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
                        Annuler
                    </Link>
                    <button
                        type="submit"
                        disabled={createProjectMutation.isPending}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center"
                    >
                        {createProjectMutation.isPending ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Création...
                            </>
                        ) : (
                            <>
                                <CheckCircleIcon className="h-5 w-5 mr-2" />
                                Créer le projet
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateProject;