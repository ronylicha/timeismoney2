import { Layout } from 'react-grid-layout';

/**
 * Default dashboard layouts for different widget configurations
 */

export const defaultLayout: Layout[] = [
    // Top row - Stats widgets (4 columns)
    { i: 'today-hours', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'week-hours', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'pending-invoices', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'active-projects', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },

    // Second row - Charts (2 columns)
    { i: 'time-tracking-chart', x: 0, y: 2, w: 6, h: 4, minW: 4, minH: 3 },
    { i: 'project-distribution', x: 6, y: 2, w: 6, h: 4, minW: 4, minH: 3 },

    // Third row - Monthly Revenue Chart (full width)
    { i: 'monthly-revenue', x: 0, y: 6, w: 12, h: 4, minW: 6, minH: 3 },

    // Fourth row - Activity and Quick Actions
    { i: 'recent-activity', x: 0, y: 10, w: 8, h: 5, minW: 4, minH: 4 },
    { i: 'quick-actions', x: 8, y: 10, w: 4, h: 5, minW: 3, minH: 4 },

    // Fifth row - Tasks Summary
    { i: 'tasks-summary', x: 8, y: 15, w: 4, h: 3, minW: 3, minH: 3 },
];

export const compactLayout: Layout[] = [
    // Compact view with smaller widgets
    { i: 'today-hours', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'week-hours', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'pending-invoices', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'active-projects', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },

    { i: 'time-tracking-chart', x: 0, y: 2, w: 12, h: 4, minW: 6, minH: 3 },

    { i: 'recent-activity', x: 0, y: 6, w: 6, h: 4, minW: 4, minH: 3 },
    { i: 'quick-actions', x: 6, y: 6, w: 6, h: 4, minW: 4, minH: 3 },
];

export const analyticsLayout: Layout[] = [
    // Analytics-focused layout with more charts
    { i: 'time-tracking-chart', x: 0, y: 0, w: 6, h: 4, minW: 4, minH: 3 },
    { i: 'project-distribution', x: 6, y: 0, w: 6, h: 4, minW: 4, minH: 3 },

    { i: 'monthly-revenue', x: 0, y: 4, w: 12, h: 4, minW: 6, minH: 3 },

    { i: 'today-hours', x: 0, y: 8, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'week-hours', x: 3, y: 8, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'pending-invoices', x: 6, y: 8, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'active-projects', x: 9, y: 8, w: 3, h: 2, minW: 2, minH: 2 },
];

export const mobileLayout: Layout[] = [
    // Mobile-optimized layout (single column)
    { i: 'today-hours', x: 0, y: 0, w: 12, h: 2, minW: 12, minH: 2 },
    { i: 'week-hours', x: 0, y: 2, w: 12, h: 2, minW: 12, minH: 2 },
    { i: 'pending-invoices', x: 0, y: 4, w: 12, h: 2, minW: 12, minH: 2 },
    { i: 'active-projects', x: 0, y: 6, w: 12, h: 2, minW: 12, minH: 2 },
    { i: 'time-tracking-chart', x: 0, y: 8, w: 12, h: 4, minW: 12, minH: 3 },
    { i: 'recent-activity', x: 0, y: 12, w: 12, h: 5, minW: 12, minH: 4 },
    { i: 'quick-actions', x: 0, y: 17, w: 12, h: 4, minW: 12, minH: 3 },
];

/**
 * Get layout by name
 */
export const getLayoutByName = (name: string): Layout[] => {
    switch (name) {
        case 'compact':
            return compactLayout;
        case 'analytics':
            return analyticsLayout;
        case 'mobile':
            return mobileLayout;
        case 'default':
        default:
            return defaultLayout;
    }
};

/**
 * Save layout to localStorage
 */
export const saveLayout = (layout: Layout[], userId: number) => {
    try {
        localStorage.setItem(`dashboard-layout-${userId}`, JSON.stringify(layout));
    } catch (error) {
        console.error('Failed to save dashboard layout:', error);
    }
};

/**
 * Load layout from localStorage
 */
export const loadLayout = (userId: number): Layout[] | null => {
    try {
        const saved = localStorage.getItem(`dashboard-layout-${userId}`);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        console.error('Failed to load dashboard layout:', error);
    }
    return null;
};

/**
 * Reset layout to default
 */
export const resetLayout = (userId: number) => {
    try {
        localStorage.removeItem(`dashboard-layout-${userId}`);
    } catch (error) {
        console.error('Failed to reset dashboard layout:', error);
    }
};
