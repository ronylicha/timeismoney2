/**
 * Performance optimization utilities for large-scale operations
 */

/**
 * Chunk array for batch processing
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

/**
 * Process array in batches with delays to prevent blocking
 */
export async function processBatched<T, R>(
    items: T[],
    processor: (item: T) => R,
    batchSize: number = 50,
    delayMs: number = 0
): Promise<R[]> {
    const results: R[] = [];
    const chunks = chunkArray(items, batchSize);

    for (const chunk of chunks) {
        const chunkResults = chunk.map(processor);
        results.push(...chunkResults);

        // Allow UI to update between batches
        if (delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }

    return results;
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return function (this: any, ...args: Parameters<T>) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

/**
 * Request idle callback with fallback
 */
export function requestIdleCallback(callback: () => void, options?: { timeout?: number }) {
    if ('requestIdleCallback' in window) {
        return window.requestIdleCallback(callback, options);
    } else {
        // Fallback for browsers that don't support requestIdleCallback
        return setTimeout(callback, 1);
    }
}

/**
 * Cancel idle callback with fallback
 */
export function cancelIdleCallback(id: number) {
    if ('cancelIdleCallback' in window) {
        window.cancelIdleCallback(id);
    } else {
        clearTimeout(id);
    }
}

/**
 * Memoize expensive calculations
 */
export function memoize<T extends (...args: any[]) => any>(
    fn: T,
    getKey?: (...args: Parameters<T>) => string
): T {
    const cache = new Map<string, ReturnType<T>>();

    return ((...args: Parameters<T>) => {
        const key = getKey ? getKey(...args) : JSON.stringify(args);

        if (cache.has(key)) {
            return cache.get(key)!;
        }

        const result = fn(...args);
        cache.set(key, result);

        // Limit cache size to prevent memory leaks
        if (cache.size > 100) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
        }

        return result;
    }) as T;
}

/**
 * Check if large dataset threshold is exceeded
 */
export function isLargeDataset(itemCount: number, threshold: number = 100): boolean {
    return itemCount > threshold;
}

/**
 * Batch DOM updates using DocumentFragment
 */
export function batchDOMUpdates(
    container: HTMLElement,
    elements: HTMLElement[]
): void {
    const fragment = document.createDocumentFragment();
    elements.forEach((el) => fragment.appendChild(el));
    container.appendChild(fragment);
}

/**
 * Calculate optimal chunk size based on dataset size
 */
export function getOptimalChunkSize(totalItems: number): number {
    if (totalItems < 100) return totalItems;
    if (totalItems < 500) return 50;
    if (totalItems < 1000) return 100;
    return 200;
}

/**
 * Monitor and log performance metrics
 */
export class PerformanceMonitor {
    private metrics: Map<string, number[]> = new Map();

    mark(name: string) {
        performance.mark(name);
    }

    measure(name: string, startMark: string, endMark: string) {
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name)[0] as PerformanceMeasure;

        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        this.metrics.get(name)!.push(measure.duration);
    }

    getAverageTime(name: string): number {
        const times = this.metrics.get(name) || [];
        if (times.length === 0) return 0;
        return times.reduce((a, b) => a + b, 0) / times.length;
    }

    report() {
        console.group('Performance Report');
        this.metrics.forEach((times, name) => {
            const avg = this.getAverageTime(name);
            const min = Math.min(...times);
            const max = Math.max(...times);
            console.log(`${name}:`, {
                average: `${avg.toFixed(2)}ms`,
                min: `${min.toFixed(2)}ms`,
                max: `${max.toFixed(2)}ms`,
                count: times.length,
            });
        });
        console.groupEnd();
    }

    clear() {
        this.metrics.clear();
        performance.clearMarks();
        performance.clearMeasures();
    }
}

export const performanceMonitor = new PerformanceMonitor();
