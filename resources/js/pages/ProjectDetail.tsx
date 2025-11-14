import React, { useState, useEffect, lazy, Suspense } from 'react';
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
    ChartBarIcon,
    UserGroupIcon,
    CurrencyEuroIcon,
    PlusIcon,
    ViewColumnsIcon,
    EyeIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { User, PaginatedResponse } from '../types';
import AttachmentManager from '../components/Attachments/AttachmentManager';
import { useOffline } from '@/contexts/OfflineContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import ViewModeSelector, { ViewMode } from '../components/ViewModeSelector';
import TasksList from '../components/Tasks/TasksList';
import KanbanView from '../components/Kanban/KanbanView';

// Lazy load GanttChart for better initial load performance
const GanttChart = lazy(() => import('../components/Gantt/GanttChart'));

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
    duration_seconds: number;
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
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedRole, setSelectedRole] = useState<'manager' | 'member' | 'viewer'>('member');
    const [memberHourlyRate, setMemberHourlyRate] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        const saved = localStorage.getItem('projectViewMode');
        return (saved as ViewMode) || 'list';
    });
    const isNewProject = !id || id === 'new';
    const isOnline = useOnlineStatus();
    const { getOfflineData } = useOffline();
    const [offlineProject, setOfflineProject] = useState<any>(null);
    const [offlineLoading, setOfflineLoading] = useState(false);
    const isLocalProject = id?.startsWith('local_');
    const shouldFetchOnline = !isNewProject && !!id && isOnline && !isLocalProject;

    const { data: projectData, isLoading } = useQuery({
        queryKey: ['project', id],
        queryFn: async () => {
            const response = await axios.get(`/projects/${id}`);
            return response.data;
        },
        enabled: shouldFetchOnline, // Only fetch if we have a valid ID and online
    });

    useEffect(() => {
        if (!shouldFetchOnline && !isNewProject && id) {
            setOfflineLoading(true);
            Promise.all([
                getOfflineData('projects', id),
                getOfflineData('tasks'),
                getOfflineData('timeEntries'),
            ])
                .then(([projectRecord, tasksData, entriesData]) => {
                    if (!projectRecord) {
                        setOfflineProject(null);
                        return;
                    }
                    const tasksArray = Array.isArray(tasksData) ? tasksData : tasksData ? [tasksData] : [];
                    const entriesArray = Array.isArray(entriesData) ? entriesData : entriesData ? [entriesData] : [];
                    const relatedTasks = tasksArray.filter(task => String(task.project_id) === String(id));
                    const relatedEntries = entriesArray.filter(entry => String(entry.project_id) === String(id));
                    setOfflineProject({
                        ...projectRecord,
                        tasks: relatedTasks,
                        time_entries: relatedEntries,
                    });
                })
                .catch(() => setOfflineProject(null))
                .finally(() => setOfflineLoading(false));
        } else if (shouldFetchOnline) {
            setOfflineProject(null);
        }
    }, [shouldFetchOnline, isNewProject, id, getOfflineData]);

    const project = projectData ?? offlineProject;
    const isProjectLoading = shouldFetchOnline ? isLoading : offlineLoading;

    const { data: availableUsers } = useQuery<PaginatedResponse<User>>({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await axios.get('/users');
            return response.data;
        },
    });

    // Add member mutation
    const addMemberMutation = useMutation({
        mutationFn: async () => {
            await axios.post(`/projects/${id}/users`, {
                users: [{
                    user_id: selectedUserId,
                    role: selectedRole,
                    hourly_rate: memberHourlyRate ? parseFloat(memberHourlyRate) : null
                }]
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project', id] });
            toast.success(t('projects.memberAdded'));
            setShowAddMemberModal(false);
            setSelectedUserId('');
            setSelectedRole('member');
            setMemberHourlyRate('');
        },
        onError: () => {
            toast.error(t('projects.addMemberError'));
        },
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

    // Save view mode to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('projectViewMode', viewMode);
    }, [viewMode]);

    // Handler for view mode change
    const handleViewModeChange = (newMode: ViewMode) => {
        setViewMode(newMode);
    };

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

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    const getTotalTime = () => {
        if (!project?.time_entries) return 0;
        return project.time_entries.reduce((acc, entry) => acc + (entry.duration_seconds || (entry as any).duration || 0), 0);
    };

    const getCompletedTasksCount = () => {
        if (!project?.tasks) return 0;
        return project.tasks.filter(task => task.status === 'done').length;
    };

    const getBudgetUsed = () => {
        if (!project?.budget || project.budget <= 0 || !project?.hourly_rate) return 0;
        const totalHours = getTotalTime() / 3600;
        const cost = totalHours * project.hourly_rate;
        return (cost / project.budget) * 100;
    };

    if (isProjectLoading) {
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
                        <ViewModeSelector
                            currentView={viewMode}
                            onChange={handleViewModeChange}
                        />
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
                    <p className="text-2xl font-bold text-gray-900">{project.users?.length || 0}</p>
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
                        {/* Type de facturation */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-600 mb-1">{t('projects.billingType')}</h3>
                            <p className="text-gray-900">
                                {project.billing_type === 'hourly' && t('projects.hourly')}
                                {project.billing_type === 'fixed' && t('projects.fixed')}
                                {project.billing_type === 'retainer' && t('projects.retainer')}
                                {project.billing_type === 'maintenance' && t('projects.maintenance')}
                            </p>
                        </div>

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

                        {/* Affichage conditionnel selon le type de facturation */}
                        {project.billing_type === 'hourly' && (
                            <>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-600 mb-1">{t('projects.hourlyRate')}</h3>
                                    <p className="text-gray-900">
                                        {new Intl.NumberFormat('fr-FR', {
                                            style: 'currency',
                                            currency: 'EUR',
                                        }).format(project.hourly_rate)} / {t('projects.hour')}
                                    </p>
                                </div>
                                {project.estimated_hours && (
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-600 mb-1">{t('projects.estimatedHours')}</h3>
                                        <p className="text-gray-900">{project.estimated_hours} {t('projects.hours')}</p>
                                    </div>
                                )}
                                {project.budget && (
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-600 mb-1">{t('projects.budget')}</h3>
                                        <p className="text-gray-900">
                                            {new Intl.NumberFormat('fr-FR', {
                                                style: 'currency',
                                                currency: 'EUR',
                                            }).format(project.budget)}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

                        {project.billing_type === 'fixed' && (
                            <>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-600 mb-1">{t('projects.dailyRate')}</h3>
                                    <p className="text-gray-900">
                                        {project.daily_rate ? new Intl.NumberFormat('fr-FR', {
                                            style: 'currency',
                                            currency: 'EUR',
                                        }).format(project.daily_rate) : t('projects.notDefined')}
                                    </p>
                                </div>
                                {project.estimated_days && (
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-600 mb-1">{t('projects.estimatedDays')}</h3>
                                        <p className="text-gray-900">{project.estimated_days} {t('projects.days')}</p>
                                    </div>
                                )}
                                {project.budget && (
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-600 mb-1">{t('projects.totalBudget')}</h3>
                                        <p className="text-gray-900">
                                            {new Intl.NumberFormat('fr-FR', {
                                                style: 'currency',
                                                currency: 'EUR',
                                            }).format(project.budget)}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

                        {project.billing_type === 'retainer' && (
                            <>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-600 mb-1">{t('projects.monthlyAmount')}</h3>
                                    <p className="text-gray-900">
                                        {project.monthly_amount ? new Intl.NumberFormat('fr-FR', {
                                            style: 'currency',
                                            currency: 'EUR',
                                        }).format(project.monthly_amount) : t('projects.notDefined')}
                                    </p>
                                </div>
                                {project.contract_duration && (
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-600 mb-1">{t('projects.contractDuration')}</h3>
                                        <p className="text-gray-900">{project.contract_duration} {t('projects.months')}</p>
                                    </div>
                                )}
                                {project.billing_frequency && (
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-600 mb-1">{t('projects.billingFrequency')}</h3>
                                        <p className="text-gray-900">
                                            {project.billing_frequency === 'monthly' && t('projects.monthly')}
                                            {project.billing_frequency === 'quarterly' && t('projects.quarterly')}
                                            {project.billing_frequency === 'yearly' && t('projects.yearly')}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

                        {project.billing_type === 'maintenance' && (
                            <>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-600 mb-1">{t('projects.maintenanceFee')}</h3>
                                    <p className="text-gray-900">
                                        {project.monthly_amount ? new Intl.NumberFormat('fr-FR', {
                                            style: 'currency',
                                            currency: 'EUR',
                                        }).format(project.monthly_amount) : t('projects.notDefined')}
                                    </p>
                                </div>
                                {project.billing_frequency && (
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-600 mb-1">{t('projects.billingFrequency')}</h3>
                                        <p className="text-gray-900">
                                            {project.billing_frequency === 'monthly' && t('projects.monthly')}
                                            {project.billing_frequency === 'quarterly' && t('projects.quarterly')}
                                            {project.billing_frequency === 'yearly' && t('projects.yearly')}
                                        </p>
                                    </div>
                                )}
                                {project.estimated_hours && (
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-600 mb-1">{t('projects.estimatedHours')}</h3>
                                        <p className="text-gray-900">{project.estimated_hours} {t('projects.hours')}</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Attachments */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
                <AttachmentManager
                    entityType="projects"
                    entityId={String(project?.id || id || '')}
                />
            </div>

            {/* Tasks Section - Conditional rendering based on view mode */}
            {viewMode === 'list' && (
                <TasksList tasks={project.tasks || []} projectId={id || ''} />
            )}

            {viewMode === 'kanban' && (
                <KanbanView tasks={project.tasks || []} projectId={id || ''} />
            )}

            {viewMode === 'gantt' && (
                <Suspense
                    fallback={
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8 p-12 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600 dark:text-gray-400">{t('projects.gantt.loading')}</p>
                        </div>
                    }
                >
                    <GanttChart
                        tasks={project.tasks || []}
                        projectId={id || ''}
                        projectName={project.name}
                    />
                </Suspense>
            )}

            {/* Team Members */}
            <div className="bg-white rounded-lg shadow mb-8">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">{t('projects.team')}</h2>
                    <button
                        onClick={() => setShowAddMemberModal(true)}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                    >
                        <PlusIcon className="h-4 w-4" />
                        <span>{t('projects.addMember')}</span>
                    </button>
                </div>

                <div className="divide-y divide-gray-200">
                    {!project.users || project.users.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <UserGroupIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p>{t('projects.noMembers')}</p>
                        </div>
                    ) : (
                        project.users.map((member) => (
                            <div key={member.id} className="p-6 flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-gray-900">{member.name}</h3>
                                    <p className="text-sm text-gray-600">{member.email}</p>
                                </div>
                                <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                    {member.pivot?.role || member.role}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

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
                                            {formatDuration(entry.duration_seconds || (entry as any).duration || 0)}
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

            {/* Add Member Modal */}
            {showAddMemberModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">{t('projects.addMember')}</h3>
                            <button
                                onClick={() => setShowAddMemberModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* User Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('projects.selectUser')} *
                                </label>
                                <select
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">{t('projects.chooseUser')}</option>
                                    {availableUsers?.data
                                        ?.filter(user => !project.users?.find(m => m.id === user.id))
                                        .map(user => (
                                            <option key={user.id} value={user.id}>
                                                {user.name} ({user.email})
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {/* Role Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('projects.role')} *
                                </label>
                                <select
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value as 'manager' | 'member' | 'viewer')}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="member">{t('projects.member')}</option>
                                    <option value="manager">{t('projects.manager')}</option>
                                    <option value="viewer">{t('projects.viewer')}</option>
                                </select>
                            </div>

                            {/* Hourly Rate (Optional) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('projects.hourlyRate')} ({t('projects.optional')})
                                </label>
                                <input
                                    type="number"
                                    value={memberHourlyRate}
                                    onChange={(e) => setMemberHourlyRate(e.target.value)}
                                    step="0.01"
                                    min="0"
                                    placeholder={t('projects.defaultHourlyRate')}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {t('projects.leaveEmptyForDefault')}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setShowAddMemberModal(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={() => addMemberMutation.mutate()}
                                disabled={!selectedUserId || addMemberMutation.isPending}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {addMemberMutation.isPending ? t('projects.adding') : t('common.add')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectDetail;
