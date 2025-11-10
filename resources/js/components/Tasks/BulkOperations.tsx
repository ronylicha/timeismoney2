import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
    TrashIcon,
    FlagIcon,
    UserGroupIcon,
    XMarkIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface Task {
    id: number;
    title: string;
    status: string;
    priority: string;
    assigned_to?: {
        id: number;
        name: string;
    };
}

interface BulkOperationsProps {
    selectedTasks: Task[];
    onClearSelection: () => void;
    onTasksUpdated: () => void;
}

const BulkOperations: React.FC<BulkOperationsProps> = ({
    selectedTasks,
    onClearSelection,
    onTasksUpdated,
}) => {
    const queryClient = useQueryClient();
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);

    // Bulk status update mutation
    const bulkStatusMutation = useMutation({
        mutationFn: async ({ taskIds, status }: { taskIds: number[]; status: string }) => {
            const response = await axios.post('/tasks/bulk-status', { task_ids: taskIds, status });
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success(`${data.updated} tâches mises à jour`);
            onClearSelection();
            setShowBulkActions(false);
            setSelectedAction(null);
            onTasksUpdated();
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Erreur lors de la mise à jour';
            toast.error(message);
        },
    });

    // Bulk priority update mutation
    const bulkPriorityMutation = useMutation({
        mutationFn: async ({ taskIds, priority }: { taskIds: number[]; priority: string }) => {
            const response = await axios.post('/tasks/bulk-priority', { task_ids: taskIds, priority });
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success(`${data.updated} tâches mises à jour`);
            onClearSelection();
            setShowBulkActions(false);
            setSelectedAction(null);
            onTasksUpdated();
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Erreur lors de la mise à jour';
            toast.error(message);
        },
    });

    // Bulk assignment mutation
    const bulkAssignMutation = useMutation({
        mutationFn: async ({ taskIds, userIds }: { taskIds: number[]; userIds: number[] }) => {
            const response = await axios.post('/tasks/bulk-assign', { task_ids: taskIds, user_ids: userIds });
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success(`${data.updated} tâches assignées`);
            onClearSelection();
            setShowBulkActions(false);
            setSelectedAction(null);
            onTasksUpdated();
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Erreur lors de l\'assignation';
            toast.error(message);
        },
    });

    // Bulk delete mutation
    const bulkDeleteMutation = useMutation({
        mutationFn: async (taskIds: number[]) => {
            const response = await axios.post('/tasks/bulk-delete', { task_ids: taskIds });
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success(`${data.deleted} tâches supprimées`);
            onClearSelection();
            setShowBulkActions(false);
            setSelectedAction(null);
            onTasksUpdated();
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Erreur lors de la suppression';
            toast.error(message);
        },
    });

    const taskIds = selectedTasks.map(task => task.id);

    const handleBulkAction = (action: string) => {
        setSelectedAction(action);
        setShowBulkActions(true);
    };

    const handleStatusUpdate = (status: string) => {
        bulkStatusMutation.mutate({ taskIds, status });
    };

    const handlePriorityUpdate = (priority: string) => {
        bulkPriorityMutation.mutate({ taskIds, priority });
    };

    const handleAssign = (userIds: number[]) => {
        bulkAssignMutation.mutate({ taskIds, userIds });
    };

    const handleDelete = () => {
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedTasks.length} tâche(s) ? Cette action est irréversible.`)) {
            bulkDeleteMutation.mutate(taskIds);
        }
    };

    const isMutating = bulkStatusMutation.isPending || 
                      bulkPriorityMutation.isPending || 
                      bulkAssignMutation.isPending || 
                      bulkDeleteMutation.isPending;

    if (selectedTasks.length === 0) {
        return null;
    }

    return (
        <>
            {/* Bulk Actions Bar */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                        <span className="text-blue-900 font-medium">
                            {selectedTasks.length} tâche(s) sélectionnée(s)
                        </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => handleBulkAction('status')}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                        >
                            <FlagIcon className="inline h-4 w-4 mr-1" />
                            Statut
                        </button>
                        <button
                            onClick={() => handleBulkAction('priority')}
                            className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition"
                        >
                            <FlagIcon className="inline h-4 w-4 mr-1" />
                            Priorité
                        </button>
                        <button
                            onClick={() => handleBulkAction('assign')}
                            className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition"
                        >
                            <UserGroupIcon className="inline h-4 w-4 mr-1" />
                            Assigner
                        </button>
                        <button
                            onClick={handleDelete}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
                        >
                            <TrashIcon className="inline h-4 w-4 mr-1" />
                            Supprimer
                        </button>
                        <button
                            onClick={onClearSelection}
                            className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition"
                        >
                            <XMarkIcon className="inline h-4 w-4 mr-1" />
                            Désélectionner
                        </button>
                    </div>
                </div>
            </div>

            {/* Bulk Actions Modal */}
            {showBulkActions && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">
                                {selectedAction === 'status' && 'Mettre à jour le statut'}
                                {selectedAction === 'priority' && 'Mettre à jour la priorité'}
                                {selectedAction === 'assign' && 'Assigner à des utilisateurs'}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowBulkActions(false);
                                    setSelectedAction(null);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {selectedAction === 'status' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nouveau statut
                                    </label>
                                    <select
                                        onChange={(e) => handleStatusUpdate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        disabled={isMutating}
                                    >
                                        <option value="">Sélectionner un statut</option>
                                        <option value="todo">À faire</option>
                                        <option value="in_progress">En cours</option>
                                        <option value="review">En révision</option>
                                        <option value="completed">Terminé</option>
                                    </select>
                                </div>
                            )}

                            {selectedAction === 'priority' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nouvelle priorité
                                    </label>
                                    <select
                                        onChange={(e) => handlePriorityUpdate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        disabled={isMutating}
                                    >
                                        <option value="">Sélectionner une priorité</option>
                                        <option value="low">Basse</option>
                                        <option value="medium">Moyenne</option>
                                        <option value="high">Haute</option>
                                        <option value="critical">Critique</option>
                                    </select>
                                </div>
                            )}

                            {selectedAction === 'assign' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Assigner à
                                    </label>
                                    <select
                                        multiple
                                        onChange={(e) => {
                                            const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                                            handleAssign(selectedOptions);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        size={4}
                                        disabled={isMutating}
                                    >
                                        <option value="1">Utilisateur 1</option>
                                        <option value="2">Utilisateur 2</option>
                                        <option value="3">Utilisateur 3</option>
                                    </select>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Maintenez Ctrl (ou Cmd) pour sélectionner plusieurs utilisateurs
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowBulkActions(false);
                                    setSelectedAction(null);
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                                disabled={isMutating}
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default BulkOperations;