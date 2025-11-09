import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Task, PaginatedResponse } from '../types';
import { toast } from 'react-toastify';

interface UseTasksReturn {
    tasks: Task[];
    isLoading: boolean;
    error: Error | null;
    totalTasks: number;
    currentPage: number;
    totalPages: number;
    loadTasks: () => void;
    fetchTasks: (page?: number, filters?: TaskFilters) => void;
    createTask: (data: Partial<Task>) => Promise<Task | null>;
    updateTask: (id: string, data: Partial<Task>) => Promise<Task | null>;
    deleteTask: (id: string) => Promise<void>;
    moveTask: (id: string, status: Task['status'], position?: number) => Promise<void>;
    getTask: (id: string) => Promise<Task | null>;
}

interface TaskFilters {
    search?: string;
    project_id?: string;
    assignee_id?: string;
    status?: string;
    priority?: string;
    is_billable?: boolean;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}

export const useTasks = (projectId?: string, initialFilters?: TaskFilters): UseTasksReturn => {
    const queryClient = useQueryClient();
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState<TaskFilters>({
        ...initialFilters,
        project_id: projectId,
    });

    // Fetch tasks query
    const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<Task>>({
        queryKey: ['tasks', currentPage, filters],
        queryFn: async () => {
            if (!filters.project_id) {
                return {
                    data: [],
                    current_page: 1,
                    last_page: 1,
                    per_page: 20,
                    total: 0,
                    from: 0,
                    to: 0,
                    path: '',
                    first_page_url: '',
                    last_page_url: '',
                };
            }

            const params = new URLSearchParams({
                page: currentPage.toString(),
                ...Object.entries(filters).reduce((acc, [key, value]) => {
                    if (value !== undefined && value !== null) {
                        acc[key] = value.toString();
                    }
                    return acc;
                }, {} as Record<string, string>),
            });

            const response = await axios.get(`/tasks?${params}`);
            return response.data;
        },
        enabled: !!filters.project_id,
        staleTime: 3 * 60 * 1000, // 3 minutes
    });

    // Create task mutation
    const createTaskMutation = useMutation({
        mutationFn: async (data: Partial<Task>) => {
            const response = await axios.post('/tasks', data);
            return response.data.task;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Task created successfully');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Failed to create task';
            toast.error(message);
        },
    });

    // Update task mutation
    const updateTaskMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Task> }) => {
            const response = await axios.put(`/tasks/${id}`, data);
            return response.data.task;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['task', data.id] });
            toast.success('Task updated successfully');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Failed to update task';
            toast.error(message);
        },
    });

    // Delete task mutation
    const deleteTaskMutation = useMutation({
        mutationFn: async (id: string) => {
            await axios.delete(`/tasks/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Task deleted successfully');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Failed to delete task';
            toast.error(message);
        },
    });

    // Move task mutation (for Kanban)
    const moveTaskMutation = useMutation({
        mutationFn: async ({
            id,
            status,
            position,
        }: {
            id: string;
            status: Task['status'];
            position?: number;
        }) => {
            const response = await axios.patch(`/tasks/${id}/move`, { status, position });
            return response.data.task;
        },
        onMutate: async ({ id, status, position }) => {
            // Optimistic update
            await queryClient.cancelQueries({ queryKey: ['tasks'] });

            const previousTasks = queryClient.getQueryData(['tasks', currentPage, filters]);

            queryClient.setQueryData(['tasks', currentPage, filters], (old: any) => {
                if (!old) return old;

                const updatedData = [...old.data];
                const taskIndex = updatedData.findIndex((t) => t.id === id);
                if (taskIndex !== -1) {
                    updatedData[taskIndex] = {
                        ...updatedData[taskIndex],
                        status,
                        position: position ?? updatedData[taskIndex].position,
                    };
                }

                return {
                    ...old,
                    data: updatedData,
                };
            });

            return { previousTasks };
        },
        onError: (err, variables, context) => {
            // Rollback on error
            if (context?.previousTasks) {
                queryClient.setQueryData(['tasks', currentPage, filters], context.previousTasks);
            }
            const message = err.response?.data?.message || 'Failed to move task';
            toast.error(message);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
    });

    const loadTasks = useCallback(() => {
        refetch();
    }, [refetch]);

    const fetchTasks = useCallback(
        (page?: number, newFilters?: TaskFilters) => {
            if (page) setCurrentPage(page);
            if (newFilters) {
                setFilters({ ...newFilters, project_id: projectId });
            }
            refetch();
        },
        [projectId, refetch]
    );

    const createTask = useCallback(
        async (data: Partial<Task>): Promise<Task | null> => {
            try {
                const taskData = {
                    ...data,
                    project_id: data.project_id || filters.project_id,
                };
                const result = await createTaskMutation.mutateAsync(taskData);
                return result;
            } catch (error) {
                return null;
            }
        },
        [createTaskMutation, filters.project_id]
    );

    const updateTask = useCallback(
        async (id: string, data: Partial<Task>): Promise<Task | null> => {
            try {
                const result = await updateTaskMutation.mutateAsync({ id, data });
                return result;
            } catch (error) {
                return null;
            }
        },
        [updateTaskMutation]
    );

    const deleteTask = useCallback(
        async (id: string): Promise<void> => {
            await deleteTaskMutation.mutateAsync(id);
        },
        [deleteTaskMutation]
    );

    const moveTask = useCallback(
        async (id: string, status: Task['status'], position?: number): Promise<void> => {
            await moveTaskMutation.mutateAsync({ id, status, position });
        },
        [moveTaskMutation]
    );

    const getTask = useCallback(
        async (id: string): Promise<Task | null> => {
            try {
                const cachedTask = queryClient.getQueryData<Task>(['task', id]);
                if (cachedTask) return cachedTask;

                const response = await axios.get(`/tasks/${id}`);
                const task = response.data;

                queryClient.setQueryData(['task', id], task);
                return task;
            } catch (error) {
                console.error('Failed to fetch task:', error);
                return null;
            }
        },
        [queryClient]
    );

    return {
        tasks: data?.data || [],
        isLoading,
        error: error as Error | null,
        totalTasks: data?.total || 0,
        currentPage: data?.current_page || 1,
        totalPages: data?.last_page || 1,
        loadTasks,
        fetchTasks,
        createTask,
        updateTask,
        deleteTask,
        moveTask,
        getTask,
    };
};

// Hook for Kanban board with real-time updates
export const useKanbanTasks = (projectId: string) => {
    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery<Record<Task['status'], Task[]>>({
        queryKey: ['kanbanTasks', projectId],
        queryFn: async () => {
            const response = await axios.get(`/projects/${projectId}/kanban-tasks`);
            return response.data;
        },
        enabled: !!projectId,
        refetchInterval: 10000, // Refresh every 10 seconds for real-time updates
    });

    const moveTask = useMutation({
        mutationFn: async ({
            taskId,
            status,
            position,
        }: {
            taskId: string;
            status: Task['status'];
            position: number;
        }) => {
            const response = await axios.patch(`/tasks/${taskId}/move`, {
                status,
                position,
            });
            return response.data.task;
        },
        onMutate: async ({ taskId, status, position }) => {
            await queryClient.cancelQueries({ queryKey: ['kanbanTasks', projectId] });

            const previousTasks = queryClient.getQueryData(['kanbanTasks', projectId]);

            queryClient.setQueryData(
                ['kanbanTasks', projectId],
                (old: Record<Task['status'], Task[]> | undefined) => {
                    if (!old) return old;

                    const newTasks = { ...old };
                    let movedTask: Task | undefined;

                    // Find and remove the task from its current status
                    for (const [currentStatus, tasks] of Object.entries(newTasks)) {
                        const index = tasks.findIndex((t) => t.id === taskId);
                        if (index !== -1) {
                            movedTask = tasks[index];
                            newTasks[currentStatus as Task['status']] = tasks.filter(
                                (t) => t.id !== taskId
                            );
                            break;
                        }
                    }

                    // Add the task to its new status at the specified position
                    if (movedTask) {
                        const targetColumn = [...(newTasks[status] || [])];
                        targetColumn.splice(position, 0, { ...movedTask, status });
                        newTasks[status] = targetColumn;
                    }

                    return newTasks;
                }
            );

            return { previousTasks };
        },
        onError: (err, variables, context) => {
            if (context?.previousTasks) {
                queryClient.setQueryData(['kanbanTasks', projectId], context.previousTasks);
            }
            toast.error('Failed to move task');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['kanbanTasks', projectId] });
        },
    });

    return {
        tasksByStatus: data || {},
        isLoading,
        error: error as Error | null,
        moveTask: moveTask.mutate,
    };
};