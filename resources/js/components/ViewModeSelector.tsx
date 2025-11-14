import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    ListBulletIcon,
    ViewColumnsIcon,
    ChartBarSquareIcon,
} from '@heroicons/react/24/outline';

export type ViewMode = 'list' | 'kanban' | 'gantt';

interface ViewModeSelectorProps {
    currentView: ViewMode;
    onChange: (view: ViewMode) => void;
    className?: string;
}

const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({
    currentView,
    onChange,
    className = '',
}) => {
    const { t } = useTranslation();

    const views: Array<{ mode: ViewMode; icon: typeof ListBulletIcon; label: string }> = [
        { mode: 'list', icon: ListBulletIcon, label: t('projects.listView') },
        { mode: 'kanban', icon: ViewColumnsIcon, label: t('projects.kanbanView') },
        { mode: 'gantt', icon: ChartBarSquareIcon, label: t('projects.ganttView') },
    ];

    return (
        <div className={`inline-flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-1 ${className}`}>
            {views.map(({ mode, icon: Icon, label }) => (
                <button
                    key={mode}
                    onClick={() => onChange(mode)}
                    className={`
                        flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                        ${
                            currentView === mode
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                    `}
                    aria-label={label}
                    title={label}
                >
                    <Icon className="h-5 w-5" />
                    <span className="hidden sm:inline">{label}</span>
                </button>
            ))}
        </div>
    );
};

export default ViewModeSelector;
