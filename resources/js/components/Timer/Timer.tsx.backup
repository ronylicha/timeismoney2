import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, Square, Clock, DollarSign, Calendar } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useTimer } from '../../hooks/useTimer';
import { useProjects } from '../../hooks/useProjects';
import { useTasks } from '../../hooks/useTasks';
import { formatDuration } from '../../utils/time';
import { TimeEntry, Project, Task } from '../../types';

interface TimerProps {
    onTimerStop?: (timeEntry: TimeEntry) => void;
}

export const Timer: React.FC<TimerProps> = ({ onTimerStop }) => {
    const { t } = useTranslation();
    const { activeTimer, isLoading, startTimer, stopTimer, currentTimer } = useTimer();
    const { projects } = useProjects();
    const [selectedProject, setSelectedProject] = useState<string>('');
    const [selectedTask, setSelectedTask] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [isBillable, setIsBillable] = useState<boolean>(true);
    const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
    const { tasks, loadTasks } = useTasks(selectedProject);

    // Update elapsed time every second and check for long-running timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        let longRunningChecked = false;

        if (activeTimer && !activeTimer.ended_at) {
            interval = setInterval(() => {
                const startTime = new Date(activeTimer.started_at).getTime();
                const now = Date.now();
                const elapsed = Math.floor((now - startTime) / 1000);
                setElapsedSeconds(elapsed);

                // Check if timer has been running for 4 hours (14400 seconds)
                if (!longRunningChecked && elapsed >= 14400) {
                    longRunningChecked = true;
                    // Send long-running timer notification
                    axios.post('/notifications/timer-long-running', {
                        timer_id: activeTimer.id,
                        project_name: activeTimer.project?.name || 'Unknown Project',
                        duration_hours: Math.floor(elapsed / 3600)
                    }).catch((error) => {
                        console.error('Failed to send long-running timer notification:', error);
                    });
                }
            }, 1000);
        } else {
            setElapsedSeconds(0);
        }

        return () => clearInterval(interval);
    }, [activeTimer]);

    // Load tasks when project changes
    useEffect(() => {
        if (selectedProject) {
            loadTasks();
        }
    }, [selectedProject, loadTasks]);

    // Auto-save description when timer is running and description changes
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
    useEffect(() => {
        // Only auto-save if timer is running and description is different from active timer
        if (activeTimer && !activeTimer.ended_at && description !== activeTimer.description) {
            // Clear previous timeout
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }

            // Auto-save after 2 seconds of inactivity
            autoSaveTimeoutRef.current = setTimeout(() => {
                axios.patch(`/time-entries/${activeTimer.id}`, {
                    description
                }).catch((error) => {
                    if (import.meta.env.DEV) {
                        console.error('Failed to auto-save description:', error);
                    }
                });
            }, 2000);
        }

        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, [activeTimer, description]);

    const handleStart = async () => {
        if (!selectedProject) {
            alert(t('time.selectProject'));
            return;
        }

        await startTimer({
            project_id: selectedProject,
            task_id: selectedTask || undefined,
            description,
            is_billable: isBillable
        });

        // Clear form
        setDescription('');
    };

    const handleStop = async () => {
        const result = await stopTimer(description);
        if (result && onTimerStop) {
            onTimerStop(result);
        }
    };

    const isRunning = activeTimer && !activeTimer.ended_at;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
                    <Clock className="mr-2" />
                    {t('time.title')}
                </h2>
                <div className="text-3xl font-mono text-gray-700 dark:text-gray-300">
                    {formatDuration(elapsedSeconds)}
                </div>
            </div>

            <div className="space-y-4">
                {/* Project Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('time.project')} *
                    </label>
                    <select
                        value={selectedProject}
                        onChange={(e) => {
                            setSelectedProject(e.target.value);
                            setSelectedTask('');
                        }}
                        disabled={isRunning}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                        <option value="">{t('time.selectProject')}</option>
                        {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                                {project.name} - {project.client?.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Task Selection */}
                {selectedProject && tasks.length > 0 && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('time.task')}
                        </label>
                        <select
                            value={selectedTask}
                            onChange={(e) => setSelectedTask(e.target.value)}
                            disabled={isRunning}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">{t('time.noTask')}</option>
                            {tasks.map((task) => (
                                <option key={task.id} value={task.id}>
                                    {task.title}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('time.workingOn')}
                    </label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('time.descriptionPlaceholder')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                </div>

                {/* Billable Toggle */}
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="billable"
                        checked={isBillable}
                        onChange={(e) => setIsBillable(e.target.checked)}
                        disabled={isRunning}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="billable" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        <DollarSign className="inline h-4 w-4 mr-1" />
                        {t('time.billable')}
                    </label>
                </div>

                {/* Timer Controls */}
                <div className="flex justify-center space-x-4">
                    {!isRunning ? (
                        <button
                            onClick={handleStart}
                            disabled={isLoading || !selectedProject}
                            className="flex items-center px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Play className="mr-2" size={20} />
                            {t('time.start')}
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={handleStop}
                                disabled={isLoading}
                                className="flex items-center px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Square className="mr-2" size={20} />
                                {t('time.stop')}
                            </button>
                        </>
                    )}
                </div>

                {/* Current Timer Info */}
                {isRunning && activeTimer && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            <p><strong>{t('time.currentProject')}:</strong> {activeTimer.project?.name}</p>
                            {activeTimer.task && <p><strong>{t('time.currentTask')}:</strong> {activeTimer.task.title}</p>}
                            {activeTimer.description && <p><strong>{t('time.currentDescription')}:</strong> {activeTimer.description}</p>}
                            <p><strong>{t('time.startedAt')}:</strong> {new Date(activeTimer.started_at).toLocaleTimeString()}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};