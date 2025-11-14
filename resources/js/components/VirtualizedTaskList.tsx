import React, { useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualizedTaskListProps<T> {
    items: T[];
    renderItem: (item: T, index: number) => React.ReactNode;
    estimateSize?: number;
    overscan?: number;
    threshold?: number; // Number of items to trigger virtualization
}

/**
 * Virtualized list component for better performance with large lists
 * Only virtualizes if items exceed threshold (default 50)
 */
function VirtualizedTaskList<T>({
    items,
    renderItem,
    estimateSize = 100,
    overscan = 5,
    threshold = 50,
}: VirtualizedTaskListProps<T>) {
    const parentRef = React.useRef<HTMLDivElement>(null);

    // Only use virtualization if we have many items
    const shouldVirtualize = items.length > threshold;

    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => estimateSize,
        overscan,
        enabled: shouldVirtualize,
    });

    // For small lists, render normally without virtualization overhead
    if (!shouldVirtualize) {
        return (
            <div className="space-y-3">
                {items.map((item, index) => (
                    <div key={index}>{renderItem(item, index)}</div>
                ))}
            </div>
        );
    }

    // For large lists, use virtualization
    const virtualItems = virtualizer.getVirtualItems();

    return (
        <div
            ref={parentRef}
            className="overflow-auto"
            style={{
                height: '600px',
                width: '100%',
            }}
        >
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {virtualItems.map((virtualRow) => (
                    <div
                        key={virtualRow.index}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            transform: `translateY(${virtualRow.start}px)`,
                        }}
                    >
                        {renderItem(items[virtualRow.index], virtualRow.index)}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default VirtualizedTaskList;
