import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Project, PaginatedResponse } from '../types';
import { toast } from 'react-toastify';

interface UseProjectsReturn {
    projects: Project[];
    isLoading: boolean;
    error: Error | null;
    totalProjects: number;
    currentPage: number;
    totalPages: number;
    fetchProjects: (page?: number, filters?: ProjectFilters) => void;
    createProject: (data: Partial<Project>) => Promise<Project | null>;
    updateProject: (id: string, data: Partial<Project>) => Promise<Project | null>;
    deleteProject: (id: string) => Promise<void>;
    getProject: (id: string) => Promise<Project | null>;
}

interface ProjectFilters {
    search?: string;
    client_id?: string;
    status?: string;
    billable_type?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}

export const useProjects = (initialFilters?: ProjectFilters): UseProjectsReturn => {
    const queryClient = useQueryClient();
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState<ProjectFilters>(initialFilters || {});

    // Fetch projects query
    const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<Project>>({
        queryKey: ['projects', currentPage, filters],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                ...filters,
            });
            const response = await axios.get(`/projects?${params}`);
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Create project mutation
    const createProjectMutation = useMutation({
        mutationFn: async (data: Partial<Project>) => {
            const response = await axios.post('/projects', data);
            return response.data.project;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            toast.success('Project created successfully');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Failed to create project';
            toast.error(message);
        },
    });

    // Update project mutation
    const updateProjectMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Project> }) => {
            const response = await axios.put(`/projects/${id}`, data);
            return response.data.project;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['project', data.id] });
            toast.success('Project updated successfully');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Failed to update project';
            toast.error(message);
        },
    });

    // Delete project mutation
    const deleteProjectMutation = useMutation({
        mutationFn: async (id: string) => {
            await axios.delete(`/projects/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            toast.success('Project deleted successfully');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Failed to delete project';
            toast.error(message);
        },
    });

    const fetchProjects = useCallback(
        (page?: number, newFilters?: ProjectFilters) => {
            if (page) setCurrentPage(page);
            if (newFilters) setFilters(newFilters);
            refetch();
        },
        [refetch]
    );

    const createProject = useCallback(
        async (data: Partial<Project>): Promise<Project | null> => {
            try {
                const result = await createProjectMutation.mutateAsync(data);
                return result;
            } catch (error) {
                return null;
            }
        },
        [createProjectMutation]
    );

    const updateProject = useCallback(
        async (id: string, data: Partial<Project>): Promise<Project | null> => {
            try {
                const result = await updateProjectMutation.mutateAsync({ id, data });
                return result;
            } catch (error) {
                return null;
            }
        },
        [updateProjectMutation]
    );

    const deleteProject = useCallback(
        async (id: string): Promise<void> => {
            await deleteProjectMutation.mutateAsync(id);
        },
        [deleteProjectMutation]
    );

    const getProject = useCallback(
        async (id: string): Promise<Project | null> => {
            try {
                const cachedProject = queryClient.getQueryData<Project>(['project', id]);
                if (cachedProject) return cachedProject;

                const response = await axios.get(`/projects/${id}`);
                const project = response.data;

                queryClient.setQueryData(['project', id], project);
                return project;
            } catch (error) {
                console.error('Failed to fetch project:', error);
                return null;
            }
        },
        [queryClient]
    );

    return {
        projects: data?.data || [],
        isLoading,
        error: error as Error | null,
        totalProjects: data?.total || 0,
        currentPage: data?.current_page || 1,
        totalPages: data?.last_page || 1,
        fetchProjects,
        createProject,
        updateProject,
        deleteProject,
        getProject,
    };
};

// Hook for single project with real-time updates
export const useProject = (projectId: string) => {
    const { data, isLoading, error } = useQuery<Project>({
        queryKey: ['project', projectId],
        queryFn: async () => {
            const response = await axios.get(`/projects/${projectId}`);
            return response.data;
        },
        enabled: !!projectId,
        refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
    });

    return {
        project: data || null,
        isLoading,
        error: error as Error | null,
    };
};