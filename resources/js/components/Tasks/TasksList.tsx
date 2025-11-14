import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    ChartBarIcon,
    PlusIcon,
    EyeIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Task {
    id: number;
    title: string;
    description: string;
    status: string;
    priority: string;
    due_date: string | null;
    assigned_to?: {
        id: number;
        name: string;
    };
}

interface TasksListProps {
    tasks: Task[];
    projectId: string;
}

const TasksList: React.FC<TasksListProps> = ({ tasks, projectId }) => {
    const { t } = useTranslation();

    const getTaskStatusBadge = (status: string) => {
        const colors = {
            todo: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
            in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
            in_review: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
            done: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
            cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        };

        const labels = {
            todo: t('tasks.todo'),
            in_progress: t('tasks.inProgress'),
            in_review: t('tasks.inReview'),
            done: t('tasks.done'),
            cancelled: t('tasks.cancelled'),
        };

        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                {labels[status as keyof typeof labels] || status}
            </span>
        );
    };

    const getPriorityBadge = (priority: string) => {
        const colors = {
            low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
            normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
            high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
            urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        };

        const labels = {
            low: t('tasks.low'),
            normal: t('tasks.normal'),
            high: t('tasks.high'),
            urgent: t('tasks.urgent'),
        };

        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                {labels[priority as keyof typeof labels] || priority}
            </span>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('projects.tasks')}</h2>
                <Link
                    to={`/tasks/new?project_id=${projectId}`}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                >
                    <PlusIcon className="h-4 w-4" />
                    <span>{t('tasks.newTask')}</span>
                </Link>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {tasks?.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                        <p>{t('projects.noTasks')}</p>
                    </div>
                ) : (
                    tasks?.map((task) => (
                        <div key={task.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <Link
                                            to={`/tasks/${task.id}`}
                                            className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition"
                                        >
                                            {task.title}
                                        </Link>
                                        {getTaskStatusBadge(task.status)}
                                        {getPriorityBadge(task.priority)}
                                    </div>
                                    {task.description && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{task.description}</p>
                                    )}
                                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                        {task.assigned_to && (
                                            <span>{t('tasks.assignedTo')}: {task.assigned_to.name}</span>
                                        )}
                                        {task.due_date && (
                                            <span>
                                                {t('tasks.dueDate')}: {format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 ml-4">
                                    <Link
                                        to={`/tasks/${task.id}`}
                                        className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition text-sm"
                                        title={t('common.view')}
                                    >
                                        <EyeIcon className="h-4 w-4" />
                                        <span>{t('common.view')}</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default TasksList;
