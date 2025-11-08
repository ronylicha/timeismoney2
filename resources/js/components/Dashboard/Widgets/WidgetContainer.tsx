import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface WidgetContainerProps {
    title: string;
    icon?: LucideIcon;
    iconColor?: string;
    iconBgColor?: string;
    children: ReactNode;
    className?: string;
    actions?: ReactNode;
    isLoading?: boolean;
}

const WidgetContainer: React.FC<WidgetContainerProps> = ({
    title,
    icon: Icon,
    iconColor = 'text-blue-600 dark:text-blue-400',
    iconBgColor = 'bg-blue-100 dark:bg-blue-900',
    children,
    className = '',
    actions,
    isLoading = false,
}) => {
    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    {Icon && (
                        <div className={`p-3 ${iconBgColor} rounded-lg`}>
                            <Icon className={iconColor} size={24} />
                        </div>
                    )}
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                        {title}
                    </h2>
                </div>
                {actions && <div className="flex items-center space-x-2">{actions}</div>}
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div>{children}</div>
            )}
        </div>
    );
};

export default WidgetContainer;
