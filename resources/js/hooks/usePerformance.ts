import { useEffect, useRef } from 'react';

/**
 * Custom hook for performance monitoring
 * Logs render times and warns if they exceed thresholds
 */
export function usePerformance(componentName: string, warnThreshold: number = 16) {
    const renderCount = useRef(0);
    const startTime = useRef<number>(0);

    useEffect(() => {
        renderCount.current += 1;
    });

    useEffect(() => {
        startTime.current = performance.now();

        return () => {
            const endTime = performance.now();
            const renderTime = endTime - startTime.current;

            if (renderTime > warnThreshold) {
                console.warn(
                    `[Performance] ${componentName} render took ${renderTime.toFixed(2)}ms (threshold: ${warnThreshold}ms)`
                );
            }

            if (process.env.NODE_ENV === 'development') {
                console.log(
                    `[Performance] ${componentName} - Render #${renderCount.current}: ${renderTime.toFixed(2)}ms`
                );
            }
        };
    });

    return {
        renderCount: renderCount.current,
    };
}

/**
 * Utility to measure async operation performance
 */
export function measureAsync<T>(
    operation: () => Promise<T>,
    operationName: string
): Promise<T> {
    const startTime = performance.now();

    return operation().then((result) => {
        const endTime = performance.now();
        const duration = endTime - startTime;

        if (process.env.NODE_ENV === 'development') {
            console.log(`[Performance] ${operationName} took ${duration.toFixed(2)}ms`);
        }

        return result;
    });
}

/**
 * Utility to measure sync operation performance
 */
export function measureSync<T>(operation: () => T, operationName: string): T {
    const startTime = performance.now();
    const result = operation();
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${operationName} took ${duration.toFixed(2)}ms`);
    }

    return result;
}
