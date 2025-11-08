import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
    FolderIcon,
    PlusIcon,
    MagnifyingGlassIcon,
    UserGroupIcon,
    ClockIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';

interface Project {
    id: number;
    name: string;
    description: string;
    client_id: number;
    status: string;
    budget: number;
    hourly_rate: number;
    client?: {
        name: string;
    };
    tasks_count?: number;
    time_entries_sum_duration?: number;
}

const Projects: React.FC = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const { data: projects, isLoading } = useQuery({
        queryKey: ['projects', searchTerm, statusFilter],
        queryFn: async () => {
            const response = await axios.get('/projects', {
                params: {
                    search: searchTerm,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                },
            });
            return response.data.data;
        },
    });

    const getStatusBadge = (status: string) => {
        const colors = {
            active: 'bg-green-100 text-green-800',
            completed: 'bg-blue-100 text-blue-800',
            on_hold: 'bg-yellow-100 text-yellow-800',
            cancelled: 'bg-red-100 text-red-800',
        };

        const labels = {
            active: 'Actif',
            completed: 'Terminé',
            on_hold: 'En pause',
            cancelled: 'Annulé',
        };

        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
                {labels[status as keyof typeof labels] || status}
            </span>
        );
    };

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        return `${hours}h`;
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Projets</h1>
                        <p className="mt-2 text-gray-600">Gérez vos projets et suivez leur progression</p>
                    </div>
                    <Link
                        to="/projects/new"
                        className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <PlusIcon className="h-5 w-5" />
                        <span>Nouveau projet</span>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
                    <div className="flex-1 relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Rechercher un projet..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">Tous les statuts</option>
                        <option value="active">Actif</option>
                        <option value="completed">Terminé</option>
                        <option value="on_hold">En pause</option>
                        <option value="cancelled">Annulé</option>
                    </select>
                </div>
            </div>

            {/* Projects Grid */}
            {isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Chargement...</p>
                </div>
            ) : projects?.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <FolderIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun projet</h3>
                    <p className="text-gray-600 mb-6">Commencez par créer votre premier projet</p>
                    <Link
                        to="/projects/new"
                        className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <PlusIcon className="h-5 w-5" />
                        <span>Créer un projet</span>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects?.map((project: Project) => (
                        <Link
                            key={project.id}
                            to={`/projects/${project.id}`}
                            className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 block"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                        {project.name}
                                    </h3>
                                    {project.client && (
                                        <p className="text-sm text-gray-600">{project.client.name}</p>
                                    )}
                                </div>
                                {getStatusBadge(project.status)}
                            </div>

                            {project.description && (
                                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                    {project.description}
                                </p>
                            )}

                            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                    <div className="flex items-center space-x-1">
                                        <ChartBarIcon className="h-4 w-4" />
                                        <span>{project.tasks_count || 0} tâches</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <ClockIcon className="h-4 w-4" />
                                        <span>{formatDuration(project.time_entries_sum_duration || 0)}</span>
                                    </div>
                                </div>
                            </div>

                            {project.budget > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Budget</span>
                                        <span className="font-semibold text-gray-900">
                                            {new Intl.NumberFormat('fr-FR', {
                                                style: 'currency',
                                                currency: 'EUR',
                                            }).format(project.budget)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Projects;
