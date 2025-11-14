import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExclamationTriangleIcon, CalendarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Task } from '@/utils/ganttMapper';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';

interface UnscheduledTasksProps {
    tasks: Task[];
    projectId: string;
}

const UnscheduledTasks: React.FC<UnscheduledTasksProps> = ({ tasks, projectId }) => {
    const { t } = useTranslation();
    const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const queryClient = useQueryClient();

    const scheduleTaskMutation = useMutation({
        mutationFn: async ({ taskId, start, end }: { taskId: number; start: string; end: string }) => {
            await axios.patch(`/api/tasks/${taskId}`, {
                start_date: start,
                due_date: end,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project', projectId] });
            toast.success(t('projects.gantt.taskUpdated'));
            setEditingTaskId(null);
            setStartDate('');
            setEndDate('');
        },
        onError: () => {
            toast.error(t('projects.gantt.taskUpdateError'));
        },
    });

    const handleScheduleTask = (taskId: number) => {
        if (!startDate || !endDate) {
            toast.error(t('projects.gantt.addDates'));
            return;
        }

        if (new Date(endDate) < new Date(startDate)) {
            toast.error(t('projects.gantt.dateConflict'));
            return;
        }

        scheduleTaskMutation.mutate({ taskId, start: startDate, end: endDate });
    };

    const autoCalculateDates = (task: Task) => {
        const today = new Date();
        const start = format(today, 'yyyy-MM-dd');

        // Calculate end date based on estimated hours (8h per day)
        const estimatedDays = task.estimated_hours ? Math.ceil(task.estimated_hours / 8) : 1;
        const endDateObj = new Date(today);
        endDateObj.setDate(endDateObj.getDate() + estimatedDays);
        const end = format(endDateObj, 'yyyy-MM-dd');

        setStartDate(start);
        setEndDate(end);
    };

    if (tasks.length === 0) {
        return null;
    }

    return (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mr-2" />
                    <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
                        {t('projects.gantt.unscheduledTasks')} ({tasks.length})
                    </h3>
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    {t('projects.gantt.unscheduledTasksWarning')}
                </p>
            </div>

            <div className="divide-y divide-yellow-200 dark:divide-yellow-800">
                {tasks.map((task) => (
                    <div key={task.id} className="p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                        {task.title}
                                    </h4>
                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                                        {t('tasks.' + task.status)}
                                    </span>
                                    {task.estimated_hours && (
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {task.estimated_hours}h estimées
                                        </span>
                                    )}
                                </div>
                                {task.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        {task.description}
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    if (editingTaskId === task.id) {
                                        setEditingTaskId(null);
                                        setStartDate('');
                                        setEndDate('');
                                    } else {
                                        setEditingTaskId(task.id);
                                        autoCalculateDates(task);
                                    }
                                }}
                                className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
                            >
                                {editingTaskId === task.id ? (
                                    <>
                                        <XMarkIcon className="h-4 w-4" />
                                        <span>{t('common.cancel')}</span>
                                    </>
                                ) : (
                                    <>
                                        <CalendarIcon className="h-4 w-4" />
                                        <span>{t('projects.gantt.scheduleTask')}</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Scheduling form */}
                        {editingTaskId === task.id && (
                            <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t('projects.startDate')}
                                        </label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t('projects.endDate')}
                                        </label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-4">
                                    <button
                                        onClick={() => autoCalculateDates(task)}
                                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                    >
                                        🔄 Auto-calculer
                                    </button>
                                    <button
                                        onClick={() => handleScheduleTask(task.id)}
                                        disabled={!startDate || !endDate || scheduleTaskMutation.isPending}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {scheduleTaskMutation.isPending ? t('common.saving') : t('common.save')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UnscheduledTasks;
