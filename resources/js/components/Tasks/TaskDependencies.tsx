import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
    LinkIcon,
    PlusIcon,
    XMarkIcon,
    CheckCircleIcon,
    ClockIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface Task {
    id: number;
    title: string;
    status: 'todo' | 'in_progress' | 'in_review' | 'done';
    code?: string;
}

interface TaskDependency {
    id: number;
    task_id: number;
    depends_on_task_id: number;
    type: 'blocks' | 'related';
    depends_on_task: Task;
}

interface TaskDependenciesProps {
    taskId: number;
    projectId: number;
}

const TaskDependencies: React.FC<TaskDependenciesProps> = ({ taskId, projectId }) => {
    const queryClient = useQueryClient();
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<number | null>(null);
    const [dependencyType, setDependencyType] = useState<'blocks' | 'related'>('blocks');

    // Fetch current dependencies
    const { data: dependencies, isLoading: dependenciesLoading } = useQuery({
        queryKey: ['task-dependencies', taskId],
        queryFn: async () => {
            const response = await axios.get(`/tasks/${taskId}/dependencies`);
            return response.data as TaskDependency[];
        },
        enabled: !!taskId,
    });

    // Fetch available tasks for dependency selection
    const { data: availableTasks, isLoading: tasksLoading } = useQuery({
        queryKey: ['available-dependency-tasks', projectId, taskId],
        queryFn: async () => {
            const response = await axios.get(`/projects/${projectId}/tasks`, {
                params: {
                    exclude_id: taskId,
                },
            });
            return response.data.data as Task[];
        },
        enabled: !!projectId && !!taskId,
    });

    // Add dependency mutation
    const addDependencyMutation = useMutation({
        mutationFn: async (dependsOnTaskId: number) => {
            const response = await axios.post(`/tasks/${taskId}/dependencies`, {
                depends_on_task_id: dependsOnTaskId,
                type: dependencyType,
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task-dependencies', taskId] });
            setShowAddModal(false);
            setSelectedTask(null);
            toast.success('Dépendance ajoutée avec succès');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Erreur lors de l\'ajout de la dépendance';
            toast.error(message);
        },
    });

    // Remove dependency mutation
    const removeDependencyMutation = useMutation({
        mutationFn: async (dependencyId: number) => {
            await axios.delete(`/tasks/${taskId}/dependencies/${dependencyId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task-dependencies', taskId] });
            toast.success('Dépendance supprimée avec succès');
        },
        onError: () => {
            toast.error('Erreur lors de la suppression de la dépendance');
        },
    });

    const handleAddDependency = () => {
        if (!selectedTask) return;
        addDependencyMutation.mutate(selectedTask);
    };

    const handleRemoveDependency = (dependencyId: number) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cette dépendance ?')) {
            removeDependencyMutation.mutate(dependencyId);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
            case 'in_progress':
            case 'review':
                return <ClockIcon className="h-4 w-4 text-blue-500" />;
            default:
                return <ClockIcon className="h-4 w-4 text-gray-400" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const colors = {
            todo: 'bg-gray-100 text-gray-800',
            in_progress: 'bg-blue-100 text-blue-800',
            review: 'bg-purple-100 text-purple-800',
            completed: 'bg-green-100 text-green-800',
        };

        const labels = {
            todo: 'À faire',
            in_progress: 'En cours',
            review: 'En révision',
            completed: 'Terminé',
        };

        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
                {labels[status as keyof typeof labels] || status}
            </span>
        );
    };

    const getDependencyTypeLabel = (type: string) => {
        return type === 'blocks' ? 'Bloque' : 'Lié à';
    };

    const isLoading = dependenciesLoading || tasksLoading;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-gray-900">Dépendances</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Gérez les dépendances de cette tâche
                    </p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                >
                    <PlusIcon className="h-4 w-4" />
                    <span>Ajouter une dépendance</span>
                </button>
            </div>

            {/* Dependencies List */}
            {dependencies && dependencies.length > 0 ? (
                <div className="space-y-3">
                    {dependencies.map((dependency) => (
                        <div
                            key={dependency.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                        >
                            <div className="flex items-center space-x-3">
                                <LinkIcon className="h-5 w-5 text-gray-400" />
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <span className="font-medium text-gray-900">
                                            {dependency.depends_on_task.title}
                                        </span>
                                        {dependency.depends_on_task.code && (
                                            <span className="text-sm text-gray-500">
                                                #{dependency.depends_on_task.code}
                                            </span>
                                        )}
                                        {getStatusBadge(dependency.depends_on_task.status)}
                                    </div>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <span className="text-sm text-gray-500">
                                            {getDependencyTypeLabel(dependency.type)}
                                        </span>
                                        {getStatusIcon(dependency.depends_on_task.status)}
                                        {dependency.depends_on_task.status !== 'done' && (
                                            <div className="flex items-center space-x-1 text-amber-600">
                                                <ExclamationTriangleIcon className="h-3 w-3" />
                                                <span className="text-xs">
                                                    Cette tâche doit être terminée avant de pouvoir continuer
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleRemoveDependency(dependency.id)}
                                className="p-2 text-gray-400 hover:text-red-600 transition"
                                title="Supprimer la dépendance"
                            >
                                <XMarkIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8">
                    <LinkIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune dépendance</h3>
                    <p className="text-gray-500 mb-4">
                        Cette tâche n'a aucune dépendance pour le moment.
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        <PlusIcon className="h-4 w-4" />
                        <span>Ajouter une dépendance</span>
                    </button>
                </div>
            )}

            {/* Add Dependency Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">
                                Ajouter une dépendance
                            </h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Type de dépendance
                                </label>
                                <select
                                    value={dependencyType}
                                    onChange={(e) => setDependencyType(e.target.value as 'blocks' | 'related')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="blocks">Bloque - Cette tâche ne peut pas commencer avant que la dépendance soit terminée</option>
                                    <option value="related">Lié à - Simple relation entre les tâches</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tâche dépendante
                                </label>
                                <select
                                    value={selectedTask || ''}
                                    onChange={(e) => setSelectedTask(e.target.value ? parseInt(e.target.value) : null)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Sélectionner une tâche</option>
                                    {availableTasks?.map((task) => (
                                        <option key={task.id} value={task.id}>
                                            {task.code ? `${task.code} - ` : ''}{task.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleAddDependency}
                                disabled={!selectedTask || addDependencyMutation.isPending}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                            >
                                {addDependencyMutation.isPending ? 'Ajout...' : 'Ajouter'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskDependencies;