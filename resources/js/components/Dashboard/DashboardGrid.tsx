import React, { useState, useEffect, useRef } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Settings } from 'lucide-react';

interface DashboardGridProps {
    children: React.ReactNode[];
    layouts: Layout[];
    onLayoutChange?: (layout: Layout[]) => void;
    editable?: boolean;
    cols?: number;
    rowHeight?: number;
}

const DashboardGrid: React.FC<DashboardGridProps> = ({
    children,
    layouts,
    onLayoutChange,
    editable = false,
    cols = 12,
    rowHeight = 80,
}) => {
    const [layout, setLayout] = useState<Layout[]>(layouts);
    const [isDraggable, setIsDraggable] = useState(editable);
    const [isResizable, setIsResizable] = useState(editable);

    // Track if we're in the middle of a user drag/resize operation
    const isUserInteractingRef = useRef(false);
    const layoutStringRef = useRef(JSON.stringify(layouts));

    // Sync internal state with external layouts prop
    // Only update if the external layout changed AND we're not currently dragging
    useEffect(() => {
        const newLayoutString = JSON.stringify(layouts);
        if (!isUserInteractingRef.current && newLayoutString !== layoutStringRef.current) {
            setLayout(layouts);
            layoutStringRef.current = newLayoutString;
        }
    }, [layouts]);

    useEffect(() => {
        setIsDraggable(editable);
        setIsResizable(editable);
    }, [editable]);

    const handleLayoutChange = (newLayout: Layout[]) => {
        setLayout(newLayout);
        layoutStringRef.current = JSON.stringify(newLayout);

        if (onLayoutChange && editable) {
            isUserInteractingRef.current = true;
            onLayoutChange(newLayout);
            // Reset the flag after a short delay to allow the prop update to settle
            setTimeout(() => {
                isUserInteractingRef.current = false;
            }, 100);
        }
    };

    return (
        <div className="relative">
            {editable && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center">
                        <Settings className="text-blue-600 dark:text-blue-400 mr-2" size={20} />
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                            Mode édition activé - Faites glisser et redimensionnez les widgets
                        </span>
                    </div>
                </div>
            )}

            <GridLayout
                className="layout"
                layout={layout}
                cols={cols}
                rowHeight={rowHeight}
                width={1200}
                isDraggable={isDraggable}
                isResizable={isResizable}
                compactType="vertical"
                preventCollision={false}
                onLayoutChange={handleLayoutChange}
                draggableHandle=".drag-handle"
            >
                {React.Children.map(children, (child, index) => {
                    if (!React.isValidElement(child)) return null;

                    const key = layout[index]?.i || `widget-${index}`;

                    return (
                        <div key={key} className="relative">
                            {editable && (
                                <div className="drag-handle absolute top-0 left-0 right-0 h-8 cursor-move bg-gradient-to-b from-gray-100 to-transparent dark:from-gray-700 opacity-0 hover:opacity-100 transition-opacity z-10 rounded-t-lg flex items-center justify-center">
                                    <div className="w-8 h-1 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                                </div>
                            )}
                            {child}
                        </div>
                    );
                })}
            </GridLayout>
        </div>
    );
};

export default DashboardGrid;
