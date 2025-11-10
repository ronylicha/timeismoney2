import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeftIcon,
    PencilIcon,
    TrashIcon,
    CalendarIcon,
    ClockIcon,
    FlagIcon,
    DocumentTextIcon,
    CurrencyDollarIcon,
    PaperClipIcon,
    ChatBubbleLeftRightIcon,
    LinkIcon,
    TagIcon,
    UserGroupIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import TaskComments from '../components/Tasks/TaskComments';
import TaskAttachments from '../components/Tasks/TaskAttachments';
import TaskChecklist from '../components/Tasks/TaskChecklist';

interface Task {
    id: number;
    title: string;
    description?: string;
    status: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    type?: 'task' | 'bug' | 'feature' | 'improvement';
    project_id: number;
    parent_id?: number;
    estimated_hours?: number;
    actual_hours?: number;
    tracked_hours?: number;
    start_date?: string;
    due_date?: string;
    completed_at?: string;
    is_billable?: boolean;
    hourly_rate?: number;
    labels?: string[];
    code?: string;
    position?: number;
    created_at?: string;
    updated_at?: string;
    project?: {
        id: number;
        name: string;
        code: string;
    };
    users?: Array<{
        id: number;
        name: string;
        email: string;
        pivot: {
            role: string;
            assigned_hours?: number;
        };
    }>;
    parent?: {
        id: number;
        title: string;
    };
    children?: Array<{
        id: number;
        title: string;
        status: string;
    }>;
    dependencies?: Array<{
        id: number;
        title: string;
        status: string;
    }>;
    dependents?: Array<{
        id: number;
        title: string;
        status: string;
    }>;
    timeEntries?: Array<{
        id: number;
        duration_seconds: number;
        description: string;
        created_at: string;
        user: {
            name: string;
        };
    }>;
}



const TaskDetail: React.FC = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'checklist' | 'time' | 'comments' | 'attachments'>('details');

    // Fetch task details
    const { data: task, isLoading, error } = useQuery({
        queryKey: ['task', id],
        queryFn: async () => {
            const response = await axios.get(`/tasks/${id}`);
            return response.data as Task;
        },
        enabled: !!id,
    });

    // Update task status mutation
    const updateStatusMutation = useMutation({
        mutationFn: async (status: string) => {
            const response = await axios.post(`/tasks/${id}/status`, { status });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task', id] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Statut mis à jour');
        },
        onError: () => {
            toast.error('Erreur lors de la mise à jour du statut');
        },
    });

    // Delete task mutation
    const deleteTaskMutation = useMutation({
        mutationFn: async () => {
            await axios.delete(`/tasks/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Tâche supprimée');
            navigate('/tasks');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || t('tasks.errors.deleteError'));
        },
    });

    const handleStatusChange = (newStatus: string) => {
        updateStatusMutation.mutate(newStatus);
    };

    const handleDelete = () => {
        deleteTaskMutation.mutate();
    };

    const getStatusBadge = (status: string) => {
        const colors = {
            todo: 'bg-gray-100 text-gray-800',
            in_progress: 'bg-blue-100 text-blue-800',
            review: 'bg-purple-100 text-purple-800',
            completed: 'bg-green-100 text-green-800',
        };

        const labels = {
            todo: t('tasks.status.todo'),
            in_progress: t('tasks.status.inProgress'),
            review: t('tasks.status.inReview'),
            completed: t('tasks.status.completed'),
        };

        return (
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
                {labels[status as keyof typeof labels] || status}
            </span>
        );
    };

    const getPriorityBadge = (priority: string) => {
        const colors = {
            low: 'bg-gray-100 text-gray-800',
            normal: 'bg-blue-100 text-blue-800',
            high: 'bg-orange-100 text-orange-800',
            urgent: 'bg-red-100 text-red-800',
        };

        const labels = {
            low: t('tasks.priority.low'),
            normal: t('tasks.priority.normal'),
            high: t('tasks.priority.high'),
            urgent: t('tasks.priority.urgent'),
        };

        return (
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
                {labels[priority as keyof typeof labels] || priority}
            </span>
        );
    };

    const getTypeBadge = (type?: string) => {
        if (!type) return null;

        const colors = {
            task: 'bg-blue-100 text-blue-800',
            bug: 'bg-red-100 text-red-800',
            feature: 'bg-green-100 text-green-800',
            improvement: 'bg-purple-100 text-purple-800',
        };

        const labels = {
            task: t('tasks.type.task'),
            bug: t('tasks.type.bug'),
            feature: t('tasks.type.feature'),
            improvement: t('tasks.type.improvement'),
        };

        return (
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
                {labels[type as keyof typeof labels] || type}
            </span>
        );
    };

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    const isOverdue = (dueDate?: string) => {
        if (!dueDate) return false;
        return new Date(dueDate) < new Date() && task?.status !== 'completed';
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !task) {
        return (
            <div className="text-center py-12">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('tasks.errors.taskNotFound')}</h2>
                <p className="text-gray-600 mb-6">{t('tasks.errors.taskNotFoundDescription')}</p>
                <Link
                    to="/tasks"
                    className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                >
                    <ArrowLeftIcon className="h-5 w-5" />
                    <span>{t('tasks.backToTasks')}</span>
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                        <Link
                            to="/tasks"
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <ArrowLeftIcon className="h-6 w-6" />
                        </Link>
                        <div>
                            <div className="flex items-center space-x-3 mb-2">
                                <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
                                {task.code && (
                                    <span className="text-sm text-gray-500">#{task.code}</span>
                                )}
                            </div>
                            <div className="flex items-center space-x-3">
                                {getStatusBadge(task.status)}
                                {getPriorityBadge(task.priority)}
                                {getTypeBadge(task.type)}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                        <Link
                            to={`/tasks/${task.id}/edit`}
                            className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                        >
                            <PencilIcon className="h-4 w-4" />
                            <span>Modifier</span>
                        </Link>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="inline-flex items-center space-x-2 px-4 py-2 border border-red-300 rounded-lg text-red-600 hover:bg-red-50 transition"
                        >
                            <TrashIcon className="h-4 w-4" />
                            <span>{t('common.delete')}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('tasks.detail.quickStatus')}
                            </label>
                            <select
                                value={task.status}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={updateStatusMutation.isPending}
                            >
                                <option value="todo">À faire</option>
                                <option value="in_progress">En cours</option>
                                <option value="review">En révision</option>
                                <option value="completed">Terminé</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                            <ClockIcon className="h-4 w-4" />
                            <span>Temps suivi: {formatDuration(task.tracked_hours ? task.tracked_hours * 3600 : 0)}</span>
                        </div>
                        {task.estimated_hours && (
                            <div className="flex items-center space-x-2">
                                <span>{t('tasks.detail.estimated')}: {task.estimated_hours}h</span>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                        {[
                            { key: 'details', label: t('tasks.detail.overview'), icon: DocumentTextIcon },
                            { key: 'checklist', label: t('tasks.detail.checklist'), icon: CheckCircleIcon },
                            { key: 'time', label: t('tasks.detail.timeTracking'), icon: ClockIcon },
                            { key: 'comments', label: t('tasks.detail.comments'), icon: ChatBubbleLeftRightIcon },
                            { key: 'attachments', label: t('tasks.detail.attachments'), icon: PaperClipIcon },
                        ].map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key as any)}
                            className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === key
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            <span>{label}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    {activeTab === 'details' && (
                        <div className="space-y-6">
                            {/* Description */}
                            {task.description && (
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">{t('tasks.form.description')}</h3>
                                    <div className="prose max-w-none">
                                        <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
                                    </div>
                                </div>
                            )}

                            {/* Sub-tasks */}
                            {task.children && task.children.length > 0 && (
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">{t('tasks.detail.subtasks')}</h3>
                                    <div className="space-y-2">
                                        {task.children.map((child) => (
                                            <Link
                                                key={child.id}
                                                to={`/tasks/${child.id}`}
                                                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                                            >
                                                <span className="font-medium">{child.title}</span>
                                                {getStatusBadge(child.status)}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Dependencies */}
                            {(task.dependencies && task.dependencies.length > 0) || (task.dependents && task.dependents.length > 0) ? (
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                                        <LinkIcon className="inline h-5 w-5 mr-1" />
                                        {t('tasks.detail.dependencies')}
                                    </h3>
                                    
                                    {task.dependencies && task.dependencies.length > 0 && (
                                        <div className="mb-4">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">{t('tasks.dependencies.dependsOn')}:</h4>
                                            <div className="space-y-2">
                                                {task.dependencies.map((dep) => (
                                                    <Link
                                                        key={dep.id}
                                                        to={`/tasks/${dep.id}`}
                                                        className="flex items-center justify-between p-2 border border-gray-200 rounded hover:bg-gray-50"
                                                    >
                                                        <span>{dep.title}</span>
                                                        {getStatusBadge(dep.status)}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {task.dependents && task.dependents.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">{t('tasks.dependencies.blocks')}:</h4>
                                            <div className="space-y-2">
                                                {task.dependents.map((dependent) => (
                                                    <Link
                                                        key={dependent.id}
                                                        to={`/tasks/${dependent.id}`}
                                                        className="flex items-center justify-between p-2 border border-gray-200 rounded hover:bg-gray-50"
                                                    >
                                                        <span>{dependent.title}</span>
                                                        {getStatusBadge(dependent.status)}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    )}

                    {activeTab === 'checklist' && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <TaskChecklist taskId={parseInt(id || '0')} />
                        </div>
                    )}

                    {activeTab === 'time' && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('tasks.detail.timeEntries')}</h3>
                            {task.timeEntries && task.timeEntries.length > 0 ? (
                                <div className="space-y-3">
                                    {task.timeEntries.map((entry) => (
                                        <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium text-gray-900">{entry.description}</p>
                                                    <p className="text-sm text-gray-500">
                                                        Par {entry.user.name} • {format(new Date(entry.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium text-gray-900">{formatDuration(entry.duration_seconds)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-8">Aucune entrée de temps pour cette tâche</p>
                            )}
                        </div>
                    )}

                    {activeTab === 'comments' && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('tasks.detail.comments')}</h3>
                            <TaskComments taskId={parseInt(id || '0')} />
                        </div>
                    )}

                    {activeTab === 'attachments' && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('tasks.detail.attachments')}</h3>
                            <TaskAttachments taskId={parseInt(id || '0')} />
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Project Info */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            <FlagIcon className="inline h-5 w-5 mr-1" />
                            {t('tasks.form.project')}
                        </h3>
                        <Link
                            to={`/projects/${task.project_id}`}
                            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                            <div>
                                <p className="font-medium">{task.project?.name}</p>
                                <p className="text-sm text-gray-500">{task.project?.code}</p>
                            </div>
                        </Link>
                    </div>

                    {/* Assignment */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            <UserGroupIcon className="inline h-5 w-5 mr-1" />
                            {t('tasks.form.assignment')}
                        </h3>
                        {task.users && task.users.length > 0 ? (
                            <div className="space-y-3">
                                {task.users.map((user) => (
                                    <div key={user.id} className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{user.name}</p>
                                            <p className="text-sm text-gray-500">{user.email}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">{t('tasks.detail.unassigned')}</p>
                        )}
                    </div>

                    {/* Dates */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            <CalendarIcon className="inline h-5 w-5 mr-1" />
                            {t('tasks.detail.dates')}
                        </h3>
                        <div className="space-y-3">
                            {task.start_date && (
                                <div>
                                    <p className="text-sm text-gray-500">{t('tasks.form.startDate')}</p>
                                    <p className="font-medium">
                                        {format(new Date(task.start_date), 'dd MMM yyyy', { locale: fr })}
                                    </p>
                                </div>
                            )}
                            
                            {task.due_date && (
                                <div>
                                    <p className="text-sm text-gray-500">{t('tasks.form.dueDate')}</p>
                                    <p className={`font-medium ${isOverdue(task.due_date) ? 'text-red-600' : ''}`}>
                                        {format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr })}
                                        {isOverdue(task.due_date) && ' (En retard)'}
                                    </p>
                                </div>
                            )}
                            
                            {task.completed_at && (
                                <div>
                                    <p className="text-sm text-gray-500">Terminé le</p>
                                    <p className="font-medium text-green-600">
                                        {format(new Date(task.completed_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                                    </p>
                                </div>
                            )}
                            
                            <div>
                                <p className="text-sm text-gray-500">Créé le</p>
                                <p className="font-medium">
                                    {format(new Date(task.created_at || ''), 'dd MMM yyyy à HH:mm', { locale: fr })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Billing */}
                    {task.is_billable && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                <CurrencyDollarIcon className="inline h-5 w-5 mr-1" />
                                Facturation
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Facturable</span>
                                    <span className="font-medium text-green-600">Oui</span>
                                </div>
                                {task.hourly_rate && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500">Taux horaire</span>
                                        <span className="font-medium">{task.hourly_rate} €</span>
                                    </div>
                                )}
                                {task.tracked_hours && task.hourly_rate && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500">{t('tasks.detail.totalAmount')}</span>
                                        <span className="font-medium">
                                            {(task.tracked_hours * task.hourly_rate).toFixed(2)} €
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Labels */}
                    {task.labels && task.labels.length > 0 && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                <TagIcon className="inline h-5 w-5 mr-1" />
                                {t('tasks.form.labels')}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {task.labels.map((label, index) => (
                                    <span
                                        key={index}
                                        className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                                    >
                                        {label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            {t('common.deleteConfirm')}
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {t('tasks.errors.deleteConfirm')}
                        </p>
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                                disabled={deleteTaskMutation.isPending}
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                                disabled={deleteTaskMutation.isPending}
                            >
                                {deleteTaskMutation.isPending ? t('common.deleting') : t('common.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskDetail;