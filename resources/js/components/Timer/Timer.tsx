import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Square, Clock, DollarSign, Calendar } from 'lucide-react';
import { useTimer } from '../../hooks/useTimer';
import { useProjects } from '../../hooks/useProjects';
import { useTasks } from '../../hooks/useTasks';
import { formatDuration } from '../../utils/time';
import { TimeEntry, Project, Task } from '../../types';

interface TimerProps {
    onTimerStop?: (timeEntry: TimeEntry) => void;
}

export const Timer: React.FC<TimerProps> = ({ onTimerStop }) => {
    const { activeTimer, isLoading, startTimer, stopTimer, currentTimer } = useTimer();
    const { projects } = useProjects();
    const [selectedProject, setSelectedProject] = useState<string>('');
    const [selectedTask, setSelectedTask] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [isBillable, setIsBillable] = useState<boolean>(true);
    const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
    const { tasks, loadTasks } = useTasks(selectedProject);

    // Update elapsed time every second
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (activeTimer && !activeTimer.ended_at) {
            interval = setInterval(() => {
                const startTime = new Date(activeTimer.started_at).getTime();
                const now = Date.now();
                setElapsedSeconds(Math.floor((now - startTime) / 1000));
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

    const handleStart = async () => {
        if (!selectedProject) {
            alert('Please select a project');
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
                    Time Tracker
                </h2>
                <div className="text-3xl font-mono text-gray-700 dark:text-gray-300">
                    {formatDuration(elapsedSeconds)}
                </div>
            </div>

            <div className="space-y-4">
                {/* Project Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Project *
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
                        <option value="">Select a project...</option>
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
                            Task (optional)
                        </label>
                        <select
                            value={selectedTask}
                            onChange={(e) => setSelectedTask(e.target.value)}
                            disabled={isRunning}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">No specific task</option>
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
                        What are you working on?
                    </label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter task description..."
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
                        Billable
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
                            Start Timer
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={handleStop}
                                disabled={isLoading}
                                className="flex items-center px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Square className="mr-2" size={20} />
                                Stop Timer
                            </button>
                        </>
                    )}
                </div>

                {/* Current Timer Info */}
                {isRunning && activeTimer && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            <p><strong>Project:</strong> {activeTimer.project?.name}</p>
                            {activeTimer.task && <p><strong>Task:</strong> {activeTimer.task.title}</p>}
                            {activeTimer.description && <p><strong>Description:</strong> {activeTimer.description}</p>}
                            <p><strong>Started at:</strong> {new Date(activeTimer.started_at).toLocaleTimeString()}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};