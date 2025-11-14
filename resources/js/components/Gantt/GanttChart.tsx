import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Gantt from 'frappe-gantt';
import { Task, GanttTask, mapTasksToGantt, getUnscheduledTasks, getScheduledTasks } from '@/utils/ganttMapper';
import { calculateCriticalPath, getCriticalPathStats } from '@/utils/criticalPath';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { CalendarIcon, BoltIcon } from '@heroicons/react/24/outline';
import { useDebounce } from '@/hooks/useDebounce';
import { usePerformance, measureSync } from '@/hooks/usePerformance';
import { useOptimizedGantt } from '@/hooks/useOptimizedGantt';
import UnscheduledTasks from './UnscheduledTasks';
import GanttExport from './GanttExport';
import GanttFilters from './GanttFilters';
import GanttLegend from './GanttLegend';
import './gantt-styles.css';

interface GanttChartProps {
    tasks: Task[];
    projectId: string;
    projectName?: string;
    onTaskUpdate?: (taskId: number, updates: Partial<Task>) => void;
}

type ViewMode = 'Day' | 'Week' | 'Month' | 'Quarter' | 'Year';

const GanttChart: React.FC<GanttChartProps> = ({
    tasks,
    projectId,
    projectName = 'Project',
    onTaskUpdate,
}) => {
    const { t } = useTranslation();
    const ganttContainerRef = useRef<HTMLDivElement>(null);
    const ganttInstanceRef = useRef<Gantt | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('Week');
    const [ganttTasks, setGanttTasks] = useState<GanttTask[]>([]);
    const [showCriticalPath, setShowCriticalPath] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
    const [assignedFilter, setAssignedFilter] = useState<string[]>([]);
    const queryClient = useQueryClient();

    // Performance monitoring
    usePerformance('GanttChart', 50); // Warn if render takes >50ms

    // Optimization for large datasets
    const {
        isLarge,
        optimizationLevel,
        recommendations,
        suggestedViewMode,
        shouldWarn,
        performanceStats,
    } = useOptimizedGantt({
        tasks,
        largeDatasetThreshold: 100,
        enablePerformanceMonitoring: process.env.NODE_ENV === 'development',
    });

    // Debounce filters to avoid excessive recalculations
    const debouncedStatusFilter = useDebounce(statusFilter, 300);
    const debouncedPriorityFilter = useDebounce(priorityFilter, 300);
    const debouncedAssignedFilter = useDebounce(assignedFilter, 300);

    // Extract available assignees from tasks
    const availableAssignees = useMemo(() => {
        const assigneeMap = new Map<number, { id: number; name: string }>();
        tasks.forEach((task) => {
            if (task.assigned_to) {
                assigneeMap.set(task.assigned_to.id, task.assigned_to);
            }
        });
        return Array.from(assigneeMap.values());
    }, [tasks]);

    // Apply filters to tasks (using debounced values for performance)
    const filteredTasks = useMemo(() => {
        return measureSync(() => {
            let filtered = [...tasks];

            // Filter by status
            if (debouncedStatusFilter.length > 0) {
                filtered = filtered.filter((task) => debouncedStatusFilter.includes(task.status));
            }

            // Filter by priority
            if (debouncedPriorityFilter.length > 0) {
                filtered = filtered.filter((task) => debouncedPriorityFilter.includes(task.priority));
            }

            // Filter by assigned user
            if (debouncedAssignedFilter.length > 0) {
                filtered = filtered.filter(
                    (task) =>
                        task.assigned_to && debouncedAssignedFilter.includes(task.assigned_to.id.toString())
                );
            }

            return filtered;
        }, `Filtering ${tasks.length} tasks`);
    }, [tasks, debouncedStatusFilter, debouncedPriorityFilter, debouncedAssignedFilter]);

    // Calculate critical path (expensive operation - measure performance)
    const cpmResult = useMemo(() => {
        if (filteredTasks.length === 0) {
            return { tasks: [], criticalPath: [], projectDuration: 0, criticalPathTasks: [] };
        }
        return measureSync(
            () => calculateCriticalPath(filteredTasks),
            `CPM calculation for ${filteredTasks.length} tasks`
        );
    }, [filteredTasks]);

    const criticalStats = useMemo(() => {
        return getCriticalPathStats(cpmResult);
    }, [cpmResult]);

    // Convert tasks to Gantt format
    useEffect(() => {
        const mappedTasks = mapTasksToGantt(filteredTasks);

        // Add critical path styling if enabled
        if (showCriticalPath) {
            const criticalTaskIds = new Set(cpmResult.criticalPath);
            mappedTasks.forEach((task) => {
                if (criticalTaskIds.has(parseInt(task.id))) {
                    task.custom_class = `${task.custom_class || ''} bar-critical`.trim();
                }
            });
        }

        setGanttTasks(mappedTasks);
    }, [filteredTasks, showCriticalPath, cpmResult.criticalPath]);

    // Mutation to update task dates
    const updateTaskMutation = useMutation({
        mutationFn: async ({
            taskId,
            startDate,
            endDate,
        }: {
            taskId: number;
            startDate: string;
            endDate: string;
        }) => {
            await axios.patch(`/api/tasks/${taskId}`, {
                start_date: startDate,
                due_date: endDate,
            });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['project', projectId] });
            toast.success(t('projects.gantt.taskUpdated'));
            if (onTaskUpdate) {
                onTaskUpdate(variables.taskId, {
                    start_date: variables.startDate,
                    due_date: variables.endDate,
                });
            }
        },
        onError: () => {
            toast.error(t('projects.gantt.taskUpdateError'));
            // Refresh to revert changes
            queryClient.invalidateQueries({ queryKey: ['project', projectId] });
        },
    });

    // Initialize Gantt chart
    useEffect(() => {
        if (!ganttContainerRef.current || ganttTasks.length === 0) {
            return;
        }

        try {
            // Clear previous instance if exists using safe DOM method
            if (ganttInstanceRef.current && ganttContainerRef.current) {
                ganttContainerRef.current.replaceChildren();
            }

            // Create new Gantt instance
            ganttInstanceRef.current = new Gantt(ganttContainerRef.current, ganttTasks, {
                view_mode: viewMode,
                language: 'en', // frappe-gantt uses English by default
                bar_height: 30,
                bar_corner_radius: 3,
                arrow_curve: 5,
                padding: 18,
                date_format: 'YYYY-MM-DD',
                custom_popup_html: (task: GanttTask) => {
                    const originalTask = filteredTasks.find((t) => String(t.id) === task.id);
                    return `
                        <div class="gantt-popup">
                            <div class="gantt-popup-title">${task.name}</div>
                            ${originalTask?.description ? `<div class="gantt-popup-desc">${originalTask.description}</div>` : ''}
                            <div class="gantt-popup-dates">
                                <strong>${t('projects.start')}:</strong> ${task.start}<br/>
                                <strong>${t('projects.end')}:</strong> ${task.end}
                            </div>
                            <div class="gantt-popup-progress">
                                <strong>${t('projects.progress')}:</strong> ${task.progress}%
                            </div>
                            ${originalTask?.assigned_to ? `
                                <div class="gantt-popup-assigned">
                                    <strong>${t('tasks.assignedTo')}:</strong> ${originalTask.assigned_to.name}
                                </div>
                            ` : ''}
                        </div>
                    `;
                },
                on_date_change: (task: GanttTask, start: Date, end: Date) => {
                    handleDateChange(task, start, end);
                },
                on_progress_change: (task: GanttTask, progress: number) => {
                    handleProgressChange(task, progress);
                },
                on_view_change: (mode: string) => {
                    console.log('View mode changed to:', mode);
                },
            });
        } catch (error) {
            console.error('Error initializing Gantt chart:', error);
            toast.error(t('projects.gantt.loading'));
        }

        return () => {
            if (ganttContainerRef.current) {
                ganttContainerRef.current.replaceChildren();
            }
            ganttInstanceRef.current = null;
        };
    }, [ganttTasks, viewMode, t]);

    // Handle date change from drag-and-drop (memoized to prevent recreating on every render)
    const handleDateChange = useCallback((task: GanttTask, start: Date, end: Date) => {
        const taskId = parseInt(task.id);
        const startDate = start.toISOString().split('T')[0];
        const endDate = end.toISOString().split('T')[0];

        // Optimistically update the task
        updateTaskMutation.mutate({ taskId, startDate, endDate });
    }, [updateTaskMutation]);

    // Handle progress change (memoized)
    const handleProgressChange = useCallback((task: GanttTask, progress: number) => {
        const taskId = parseInt(task.id);

        axios
            .patch(`/api/tasks/${taskId}`, { progress })
            .then(() => {
                queryClient.invalidateQueries({ queryKey: ['project', projectId] });
                toast.success(t('projects.gantt.taskUpdated'));
            })
            .catch(() => {
                toast.error(t('projects.gantt.taskUpdateError'));
                queryClient.invalidateQueries({ queryKey: ['project', projectId] });
            });
    }, [queryClient, projectId, t]);

    // Change view mode (memoized)
    const handleViewModeChange = useCallback((mode: ViewMode) => {
        setViewMode(mode);
        if (ganttInstanceRef.current) {
            ganttInstanceRef.current.change_view_mode(mode);
        }
    }, []);

    const unscheduledTasks = getUnscheduledTasks(tasks);
    const scheduledTasks = getScheduledTasks(tasks);

    if (ganttTasks.length === 0 && unscheduledTasks.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                    <p className="text-lg font-medium mb-2">{t('projects.gantt.noTasksToDisplay')}</p>
                    <p className="text-sm">{t('projects.gantt.addTasksFirst')}</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Unscheduled Tasks Warning */}
            {unscheduledTasks.length > 0 && (
                <UnscheduledTasks tasks={unscheduledTasks} projectId={projectId} />
            )}

            {/* Filters */}
            {scheduledTasks.length > 0 && (
                <GanttFilters
                    statusFilter={statusFilter}
                    priorityFilter={priorityFilter}
                    assignedFilter={assignedFilter}
                    onStatusChange={setStatusFilter}
                    onPriorityChange={setPriorityFilter}
                    onAssignedChange={setAssignedFilter}
                    availableAssignees={availableAssignees}
                />
            )}

            {/* Legend */}
            {scheduledTasks.length > 0 && <GanttLegend />}

            {/* Performance Warning for Large Datasets */}
            {shouldWarn && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-4">
                    <div className="flex items-start">
                        <BoltIcon className="h-5 w-5 text-orange-600 dark:text-orange-400 mr-3 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-2">
                                {t('projects.gantt.largeDatasetWarning') || 'Large Project Detected'}
                            </h4>
                            <p className="text-sm text-orange-700 dark:text-orange-300 mb-2">
                                {t('projects.gantt.largeDatasetMessage') ||
                                    `This project has ${performanceStats.taskCount} tasks. For optimal performance:`}
                            </p>
                            <ul className="text-sm text-orange-700 dark:text-orange-300 list-disc list-inside space-y-1">
                                {recommendations.map((rec, index) => (
                                    <li key={index}>{rec}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Gantt Chart */}
            {ganttTasks.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
            {/* Header with view mode selector */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {t('projects.gantt.title')}
                    </h2>

                    <div className="flex items-center space-x-3">
                        {/* View Mode Buttons */}
                        <div className="flex items-center space-x-2">
                            {(['Day', 'Week', 'Month', 'Quarter', 'Year'] as ViewMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => handleViewModeChange(mode)}
                                    className={`px-3 py-1 text-sm rounded-md transition ${
                                        viewMode === mode
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    {t(`projects.gantt.${mode.toLowerCase()}`)}
                                </button>
                            ))}
                        </div>

                        {/* Export Button */}
                        <GanttExport
                            ganttContainerRef={ganttContainerRef}
                            projectName={projectName}
                        />
                    </div>
                </div>

                {/* Critical Path Toggle and Stats */}
                {cpmResult.criticalPath.length > 0 && (
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setShowCriticalPath(!showCriticalPath)}
                            className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition ${
                                showCriticalPath
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            <BoltIcon className="h-4 w-4" />
                            <span>
                                {showCriticalPath
                                    ? t('projects.gantt.hideCriticalPath')
                                    : t('projects.gantt.showCriticalPath')}
                            </span>
                        </button>

                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                            <span>
                                {t('projects.gantt.criticalTasks')}: <strong>{criticalStats.criticalTasks}</strong>/{criticalStats.totalTasks}
                            </span>
                            <span>
                                {t('projects.gantt.projectDuration')}: <strong>{criticalStats.projectDuration}</strong> {t('projects.days')}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Gantt Chart Container */}
            <div className="p-6 overflow-x-auto">
                <div ref={ganttContainerRef} className="gantt-container" />

                {/* Helper text */}
                <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 space-y-1">
                    <p>💡 {t('projects.gantt.dragToReschedule')}</p>
                    <p>💡 {t('projects.gantt.resizeToAdjustDuration')}</p>
                    <p>💡 {t('projects.gantt.clickForDetails')}</p>
                </div>
            </div>
                </div>
            )}
        </>
    );
};

export default GanttChart;
