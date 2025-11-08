import { useState, useEffect, useCallback } from 'react';
import { Layout } from 'react-grid-layout';
import {
    DashboardPreferences,
    WidgetVisibility,
    ColorTheme,
    LayoutType,
    RefreshInterval,
    DateRangeType,
    UserRole,
    defaultPreferencesByRole,
} from '../types/dashboard';
import { defaultLayout, getLayoutByName } from '../components/Dashboard/defaultLayouts';

const STORAGE_KEY = 'dashboard-preferences';

/**
 * Hook to manage dashboard preferences
 */
export const useDashboardPreferences = (userId: number, userRole: UserRole) => {
    const [preferences, setPreferences] = useState<DashboardPreferences>(() => {
        return getDefaultPreferences(userId, userRole);
    });

    const [isLoading, setIsLoading] = useState(true);

    // Load preferences from localStorage on mount
    useEffect(() => {
        loadPreferences();
    }, [userId]);

    // Load preferences
    const loadPreferences = useCallback(() => {
        try {
            const stored = localStorage.getItem(`${STORAGE_KEY}-${userId}`);
            if (stored) {
                const parsed = JSON.parse(stored) as DashboardPreferences;
                setPreferences(parsed);
            } else {
                setPreferences(getDefaultPreferences(userId, userRole));
            }
        } catch (error) {
            console.error('Failed to load dashboard preferences:', error);
            setPreferences(getDefaultPreferences(userId, userRole));
        } finally {
            setIsLoading(false);
        }
    }, [userId, userRole]);

    // Save preferences to localStorage
    const savePreferences = useCallback(
        (newPreferences: DashboardPreferences) => {
            try {
                localStorage.setItem(
                    `${STORAGE_KEY}-${userId}`,
                    JSON.stringify(newPreferences)
                );
                setPreferences(newPreferences);
            } catch (error) {
                console.error('Failed to save dashboard preferences:', error);
            }
        },
        [userId]
    );

    // Update specific preference
    const updatePreference = useCallback(
        <K extends keyof DashboardPreferences>(
            key: K,
            value: DashboardPreferences[K]
        ) => {
            const newPreferences = { ...preferences, [key]: value };
            savePreferences(newPreferences);
        },
        [preferences, savePreferences]
    );

    // Toggle widget visibility
    const toggleWidget = useCallback(
        (widgetId: keyof WidgetVisibility) => {
            const newVisibility = {
                ...preferences.visibleWidgets,
                [widgetId]: !preferences.visibleWidgets[widgetId],
            };
            updatePreference('visibleWidgets', newVisibility);
        },
        [preferences, updatePreference]
    );

    // Set layout type
    const setLayoutType = useCallback(
        (layoutType: LayoutType) => {
            updatePreference('layoutType', layoutType);
            if (layoutType !== 'custom') {
                updatePreference('customLayout', undefined);
            }
        },
        [updatePreference]
    );

    // Set custom layout
    const setCustomLayout = useCallback(
        (layout: Layout[]) => {
            updatePreference('customLayout', layout);
            updatePreference('layoutType', 'custom');
        },
        [updatePreference]
    );

    // Set color theme
    const setColorTheme = useCallback(
        (theme: ColorTheme) => {
            updatePreference('colorTheme', theme);
        },
        [updatePreference]
    );

    // Set refresh interval
    const setRefreshInterval = useCallback(
        (interval: RefreshInterval) => {
            updatePreference('refreshInterval', interval);
        },
        [updatePreference]
    );

    // Set date range
    const setDateRange = useCallback(
        (range: DateRangeType) => {
            updatePreference('defaultDateRange', range);
        },
        [updatePreference]
    );

    // Reset to default preferences
    const resetPreferences = useCallback(() => {
        const defaultPrefs = getDefaultPreferences(userId, userRole);
        savePreferences(defaultPrefs);
    }, [userId, userRole, savePreferences]);

    // Get current layout
    const getCurrentLayout = useCallback((): Layout[] => {
        if (preferences.layoutType === 'custom' && preferences.customLayout) {
            return preferences.customLayout;
        }
        return getLayoutByName(preferences.layoutType);
    }, [preferences]);

    // Get visible widgets
    const getVisibleWidgets = useCallback((): (keyof WidgetVisibility)[] => {
        return Object.entries(preferences.visibleWidgets)
            .filter(([_, visible]) => visible)
            .map(([id]) => id as keyof WidgetVisibility);
    }, [preferences]);

    return {
        preferences,
        isLoading,
        updatePreference,
        toggleWidget,
        setLayoutType,
        setCustomLayout,
        setColorTheme,
        setRefreshInterval,
        setDateRange,
        resetPreferences,
        getCurrentLayout,
        getVisibleWidgets,
        savePreferences,
    };
};

/**
 * Get default preferences for a user
 */
function getDefaultPreferences(userId: number, role: UserRole): DashboardPreferences {
    const roleDefaults = defaultPreferencesByRole[role];

    return {
        userId,
        role,
        layoutType: roleDefaults.layoutType || 'default',
        visibleWidgets:
            roleDefaults.visibleWidgets ||
            defaultPreferencesByRole.admin.visibleWidgets!,
        colorTheme: roleDefaults.colorTheme || 'blue',
        refreshInterval: roleDefaults.refreshInterval || 60000,
        defaultDateRange: roleDefaults.defaultDateRange || 'week',
        showWelcomeMessage: roleDefaults.showWelcomeMessage ?? true,
        compactMode: roleDefaults.compactMode ?? false,
        showTrends: roleDefaults.showTrends ?? true,
        animationsEnabled: roleDefaults.animationsEnabled ?? true,
    };
}
