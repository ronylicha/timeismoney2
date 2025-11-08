import React, { useState } from 'react';
import {
    X,
    Layout as LayoutIcon,
    Palette,
    RefreshCw,
    Calendar,
    Eye,
    EyeOff,
    Grid,
    BarChart,
    Zap,
    Activity,
    RotateCcw,
} from 'lucide-react';
import {
    DashboardPreferences,
    WidgetVisibility,
    ColorTheme,
    LayoutType,
    RefreshInterval,
    DateRangeType,
    widgetCatalog,
    colorThemes,
    refreshIntervalOptions,
    dateRangeOptions,
    UserRole,
} from '../../types/dashboard';

interface DashboardSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    preferences: DashboardPreferences;
    onSave: (preferences: DashboardPreferences) => void;
    onReset: () => void;
    userRole: UserRole;
}

const DashboardSettings: React.FC<DashboardSettingsProps> = ({
    isOpen,
    onClose,
    preferences,
    onSave,
    onReset,
    userRole,
}) => {
    const [localPreferences, setLocalPreferences] = useState<DashboardPreferences>(preferences);
    const [activeTab, setActiveTab] = useState<'widgets' | 'layout' | 'appearance' | 'advanced'>(
        'widgets'
    );

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(localPreferences);
        onClose();
    };

    const handleReset = () => {
        onReset();
        onClose();
    };

    const updateLocalPreference = <K extends keyof DashboardPreferences>(
        key: K,
        value: DashboardPreferences[K]
    ) => {
        setLocalPreferences((prev) => ({ ...prev, [key]: value }));
    };

    const toggleWidget = (widgetId: keyof WidgetVisibility) => {
        setLocalPreferences((prev) => ({
            ...prev,
            visibleWidgets: {
                ...prev.visibleWidgets,
                [widgetId]: !prev.visibleWidgets[widgetId],
            },
        }));
    };

    const categoryIcons: Record<string, React.ReactNode> = {
        stats: <BarChart size={16} />,
        charts: <Grid size={16} />,
        activity: <Activity size={16} />,
        actions: <Zap size={16} />,
    };

    // Filter widgets by user role
    const availableWidgets = widgetCatalog.filter((widget) =>
        widget.availableForRoles.includes(userRole)
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                        Paramètres du Dashboard
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X size={24} className="text-gray-600 dark:text-gray-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
                    <button
                        onClick={() => setActiveTab('widgets')}
                        className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                            activeTab === 'widgets'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        <div className="flex items-center space-x-2">
                            <Eye size={18} />
                            <span>Widgets</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('layout')}
                        className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                            activeTab === 'layout'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        <div className="flex items-center space-x-2">
                            <LayoutIcon size={18} />
                            <span>Disposition</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('appearance')}
                        className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                            activeTab === 'appearance'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        <div className="flex items-center space-x-2">
                            <Palette size={18} />
                            <span>Apparence</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('advanced')}
                        className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                            activeTab === 'advanced'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        <div className="flex items-center space-x-2">
                            <RefreshCw size={18} />
                            <span>Avancé</span>
                        </div>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Widgets Tab */}
                    {activeTab === 'widgets' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                                    Sélectionner les widgets à afficher
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                    Activez ou désactivez les widgets que vous souhaitez voir sur
                                    votre dashboard.
                                </p>

                                {['stats', 'charts', 'activity', 'actions'].map((category) => {
                                    const categoryWidgets = availableWidgets.filter(
                                        (w) => w.category === category
                                    );
                                    if (categoryWidgets.length === 0) return null;

                                    return (
                                        <div key={category} className="mb-6">
                                            <div className="flex items-center space-x-2 mb-3">
                                                {categoryIcons[category]}
                                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                                    {category === 'stats' && 'Statistiques'}
                                                    {category === 'charts' && 'Graphiques'}
                                                    {category === 'activity' && 'Activités'}
                                                    {category === 'actions' && 'Actions'}
                                                </h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {categoryWidgets.map((widget) => (
                                                    <div
                                                        key={widget.id}
                                                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                                            localPreferences.visibleWidgets[
                                                                widget.id
                                                            ]
                                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                        }`}
                                                        onClick={() => toggleWidget(widget.id)}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <h5 className="font-medium text-gray-800 dark:text-white">
                                                                    {widget.name}
                                                                </h5>
                                                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                                    {widget.description}
                                                                </p>
                                                            </div>
                                                            {localPreferences.visibleWidgets[
                                                                widget.id
                                                            ] ? (
                                                                <Eye
                                                                    size={20}
                                                                    className="text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2"
                                                                />
                                                            ) : (
                                                                <EyeOff
                                                                    size={20}
                                                                    className="text-gray-400 flex-shrink-0 ml-2"
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Layout Tab */}
                    {activeTab === 'layout' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                                    Disposition du Dashboard
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                    Choisissez une disposition prédéfinie ou créez votre propre
                                    layout personnalisé.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(['default', 'compact', 'analytics'] as LayoutType[]).map(
                                        (layout) => (
                                            <div
                                                key={layout}
                                                onClick={() =>
                                                    updateLocalPreference('layoutType', layout)
                                                }
                                                className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                                                    localPreferences.layoutType === layout
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="font-semibold text-gray-800 dark:text-white">
                                                        {layout === 'default' && 'Par défaut'}
                                                        {layout === 'compact' && 'Compact'}
                                                        {layout === 'analytics' && 'Analytique'}
                                                    </h4>
                                                    {localPreferences.layoutType === layout && (
                                                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                                            <div className="w-2 h-2 bg-white rounded-full"></div>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {layout === 'default' &&
                                                        'Layout complet avec tous les widgets'}
                                                    {layout === 'compact' &&
                                                        'Vue condensée pour écrans plus petits'}
                                                    {layout === 'analytics' &&
                                                        'Focus sur les graphiques et analyses'}
                                                </p>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Appearance Tab */}
                    {activeTab === 'appearance' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                                    Thème de couleur
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                    Personnalisez les couleurs de votre dashboard.
                                </p>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {(
                                        Object.keys(colorThemes) as ColorTheme[]
                                    ).map((theme) => (
                                        <div
                                            key={theme}
                                            onClick={() =>
                                                updateLocalPreference('colorTheme', theme)
                                            }
                                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                                localPreferences.colorTheme === theme
                                                    ? 'border-blue-500'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="flex items-center space-x-3 mb-2">
                                                <div
                                                    className={`w-8 h-8 rounded-full bg-${colorThemes[theme].primary}-500`}
                                                ></div>
                                                <span className="font-medium text-gray-800 dark:text-white capitalize">
                                                    {theme}
                                                </span>
                                            </div>
                                            <div className="flex space-x-1">
                                                <div
                                                    className={`w-6 h-6 rounded bg-${colorThemes[theme].primary}-500`}
                                                ></div>
                                                <div
                                                    className={`w-6 h-6 rounded bg-${colorThemes[theme].secondary}-500`}
                                                ></div>
                                                <div
                                                    className={`w-6 h-6 rounded bg-${colorThemes[theme].accent}-500`}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                                    Options d'affichage
                                </h3>

                                <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div>
                                        <span className="font-medium text-gray-800 dark:text-white">
                                            Message de bienvenue
                                        </span>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Afficher le message de bienvenue personnalisé
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={localPreferences.showWelcomeMessage}
                                        onChange={(e) =>
                                            updateLocalPreference(
                                                'showWelcomeMessage',
                                                e.target.checked
                                            )
                                        }
                                        className="w-5 h-5 text-blue-600"
                                    />
                                </label>

                                <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div>
                                        <span className="font-medium text-gray-800 dark:text-white">
                                            Afficher les tendances
                                        </span>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Voir les pourcentages de variation
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={localPreferences.showTrends}
                                        onChange={(e) =>
                                            updateLocalPreference('showTrends', e.target.checked)
                                        }
                                        className="w-5 h-5 text-blue-600"
                                    />
                                </label>

                                <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div>
                                        <span className="font-medium text-gray-800 dark:text-white">
                                            Animations
                                        </span>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Activer les animations et transitions
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={localPreferences.animationsEnabled}
                                        onChange={(e) =>
                                            updateLocalPreference(
                                                'animationsEnabled',
                                                e.target.checked
                                            )
                                        }
                                        className="w-5 h-5 text-blue-600"
                                    />
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Advanced Tab */}
                    {activeTab === 'advanced' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
                                    <RefreshCw size={20} className="mr-2" />
                                    Intervalle de rafraîchissement
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Fréquence de mise à jour automatique des données
                                </p>

                                <select
                                    value={localPreferences.refreshInterval}
                                    onChange={(e) =>
                                        updateLocalPreference(
                                            'refreshInterval',
                                            Number(e.target.value) as RefreshInterval
                                        )
                                    }
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                                >
                                    {refreshIntervalOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
                                    <Calendar size={20} className="mr-2" />
                                    Période par défaut
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Plage de dates utilisée par défaut pour les graphiques
                                </p>

                                <select
                                    value={localPreferences.defaultDateRange}
                                    onChange={(e) =>
                                        updateLocalPreference(
                                            'defaultDateRange',
                                            e.target.value as DateRangeType
                                        )
                                    }
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                                >
                                    {dateRangeOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={handleReset}
                        className="flex items-center px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        <RotateCcw size={18} className="mr-2" />
                        Réinitialiser
                    </button>
                    <div className="flex space-x-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Enregistrer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardSettings;
