import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
    PlusIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    CheckCircleIcon,
    ClockIcon,
    FlagIcon,
    UserIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Task {
    id: number;
    title: string;
    description: string;
    status: string;
    priority: string;
    due_date: string | null;
    project_id: number;
    assigned_to_id: number | null;
    project?: {
        id: number;
        name: string;
    };
    assigned_to?: {
        id: number;
        name: string;
    };
}

const Tasks: React.FC = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [projectFilter, setProjectFilter] = useState('all');

    // Fetch tasks
    const { data: tasks, isLoading } = useQuery({
        queryKey: ['tasks', searchTerm, statusFilter, priorityFilter, projectFilter],
        queryFn: async () => {
            const response = await axios.get('/tasks', {
                params: {
                    search: searchTerm,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
                    project_id: projectFilter !== 'all' ? projectFilter : undefined,
                },
            });
            return response.data.data;
        },
    });

    // Fetch projects for filter
    const { data: projects } = useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const response = await axios.get('/projects');
            return response.data.data;
        },
    });

    // Update task status mutation
    const updateTaskStatusMutation = useMutation({
        mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
            const response = await axios.patch(`/tasks/${taskId}`, { status });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Statut mis à jour');
        },
        onError: () => {
            toast.error('Erreur lors de la mise à jour du statut');
        },
    });

    const getStatusBadge = (status: string) => {
        const colors = {
            todo: 'bg-gray-100 text-gray-800',
            in_progress: 'bg-blue-100 text-blue-800',
            in_review: 'bg-purple-100 text-purple-800',
            completed: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800',
        };

        const labels = {
            todo: 'À faire',
            in_progress: 'En cours',
            in_review: 'En révision',
            completed: 'Terminé',
            cancelled: 'Annulé',
        };

        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
                {labels[status as keyof typeof labels] || status}
            </span>
        );
    };

    const getPriorityBadge = (priority: string) => {
        const colors = {
            low: 'bg-gray-100 text-gray-800',
            medium: 'bg-yellow-100 text-yellow-800',
            high: 'bg-orange-100 text-orange-800',
            urgent: 'bg-red-100 text-red-800',
        };

        const labels = {
            low: 'Basse',
            medium: 'Moyenne',
            high: 'Haute',
            urgent: 'Urgente',
        };

        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
                {labels[priority as keyof typeof labels] || priority}
            </span>
        );
    };

    const isOverdue = (dueDate: string | null) => {
        if (!dueDate) return false;
        return new Date(dueDate) < new Date();
    };

    const getTasksByStatus = () => {
        if (!tasks) return { todo: 0, in_progress: 0, in_review: 0, completed: 0 };
        return tasks.reduce((acc: any, task: Task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {});
    };

    const statusCounts = getTasksByStatus();

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Tâches</h1>
                        <p className="mt-2 text-gray-600">Gérez toutes vos tâches en un seul endroit</p>
                    </div>
                    <Link
                        to="/tasks/new"
                        className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <PlusIcon className="h-5 w-5" />
                        <span>Nouvelle tâche</span>
                    </Link>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">À faire</p>
                            <p className="text-2xl font-bold text-gray-900 mt-2">{statusCounts.todo || 0}</p>
                        </div>
                        <div className="p-3 bg-gray-100 rounded-lg">
                            <ClockIcon className="h-6 w-6 text-gray-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">En cours</p>
                            <p className="text-2xl font-bold text-gray-900 mt-2">{statusCounts.in_progress || 0}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <ClockIcon className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">En révision</p>
                            <p className="text-2xl font-bold text-gray-900 mt-2">{statusCounts.in_review || 0}</p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <ClockIcon className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Terminé</p>
                            <p className="text-2xl font-bold text-gray-900 mt-2">{statusCounts.completed || 0}</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <CheckCircleIcon className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Rechercher une tâche..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">Tous les statuts</option>
                        <option value="todo">À faire</option>
                        <option value="in_progress">En cours</option>
                        <option value="in_review">En révision</option>
                        <option value="completed">Terminé</option>
                        <option value="cancelled">Annulé</option>
                    </select>

                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">Toutes les priorités</option>
                        <option value="low">Basse</option>
                        <option value="medium">Moyenne</option>
                        <option value="high">Haute</option>
                        <option value="urgent">Urgente</option>
                    </select>

                    <select
                        value={projectFilter}
                        onChange={(e) => setProjectFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">Tous les projets</option>
                        {projects?.map((project: any) => (
                            <option key={project.id} value={project.id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tasks List */}
            {isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Chargement...</p>
                </div>
            ) : tasks?.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <CheckCircleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune tâche</h3>
                    <p className="text-gray-600 mb-6">Commencez par créer votre première tâche</p>
                    <Link
                        to="/tasks/new"
                        className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <PlusIcon className="h-5 w-5" />
                        <span>Créer une tâche</span>
                    </Link>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="divide-y divide-gray-200">
                        {tasks?.map((task: Task) => (
                            <div
                                key={task.id}
                                className="p-6 hover:bg-gray-50 transition cursor-pointer"
                                onClick={() => window.location.href = `/tasks/${task.id}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {task.title}
                                            </h3>
                                            {getStatusBadge(task.status)}
                                            {getPriorityBadge(task.priority)}
                                        </div>

                                        {task.description && (
                                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                                {task.description}
                                            </p>
                                        )}

                                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                                            {task.project && (
                                                <Link
                                                    to={`/projects/${task.project.id}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="flex items-center space-x-1 hover:text-blue-600"
                                                >
                                                    <FlagIcon className="h-4 w-4" />
                                                    <span>{task.project.name}</span>
                                                </Link>
                                            )}

                                            {task.assigned_to && (
                                                <div className="flex items-center space-x-1">
                                                    <UserIcon className="h-4 w-4" />
                                                    <span>{task.assigned_to.name}</span>
                                                </div>
                                            )}

                                            {task.due_date && (
                                                <div className={`flex items-center space-x-1 ${isOverdue(task.due_date) ? 'text-red-600' : ''}`}>
                                                    <ClockIcon className="h-4 w-4" />
                                                    <span>
                                                        {format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr })}
                                                        {isOverdue(task.due_date) && ' (En retard)'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="ml-4">
                                        <select
                                            value={task.status}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                updateTaskStatusMutation.mutate({
                                                    taskId: task.id,
                                                    status: e.target.value,
                                                });
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="todo">À faire</option>
                                            <option value="in_progress">En cours</option>
                                            <option value="in_review">En révision</option>
                                            <option value="completed">Terminé</option>
                                            <option value="cancelled">Annulé</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tasks;
