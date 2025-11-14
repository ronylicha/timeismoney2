import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
    XMarkIcon,
    UserGroupIcon,
    CalendarIcon,
    FlagIcon,
    ClockIcon,
    DocumentTextIcon,
    CurrencyDollarIcon,
    TagIcon,
} from '@heroicons/react/24/outline';

import { useOffline } from '@/contexts/OfflineContext';
import { OFFLINE_ENTITY_EVENT } from '@/utils/offlineDB';

interface Task {
    id?: number;
    title: string;
    description?: string;
    status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    type?: 'task' | 'bug' | 'feature' | 'improvement';
    project_id: number;
    parent_id?: number;
    estimated_hours?: number;
    start_date?: string;
    due_date?: string;
    is_billable?: boolean;
    hourly_rate?: number;
    labels?: string[];
    assigned_users?: number[];
}

interface Project {
    id: number;
    name: string;
    code: string;
}

interface User {
    id: number;
    name: string;
    email: string;
}

interface TaskFormProps {
    task?: Task;
    isModal?: boolean;
    onClose?: () => void;
    projectId?: number;
}

const normalizeRecords = <T,>(data: T | T[] | null | undefined): T[] => {
    if (Array.isArray(data)) {
        return data.filter(Boolean) as T[];
    }
    return data ? [data] : [];
};

const TaskForm: React.FC<TaskFormProps> = ({ 
    task, 
    isModal = false, 
    onClose, 
    projectId 
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const { isOnline, getOfflineData } = useOffline();
    
    const [formData, setFormData] = useState<Task>({
        title: '',
        description: '',
        status: 'todo',
        priority: 'normal',
        type: 'task',
        project_id: projectId || 0,
        estimated_hours: undefined,
        start_date: '',
        due_date: '',
        is_billable: true,
        hourly_rate: undefined,
        labels: [],
        assigned_users: [],
    });

    const [cachedProjects, setCachedProjects] = useState<Project[]>([]);
    const [offlineProjects, setOfflineProjects] = useState<Project[]>([]);
    const [cachedUsers, setCachedUsers] = useState<User[]>([]);
    const [offlineUsers, setOfflineUsers] = useState<User[]>([]);

    // Fetch projects
    const { data: projectsData } = useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const response = await axios.get('/projects');
            return response.data.data;
        },
        enabled: isOnline,
    });

    // Fetch users for assignment
    const { data: usersData } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await axios.get('/users');
            return response.data.data;
        },
        enabled: isOnline,
    });

    const loadOfflineProjects = useCallback(() => {
        getOfflineData('projects')
            .then((data) => setOfflineProjects(normalizeRecords<Project>(data)))
            .catch(() => setOfflineProjects([]));
    }, [getOfflineData]);

    const loadOfflineUsers = useCallback(() => {
        getOfflineData('users')
            .then((data) => setOfflineUsers(normalizeRecords<User>(data)))
            .catch(() => setOfflineUsers([]));
    }, [getOfflineData]);

    useEffect(() => {
        if (isOnline && Array.isArray(projectsData)) {
            setCachedProjects(projectsData);
        }
    }, [projectsData, isOnline]);

    useEffect(() => {
        if (isOnline && Array.isArray(usersData)) {
            setCachedUsers(usersData);
        }
    }, [usersData, isOnline]);

    useEffect(() => {
        loadOfflineProjects();
        loadOfflineUsers();
    }, [loadOfflineProjects, loadOfflineUsers]);

    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent).detail;
            if (detail?.type === 'project') {
                loadOfflineProjects();
            }
            if (detail?.type === 'user') {
                loadOfflineUsers();
            }
        };
        window.addEventListener(OFFLINE_ENTITY_EVENT, handler as EventListener);
        return () => window.removeEventListener(OFFLINE_ENTITY_EVENT, handler as EventListener);
    }, [loadOfflineProjects, loadOfflineUsers]);

    const projectOptions = useMemo(() => {
        const map = new Map<string, Project>();
        (projectsData ?? cachedProjects).forEach((project) => {
            if (project) {
                map.set(String(project.id), project);
            }
        });
        offlineProjects.forEach((project) => {
            if (project) {
                map.set(String(project.id), project);
            }
        });
        return Array.from(map.values());
    }, [projectsData, cachedProjects, offlineProjects]);

    const userOptions = useMemo(() => {
        const map = new Map<string, User>();
        (usersData ?? cachedUsers).forEach((user) => {
            if (user) {
                map.set(String(user.id), user);
            }
        });
        offlineUsers.forEach((user) => {
            if (user) {
                map.set(String(user.id), user);
            }
        });
        return Array.from(map.values());
    }, [usersData, cachedUsers, offlineUsers]);

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [projectSearchTerm, setProjectSearchTerm] = useState('');
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
    const [parentTaskSearchTerm, setParentTaskSearchTerm] = useState('');
    const [showParentTaskDropdown, setShowParentTaskDropdown] = useState(false);

    // Fetch available tasks for parent selection
    const { data: availableTasks } = useQuery({
        queryKey: ['tasks', 'parent-options', formData.project_id],
        queryFn: async () => {
            if (!formData.project_id) return [];
            const response = await axios.get(`/tasks?project_id=${formData.project_id}&status=todo,in_progress,in_review`);
            return response.data.data.filter((t: Task) => t.id !== task?.id);
        },
        enabled: !!formData.project_id,
    });

    // Initialize form data when editing or when projectId is provided
    useEffect(() => {
        if (task) {
            setFormData({
                ...task,
                start_date: task.start_date ? new Date(task.start_date).toISOString().split('T')[0] : '',
                due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
            });
            
            // Set project search term when editing
            const project = projectOptions.find((p: Project) => p.id === task.project_id);
            if (project) {
                setProjectSearchTerm(`${project.code} - ${project.name}`);
            }
            
            // Set selected users when editing
            if (task.assigned_users) {
                setSelectedUsers(task.assigned_users);
            }
            
            // Set parent task search term when editing
            if (task.parent_id && availableTasks) {
                const parentTask = availableTasks.find((t: Task) => t.id === task.parent_id);
                if (parentTask) {
                    setParentTaskSearchTerm(parentTask.title);
                }
            }
        } else if (projectId) {
            setFormData(prev => ({ ...prev, project_id: projectId }));
            const project = projectOptions.find((p: Project) => p.id === projectId);
            if (project) {
                setProjectSearchTerm(`${project.code} - ${project.name}`);
            }
        }
    }, [task, projectId, projectOptions, availableTasks]);

    // Get project_id from URL query params
    useEffect(() => {
        if (!projectId && !task) {
            const params = new URLSearchParams(location.search);
            const urlProjectId = params.get('project_id');
            if (urlProjectId) {
                setFormData(prev => ({ ...prev, project_id: parseInt(urlProjectId) }));
            }
        }
    }, [location.search, projectId, task]);

    // Create task mutation
    const createTaskMutation = useMutation({
        mutationFn: async (data: Task) => {
            const response = await axios.post('/tasks', data);
            return response.data;
        },
        onSuccess: (data) => {
            // Update the cache immediately with the new data
            queryClient.setQueryData(['task', data.task.id.toString()], data.task);

            // Then invalidate to ensure fresh data on next load
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['kanbanTasks'] });

            toast.success('Tâche créée avec succès');

            if (isModal && onClose) {
                onClose();
            } else {
                navigate(`/tasks/${data.task.id}`);
            }
        },
        onError: (error: any) => {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                toast.error('Erreur lors de la création de la tâche');
            }
        },
    });

    // Update task mutation
    const updateTaskMutation = useMutation({
        mutationFn: async (data: Task) => {
            const response = await axios.put(`/tasks/${task?.id}`, data);
            return response.data;
        },
        onSuccess: (data) => {
            // Update the cache immediately with the new data
            queryClient.setQueryData(['task', task?.id?.toString()], data.task);

            // Then invalidate to ensure fresh data on next load
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['kanbanTasks'] });

            toast.success('Tâche mise à jour avec succès');

            if (isModal && onClose) {
                onClose();
            } else {
                navigate(`/tasks/${data.task.id}`);
            }
        },
        onError: (error: any) => {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                toast.error('Erreur lors de la mise à jour de la tâche');
            }
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const mutation = task ? updateTaskMutation : createTaskMutation;
        mutation.mutate(formData);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else if (type === 'number') {
            setFormData(prev => ({ 
                ...prev, 
                [name]: value === '' ? undefined : parseFloat(value) 
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleLabelsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const labels = e.target.value.split(',').map(label => label.trim()).filter(Boolean);
        setFormData(prev => ({ ...prev, labels }));
    };

    const isLoading = createTaskMutation.isPending || updateTaskMutation.isPending;

    const formContent = (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('tasks.form.generalInformation')}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('tasks.form.title')} *
                        </label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                        {errors.title && (
                            <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <FlagIcon className="inline h-4 w-4 mr-1" />
                            {t('tasks.form.project')} *
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={projectSearchTerm}
                                onChange={(e) => {
                                    const searchTerm = e.target.value;
                                    setProjectSearchTerm(searchTerm);
                                    setShowProjectDropdown(true);
                                }}
                                onFocus={() => setShowProjectDropdown(true)}
                                onBlur={() => {
                                    setTimeout(() => setShowProjectDropdown(false), 200);
                                }}
                                placeholder={t('tasks.form.searchProject')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                                disabled={!!projectId}
                            />
                            
                            {/* Dropdown */}
                            {showProjectDropdown && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                                    {projectOptions
                                        .filter((project: Project) => {
                                            const query = projectSearchTerm.toLowerCase();
                                            return (project.name || '').toLowerCase().includes(query) || (project.code || '').toLowerCase().includes(query);
                                        })
                                        .map((project: Project) => (
                                            <div
                                                key={project.id}
                                                onClick={() => {
                                                    setFormData(prev => ({ ...prev, project_id: project.id }));
                                                    const label = project.code ? `${project.code} - ${project.name}` : project.name;
                                                    setProjectSearchTerm(label);
                                                    setShowProjectDropdown(false);
                                                }}
                                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                            >
                                                <div className="font-medium">{project.name}</div>
                                                {project.code && (
                                                    <div className="text-sm text-gray-500">{project.code}</div>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                        {errors.project_id && (
                            <p className="mt-1 text-sm text-red-600">{errors.project_id}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('tasks.form.type')}
                        </label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="task">{t('tasks.type.task')}</option>
                            <option value="bug">{t('tasks.type.bug')}</option>
                            <option value="feature">{t('tasks.type.feature')}</option>
                            <option value="improvement">{t('tasks.type.improvement')}</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <DocumentTextIcon className="inline h-4 w-4 mr-1" />
                            {t('tasks.form.description')}
                        </label>
                        <textarea
                            name="description"
                            value={formData.description || ''}
                            onChange={handleInputChange}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {errors.description && (
                            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Status and Priority */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('tasks.form.statusAndPriority')}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('tasks.form.status')}
                        </label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="todo">{t('tasks.status.todo')}</option>
                            <option value="in_progress">{t('tasks.status.inProgress')}</option>
                            <option value="review">{t('tasks.status.inReview')}</option>
                            <option value="done">{t('tasks.status.done')}</option>
                            <option value="cancelled">{t('tasks.status.cancelled')}</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Priorité
                        </label>
                        <select
                            name="priority"
                            value={formData.priority}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="low">{t('tasks.priority.low')}</option>
                            <option value="normal">{t('tasks.priority.normal')}</option>
                            <option value="high">{t('tasks.priority.high')}</option>
                            <option value="urgent">{t('tasks.priority.urgent')}</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Dates and Time */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                    <CalendarIcon className="inline h-5 w-5 mr-1" />
                    {t('tasks.form.datesAndHours')}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('tasks.form.startDate')}
                        </label>
                        <input
                            type="date"
                            name="start_date"
                            value={formData.start_date}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {errors.start_date && (
                            <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('tasks.form.dueDate')}
                        </label>
                        <input
                            type="date"
                            name="due_date"
                            value={formData.due_date}
                            onChange={handleInputChange}
                            min={formData.start_date}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {errors.due_date && (
                            <p className="mt-1 text-sm text-red-600">{errors.due_date}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <ClockIcon className="inline h-4 w-4 mr-1" />
                            {t('tasks.form.estimatedHours')}
                        </label>
                        <input
                            type="number"
                            name="estimated_hours"
                            value={formData.estimated_hours || ''}
                            onChange={handleInputChange}
                            step="0.5"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {errors.estimated_hours && (
                            <p className="mt-1 text-sm text-red-600">{errors.estimated_hours}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('tasks.form.parentTask')}
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={parentTaskSearchTerm}
                                onChange={(e) => {
                                    const searchTerm = e.target.value;
                                    setParentTaskSearchTerm(searchTerm);
                                    setShowParentTaskDropdown(true);
                                    setFormData(prev => ({ ...prev, parent_id: undefined }));
                                }}
                                onFocus={() => setShowParentTaskDropdown(true)}
                                onBlur={() => {
                                    setTimeout(() => setShowParentTaskDropdown(false), 200);
                                }}
                                placeholder={t('tasks.form.searchParentTask')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            
                            {/* Dropdown */}
                            {showParentTaskDropdown && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                                    {availableTasks
                                        ?.filter((availableTask: Task) => 
                                            availableTask.title.toLowerCase().includes(parentTaskSearchTerm.toLowerCase())
                                        )
                                        .map((availableTask: Task) => (
                                            <div
                                                key={availableTask.id}
                                                onClick={() => {
                                                    setFormData(prev => ({ ...prev, parent_id: availableTask.id }));
                                                    setParentTaskSearchTerm(availableTask.title);
                                                    setShowParentTaskDropdown(false);
                                                }}
                                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                            >
                                                <div className="font-medium">{availableTask.title}</div>
                                                <div className="text-sm text-gray-500">{t('common.status')}: {availableTask.status}</div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Assignment */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                    <UserGroupIcon className="inline h-5 w-5 mr-1" />
                    {t('tasks.form.assignment')}
                </h3>
                
                <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('tasks.form.addAssignee')}
                        </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={userSearchTerm}
                            onChange={(e) => {
                                const searchTerm = e.target.value;
                                setUserSearchTerm(searchTerm);
                                setShowUserDropdown(true);
                            }}
                            onFocus={() => setShowUserDropdown(true)}
                            onBlur={() => {
                                setTimeout(() => setShowUserDropdown(false), 200);
                            }}
                            placeholder={t('tasks.form.searchUsers')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        
                        {/* Dropdown */}
                        {showUserDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                                {userOptions
                                    .filter((user: User) => {
                                        const query = userSearchTerm.toLowerCase();
                                        return (user.name || '').toLowerCase().includes(query) || (user.email || '').toLowerCase().includes(query);
                                    })
                                    .filter((user: User) => !selectedUsers.includes(user.id))
                                    .map((user: User) => (
                                        <div
                                            key={user.id}
                                            onClick={() => {
                                                setSelectedUsers(prev => [...prev, user.id]);
                                                setUserSearchTerm('');
                                                setShowUserDropdown(false);
                                                setFormData(prev => ({ 
                                                    ...prev, 
                                                    assigned_users: [...(prev.assigned_users || []), user.id] as any 
                                                }));
                                            }}
                                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                        >
                                            <div className="font-medium">{user.name}</div>
                                            {user.email && (
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Selected Users */}
                    {selectedUsers.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {selectedUsers.map(userId => {
                                const user = userOptions.find((u: User) => u.id === userId);
                                return user ? (
                                    <div
                                        key={userId}
                                        className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                                    >
                                        <span>{user.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedUsers(prev => prev.filter(id => id !== userId));
                                                setFormData(prev => ({ 
                                                    ...prev, 
                                                    assigned_users: (prev.assigned_users || []).filter(id => id !== userId) as any
                                                }));
                                            }}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ) : null;
                            })}
                        </div>
                    )}
                    
                    <p className="mt-2 text-sm text-gray-500">
                        Cliquez sur le champ pour rechercher et ajouter des utilisateurs
                    </p>
                </div>
            </div>

            {/* Billing */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                    <CurrencyDollarIcon className="inline h-5 w-5 mr-1" />
                    Facturation
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="is_billable"
                                checked={formData.is_billable || false}
                                onChange={handleInputChange}
                                className="mr-2"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                Tâche facturable
                            </span>
                        </label>
                    </div>

                    {formData.is_billable && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Taux horaire (€)
                            </label>
                            <input
                                type="number"
                                name="hourly_rate"
                                value={formData.hourly_rate || ''}
                                onChange={handleInputChange}
                                step="0.01"
                                min="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {errors.hourly_rate && (
                                <p className="mt-1 text-sm text-red-600">{errors.hourly_rate}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Labels */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                    <TagIcon className="inline h-5 w-5 mr-1" />
                    Étiquettes
                </h3>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Étiquettes (séparées par des virgules)
                    </label>
                    <input
                        type="text"
                        value={formData.labels?.join(', ') || ''}
                        onChange={handleLabelsChange}
                        placeholder="ex: urgent, client-A, développement"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4">
                <button
                    type="button"
                    onClick={() => isModal && onClose ? onClose() : navigate('/tasks')}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    disabled={isLoading}
                >
                    {t('common.cancel')}
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                    {isLoading ? t('common.saving') || 'Enregistrement...' : (task ? t('common.update') : t('tasks.createTask'))}
                </button>
            </div>
        </form>
    );

    if (isModal) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center p-6 border-b">
                        <h2 className="text-xl font-semibold text-gray-900">
                            {task ? t('tasks.editTask') : t('tasks.newTask')}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                    <div className="p-6">
                        {formContent}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    {task ? 'Modifier la tâche' : 'Nouvelle tâche'}
                </h1>
                <p className="text-gray-600 mt-2">
                    {task ? 'Modifiez les informations de la tâche' : 'Créez une nouvelle tâche'}
                </p>
            </div>
            {formContent}
        </div>
    );
};

export default TaskForm;
