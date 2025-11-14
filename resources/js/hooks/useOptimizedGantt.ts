import { useMemo, useEffect, useState } from 'react';
import { Task } from '@/utils/ganttMapper';
import { isLargeDataset, performanceMonitor } from '@/utils/performanceOptimizations';

interface UseOptimizedGanttOptions {
    tasks: Task[];
    largeDatasetThreshold?: number;
    enablePerformanceMonitoring?: boolean;
}

/**
 * Hook to optimize Gantt chart rendering for large datasets
 */
export function useOptimizedGantt({
    tasks,
    largeDatasetThreshold = 100,
    enablePerformanceMonitoring = true,
}: UseOptimizedGanttOptions) {
    const [isLarge, setIsLarge] = useState(false);
    const [optimizationLevel, setOptimizationLevel] = useState<'none' | 'medium' | 'high'>('none');

    // Determine dataset size and optimization level
    useEffect(() => {
        const taskCount = tasks.length;
        const large = isLargeDataset(taskCount, largeDatasetThreshold);
        setIsLarge(large);

        if (taskCount < 100) {
            setOptimizationLevel('none');
        } else if (taskCount < 500) {
            setOptimizationLevel('medium');
        } else {
            setOptimizationLevel('high');
        }

        if (enablePerformanceMonitoring) {
            console.log(`[Gantt Optimization] Dataset size: ${taskCount}, Level: ${large ? optimizationLevel : 'none'}`);
        }
    }, [tasks.length, largeDatasetThreshold, optimizationLevel, enablePerformanceMonitoring]);

    // Performance recommendations
    const recommendations = useMemo(() => {
        const recs: string[] = [];

        if (optimizationLevel === 'medium') {
            recs.push('Consider using date range filters to reduce visible tasks');
            recs.push('Use monthly or quarterly view for better performance');
        }

        if (optimizationLevel === 'high') {
            recs.push('Large dataset detected - filters are recommended');
            recs.push('Consider breaking project into smaller sub-projects');
            recs.push('Use quarterly or yearly view for optimal performance');
        }

        return recs;
    }, [optimizationLevel]);

    // Suggested view mode based on dataset size
    const suggestedViewMode = useMemo(() => {
        if (tasks.length < 50) return 'Day';
        if (tasks.length < 100) return 'Week';
        if (tasks.length < 300) return 'Month';
        return 'Quarter';
    }, [tasks.length]);

    // Should show performance warning
    const shouldWarn = optimizationLevel === 'high';

    // Performance stats
    const performanceStats = useMemo(() => {
        return {
            taskCount: tasks.length,
            scheduledTasks: tasks.filter(t => t.start_date && t.due_date).length,
            unscheduledTasks: tasks.filter(t => !t.start_date || !t.due_date).length,
            optimizationLevel,
            isLarge,
        };
    }, [tasks, optimizationLevel, isLarge]);

    return {
        isLarge,
        optimizationLevel,
        recommendations,
        suggestedViewMode,
        shouldWarn,
        performanceStats,
        performanceMonitor: enablePerformanceMonitoring ? performanceMonitor : null,
    };
}
