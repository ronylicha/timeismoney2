import React, { ReactNode } from 'react';
import WidgetContainer from './WidgetContainer';
import { LucideIcon } from 'lucide-react';

interface ChartWidgetProps {
    title: string;
    icon?: LucideIcon;
    iconColor?: string;
    iconBgColor?: string;
    children: ReactNode;
    actions?: ReactNode;
    height?: number;
    isLoading?: boolean;
}

const ChartWidget: React.FC<ChartWidgetProps> = ({
    title,
    icon,
    iconColor,
    iconBgColor,
    children,
    actions,
    height = 300,
    isLoading = false,
}) => {
    return (
        <WidgetContainer
            title={title}
            icon={icon}
            iconColor={iconColor}
            iconBgColor={iconBgColor}
            actions={actions}
            isLoading={isLoading}
        >
            <div style={{ height: `${height}px` }}>{children}</div>
        </WidgetContainer>
    );
};

export default ChartWidget;
