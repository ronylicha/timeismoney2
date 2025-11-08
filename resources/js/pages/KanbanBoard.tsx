import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline';

interface Task {
    id: number;
    title: string;
    description: string;
    status: string;
    priority: string;
    assigned_to?: {
        name: string;
    };
}

const KanbanBoard: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    const { data: project, isLoading: loadingProject } = useQuery({
        queryKey: ['project', id],
        queryFn: async () => {
            const response = await axios.get(`/projects/${id}`);
            return response.data.data;
        },
    });

    const { data: tasks, isLoading: loadingTasks } = useQuery({
        queryKey: ['tasks', id],
        queryFn: async () => {
            const response = await axios.get(`/tasks?project_id=${id}`);
            return response.data.data;
        },
    });

    const columns = [
        { id: 'todo', name: 'À faire', color: 'bg-gray-200' },
        { id: 'in_progress', name: 'En cours', color: 'bg-blue-200' },
        { id: 'in_review', name: 'En révision', color: 'bg-purple-200' },
        { id: 'completed', name: 'Terminé', color: 'bg-green-200' },
    ];

    const getTasksByStatus = (status: string) => {
        if (!tasks) return [];
        return tasks.filter((task: Task) => task.status === status);
    };

    const getPriorityColor = (priority: string) => {
        const colors = {
            low: 'border-l-gray-400',
            medium: 'border-l-yellow-400',
            high: 'border-l-orange-400',
            urgent: 'border-l-red-400',
        };
        return colors[priority as keyof typeof colors] || 'border-l-gray-400';
    };

    if (loadingProject || loadingTasks) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-8">
                <div className="flex items-center mb-4">
                    <Link
                        to={`/projects/${id}`}
                        className="flex items-center text-gray-600 hover:text-gray-900 transition mr-4"
                    >
                        <ArrowLeftIcon className="h-5 w-5 mr-1" />
                        <span>Retour au projet</span>
                    </Link>
                </div>

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Kanban Board</h1>
                        <p className="mt-2 text-gray-600">{project?.name}</p>
                    </div>
                    <Link
                        to={`/tasks/new?project_id=${id}`}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <PlusIcon className="h-5 w-5" />
                        <span>Nouvelle tâche</span>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {columns.map((column) => {
                    const columnTasks = getTasksByStatus(column.id);

                    return (
                        <div key={column.id} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-2">
                                    <div className={`h-3 w-3 rounded-full ${column.color}`}></div>
                                    <h3 className="font-semibold text-gray-900">{column.name}</h3>
                                    <span className="text-sm text-gray-500">({columnTasks.length})</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {columnTasks.map((task: Task) => (
                                    <div
                                        key={task.id}
                                        className={`bg-white rounded-lg p-4 shadow hover:shadow-md transition cursor-pointer border-l-4 ${getPriorityColor(task.priority)}`}
                                    >
                                        <h4 className="font-medium text-gray-900 mb-2">
                                            {task.title}
                                        </h4>
                                        {task.description && (
                                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                                {task.description}
                                            </p>
                                        )}
                                        {task.assigned_to && (
                                            <div className="flex items-center space-x-2">
                                                <div className="h-6 w-6 bg-gray-200 rounded-full flex items-center justify-center">
                                                    <span className="text-xs font-medium text-gray-600">
                                                        {task.assigned_to.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-gray-600">
                                                    {task.assigned_to.name}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {columnTasks.length === 0 && (
                                    <div className="text-center py-8 text-gray-400 text-sm">
                                        Aucune tâche
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default KanbanBoard;
