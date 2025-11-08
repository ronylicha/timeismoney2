import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
    PlayIcon,
    PauseIcon,
    StopIcon,
    ClockIcon,
    FolderIcon,
    TagIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Timer {
    id: number;
    project_id: number;
    task_id: number | null;
    description: string;
    started_at: string;
    paused_at: string | null;
    total_seconds: number;
    project?: {
        id: number;
        name: string;
        client?: {
            name: string;
        };
    };
}

interface TimeEntry {
    id: number;
    project_id: number;
    description: string;
    started_at: string;
    ended_at: string;
    duration: number;
    project?: {
        name: string;
    };
}

const TimeTracking: React.FC = () => {
    const queryClient = useQueryClient();
    const [elapsedTime, setElapsedTime] = useState(0);
    const [description, setDescription] = useState('');
    const [selectedProject, setSelectedProject] = useState<number | null>(null);

    // Fetch current timer
    const { data: currentTimer, isLoading: loadingTimer } = useQuery({
        queryKey: ['current-timer'],
        queryFn: async () => {
            const response = await axios.get('/time-entries/current');
            return response.data.timer;
        },
        // Only refetch every 30 seconds if timer is running, not every second
        // The UI timer ticks are handled locally in the component
        refetchInterval: (data) => data ? 30000 : false,
    });

    // Fetch projects
    const { data: projects } = useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const response = await axios.get('/projects');
            return response.data.data;
        },
    });

    // Fetch today's entries
    const { data: todayEntries } = useQuery({
        queryKey: ['today-entries'],
        queryFn: async () => {
            const response = await axios.get('/time-entries', {
                params: {
                    date: format(new Date(), 'yyyy-MM-dd'),
                },
            });
            return response.data.data;
        },
    });

    // Start timer mutation
    const startTimerMutation = useMutation({
        mutationFn: async (data: { project_id: number; description: string }) => {
            const response = await axios.post('/time-entries/start', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['current-timer'] });
            queryClient.invalidateQueries({ queryKey: ['today-entries'] });
            toast.success('Timer démarré');
            setDescription('');
        },
        onError: () => {
            toast.error('Erreur lors du démarrage du timer');
        },
    });

    // Stop timer mutation
    const stopTimerMutation = useMutation({
        mutationFn: async () => {
            const response = await axios.post('/time-entries/stop');
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['current-timer'] });
            queryClient.invalidateQueries({ queryKey: ['today-entries'] });
            toast.success('Timer arrêté');
        },
        onError: () => {
            toast.error('Erreur lors de l\'arrêt du timer');
        },
    });

    // Calculate elapsed time
    useEffect(() => {
        if (currentTimer) {
            const startTime = new Date(currentTimer.started_at).getTime();
            const pausedDuration = currentTimer.paused_at
                ? new Date().getTime() - new Date(currentTimer.paused_at).getTime()
                : 0;

            const interval = setInterval(() => {
                if (!currentTimer.paused_at) {
                    const elapsed = Math.floor((new Date().getTime() - startTime) / 1000);
                    setElapsedTime(currentTimer.total_seconds + elapsed);
                }
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [currentTimer]);

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStartTimer = () => {
        if (!selectedProject) {
            toast.error('Veuillez sélectionner un projet');
            return;
        }

        startTimerMutation.mutate({
            project_id: selectedProject,
            description: description || 'Sans description',
        });
    };

    const getTotalToday = () => {
        if (!todayEntries) return 0;
        return todayEntries.reduce((acc: number, entry: TimeEntry) => acc + entry.duration, 0);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Suivi du temps</h1>
                <p className="mt-2 text-gray-600">Suivez votre temps en temps réel</p>
            </div>

            {/* Timer Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
                <div className="text-center mb-6">
                    <div className="text-6xl font-bold text-gray-900 mb-4">
                        {formatDuration(currentTimer ? elapsedTime : 0)}
                    </div>
                    {currentTimer && (
                        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                            <FolderIcon className="h-5 w-5" />
                            <span>{currentTimer.project?.name}</span>
                            {currentTimer.project?.client && (
                                <>
                                    <span>•</span>
                                    <span>{currentTimer.project.client.name}</span>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {!currentTimer ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Projet *
                            </label>
                            <select
                                value={selectedProject || ''}
                                onChange={(e) => setSelectedProject(Number(e.target.value))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Sélectionner un projet</option>
                                {projects?.map((project: any) => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Que faites-vous ?"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <button
                            onClick={handleStartTimer}
                            disabled={startTimerMutation.isPending}
                            className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                        >
                            <PlayIcon className="h-6 w-6" />
                            <span className="text-lg font-medium">Démarrer</span>
                        </button>
                    </div>
                ) : (
                    <div className="flex justify-center space-x-4">
                        <button
                            onClick={() => stopTimerMutation.mutate()}
                            disabled={stopTimerMutation.isPending}
                            className="flex items-center space-x-2 bg-red-600 text-white px-8 py-4 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                        >
                            <StopIcon className="h-6 w-6" />
                            <span className="text-lg font-medium">Arrêter</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Today's Summary */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Aujourd'hui</h2>
                    <div className="text-2xl font-bold text-blue-600">
                        {formatDuration(getTotalToday())}
                    </div>
                </div>
            </div>

            {/* Today's Entries */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Entrées d'aujourd'hui</h2>
                </div>

                <div className="divide-y divide-gray-200">
                    {todayEntries?.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <ClockIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p>Aucune entrée pour aujourd'hui</p>
                        </div>
                    ) : (
                        todayEntries?.map((entry: TimeEntry) => (
                            <div key={entry.id} className="p-6 hover:bg-gray-50 transition">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <FolderIcon className="h-5 w-5 text-gray-400" />
                                            <span className="font-medium text-gray-900">
                                                {entry.project?.name}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 text-sm ml-8">
                                            {entry.description}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-2 ml-8">
                                            {format(new Date(entry.started_at), 'HH:mm', { locale: fr })} -{' '}
                                            {format(new Date(entry.ended_at), 'HH:mm', { locale: fr })}
                                        </p>
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
        </div>
    );
};

export default TimeTracking;
