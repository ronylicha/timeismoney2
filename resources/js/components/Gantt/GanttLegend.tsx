import React, { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { InformationCircleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

const GanttLegend: React.FC = memo(() => {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);

    const statusColors = [
        { key: 'todo', color: 'bg-gray-400', label: t('tasks.status.todo') },
        { key: 'in_progress', color: 'bg-blue-500', label: t('tasks.status.in_progress') },
        { key: 'in_review', color: 'bg-purple-500', label: t('tasks.status.in_review') },
        { key: 'done', color: 'bg-green-500', label: t('tasks.status.done') },
    ];

    const priorityColors = [
        { key: 'low', opacity: '60%', label: t('tasks.priority.low') },
        { key: 'normal', opacity: '80%', label: t('tasks.priority.normal') },
        { key: 'high', opacity: '90%', label: t('tasks.priority.high') },
        { key: 'urgent', border: 'border-2 border-red-600', label: t('tasks.priority.urgent') },
    ];

    return (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-100 dark:hover:bg-blue-900/30 transition rounded-lg"
            >
                <div className="flex items-center space-x-2">
                    <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        {t('projects.gantt.legend')}
                    </span>
                </div>
                {isExpanded ? (
                    <ChevronUpIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                ) : (
                    <ChevronDownIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                )}
            </button>

            {isExpanded && (
                <div className="px-4 pb-4 space-y-4">
                    {/* Task Status Colors */}
                    <div>
                        <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
                            {t('projects.gantt.taskStatusColors')}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {statusColors.map((status) => (
                                <div key={status.key} className="flex items-center space-x-2">
                                    <div className={`h-4 w-8 rounded ${status.color}`}></div>
                                    <span className="text-xs text-blue-800 dark:text-blue-200">
                                        {status.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Priority Indicators */}
                    <div>
                        <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
                            {t('projects.gantt.priorityIndicators')}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {priorityColors.map((priority) => (
                                <div key={priority.key} className="flex items-center space-x-2">
                                    <div
                                        className={`h-4 w-8 rounded bg-blue-500 ${priority.border || ''}`}
                                        style={{ opacity: priority.opacity }}
                                    ></div>
                                    <span className="text-xs text-blue-800 dark:text-blue-200">
                                        {priority.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Critical Path */}
                    <div>
                        <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
                            {t('projects.gantt.specialIndicators')}
                        </h4>
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <div className="h-4 w-8 rounded bg-red-600 border-2 border-red-800"></div>
                                <span className="text-xs text-blue-800 dark:text-blue-200">
                                    {t('projects.gantt.criticalPathTask')}
                                </span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="h-0.5 w-8 bg-gray-600"></div>
                                <span className="text-xs text-blue-800 dark:text-blue-200">
                                    {t('projects.gantt.dependency')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
                        <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
                            {t('projects.gantt.interactions')}
                        </h4>
                        <ul className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
                            <li>• {t('projects.gantt.dragToReschedule')}</li>
                            <li>• {t('projects.gantt.resizeToAdjustDuration')}</li>
                            <li>• {t('projects.gantt.clickForDetails')}</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
});

GanttLegend.displayName = 'GanttLegend';

export default GanttLegend;
