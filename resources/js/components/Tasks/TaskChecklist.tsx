import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface ChecklistItem {
    id: string;
    text: string;
    completed: boolean;
    position: number;
    created_at?: string;
    updated_at?: string;
}

interface TaskChecklistProps {
    taskId: number;
}

const TaskChecklist: React.FC<TaskChecklistProps> = ({ taskId }) => {
    const queryClient = useQueryClient();
    const [newItemText, setNewItemText] = useState('');
    const [editingItem, setEditingItem] = useState<string | null>(null);
    const [editText, setEditText] = useState('');

    // Fetch checklist items
    const { data: items, isLoading } = useQuery({
        queryKey: ['task-checklist', taskId],
        queryFn: async () => {
            const response = await axios.get(`/tasks/${taskId}/checklist`);
            return response.data as ChecklistItem[];
        },
        enabled: !!taskId,
    });

    // Add item mutation
    const addItemMutation = useMutation({
        mutationFn: async (text: string) => {
            const response = await axios.post(`/tasks/${taskId}/checklist`, { text });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task-checklist', taskId] });
            setNewItemText('');
            toast.success('Élément ajouté à la checklist');
        },
        onError: () => {
            toast.error('Erreur lors de l\'ajout de l\'élément');
        },
    });

    // Update item mutation
    const updateItemMutation = useMutation({
        mutationFn: async ({ itemId, data }: { itemId: string; data: Partial<ChecklistItem> }) => {
            const response = await axios.put(`/tasks/${taskId}/checklist/${itemId}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task-checklist', taskId] });
            setEditingItem(null);
            setEditText('');
            toast.success('Élément mis à jour');
        },
        onError: () => {
            toast.error('Erreur lors de la mise à jour de l\'élément');
        },
    });

    // Delete item mutation
    const deleteItemMutation = useMutation({
        mutationFn: async (itemId: string) => {
            await axios.delete(`/tasks/${taskId}/checklist/${itemId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task-checklist', taskId] });
            toast.success('Élément supprimé');
        },
        onError: () => {
            toast.error('Erreur lors de la suppression de l\'élément');
        },
    });



    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemText.trim()) return;

        addItemMutation.mutate(newItemText.trim());
    };

    const handleToggleComplete = (item: ChecklistItem) => {
        updateItemMutation.mutate({
            itemId: item.id,
            data: { completed: !item.completed },
        });
    };

    const handleEdit = (item: ChecklistItem) => {
        setEditingItem(item.id);
        setEditText(item.text);
    };

    const handleUpdate = (itemId: string) => {
        if (!editText.trim()) return;

        updateItemMutation.mutate({
            itemId,
            data: { text: editText.trim() },
        });
    };

    const handleDelete = (itemId: string) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
            deleteItemMutation.mutate(itemId);
        }
    };

    const cancelEdit = () => {
        setEditingItem(null);
        setEditText('');
    };

    const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            action();
        }
    };

    const completedCount = items?.filter(item => item.completed).length || 0;
    const totalCount = items?.length || 0;
    const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Progress Header */}
            <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium text-gray-900">Checklist</h3>
                    <span className="text-sm text-gray-600">
                        {completedCount} / {totalCount} terminés
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${completionPercentage}%` }}
                    ></div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                    {completionPercentage}% complété
                </p>
            </div>

            {/* Add Item Form */}
            <form onSubmit={handleAddItem} className="space-y-4">
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, () => handleAddItem(e))}
                        placeholder="Ajouter un élément à la checklist..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                        type="submit"
                        disabled={!newItemText.trim() || addItemMutation.isPending}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        <PlusIcon className="h-5 w-5" />
                    </button>
                </div>
            </form>

            {/* Checklist Items */}
            <div className="space-y-2">
                {items && items.length > 0 ? (
                    items.map((item) => (
                        <div
                            key={item.id}
                            className={`flex items-center space-x-3 p-3 rounded-lg border ${
                                item.completed
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-white border-gray-200'
                            }`}
                        >
                            <button
                                onClick={() => handleToggleComplete(item)}
                                className="flex-shrink-0"
                            >
                                {item.completed ? (
                                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                ) : (
                                    <div className="h-5 w-5 border-2 border-gray-400 rounded hover:border-gray-600"></div>
                                )}
                            </button>

                            <div className="flex-1">
                                {editingItem === item.id ? (
                                    <input
                                        type="text"
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, () => handleUpdate(item.id))}
                                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        autoFocus
                                    />
                                ) : (
                                    <span
                                        className={`${
                                            item.completed
                                                ? 'text-gray-500 line-through'
                                                : 'text-gray-900'
                                        }`}
                                    >
                                        {item.text}
                                    </span>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center space-x-1">
                                {editingItem === item.id ? (
                                    <>
                                        <button
                                            onClick={() => handleUpdate(item.id)}
                                            disabled={!editText.trim() || updateItemMutation.isPending}
                                            className="p-1 text-green-600 hover:text-green-700 transition disabled:opacity-50"
                                            title="Sauvegarder"
                                        >
                                            <CheckCircleIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={cancelEdit}
                                            className="p-1 text-gray-400 hover:text-gray-600 transition"
                                            title="Annuler"
                                        >
                                            <div className="h-4 w-4 border-2 border-gray-400 rounded"></div>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleEdit(item)}
                                            className="p-1 text-gray-400 hover:text-gray-600 transition"
                                            title="Modifier"
                                        >
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-1 text-gray-400 hover:text-red-600 transition"
                                            title="Supprimer"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8">
                        <CheckCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun élément</h3>
                        <p className="text-gray-500">
                            Ajoutez des éléments pour suivre la progression de cette tâche.
                        </p>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            {items && items.length > 0 && (
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                        {completedCount === totalCount && (
                            <span className="text-green-600 font-medium">
                                ✓ Tous les éléments sont complétés !
                            </span>
                        )}
                    </div>
                    
                    <div className="space-x-2">
                        {completedCount > 0 && (
                            <button
                                onClick={() => {
                                    items.filter(item => item.completed).forEach(item => {
                                        updateItemMutation.mutate({
                                            itemId: item.id,
                                            data: { completed: false },
                                        });
                                    });
                                }}
                                className="text-sm text-gray-500 hover:text-gray-700 transition"
                            >
                                Réinitialiser complétés
                            </button>
                        )}
                        
                        {completedCount < totalCount && (
                            <button
                                onClick={() => {
                                    items.filter(item => !item.completed).forEach(item => {
                                        updateItemMutation.mutate({
                                            itemId: item.id,
                                            data: { completed: true },
                                        });
                                    });
                                }}
                                className="text-sm text-blue-600 hover:text-blue-700 transition"
                            >
                                Tout compléter
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskChecklist;