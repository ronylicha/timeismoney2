import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { TimeEntry, TimerStartData } from '../types';
import { toast } from 'react-toastify';

interface UseTimerReturn {
    activeTimer: TimeEntry | null;
    currentTimer: TimeEntry | null;
    isLoading: boolean;
    isRunning: boolean;
    startTimer: (data: TimerStartData) => Promise<TimeEntry | null>;
    stopTimer: (description?: string) => Promise<TimeEntry | null>;
    pauseTimer: () => Promise<void>;
    resumeTimer: () => Promise<void>;
    deleteTimer: (id: string) => Promise<void>;
    error: Error | null;
}

export const useTimer = (): UseTimerReturn => {
    const queryClient = useQueryClient();
    const [error, setError] = useState<Error | null>(null);

    // Fetch active timer
    const { data: activeTimer, isLoading, refetch } = useQuery<TimeEntry | null>({
        queryKey: ['activeTimer'],
        queryFn: async () => {
            try {
                const response = await axios.get('/api/time-entries/current');
                return response.data.data || null;
            } catch (error: any) {
                if (error.response?.status === 404) {
                    return null;
                }
                throw error;
            }
        },
        refetchInterval: 30000, // Refresh every 30 seconds
        retry: 1,
    });

    // Start timer mutation
    const startTimerMutation = useMutation({
        mutationFn: async (data: TimerStartData) => {
            const response = await axios.post('/api/time-entries/start', data);
            return response.data.timer;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['activeTimer'], data);
            queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
            toast.success('Timer started successfully');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Failed to start timer';
            toast.error(message);
            setError(error);
        },
    });

    // Stop timer mutation
    const stopTimerMutation = useMutation({
        mutationFn: async (description?: string) => {
            const response = await axios.post('/api/time-entries/stop', { description });
            return response.data.timer;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['activeTimer'], null);
            queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            toast.success('Timer stopped successfully');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Failed to stop timer';
            toast.error(message);
            setError(error);
        },
    });

    // Pause timer mutation
    const pauseTimerMutation = useMutation({
        mutationFn: async () => {
            const response = await axios.post('/api/time-entries/pause');
            return response.data;
        },
        onSuccess: () => {
            refetch();
            toast.success('Timer paused');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Failed to pause timer';
            toast.error(message);
            setError(error);
        },
    });

    // Resume timer mutation
    const resumeTimerMutation = useMutation({
        mutationFn: async () => {
            const response = await axios.post('/api/time-entries/resume');
            return response.data;
        },
        onSuccess: () => {
            refetch();
            toast.success('Timer resumed');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Failed to resume timer';
            toast.error(message);
            setError(error);
        },
    });

    // Delete timer mutation
    const deleteTimerMutation = useMutation({
        mutationFn: async (id: string) => {
            await axios.delete(`/api/time-entries/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            toast.success('Time entry deleted');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Failed to delete time entry';
            toast.error(message);
            setError(error);
        },
    });

    const startTimer = useCallback(
        async (data: TimerStartData): Promise<TimeEntry | null> => {
            try {
                const result = await startTimerMutation.mutateAsync(data);
                return result;
            } catch (error) {
                return null;
            }
        },
        [startTimerMutation]
    );

    const stopTimer = useCallback(
        async (description?: string): Promise<TimeEntry | null> => {
            try {
                const result = await stopTimerMutation.mutateAsync(description);
                return result;
            } catch (error) {
                return null;
            }
        },
        [stopTimerMutation]
    );

    const pauseTimer = useCallback(async () => {
        await pauseTimerMutation.mutateAsync();
    }, [pauseTimerMutation]);

    const resumeTimer = useCallback(async () => {
        await resumeTimerMutation.mutateAsync();
    }, [resumeTimerMutation]);

    const deleteTimer = useCallback(
        async (id: string) => {
            await deleteTimerMutation.mutateAsync(id);
        },
        [deleteTimerMutation]
    );

    // Set up auto-save for active timer description
    useEffect(() => {
        if (!activeTimer || activeTimer.ended_at) return;

        const interval = setInterval(() => {
            // Auto-save description every minute if changed
            const descriptionInput = document.querySelector<HTMLInputElement>('input[placeholder*="task description"]');
            if (descriptionInput && descriptionInput.value !== activeTimer.description) {
                axios.patch(`/api/time-entries/${activeTimer.id}`, {
                    description: descriptionInput.value,
                }).catch((error) => {
                    console.error('Failed to auto-save description:', error);
                });
            }
        }, 60000); // Every minute

        return () => clearInterval(interval);
    }, [activeTimer]);

    return {
        activeTimer,
        currentTimer: activeTimer,
        isLoading,
        isRunning: !!activeTimer && !activeTimer.ended_at,
        startTimer,
        stopTimer,
        pauseTimer,
        resumeTimer,
        deleteTimer,
        error,
    };
};