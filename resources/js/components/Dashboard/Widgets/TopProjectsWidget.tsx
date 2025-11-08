import React from 'react';
import WidgetContainer from './WidgetContainer';
import { Briefcase, Clock, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Project {
    id: number;
    name: string;
    client_name: string;
    hours: number;
    revenue: number;
    progress: number;
    status: 'active' | 'on_hold' | 'completed';
}

interface TopProjectsWidgetProps {
    projects?: Project[];
    isLoading?: boolean;
}

const TopProjectsWidget: React.FC<TopProjectsWidgetProps> = ({ projects, isLoading = false }) => {
    if (!projects || projects.length === 0) {
        return null;
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
            case 'on_hold':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
            case 'completed':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active':
                return 'Actif';
            case 'on_hold':
                return 'En pause';
            case 'completed':
                return 'Terminé';
            default:
                return status;
        }
    };

    return (
        <WidgetContainer
            title="Top Projets"
            icon={Briefcase}
            iconColor="text-purple-600 dark:text-purple-400"
            iconBgColor="bg-purple-100 dark:bg-purple-900"
            isLoading={isLoading}
            actions={
                <Link
                    to="/projects"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                    Voir tous
                </Link>
            }
        >
            <div className="space-y-4">
                {projects.map((project) => (
                    <Link
                        key={project.id}
                        to={`/projects/${project.id}`}
                        className="block p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        {/* Project Header */}
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                                <h4 className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                                    {project.name}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {project.client_name}
                                </p>
                            </div>
                            <span
                                className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(
                                    project.status
                                )}`}
                            >
                                {getStatusLabel(project.status)}
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                                <span>Progression</span>
                                <span>{project.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                                <div
                                    className="bg-purple-600 h-1.5 rounded-full transition-all"
                                    style={{ width: `${project.progress}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center text-gray-600 dark:text-gray-400">
                                <Clock size={12} className="mr-1" />
                                <span>{project.hours.toFixed(1)}h</span>
                            </div>
                            <div className="flex items-center text-gray-600 dark:text-gray-400">
                                <DollarSign size={12} className="mr-1" />
                                <span>{formatCurrency(project.revenue)}</span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </WidgetContainer>
    );
};

export default TopProjectsWidget;
