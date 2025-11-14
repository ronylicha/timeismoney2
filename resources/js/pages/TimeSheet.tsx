import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Download,
    Play,
    Edit2,
    Trash2
} from 'lucide-react';
import { TimeEntry, Project } from '../types';
import {
    formatDuration,
    formatDate,
    formatTime,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    addDays,
    formatDateForApi
} from '../utils/time';
import { useTimer } from '../hooks/useTimer';

import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import ProjectSearchSelectSimple from '../components/ProjectSearchSelectSimple';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOffline } from '@/contexts/OfflineContext';

type ViewMode = 'day' | 'week' | 'month';

interface TimeSheetData {
    entries: TimeEntry[];
    totals: {
        total_duration: number;
        billable_duration: number;
        non_billable_duration: number;
        total_amount: number;
    };
    by_project: Record<string, {
        project: Project;
        duration: number;
        amount: number;
        entries: TimeEntry[];
    }>;
    by_date: Record<string, TimeEntry[]>;
}

const TimeSheet: React.FC = () => {
    const { t } = useTranslation();
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedProject, setSelectedProject] = useState<string>('');
    const [showBillableOnly, setShowBillableOnly] = useState(false);
    const { startTimer } = useTimer();
    const isOnline = useOnlineStatus();
    const { getOfflineData } = useOffline();
    const [offlineTimesheet, setOfflineTimesheet] = useState<TimeSheetData | null>(null);
    const [offlineLoading, setOfflineLoading] = useState(false);
    const [offlineEntriesCache, setOfflineEntriesCache] = useState<TimeEntry[]>([]);

    // Calculate date range based on view mode
    const getDateRange = () => {
        let startDate: Date;
        let endDate: Date;

        switch (viewMode) {
            case 'day':
                startDate = new Date(currentDate);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(currentDate);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'week':
                startDate = startOfWeek(currentDate);
                endDate = endOfWeek(currentDate);
                break;
            case 'month':
                startDate = startOfMonth(currentDate);
                endDate = endOfMonth(currentDate);
                break;
        }

        return { startDate, endDate };
    };

    const { startDate, endDate } = getDateRange();

    // Fetch timesheet data
    const { data, isLoading, refetch } = useQuery<TimeSheetData>({
        queryKey: ['timesheet', startDate, endDate, selectedProject, showBillableOnly],
        queryFn: async () => {
            const params = new URLSearchParams({
                start_date: formatDateForApi(startDate),
                end_date: formatDateForApi(endDate),
                ...(selectedProject && { project_id: selectedProject }),
                ...(showBillableOnly && { billable_only: 'true' }),
            });

            const response = await axios.get(`/time-entries/timesheet?${params}`);
            return response.data;
        },
        enabled: isOnline,
    });

    useEffect(() => {
        if (isOnline) {
            setOfflineEntriesCache([]);
            setOfflineTimesheet(null);
            setOfflineLoading(false);
            return;
        }

        let cancelled = false;
        setOfflineLoading(true);
        getOfflineData('timeEntries')
            .then((entries) => {
                if (cancelled) return;
                const normalized: TimeEntry[] = Array.isArray(entries) ? entries : entries ? [entries] : [];
                setOfflineEntriesCache(normalized);
            })
            .catch((error) => {
                if (import.meta.env.DEV) {
                    console.warn('Failed to load offline time entries', error);
                }
                if (!cancelled) {
                    setOfflineEntriesCache([]);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setOfflineLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [isOnline, getOfflineData]);

    useEffect(() => {
        if (isOnline) {
            return;
        }
        if (typeof window === 'undefined') {
            return;
        }

        const compute = () => {
            const filtered = offlineEntriesCache.filter((entry) => {
                const startedAt = entry.started_at ? new Date(entry.started_at) : null;
                if (!startedAt) return false;
                if (startedAt < startDate || startedAt > endDate) {
                    return false;
                }
                if (selectedProject && String(entry.project_id) !== selectedProject) {
                    return false;
                }
                if (showBillableOnly && !entry.is_billable) {
                    return false;
                }
                return true;
            });
            setOfflineTimesheet(buildOfflineTimesheet(filtered));
        };

        let handle: number | null = null;
        if ('requestIdleCallback' in window) {
            handle = (window as any).requestIdleCallback(compute);
            return () => {
                if (handle && (window as any).cancelIdleCallback) {
                    (window as any).cancelIdleCallback(handle);
                }
            };
        }

        handle = window.setTimeout(compute, 0);
        return () => {
            if (handle) {
                clearTimeout(handle);
            }
        };
    }, [isOnline, offlineEntriesCache, startDate, endDate, selectedProject, showBillableOnly]);

    const resolvedData = isOnline ? data : offlineTimesheet;
    const isDataLoading = isOnline ? isLoading : offlineLoading;

    // Navigation functions
    const navigatePrevious = () => {
        switch (viewMode) {
            case 'day':
                setCurrentDate(addDays(currentDate, -1));
                break;
            case 'week':
                setCurrentDate(addDays(currentDate, -7));
                break;
            case 'month':
                setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
                break;
        }
    };

    const navigateNext = () => {
        switch (viewMode) {
            case 'day':
                setCurrentDate(addDays(currentDate, 1));
                break;
            case 'week':
                setCurrentDate(addDays(currentDate, 7));
                break;
            case 'month':
                setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
                break;
        }
    };

    const navigateToday = () => {
        setCurrentDate(new Date());
    };

    // Export timesheet
    const exportTimesheet = async (format: 'csv' | 'pdf' | 'excel' | 'json') => {
        if (!isOnline) {
            toast.info(
                t('time.exportOfflineWarning') ||
                'L’export est indisponible hors ligne. Reconnectez-vous pour générer ce fichier.'
            );
            return;
        }

        try {
            const params = new URLSearchParams({
                start_date: formatDateForApi(startDate),
                end_date: formatDateForApi(endDate),
                ...(selectedProject && { project_id: selectedProject }),
                ...(showBillableOnly && { billable_only: 'true' }),
            });

            let response;
            let filename;

            if (format === 'excel') {
                // Use the new Excel export endpoint
                response = await axios.get(`/time-entries/export/excel?${params}`, {
                    responseType: 'blob',
                });
                filename = `timesheet_${formatDateForApi(startDate)}_${formatDateForApi(endDate)}.xlsx`;
            } else {
                // Use the existing export endpoint for other formats
                params.append('format', format);
                response = await axios.get(`/time-entries/export?${params}`, {
                    responseType: 'blob',
                });
                filename = `timesheet_${formatDateForApi(startDate)}_${formatDateForApi(endDate)}.${format}`;
            }

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();

            toast.success(t('time.exportSuccess'));
        } catch (error) {
            toast.error(t('time.exportError'));
        }
    };

    // Delete time entry
    const deleteEntry = async (id: string) => {
        if (!confirm(t('time.confirmDelete'))) {
            return;
        }

        try {
            await axios.delete(`/time-entries/${id}`);
            toast.success(t('time.deleteSuccess'));
            if (isOnline) {
                refetch();
            } else {
                setOfflineTimesheet((prev) => {
                    if (!prev) return prev;
                    const remaining = prev.entries.filter((entry) => {
                        const entryId = String(entry.id || entry.local_id);
                        return entryId !== String(id);
                    });
                    return buildOfflineTimesheet(remaining);
                });
            }
        } catch (error) {
            toast.error(t('time.deleteError'));
        } finally {
            if (!isOnline) {
                toast.info(
                    t('time.offlineDeleteInfo') ||
                    'La suppression sera synchronisée lors du prochain retour en ligne.'
                );
            }
        }
    };

    // Continue timer from existing entry
    const continueTimer = async (entry: TimeEntry) => {
        await startTimer({
            project_id: entry.project_id,
            task_id: entry.task_id || undefined,
            description: entry.description || '',
            is_billable: entry.is_billable,
        });
    };

    // Get current locale for date formatting
    const getCurrentLocale = () => {
        const lang = t('common.locale') || 'fr';
        const localeMap: Record<string, string> = {
            'fr': 'fr-FR',
            'en': 'en-US',
            'es': 'es-ES',
            'pt': 'pt-BR'
        };
        return localeMap[lang] || 'fr-FR';
    };

    // Get formatted date range title
    const getDateRangeTitle = () => {
        const locale = getCurrentLocale();
        switch (viewMode) {
            case 'day':
                return formatDate(currentDate, locale);
            case 'week':
                return `${formatDate(startDate, locale)} - ${formatDate(endDate, locale)}`;
            case 'month':
                return currentDate.toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'long'
                });
        }
    };

    // Render day view
    const renderDayView = () => {
        const entries = resolvedData?.by_date?.[formatDateForApi(currentDate)] || [];
        const locale = getCurrentLocale();

        return (
            <div className="space-y-4">
                {entries.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        {t('time.noEntriesDay')}
                    </div>
                ) : (
                    entries.map((entry) => (
                        <div
                            key={entry.id}
                            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-4 mb-2">
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                            {entry.project?.name}
                                        </span>
                                        {entry.task && (
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {entry.task.title}
                                            </span>
                                        )}
                                        {entry.is_billable && (
                                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                                {t('time.billable')}
                                            </span>
                                        )}
                                    </div>
                                    {entry.description && (
                                        <p className="text-gray-700 dark:text-gray-300 mb-2">
                                            {entry.description}
                                        </p>
                                    )}
                                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                                        <span>
                                            {formatTime(entry.started_at, locale)} - {entry.ended_at ? formatTime(entry.ended_at, locale) : t('time.running')}
                                        </span>
                                        <span className="font-mono">
                                            {formatDuration(entry.duration_seconds || 0)}
                                        </span>
                                        {entry.is_billable && (
                                            <span>
                                                €{((entry.duration_seconds || 0) / 3600 * entry.hourly_rate).toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => continueTimer(entry)}
                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                        title={t('time.continueTimer')}
                                    >
                                        <Play size={18} />
                                    </button>
                                    <button
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title={t('time.editEntry')}
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => deleteEntry(entry.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title={t('time.deleteEntry')}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        );
    };

    // Render week view
    const renderWeekView = () => {
        const days = [];
        const current = new Date(startDate);
        const locale = getCurrentLocale();

        for (let i = 0; i < 7; i++) {
            const date = new Date(current);
            const dateStr = formatDateForApi(date);
            const entries = resolvedData?.by_date?.[dateStr] || [];
            const totalDuration = entries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);

            days.push({
                date,
                dateStr,
                entries,
                totalDuration,
            });

            current.setDate(current.getDate() + 1);
        }

        return (
            <div className="grid grid-cols-7 gap-4">
                {days.map((day) => (
                    <div
                        key={day.dateStr}
                        className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm"
                    >
                        <div className="text-center mb-3">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {(() => {
                                    const dayIndex = day.date.getDay();
                                    const weekdayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                                    return t(`time.weekdays.${weekdayKeys[dayIndex]}`);
                                })()}
                            </div>
                            <div className="text-xl font-semibold text-gray-900 dark:text-white">
                                {day.date.getDate()}
                            </div>
                            {day.totalDuration > 0 && (
                                <div className="text-sm font-mono text-gray-700 dark:text-gray-300">
                                    {formatDuration(day.totalDuration)}
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            {day.entries.slice(0, 3).map((entry) => (
                                <div
                                    key={entry.id}
                                    className="text-xs p-2 bg-gray-50 dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                                    title={entry.description || entry.project?.name}
                                >
                                    <div className="font-medium text-gray-800 dark:text-gray-200 truncate">
                                        {entry.project?.name}
                                    </div>
                                    <div className="text-gray-600 dark:text-gray-400">
                                        {formatDuration(entry.duration_seconds || 0)}
                                    </div>
                                </div>
                            ))}
                            {day.entries.length > 3 && (
                                <div className="text-xs text-center text-gray-500 dark:text-gray-400">
                                    +{day.entries.length - 3} {t('time.more')}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // Render month view
    const renderMonthView = () => {
        // Group by project for month view
        const projectData = resolvedData?.by_project || {};
        const locale = getCurrentLocale();

        if (Object.keys(projectData).length === 0) {
            return (
                <div className="text-center py-8 text-gray-500">
                    {t('time.noEntriesDay')}
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {Object.entries(projectData).map(([projectId, projectInfo]) => (
                    <div
                        key={projectId}
                        className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {projectInfo.project.name}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm">
                                <span className="font-mono text-gray-700 dark:text-gray-300">
                                    {formatDuration(projectInfo.duration)}
                                </span>
                                <span className="font-semibold text-green-600">
                                    €{projectInfo.amount.toFixed(2)}
                                </span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {projectInfo.entries.slice(0, 5).map((entry) => (
                                <div
                                    key={entry.id}
                                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                                >
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-800 dark:text-gray-200">
                                            {formatDate(entry.started_at ? new Date(entry.started_at) : new Date(), locale)}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            {entry.description || t('time.noDescription')}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-mono text-sm text-gray-700 dark:text-gray-300">
                                            {formatDuration(entry.duration_seconds || 0)}
                                        </div>
                                        {entry.is_billable && (
                                            <div className="text-xs text-green-600">
                                                €{((entry.duration_seconds || 0) / 3600 * entry.hourly_rate).toFixed(2)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {projectInfo.entries.length > 5 && (
                                <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                                    +{projectInfo.entries.length - 5} {t('time.more')}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
                        <Calendar className="mr-2" />
                        {t('time.timesheet')}
                    </h1>
                    <div className="flex items-center space-x-4">
                        {/* View mode selector */}
                        <div className="flex rounded-lg border border-gray-300 dark:border-gray-600">
                            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-4 py-2 capitalize ${
                                        viewMode === mode
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                    } ${
                                        mode === 'day' ? 'rounded-l-lg' : ''
                                    } ${
                                        mode === 'month' ? 'rounded-r-lg' : ''
                                    } transition-colors`}
                                >
                                    {t(`time.${mode}`)}
                                </button>
                            ))}
                        </div>

                        {/* Export buttons */}
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => exportTimesheet('json')}
                                className={`p-2 rounded-lg transition-colors ${
                                    isOnline
                                        ? 'text-gray-600 hover:bg-gray-100'
                                        : 'text-gray-400 cursor-not-allowed'
                                }`}
                                disabled={!isOnline}
                                title={t('time.exportJSON')}
                            >
                                <Download size={20} />
                            </button>
                            <button
                                onClick={() => exportTimesheet('excel')}
                                className={`p-2 rounded-lg transition-colors ${
                                    isOnline
                                        ? 'text-green-600 hover:bg-green-50'
                                        : 'text-green-300 cursor-not-allowed'
                                }`}
                                disabled={!isOnline}
                                title={t('time.exportExcel')}
                            >
                                <Download size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {!isOnline && (
                    <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 border border-amber-200">
                        {t('time.offlineTimesheetInfo') ||
                            'Mode hors ligne : les exports et rafraîchissements automatiques sont désactivés. Vos suppressions ou ajouts seront synchronisés dès que la connexion reviendra.'}
                    </div>
                )}

                {/* Navigation and filters */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={navigatePrevious}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={navigateToday}
                            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            {t('time.today')}
                        </button>
                        <button
                            onClick={navigateNext}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                        <span className="ml-4 text-lg font-medium text-gray-800 dark:text-white">
                            {getDateRangeTitle()}
                        </span>
                    </div>

                    <div className="flex items-center space-x-4">
                        {/* Project filter */}
                        <ProjectSearchSelectSimple
                            value={selectedProject}
                            onChange={setSelectedProject}
                            placeholder={t('time.allProjects')}
                        />

                        {/* Billable filter */}
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showBillableOnly}
                                onChange={(e) => setShowBillableOnly(e.target.checked)}
                                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                {t('time.billableOnly')}
                            </span>
                        </label>
                    </div>
                </div>

                {/* Summary stats */}
                {resolvedData && resolvedData.totals && (
                    <div className="grid grid-cols-4 gap-4 mt-6">
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                            <div className="text-sm text-gray-600 dark:text-gray-400">{t('time.totalTime')}</div>
                            <div className="text-xl font-semibold text-gray-900 dark:text-white">
                                {formatDuration(resolvedData.totals?.total_duration || 0)}
                            </div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                            <div className="text-sm text-green-600 dark:text-green-400">{t('time.billable')}</div>
                            <div className="text-xl font-semibold text-green-700 dark:text-green-300">
                                {formatDuration(resolvedData.totals?.billable_duration || 0)}
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                            <div className="text-sm text-gray-600 dark:text-gray-400">{t('time.nonBillable')}</div>
                            <div className="text-xl font-semibold text-gray-900 dark:text-white">
                                {formatDuration(resolvedData.totals?.non_billable_duration || 0)}
                            </div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                            <div className="text-sm text-blue-600 dark:text-blue-400">{t('time.totalAmount')}</div>
                            <div className="text-xl font-semibold text-blue-700 dark:text-blue-300">
                                €{(resolvedData.totals?.total_amount || 0).toFixed(2)}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                {isDataLoading ? (
                    <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                    </div>
                ) : (
                    <>
                        {viewMode === 'day' && renderDayView()}
                        {viewMode === 'week' && renderWeekView()}
                        {viewMode === 'month' && renderMonthView()}
                    </>
                )}
            </div>
        </div>
    );
};

export default TimeSheet;

function buildOfflineTimesheet(entries: TimeEntry[]): TimeSheetData {
    const totals = {
        total_duration: 0,
        billable_duration: 0,
        non_billable_duration: 0,
        total_amount: 0,
    };

    const by_project: TimeSheetData['by_project'] = {};
    const by_date: TimeSheetData['by_date'] = {};

    entries.forEach((entry) => {
        const duration = entry.duration_seconds || (entry as any).duration || 0;
        const hourlyRate = entry.hourly_rate || 0;
        totals.total_duration += duration;
        if (entry.is_billable) {
            totals.billable_duration += duration;
            totals.total_amount += (duration / 3600) * hourlyRate;
        } else {
            totals.non_billable_duration += duration;
        }

        const projectKey = entry.project?.id
            ? String(entry.project.id)
            : entry.project_id
                ? String(entry.project_id)
                : String(entry.id);

        if (!by_project[projectKey]) {
            by_project[projectKey] = {
                project: entry.project || ({
                    id: entry.project_id,
                    name: entry.project?.name || 'Projet hors ligne',
                } as Project),
                duration: 0,
                amount: 0,
                entries: [],
            };
        }
        by_project[projectKey].duration += duration;
        if (entry.is_billable) {
            by_project[projectKey].amount += (duration / 3600) * hourlyRate;
        }
        by_project[projectKey].entries.push(entry);

        const dateKey = entry.started_at
            ? formatDateForApi(new Date(entry.started_at))
            : entry.ended_at
                ? formatDateForApi(new Date(entry.ended_at))
                : `offline-${projectKey}`;
        if (!by_date[dateKey]) {
            by_date[dateKey] = [];
        }
        by_date[dateKey].push(entry);
    });

    return {
        entries,
        totals,
        by_project,
        by_date,
    };
}
