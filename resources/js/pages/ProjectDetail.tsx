import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeftIcon,
    PencilIcon,
    TrashIcon,
    ClockIcon,
    CheckCircleIcon,
    ChartBarIcon,
    UserGroupIcon,
    CurrencyEuroIcon,
    PlusIcon,
    ViewColumnsIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Project {
    id: number;
    name: string;
    description: string;
    client_id: number;
    status: string;
    budget: number;
    hourly_rate: number;
    start_date: string;
    end_date: string | null;
    client?: {
        id: number;
        name: string;
        email: string;
    };
    tasks?: Task[];
    time_entries?: TimeEntry[];
    team_members?: TeamMember[];
}

interface Task {
    id: number;
    title: string;
    description: string;
    status: string;
    priority: string;
    due_date: string | null;
    assigned_to?: {
        id: number;
        name: string;
    };
}

interface TimeEntry {
    id: number;
    description: string;
    started_at: string;
    ended_at: string;
    duration: number;
    user?: {
        name: string;
    };
}

interface TeamMember {
    id: number;
    name: string;
    email: string;
    role: string;
    pivot?: {
        role: string;
    };
}

const ProjectDetail: React.FC = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const isNewProject = !id || id === 'new';

    // Fetch project details (skip if creating new project)
    const { data: project, isLoading } = useQuery({
        queryKey: ['project', id],
        queryFn: async () => {
            const response = await axios.get(`/projects/${id}`);
            return response.data.data;
        },
        enabled: !isNewProject, // Only fetch if we have a valid ID
    });

    // Delete project mutation
    const deleteProjectMutation = useMutation({
        mutationFn: async () => {
            await axios.delete(`/projects/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            toast.success(t('projects.deleteSuccess'));
            navigate('/projects');
        },
        onError: () => {
            toast.error(t('projects.deleteError'));
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
            active: t('projects.active'),
            completed: t('projects.completed'),
            on_hold: t('projects.onHold'),
            cancelled: t('projects.cancelled'),
        };

        return (
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
                {labels[status as keyof typeof labels] || status}
            </span>
        );
    };

    const getTaskStatusBadge = (status: string) => {
        const colors = {
            todo: 'bg-gray-100 text-gray-800',
            in_progress: 'bg-blue-100 text-blue-800',
            in_review: 'bg-purple-100 text-purple-800',
            completed: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800',
        };

        const labels = {
            todo: t('tasks.todo'),
            in_progress: t('tasks.inProgress'),
            in_review: t('tasks.inReview'),
            completed: t('tasks.completed'),
            cancelled: t('tasks.cancelled'),
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
            low: t('tasks.low'),
            medium: t('tasks.medium'),
            high: t('tasks.high'),
            urgent: t('tasks.urgent'),
        };

        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
                {labels[priority as keyof typeof labels] || priority}
            </span>
        );
    };

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    const getTotalTime = () => {
        if (!project?.time_entries) return 0;
        return project.time_entries.reduce((acc, entry) => acc + entry.duration, 0);
    };

    const getCompletedTasksCount = () => {
        if (!project?.tasks) return 0;
        return project.tasks.filter(task => task.status === 'completed').length;
    };

    const getBudgetUsed = () => {
        if (!project?.budget || !project?.hourly_rate) return 0;
        const totalHours = getTotalTime() / 3600;
        const cost = totalHours * project.hourly_rate;
        return (cost / project.budget) * 100;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="p-6">
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('projects.notFound')}</h3>
                    <p className="text-gray-600 mb-6">{t('projects.notFoundDescription')}</p>
                    <Link
                        to="/projects"
                        className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                        <span>{t('projects.backToProjects')}</span>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center mb-4">
                    <Link
                        to="/projects"
                        className="flex items-center text-gray-600 hover:text-gray-900 transition mr-4"
                    >
                        <ArrowLeftIcon className="h-5 w-5 mr-1" />
                        <span>{t('common.back')}</span>
                    </Link>
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                            {getStatusBadge(project.status)}
                        </div>
                        {project.client && (
                            <p className="text-gray-600">{t('projects.client')}: {project.client.name}</p>
                        )}
                    </div>

                    <div className="flex items-center space-x-3 mt-4 md:mt-0">
                        <Link
                            to={`/projects/${id}/kanban`}
                            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
                        >
                            <ViewColumnsIcon className="h-5 w-5" />
                            <span>{t('projects.kanban')}</span>
                        </Link>
                        <Link
                            to={`/projects/${id}/edit`}
                            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                        >
                            <PencilIcon className="h-5 w-5" />
                            <span>{t('common.edit')}</span>
                        </Link>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                        >
                            <TrashIcon className="h-5 w-5" />
                            <span>{t('common.delete')}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">{t('projects.totalTime')}</h3>
                        <ClockIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatDuration(getTotalTime())}</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">{t('projects.tasks')}</h3>
                        <ChartBarIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {getCompletedTasksCount()} / {project.tasks?.length || 0}
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">{t('projects.team')}</h3>
                        <UserGroupIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{project.team_members?.length || 0}</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">{t('projects.budgetUsed')}</h3>
                        <CurrencyEuroIcon className="h-5 w-5 text-orange-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{Math.round(getBudgetUsed())}%</p>
                </div>
            </div>

            {/* Project Details */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">{t('projects.details')}</h2>
                <div className="space-y-4">
                    {project.description && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-600 mb-1">{t('projects.description')}</h3>
                            <p className="text-gray-900">{project.description}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h3 className="text-sm font-medium text-gray-600 mb-1">{t('projects.startDate')}</h3>
                            <p className="text-gray-900">
                                {project.start_date ? format(new Date(project.start_date), 'dd MMMM yyyy', { locale: fr }) : t('projects.notDefined')}
                            </p>
                        </div>

                        <div>
                            <h3 className="text-sm font-medium text-gray-600 mb-1">{t('projects.endDate')}</h3>
                            <p className="text-gray-900">
                                {project.end_date ? format(new Date(project.end_date), 'dd MMMM yyyy', { locale: fr }) : t('projects.notDefined')}
                            </p>
                        </div>

                        <div>
                            <h3 className="text-sm font-medium text-gray-600 mb-1">{t('projects.budget')}</h3>
                            <p className="text-gray-900">
                                {new Intl.NumberFormat('fr-FR', {
                                    style: 'currency',
                                    currency: 'EUR',
                                }).format(project.budget)}
                            </p>
                        </div>

                        <div>
                            <h3 className="text-sm font-medium text-gray-600 mb-1">{t('projects.hourlyRate')}</h3>
                            <p className="text-gray-900">
                                {new Intl.NumberFormat('fr-FR', {
                                    style: 'currency',
                                    currency: 'EUR',
                                }).format(project.hourly_rate)} / {t('projects.hour')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tasks Section */}
            <div className="bg-white rounded-lg shadow mb-8">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">{t('projects.tasks')}</h2>
                    <Link
                        to={`/tasks/new?project_id=${id}`}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                    >
                        <PlusIcon className="h-4 w-4" />
                        <span>{t('tasks.newTask')}</span>
                    </Link>
                </div>

                <div className="divide-y divide-gray-200">
                    {project.tasks?.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p>{t('projects.noTasks')}</p>
                        </div>
                    ) : (
                        project.tasks?.map((task) => (
                            <div key={task.id} className="p-6 hover:bg-gray-50 transition">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h3 className="font-medium text-gray-900">{task.title}</h3>
                                            {getTaskStatusBadge(task.status)}
                                            {getPriorityBadge(task.priority)}
                                        </div>
                                        {task.description && (
                                            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                                        )}
                                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                                            {task.assigned_to && (
                                                <span>{t('tasks.assignedTo')}: {task.assigned_to.name}</span>
                                            )}
                                            {task.due_date && (
                                                <span>
                                                    {t('tasks.dueDate')}: {format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Team Members */}
            {project.team_members && project.team_members.length > 0 && (
                <div className="bg-white rounded-lg shadow mb-8">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">{t('projects.team')}</h2>
                    </div>

                    <div className="divide-y divide-gray-200">
                        {project.team_members.map((member) => (
                            <div key={member.id} className="p-6 flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-gray-900">{member.name}</h3>
                                    <p className="text-sm text-gray-600">{member.email}</p>
                                </div>
                                <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                    {member.pivot?.role || member.role}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Time Entries */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">{t('projects.recentTimeEntries')}</h2>
                </div>

                <div className="divide-y divide-gray-200">
                    {project.time_entries?.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <ClockIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p>{t('projects.noTimeEntries')}</p>
                        </div>
                    ) : (
                        project.time_entries?.slice(0, 5).map((entry) => (
                            <div key={entry.id} className="p-6 hover:bg-gray-50 transition">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{entry.description}</p>
                                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                                            {entry.user && <span>{entry.user.name}</span>}
                                            <span>
                                                {format(new Date(entry.started_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-semibold text-gray-900">
                                            {formatDuration(entry.duration)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{t('projects.confirmDelete')}</h3>
                        <p className="text-gray-600 mb-6">
                            {t('projects.deleteWarning')}
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={() => {
                                    deleteProjectMutation.mutate();
                                    setShowDeleteConfirm(false);
                                }}
                                disabled={deleteProjectMutation.isPending}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                            >
                                {deleteProjectMutation.isPending ? t('projects.deleting') : t('common.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectDetail;
