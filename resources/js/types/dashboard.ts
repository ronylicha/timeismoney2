import { Layout } from 'react-grid-layout';

/**
 * Widget visibility configuration
 */
export interface WidgetVisibility {
    'today-hours': boolean;
    'week-hours': boolean;
    'pending-invoices': boolean;
    'active-projects': boolean;
    'time-tracking-chart': boolean;
    'project-distribution': boolean;
    'monthly-revenue': boolean;
    'recent-activity': boolean;
    'quick-actions': boolean;
    'tasks-summary': boolean;
    'client-stats': boolean;
    'expenses-summary': boolean;
    'top-projects': boolean;
}

/**
 * Available color themes
 */
export type ColorTheme = 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'indigo';

/**
 * Available dashboard layouts
 */
export type LayoutType = 'default' | 'compact' | 'analytics' | 'mobile' | 'custom';

/**
 * Refresh interval options (in milliseconds)
 */
export type RefreshInterval = 30000 | 60000 | 120000 | 300000 | 600000 | 0; // 30s, 1m, 2m, 5m, 10m, Never

/**
 * Date range filter options
 */
export type DateRangeType =
    | 'today'
    | 'yesterday'
    | 'week'
    | 'last-week'
    | 'month'
    | 'last-month'
    | 'quarter'
    | 'year'
    | 'custom';

/**
 * Custom date range
 */
export interface CustomDateRange {
    start: string; // ISO date string
    end: string; // ISO date string
}

/**
 * User role types
 */
export type UserRole = 'admin' | 'manager' | 'employee' | 'client';

/**
 * Dashboard preferences
 */
export interface DashboardPreferences {
    userId: number;
    role: UserRole;
    layoutType: LayoutType;
    customLayout?: Layout[];
    visibleWidgets: WidgetVisibility;
    colorTheme: ColorTheme;
    refreshInterval: RefreshInterval;
    defaultDateRange: DateRangeType;
    customDateRange?: CustomDateRange;
    showWelcomeMessage: boolean;
    compactMode: boolean;
    showTrends: boolean;
    animationsEnabled: boolean;
}

/**
 * Widget metadata
 */
export interface WidgetMetadata {
    id: keyof WidgetVisibility;
    name: string;
    description: string;
    category: 'stats' | 'charts' | 'activity' | 'actions';
    icon: string;
    minSize: { w: number; h: number };
    defaultSize: { w: number; h: number };
    availableForRoles: UserRole[];
}

/**
 * Default preferences by role
 */
export const defaultPreferencesByRole: Record<UserRole, Partial<DashboardPreferences>> = {
    admin: {
        layoutType: 'default',
        visibleWidgets: {
            'today-hours': true,
            'week-hours': true,
            'pending-invoices': true,
            'active-projects': true,
            'time-tracking-chart': true,
            'project-distribution': true,
            'monthly-revenue': true,
            'recent-activity': true,
            'quick-actions': true,
            'tasks-summary': true,
            'client-stats': true,
            'expenses-summary': true,
            'top-projects': true,
        },
        colorTheme: 'blue',
        refreshInterval: 60000,
        defaultDateRange: 'month',
        showWelcomeMessage: true,
        compactMode: false,
        showTrends: true,
        animationsEnabled: true,
    },
    manager: {
        layoutType: 'analytics',
        visibleWidgets: {
            'today-hours': false,
            'week-hours': true,
            'pending-invoices': true,
            'active-projects': true,
            'time-tracking-chart': true,
            'project-distribution': true,
            'monthly-revenue': true,
            'recent-activity': true,
            'quick-actions': false,
            'tasks-summary': true,
            'client-stats': true,
            'expenses-summary': true,
            'top-projects': true,
        },
        colorTheme: 'purple',
        refreshInterval: 120000,
        defaultDateRange: 'week',
        showWelcomeMessage: false,
        compactMode: false,
        showTrends: true,
        animationsEnabled: true,
    },
    employee: {
        layoutType: 'compact',
        visibleWidgets: {
            'today-hours': true,
            'week-hours': true,
            'pending-invoices': false,
            'active-projects': true,
            'time-tracking-chart': true,
            'project-distribution': false,
            'monthly-revenue': false,
            'recent-activity': true,
            'quick-actions': true,
            'tasks-summary': true,
            'client-stats': false,
            'expenses-summary': false,
            'top-projects': false,
        },
        colorTheme: 'green',
        refreshInterval: 60000,
        defaultDateRange: 'week',
        showWelcomeMessage: true,
        compactMode: true,
        showTrends: true,
        animationsEnabled: true,
    },
    client: {
        layoutType: 'compact',
        visibleWidgets: {
            'today-hours': false,
            'week-hours': false,
            'pending-invoices': true,
            'active-projects': true,
            'time-tracking-chart': false,
            'project-distribution': false,
            'monthly-revenue': false,
            'recent-activity': true,
            'quick-actions': false,
            'tasks-summary': false,
            'client-stats': false,
            'expenses-summary': false,
            'top-projects': false,
        },
        colorTheme: 'indigo',
        refreshInterval: 300000,
        defaultDateRange: 'month',
        showWelcomeMessage: true,
        compactMode: true,
        showTrends: false,
        animationsEnabled: false,
    },
};

/**
 * Widget catalog with metadata
 */
export const widgetCatalog: WidgetMetadata[] = [
    {
        id: 'today-hours',
        name: "Heures aujourd'hui",
        description: 'Temps tracké aujourd\'hui',
        category: 'stats',
        icon: 'Clock',
        minSize: { w: 2, h: 2 },
        defaultSize: { w: 3, h: 2 },
        availableForRoles: ['admin', 'manager', 'employee'],
    },
    {
        id: 'week-hours',
        name: 'Heures cette semaine',
        description: 'Temps tracké cette semaine avec tendance',
        category: 'stats',
        icon: 'TrendingUp',
        minSize: { w: 2, h: 2 },
        defaultSize: { w: 3, h: 2 },
        availableForRoles: ['admin', 'manager', 'employee'],
    },
    {
        id: 'pending-invoices',
        name: 'Factures en attente',
        description: 'Montant total des factures en attente',
        category: 'stats',
        icon: 'FileText',
        minSize: { w: 2, h: 2 },
        defaultSize: { w: 3, h: 2 },
        availableForRoles: ['admin', 'manager', 'client'],
    },
    {
        id: 'active-projects',
        name: 'Projets actifs',
        description: 'Nombre de projets actuellement actifs',
        category: 'stats',
        icon: 'Briefcase',
        minSize: { w: 2, h: 2 },
        defaultSize: { w: 3, h: 2 },
        availableForRoles: ['admin', 'manager', 'employee', 'client'],
    },
    {
        id: 'time-tracking-chart',
        name: 'Tendance du temps',
        description: 'Graphique des heures trackées',
        category: 'charts',
        icon: 'LineChart',
        minSize: { w: 4, h: 3 },
        defaultSize: { w: 6, h: 4 },
        availableForRoles: ['admin', 'manager', 'employee'],
    },
    {
        id: 'project-distribution',
        name: 'Répartition des projets',
        description: 'Distribution du temps par projet',
        category: 'charts',
        icon: 'PieChart',
        minSize: { w: 4, h: 3 },
        defaultSize: { w: 6, h: 4 },
        availableForRoles: ['admin', 'manager'],
    },
    {
        id: 'monthly-revenue',
        name: 'Revenu mensuel',
        description: 'Facturé vs payé par mois',
        category: 'charts',
        icon: 'BarChart',
        minSize: { w: 6, h: 3 },
        defaultSize: { w: 12, h: 4 },
        availableForRoles: ['admin', 'manager'],
    },
    {
        id: 'recent-activity',
        name: 'Activité récente',
        description: 'Dernières actions sur la plateforme',
        category: 'activity',
        icon: 'Activity',
        minSize: { w: 4, h: 4 },
        defaultSize: { w: 8, h: 5 },
        availableForRoles: ['admin', 'manager', 'employee', 'client'],
    },
    {
        id: 'quick-actions',
        name: 'Actions rapides',
        description: 'Raccourcis vers les actions fréquentes',
        category: 'actions',
        icon: 'Zap',
        minSize: { w: 3, h: 4 },
        defaultSize: { w: 4, h: 5 },
        availableForRoles: ['admin', 'manager', 'employee'],
    },
    {
        id: 'tasks-summary',
        name: 'Résumé des tâches',
        description: 'Vue d\'ensemble de vos tâches',
        category: 'stats',
        icon: 'CheckSquare',
        minSize: { w: 3, h: 3 },
        defaultSize: { w: 4, h: 3 },
        availableForRoles: ['admin', 'manager', 'employee'],
    },
    {
        id: 'client-stats',
        name: 'Statistiques clients',
        description: 'Vue d\'ensemble de vos clients',
        category: 'stats',
        icon: 'Users',
        minSize: { w: 3, h: 3 },
        defaultSize: { w: 4, h: 4 },
        availableForRoles: ['admin', 'manager'],
    },
    {
        id: 'expenses-summary',
        name: 'Résumé des dépenses',
        description: 'Dépenses et tendances',
        category: 'stats',
        icon: 'Wallet',
        minSize: { w: 3, h: 3 },
        defaultSize: { w: 4, h: 4 },
        availableForRoles: ['admin', 'manager'],
    },
    {
        id: 'top-projects',
        name: 'Top projets',
        description: 'Projets principaux avec progression',
        category: 'activity',
        icon: 'Briefcase',
        minSize: { w: 4, h: 4 },
        defaultSize: { w: 6, h: 5 },
        availableForRoles: ['admin', 'manager'],
    },
];

/**
 * Color theme configurations
 */
export const colorThemes: Record<ColorTheme, { primary: string; secondary: string; accent: string }> = {
    blue: {
        primary: 'blue',
        secondary: 'indigo',
        accent: 'sky',
    },
    green: {
        primary: 'green',
        secondary: 'emerald',
        accent: 'teal',
    },
    purple: {
        primary: 'purple',
        secondary: 'violet',
        accent: 'fuchsia',
    },
    orange: {
        primary: 'orange',
        secondary: 'amber',
        accent: 'yellow',
    },
    pink: {
        primary: 'pink',
        secondary: 'rose',
        accent: 'red',
    },
    indigo: {
        primary: 'indigo',
        secondary: 'blue',
        accent: 'cyan',
    },
};

/**
 * Refresh interval options with labels
 */
export const refreshIntervalOptions: { value: RefreshInterval; label: string }[] = [
    { value: 30000, label: '30 secondes' },
    { value: 60000, label: '1 minute' },
    { value: 120000, label: '2 minutes' },
    { value: 300000, label: '5 minutes' },
    { value: 600000, label: '10 minutes' },
    { value: 0, label: 'Jamais' },
];

/**
 * Date range options with labels
 */
export const dateRangeOptions: { value: DateRangeType; label: string }[] = [
    { value: 'today', label: "Aujourd'hui" },
    { value: 'yesterday', label: 'Hier' },
    { value: 'week', label: 'Cette semaine' },
    { value: 'last-week', label: 'Semaine dernière' },
    { value: 'month', label: 'Ce mois' },
    { value: 'last-month', label: 'Mois dernier' },
    { value: 'quarter', label: 'Ce trimestre' },
    { value: 'year', label: 'Cette année' },
    { value: 'custom', label: 'Personnalisé' },
];
