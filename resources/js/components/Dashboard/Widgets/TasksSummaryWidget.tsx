import React from 'react';
import WidgetContainer from './WidgetContainer';
import { CheckSquare, Circle, PlayCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TaskStats {
    todo: number;
    in_progress: number;
    completed: number;
    overdue: number;
}

interface TasksSummaryWidgetProps {
    tasks?: TaskStats;
    isLoading?: boolean;
}

const TasksSummaryWidget: React.FC<TasksSummaryWidgetProps> = ({ tasks, isLoading = false }) => {
    if (!tasks) {
        return null;
    }

    const taskItems = [
        {
            label: 'À faire',
            count: tasks.todo,
            icon: <Circle size={14} className="text-gray-500" />,
            color: 'text-gray-800 dark:text-white',
            to: '/tasks?status=todo',
        },
        {
            label: 'En cours',
            count: tasks.in_progress,
            icon: <PlayCircle size={14} className="text-blue-500" />,
            color: 'text-blue-600',
            to: '/tasks?status=in_progress',
        },
        {
            label: 'Terminé',
            count: tasks.completed,
            icon: <CheckCircle size={14} className="text-green-500" />,
            color: 'text-green-600',
            to: '/tasks?status=done',
        },
    ];

    if (tasks.overdue > 0) {
        taskItems.push({
            label: 'En retard',
            count: tasks.overdue,
            icon: <AlertCircle size={14} className="text-red-500" />,
            color: 'text-red-600',
            to: '/tasks?filter=overdue',
        });
    }

    return (
        <WidgetContainer
            title="Aperçu des tâches"
            icon={CheckSquare}
            iconColor="text-teal-600 dark:text-teal-400"
            iconBgColor="bg-teal-100 dark:bg-teal-900"
            isLoading={isLoading}
        >
            <div className="space-y-3">
                {taskItems.map((item, index) => (
                    <Link
                        key={index}
                        to={item.to}
                        className="flex justify-between items-center p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <div className="flex items-center space-x-2">
                            {item.icon}
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                {item.label}
                            </span>
                        </div>
                        <span className={`text-sm font-semibold ${item.color}`}>
                            {item.count}
                        </span>
                    </Link>
                ))}

                {/* Total */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-800 dark:text-white">
                            Total
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {tasks.todo + tasks.in_progress + tasks.completed + tasks.overdue}
                        </span>
                    </div>
                </div>
            </div>
        </WidgetContainer>
    );
};

export default TasksSummaryWidget;
