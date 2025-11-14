# Gantt Chart Performance Optimizations

This document outlines the performance optimizations implemented for the Gantt chart view to handle large projects efficiently.

## Overview

The Gantt chart implementation includes multiple layers of optimization to ensure smooth performance across projects of varying sizes.

## Optimization Techniques

### 1. Lazy Loading

**Component:** `GanttChart`
**Location:** `/resources/js/pages/ProjectDetail.tsx`

The GanttChart component is lazy-loaded using React's `lazy()` and `Suspense`:

```typescript
const GanttChart = lazy(() => import('../components/Gantt/GanttChart'));
```

**Benefits:**
- Reduces initial bundle size
- Faster initial page load
- Component only loads when Gantt view is selected

### 2. Debounced Filters

**Hook:** `useDebounce`
**Location:** `/resources/js/hooks/useDebounce.ts`

All filter inputs (status, priority, assigned) are debounced with a 300ms delay:

```typescript
const debouncedStatusFilter = useDebounce(statusFilter, 300);
```

**Benefits:**
- Prevents excessive re-calculations during typing
- Reduces number of expensive filter operations
- Improves UI responsiveness

### 3. Memoized Calculations

**Techniques Used:**
- `useMemo` for expensive computations
- `useCallback` for stable function references

**Key Memoized Operations:**
- Filter application
- CPM (Critical Path Method) calculations
- Gantt task transformations
- Critical path statistics

**Example:**
```typescript
const cpmResult = useMemo(() => {
    return measureSync(
        () => calculateCriticalPath(filteredTasks),
        `CPM calculation for ${filteredTasks.length} tasks`
    );
}, [filteredTasks]);
```

### 4. React.memo for Components

**Optimized Components:**
- `GanttFilters` - Prevents re-render when props haven't changed
- `GanttLegend` - Static component, rarely needs updates

**Benefits:**
- Reduces unnecessary re-renders
- Improves overall render performance

### 5. Performance Monitoring

**Hook:** `usePerformance`
**Location:** `/resources/js/hooks/usePerformance.ts`

Tracks component render times and logs warnings if thresholds are exceeded:

```typescript
usePerformance('GanttChart', 50); // Warn if render >50ms
```

**Utilities:**
- `measureSync()` - Measures synchronous operation duration
- `measureAsync()` - Measures asynchronous operation duration
- `PerformanceMonitor` - Collects and reports performance metrics

### 6. Dataset Size Optimization

**Hook:** `useOptimizedGantt`
**Location:** `/resources/js/hooks/useOptimizedGantt.ts`

Automatically detects dataset size and applies appropriate optimizations:

**Thresholds:**
- **Small (<100 tasks):** No optimization overhead, `optimization: none`
- **Medium (100-500 tasks):** Moderate optimizations, `optimization: medium`
- **Large (>500 tasks):** Aggressive optimizations, `optimization: high`

**Features:**
- Automatic performance level detection
- User-facing recommendations
- Suggested view modes based on task count
- Performance statistics tracking

### 7. Virtual Scrolling

**Component:** `VirtualizedTaskList`
**Location:** `/resources/js/components/VirtualizedTaskList.tsx`

For lists with >50 items, virtual scrolling renders only visible items:

```typescript
const virtualizer = useVirtualizer({
    count: items.length,
    estimateSize: () => 100,
    overscan: 5,
});
```

**Benefits:**
- Dramatically reduces DOM nodes
- Constant performance regardless of list size
- Smooth scrolling even with 1000+ items

### 8. Performance Utilities

**Module:** `performanceOptimizations`
**Location:** `/resources/js/utils/performanceOptimizations.ts`

**Available Utilities:**
- `chunkArray()` - Split arrays for batch processing
- `processBatched()` - Process arrays in chunks with delays
- `throttle()` - Limit function execution frequency
- `memoize()` - Cache expensive calculations
- `requestIdleCallback()` - Schedule non-critical work
- `PerformanceMonitor` - Comprehensive performance tracking

### 9. Large Dataset Warning

When a project exceeds 500 tasks, users see a warning with optimization tips:

**Features:**
- Visual indicator (orange banner)
- Performance recommendations
- Suggested view modes
- Dataset statistics

**Recommendations Shown:**
- Use filters to reduce visible tasks
- Switch to monthly/quarterly view
- Consider breaking into sub-projects

## Performance Benchmarks

### Expected Performance

| Task Count | View Mode | Render Time | CPM Time | Total Time |
|-----------|-----------|-------------|----------|------------|
| 50        | Week      | ~10ms       | ~5ms     | ~15ms      |
| 100       | Week      | ~20ms       | ~15ms    | ~35ms      |
| 250       | Month     | ~40ms       | ~40ms    | ~80ms      |
| 500       | Quarter   | ~70ms       | ~100ms   | ~170ms     |
| 1000+     | Quarter   | ~150ms      | ~250ms   | ~400ms     |

*Times are approximate and depend on hardware*

## Best Practices for Users

### For Projects with 100-500 Tasks:
1. Use filters to focus on relevant tasks
2. Switch to Month or Quarter view
3. Enable filters by status or assigned user

### For Projects with 500+ Tasks:
1. **Strongly recommended:** Use filters
2. Use Quarter or Year view
3. Consider breaking into multiple projects
4. Limit concurrent dependency calculations

## Developer Guidelines

### When Adding New Features:

1. **Use memoization** for expensive calculations:
   ```typescript
   const result = useMemo(() => expensiveOperation(), [deps]);
   ```

2. **Debounce user inputs** that trigger calculations:
   ```typescript
   const debouncedValue = useDebounce(value, 300);
   ```

3. **Measure performance** in development:
   ```typescript
   const result = measureSync(() => operation(), 'Operation Name');
   ```

4. **Use virtual scrolling** for large lists:
   ```typescript
   <VirtualizedTaskList items={items} renderItem={renderFn} />
   ```

5. **Lazy load** heavy components:
   ```typescript
   const HeavyComponent = lazy(() => import('./Heavy'));
   ```

## Monitoring in Production

Performance monitoring is automatically enabled in development mode. To enable in production:

```typescript
useOptimizedGantt({
    tasks,
    enablePerformanceMonitoring: true, // Enable in production
});
```

View performance reports in console:
```javascript
performanceMonitor.report();
```

## Future Optimizations

Potential areas for further optimization:

1. **Web Workers** for CPM calculations (>1000 tasks)
2. **Server-side rendering** for initial Gantt state
3. **Incremental CPM** updates instead of full recalculation
4. **IndexedDB caching** for large project data
5. **Progressive loading** of tasks in chunks

## Troubleshooting

### Slow Performance?

1. Check dataset size: `performanceStats.taskCount`
2. Review console for performance warnings
3. Enable performance monitoring
4. Check if filters are being applied
5. Verify debouncing is working (300ms delay)

### Memory Issues?

1. Clear browser cache
2. Reduce concurrent filters
3. Use simpler view modes (Quarter/Year)
4. Check for memory leaks in browser DevTools

## Configuration

### Customizing Thresholds:

```typescript
// In GanttChart.tsx
useOptimizedGantt({
    tasks,
    largeDatasetThreshold: 150, // Custom threshold
});

// In useDebounce
useDebounce(value, 500); // Longer delay
```

## Resources

- React Performance: https://react.dev/learn/render-and-commit
- useMemo: https://react.dev/reference/react/useMemo
- React.lazy: https://react.dev/reference/react/lazy
- Virtual Scrolling: https://tanstack.com/virtual/latest

## Conclusion

These optimizations ensure the Gantt chart remains performant across projects of all sizes, from small 10-task projects to enterprise-scale 1000+ task projects. The combination of lazy loading, memoization, debouncing, and intelligent dataset handling provides a smooth user experience while maintaining code maintainability.
