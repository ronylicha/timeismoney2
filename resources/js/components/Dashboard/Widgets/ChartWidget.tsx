import React, { ReactNode, useEffect, useRef, useState } from 'react';
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
    const containerRef = useRef<HTMLDivElement>(null);
    const [isClient, setIsClient] = useState(false);
    const [hasDimensions, setHasDimensions] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient || isLoading) {
            return;
        }

        const element = containerRef.current;
        if (!element) {
            setHasDimensions(false);
            return;
        }

        if (typeof ResizeObserver === 'undefined') {
            setHasDimensions(true);
            return;
        }

        const observer = new ResizeObserver(entries => {
            const entry = entries[0];
            const { width, height: measuredHeight } = entry.contentRect;
            setHasDimensions(width > 0 && measuredHeight > 0);
        });

        observer.observe(element);
        return () => observer.disconnect();
    }, [isClient, isLoading, height]);

    const shouldRenderChart = !isLoading && isClient && hasDimensions;

    return (
        <WidgetContainer
            title={title}
            icon={icon}
            iconColor={iconColor}
            iconBgColor={iconBgColor}
            actions={actions}
            isLoading={isLoading}
        >
            <div
                ref={containerRef}
                className="w-full"
                style={{
                    height: `${height}px`,
                    minHeight: `${height}px`,
                    width: '100%',
                    minWidth: 0,
                }}
            >
                {shouldRenderChart ? children : null}
            </div>
        </WidgetContainer>
    );
};

export default ChartWidget;
