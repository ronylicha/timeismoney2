import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
    PlusIcon,
    MagnifyingGlassIcon,
    CheckCircleIcon,
    ClockIcon,
    FlagIcon,
    UserIcon,
    TrashIcon,
    TagIcon,
    EyeIcon,
    ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import TaskForm from '../components/Tasks/TaskForm';

interface Task {
    id: number;
    title: string;
    description: string;
    status: string;
    priority: string;
    due_date: string | null;
    project_id: number;
    assigned_to_id: number | null;
    labels?: string[];
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
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const location = useLocation();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [projectFilter, setProjectFilter] = useState('all');
    const [dateRangeFilter, setDateRangeFilter] = useState({
        start_date: '',
        end_date: '',
    });
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [labelsFilter, setLabelsFilter] = useState<string[]>([]);
    const [availableLabels, setAvailableLabels] = useState<string[]>([]);

    // Check if we should show create modal from URL params
    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('create') === 'true') {
            setShowCreateModal(true);
        }
    }, [location.search]);

    // Fetch tasks
    const { data: tasks, isLoading } = useQuery({
        queryKey: ['tasks', searchTerm, statusFilter, priorityFilter, projectFilter, dateRangeFilter, labelsFilter],
        queryFn: async () => {
            const response = await axios.get('/tasks', {
                params: {
                    search: searchTerm,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
                    project_id: projectFilter !== 'all' ? projectFilter : undefined,
                    start_date: dateRangeFilter.start_date || undefined,
                    end_date: dateRangeFilter.end_date || undefined,
                    labels: labelsFilter.length > 0 ? labelsFilter.join(',') : undefined,
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
            toast.success(t('tasks.statusUpdated'));
        },
        onError: () => {
            toast.error(t('tasks.statusUpdateError'));
        },
    });

    // Bulk update tasks mutation
    const bulkUpdateMutation = useMutation({
        mutationFn: async ({ taskIds, data }: { taskIds: number[]; data: any }) => {
            const response = await axios.post('/tasks/bulk-update', { task_ids: taskIds, ...data });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setSelectedTasks([]);
            setShowBulkActions(false);
            toast.success(t('tasks.bulkUpdateSuccess'));
        },
        onError: () => {
            toast.error(t('tasks.bulkUpdateError'));
        },
    });

    // Bulk delete tasks mutation
    const bulkDeleteMutation = useMutation({
        mutationFn: async (taskIds: number[]) => {
            const response = await axios.post('/tasks/bulk-delete', { task_ids: taskIds });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setSelectedTasks([]);
            setShowBulkActions(false);
            toast.success(t('tasks.bulkDeleteSuccess'));
        },
        onError: () => {
            toast.error(t('tasks.bulkDeleteError'));
        },
    });

    // Export tasks mutation
    const exportTasksMutation = useMutation({
        mutationFn: async (format: 'csv' | 'pdf' | 'excel') => {
            const response = await axios.get('/tasks/export', {
                params: {
                    format,
                    search: searchTerm,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
                    project_id: projectFilter !== 'all' ? projectFilter : undefined,
                    start_date: dateRangeFilter.start_date || undefined,
                    end_date: dateRangeFilter.end_date || undefined,
                    labels: labelsFilter.length > 0 ? labelsFilter.join(',') : undefined,
                },
                responseType: 'blob'
            });
            return response.data;
        },
        onSuccess: (data, variables) => {
            const url = window.URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tasks.${variables}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success(t('tasks.exportSuccess'));
        },
        onError: () => {
            toast.error(t('tasks.exportError'));
        },
    });

    const getStatusBadge = (status: string) => {
        const colors = {
            todo: 'bg-gray-100 text-gray-800',
            in_progress: 'bg-blue-100 text-blue-800',
            review: 'bg-purple-100 text-purple-800',
            done: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800',
        };

        const labels = {
            todo: t('tasks.status.todo'),
            in_progress: t('tasks.status.inProgress'),
            review: t('tasks.status.inReview'),
            done: t('tasks.status.done'),
            cancelled: t('tasks.status.cancelled'),
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
        if (!tasks) return { todo: 0, in_progress: 0, review: 0, done: 0, cancelled: 0 };
        return tasks.reduce((acc: any, task: Task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {});
    };

    const statusCounts = getTasksByStatus();

    // Extract available labels from tasks
    React.useEffect(() => {
        if (tasks) {
            const allLabels = tasks.flatMap((task: Task) => task.labels || []);
            const uniqueLabels = Array.from(new Set(allLabels)) as string[];
            setAvailableLabels(uniqueLabels);
        }
    }, [tasks]);

    // Handle task selection
    const handleTaskSelection = (taskId: number, selected: boolean) => {
        if (selected) {
            setSelectedTasks(prev => [...prev, taskId]);
        } else {
            setSelectedTasks(prev => prev.filter(id => id !== taskId));
        }
    };

    // Handle select all
    const handleSelectAll = (selected: boolean) => {
        if (selected && tasks) {
            setSelectedTasks(tasks.map((task: Task) => task.id));
        } else {
            setSelectedTasks([]);
        }
    };

    // Handle bulk status update
    const handleBulkStatusUpdate = (status: string) => {
        if (selectedTasks.length === 0) return;
        bulkUpdateMutation.mutate({ taskIds: selectedTasks, data: { status } });
    };

    // Handle bulk delete
    const handleBulkDelete = () => {
        if (selectedTasks.length === 0) return;
        if (window.confirm(t('tasks.bulkDeleteConfirm'))) {
            bulkDeleteMutation.mutate(selectedTasks);
        }
    };

    // Handle export
    const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
        exportTasksMutation.mutate(format);
    };

    // Toggle bulk actions visibility
    React.useEffect(() => {
        setShowBulkActions(selectedTasks.length > 0);
    }, [selectedTasks]);

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('tasks.title')}</h1>
                        <p className="mt-2 text-gray-600">{t('tasks.subtitle')}</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <PlusIcon className="h-5 w-5" />
                        <span>{t('tasks.newTask')}</span>
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">{t('tasks.stats.todo')}</p>
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
                            <p className="text-sm font-medium text-gray-600">{t('tasks.stats.inProgress')}</p>
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
                            <p className="text-sm font-medium text-gray-600">{t('tasks.stats.inReview')}</p>
                            <p className="text-2xl font-bold text-gray-900 mt-2">{statusCounts.review || 0}</p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <ClockIcon className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">{t('tasks.stats.done')}</p>
                            <p className="text-2xl font-bold text-gray-900 mt-2">{statusCounts.done || 0}</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <CheckCircleIcon className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {showBulkActions && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <span className="text-sm font-medium text-blue-900">
                                {selectedTasks.length} {t('tasks.selected')}
                            </span>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => handleBulkStatusUpdate('todo')}
                                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                                >
                                    {t('tasks.status.todo')}
                                </button>
                                <button
                                    onClick={() => handleBulkStatusUpdate('in_progress')}
                                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                                >
                                    {t('tasks.status.inProgress')}
                                </button>
                                <button
                                    onClick={() => handleBulkStatusUpdate('done')}
                                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
                                >
                                    {t('tasks.status.done')}
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                                >
                                    <TrashIcon className="h-4 w-4 inline mr-1" />
                                    {t('common.delete')}
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedTasks([])}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                            {t('common.cancel')}
                        </button>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t('tasks.searchPlaceholder')}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">{t('tasks.allStatuses')}</option>
                        <option value="todo">{t('tasks.status.todo')}</option>
                        <option value="in_progress">{t('tasks.status.inProgress')}</option>
                        <option value="review">{t('tasks.status.inReview')}</option>
                        <option value="done">{t('tasks.status.done')}</option>
                        <option value="cancelled">{t('tasks.status.cancelled')}</option>
                    </select>

                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">{t('tasks.allPriorities')}</option>
                        <option value="low">{t('tasks.priority.low')}</option>
                        <option value="normal">{t('tasks.priority.normal')}</option>
                        <option value="high">{t('tasks.priority.high')}</option>
                        <option value="urgent">{t('tasks.priority.urgent')}</option>
                    </select>

                    <select
                        value={projectFilter}
                        onChange={(e) => setProjectFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">{t('tasks.allProjects')}</option>
                        {projects?.map((project: any) => (
                            <option key={project.id} value={project.id}>
                                {project.name}
                            </option>
                        ))}
                    </select>

                    <div className="relative">
                        <TagIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <select
                            multiple
                            value={labelsFilter}
                            onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions, option => option.value);
                                setLabelsFilter(selected);
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            size={1}
                        >
                            <option value="" disabled>
                                {labelsFilter.length > 0 
                                    ? `${labelsFilter.length} ${t('tasks.labelsSelected')}` 
                                    : t('tasks.selectLabels')
                                }
                            </option>
                            {availableLabels.map((label) => (
                                <option key={label} value={label}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Advanced Filters Toggle */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className="text-sm text-blue-600 hover:text-blue-700 transition"
                        >
                            {showAdvancedFilters ? t('tasks.hideAdvancedFilters') : t('tasks.showAdvancedFilters')}
                        </button>
                        
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">{t('tasks.export')}:</span>
                            <button
                                onClick={() => handleExport('csv')}
                                className="text-sm text-green-600 hover:text-green-700 transition"
                                disabled={exportTasksMutation.isPending}
                            >
                                CSV
                            </button>
                            <button
                                onClick={() => handleExport('excel')}
                                className="text-sm text-blue-600 hover:text-blue-700 transition"
                                disabled={exportTasksMutation.isPending}
                            >
                                Excel
                            </button>
                            <button
                                onClick={() => handleExport('pdf')}
                                className="text-sm text-red-600 hover:text-red-700 transition"
                                disabled={exportTasksMutation.isPending}
                            >
                                PDF
                            </button>
                        </div>
                    </div>
                    
                    {(dateRangeFilter.start_date || dateRangeFilter.end_date || labelsFilter.length > 0) && (
                        <button
                            onClick={() => {
                                setDateRangeFilter({ start_date: '', end_date: '' });
                                setLabelsFilter([]);
                            }}
                            className="text-sm text-gray-500 hover:text-gray-700 transition"
                        >
                            {t('tasks.filters.clearFilters')}
                        </button>
                    )}
                </div>

                {/* Advanced Filters */}
                {showAdvancedFilters && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('tasks.filters.fromDate')}
                                </label>
                                <input
                                    type="date"
                                    value={dateRangeFilter.start_date}
                                    onChange={(e) => setDateRangeFilter(prev => ({ ...prev, start_date: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('tasks.filters.toDate')}
                                </label>
                                <input
                                    type="date"
                                    value={dateRangeFilter.end_date}
                                    onChange={(e) => setDateRangeFilter(prev => ({ ...prev, end_date: e.target.value }))}
                                    min={dateRangeFilter.start_date}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tasks List */}
            {isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">{t('common.loading')}</p>
                </div>
            ) : tasks?.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <CheckCircleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('tasks.noTasks')}</h3>
                    <p className="text-gray-600 mb-6">{t('tasks.noTasksDescription')}</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <PlusIcon className="h-5 w-5" />
                        <span>{t('tasks.createTask')}</span>
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {/* Table Header */}
                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <input
                                    type="checkbox"
                                    checked={tasks && selectedTasks.length === tasks.length}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="text-sm font-medium text-gray-900">
                                    {t('tasks.selectAll')} ({tasks?.length || 0})
                                </span>
                            </div>
                            <div className="text-sm text-gray-500">
                                {t('tasks.clickToViewDetails')}
                            </div>
                        </div>
                    </div>

                    <div className="divide-y divide-gray-200">
                        {tasks?.map((task: Task) => (
                            <div
                                key={task.id}
                                className={`p-6 hover:bg-gray-50 transition ${
                                    selectedTasks.includes(task.id) ? 'bg-blue-50' : ''
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-4 flex-1">
                                        <input
                                            type="checkbox"
                                            checked={selectedTasks.includes(task.id)}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                handleTaskSelection(task.id, e.target.checked);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                                        />
                                        
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <Link
                                                    to={`/tasks/${task.id}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition flex items-center space-x-2"
                                                >
                                                    <span>{task.title}</span>
                                                    <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                                                </Link>
                                                {getStatusBadge(task.status)}
                                                {getPriorityBadge(task.priority)}
                                                {task.labels && task.labels.length > 0 && (
                                                    <div className="flex items-center space-x-1">
                                                        {task.labels.slice(0, 2).map((label, index) => (
                                                            <span
                                                                key={index}
                                                                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                                                            >
                                                                {label}
                                                            </span>
                                                        ))}
                                                        {task.labels.length > 2 && (
                                                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                                                                +{task.labels.length - 2}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
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
                                                            {isOverdue(task.due_date) && ` (${t('tasks.overdue')})`}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="ml-4 flex items-center space-x-2">
                                        <Link
                                            to={`/tasks/${task.id}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                                        >
                                            <EyeIcon className="h-4 w-4" />
                                            <span>{t('common.view')}</span>
                                        </Link>
                                        
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
                                            <option value="todo">{t('tasks.status.todo')}</option>
                                            <option value="in_progress">{t('tasks.status.inProgress')}</option>
                                            <option value="review">{t('tasks.status.inReview')}</option>
                                            <option value="done">{t('tasks.status.done')}</option>
                                            <option value="cancelled">{t('tasks.status.cancelled')}</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Create Task Modal */}
            {showCreateModal && (
                <TaskForm
                    isModal={true}
                    onClose={() => setShowCreateModal(false)}
                    projectId={projectFilter !== 'all' ? parseInt(projectFilter) : undefined}
                />
            )}
        </div>
    );
};

export default Tasks;
