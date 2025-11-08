import React from 'react';
import WidgetContainer from './WidgetContainer';
import {
    Activity,
    Clock,
    FileText,
    Briefcase,
    CheckCircle,
    DollarSign,
} from 'lucide-react';
import { getRelativeTime } from '../../../utils/time';

interface Activity {
    id: string;
    type: 'time_entry' | 'invoice' | 'project' | 'task' | 'payment';
    description: string;
    created_at: string;
    metadata?: any;
}

interface RecentActivityWidgetProps {
    activities: Activity[];
    isLoading?: boolean;
    maxHeight?: number;
}

const getActivityIcon = (type: string) => {
    switch (type) {
        case 'time_entry':
            return <Clock className="text-blue-500" size={16} />;
        case 'invoice':
            return <FileText className="text-green-500" size={16} />;
        case 'project':
            return <Briefcase className="text-purple-500" size={16} />;
        case 'task':
            return <CheckCircle className="text-yellow-500" size={16} />;
        case 'payment':
            return <DollarSign className="text-emerald-500" size={16} />;
        default:
            return <Activity className="text-gray-500" size={16} />;
    }
};

const RecentActivityWidget: React.FC<RecentActivityWidgetProps> = ({
    activities,
    isLoading = false,
    maxHeight = 384,
}) => {
    return (
        <WidgetContainer
            title="Activité récente"
            icon={Activity}
            iconColor="text-indigo-600 dark:text-indigo-400"
            iconBgColor="bg-indigo-100 dark:bg-indigo-900"
            isLoading={isLoading}
        >
            <div className="space-y-3" style={{ maxHeight: `${maxHeight}px`, overflowY: 'auto' }}>
                {activities?.map((activity) => (
                    <div
                        key={activity.id}
                        className="flex items-start space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                    >
                        <div className="flex-shrink-0 mt-1">{getActivityIcon(activity.type)}</div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 dark:text-white">
                                {activity.description}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {getRelativeTime(activity.created_at)}
                            </p>
                        </div>
                    </div>
                ))}
                {(!activities || activities.length === 0) && (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                        Aucune activité récente
                    </p>
                )}
            </div>
        </WidgetContainer>
    );
};

export default RecentActivityWidget;
