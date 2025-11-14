import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface GanttFiltersProps {
    statusFilter: string[];
    priorityFilter: string[];
    assignedFilter: string[];
    onStatusChange: (statuses: string[]) => void;
    onPriorityChange: (priorities: string[]) => void;
    onAssignedChange: (assigned: string[]) => void;
    availableAssignees: Array<{ id: number; name: string }>;
}

const GanttFilters: React.FC<GanttFiltersProps> = memo(({
    statusFilter,
    priorityFilter,
    assignedFilter,
    onStatusChange,
    onPriorityChange,
    onAssignedChange,
    availableAssignees,
}) => {
    const { t } = useTranslation();

    const statuses = [
        { value: 'todo', label: t('tasks.status.todo'), color: 'bg-gray-400' },
        { value: 'in_progress', label: t('tasks.status.in_progress'), color: 'bg-blue-500' },
        { value: 'in_review', label: t('tasks.status.in_review'), color: 'bg-purple-500' },
        { value: 'done', label: t('tasks.status.done'), color: 'bg-green-500' },
    ];

    const priorities = [
        { value: 'low', label: t('tasks.priority.low'), color: 'text-gray-600' },
        { value: 'normal', label: t('tasks.priority.normal'), color: 'text-blue-600' },
        { value: 'medium', label: t('tasks.priority.medium'), color: 'text-yellow-600' },
        { value: 'high', label: t('tasks.priority.high'), color: 'text-orange-600' },
        { value: 'urgent', label: t('tasks.priority.urgent'), color: 'text-red-600' },
    ];

    const toggleStatus = (value: string) => {
        if (statusFilter.includes(value)) {
            onStatusChange(statusFilter.filter((s) => s !== value));
        } else {
            onStatusChange([...statusFilter, value]);
        }
    };

    const togglePriority = (value: string) => {
        if (priorityFilter.includes(value)) {
            onPriorityChange(priorityFilter.filter((p) => p !== value));
        } else {
            onPriorityChange([...priorityFilter, value]);
        }
    };

    const toggleAssigned = (id: string) => {
        if (assignedFilter.includes(id)) {
            onAssignedChange(assignedFilter.filter((a) => a !== id));
        } else {
            onAssignedChange([...assignedFilter, id]);
        }
    };

    const clearAllFilters = () => {
        onStatusChange([]);
        onPriorityChange([]);
        onAssignedChange([]);
    };

    const hasActiveFilters =
        statusFilter.length > 0 || priorityFilter.length > 0 || assignedFilter.length > 0;

    return (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <FunnelIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {t('projects.gantt.filters')}
                    </h3>
                </div>
                {hasActiveFilters && (
                    <button
                        onClick={clearAllFilters}
                        className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition"
                    >
                        <XMarkIcon className="h-4 w-4" />
                        <span>{t('common.clearAll')}</span>
                    </button>
                )}
            </div>

            <div className="space-y-3">
                {/* Status Filter */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('tasks.status.label')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {statuses.map((status) => (
                            <button
                                key={status.value}
                                onClick={() => toggleStatus(status.value)}
                                className={`px-3 py-1 text-sm rounded-full transition flex items-center space-x-2 ${
                                    statusFilter.includes(status.value)
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-blue-400'
                                }`}
                            >
                                <div className={`h-2 w-2 rounded-full ${status.color}`}></div>
                                <span>{status.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Priority Filter */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('tasks.priority.label')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {priorities.map((priority) => (
                            <button
                                key={priority.value}
                                onClick={() => togglePriority(priority.value)}
                                className={`px-3 py-1 text-sm rounded-full transition ${
                                    priorityFilter.includes(priority.value)
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-blue-400'
                                }`}
                            >
                                <span className={priorityFilter.includes(priority.value) ? '' : priority.color}>
                                    {priority.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Assigned Filter */}
                {availableAssignees.length > 0 && (
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('tasks.assignedTo')}
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {availableAssignees.map((assignee) => (
                                <button
                                    key={assignee.id}
                                    onClick={() => toggleAssigned(assignee.id.toString())}
                                    className={`px-3 py-1 text-sm rounded-full transition flex items-center space-x-2 ${
                                        assignedFilter.includes(assignee.id.toString())
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-blue-400'
                                    }`}
                                >
                                    <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                        <span className="text-xs font-medium">
                                            {assignee.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <span>{assignee.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

GanttFilters.displayName = 'GanttFilters';

export default GanttFilters;
