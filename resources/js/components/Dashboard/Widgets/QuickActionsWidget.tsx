import React from 'react';
import { Link } from 'react-router-dom';
import WidgetContainer from './WidgetContainer';
import {
    Zap,
    Timer,
    FileText,
    Briefcase,
    Calendar,
    ArrowRight,
    Plus,
    Users,
} from 'lucide-react';

interface QuickAction {
    label: string;
    icon: React.ReactNode;
    to: string;
    color: string;
    bgColor: string;
}

const QuickActionsWidget: React.FC = () => {
    const actions: QuickAction[] = [
        {
            label: 'Démarrer le chronomètre',
            icon: <Timer size={20} />,
            to: '/time',
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30',
        },
        {
            label: 'Créer une facture',
            icon: <FileText size={20} />,
            to: '/invoices/new',
            color: 'text-green-600 dark:text-green-400',
            bgColor:
                'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30',
        },
        {
            label: 'Nouveau projet',
            icon: <Briefcase size={20} />,
            to: '/projects/new',
            color: 'text-purple-600 dark:text-purple-400',
            bgColor:
                'bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30',
        },
        {
            label: 'Ajouter un client',
            icon: <Users size={20} />,
            to: '/clients/new',
            color: 'text-pink-600 dark:text-pink-400',
            bgColor: 'bg-pink-50 dark:bg-pink-900/20 hover:bg-pink-100 dark:hover:bg-pink-900/30',
        },
        {
            label: 'Voir la feuille de temps',
            icon: <Calendar size={20} />,
            to: '/timesheet',
            color: 'text-yellow-600 dark:text-yellow-400',
            bgColor:
                'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30',
        },
    ];

    return (
        <WidgetContainer
            title="Actions rapides"
            icon={Zap}
            iconColor="text-orange-600 dark:text-orange-400"
            iconBgColor="bg-orange-100 dark:bg-orange-900"
        >
            <div className="space-y-3">
                {actions.map((action, index) => (
                    <Link
                        key={index}
                        to={action.to}
                        className={`flex items-center justify-between p-3 rounded-lg transition-colors ${action.bgColor}`}
                    >
                        <div className="flex items-center">
                            <span className={`${action.color} mr-3`}>{action.icon}</span>
                            <span className="text-sm font-medium text-gray-800 dark:text-white">
                                {action.label}
                            </span>
                        </div>
                        <ArrowRight className="text-gray-400" size={16} />
                    </Link>
                ))}
            </div>
        </WidgetContainer>
    );
};

export default QuickActionsWidget;
