/**
 * Time utility functions for the Time Is Money application
 */

/**
 * Format duration from seconds to human-readable format
 * @param seconds - Duration in seconds
 * @returns Formatted time string (HH:MM:SS)
 */
export function formatDuration(seconds: number): string {
    if (seconds < 0 || !Number.isFinite(seconds)) {
        return '00:00:00';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return [hours, minutes, secs]
        .map(unit => unit.toString().padStart(2, '0'))
        .join(':');
}

/**
 * Format duration from seconds to hours with decimal
 * @param seconds - Duration in seconds
 * @returns Hours with two decimal places (e.g., "2.50")
 */
export function formatHours(seconds: number): string {
    if (seconds < 0 || !Number.isFinite(seconds)) {
        return '0.00';
    }

    const hours = seconds / 3600;
    return hours.toFixed(2);
}

/**
 * Parse duration string to seconds
 * @param duration - Duration string in format "HH:MM:SS" or "HH:MM"
 * @returns Duration in seconds
 */
export function parseDuration(duration: string): number {
    const parts = duration.split(':').map(Number);

    if (parts.length === 3) {
        const [hours, minutes, seconds] = parts;
        return hours * 3600 + minutes * 60 + seconds;
    } else if (parts.length === 2) {
        const [hours, minutes] = parts;
        return hours * 3600 + minutes * 60;
    }

    return 0;
}

/**
 * Format date to ISO string for API
 * @param date - Date object or string
 * @returns ISO date string (YYYY-MM-DD)
 */
export function formatDateForApi(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
}

/**
 * Format date to localized string
 * @param date - Date object or string
 * @param locale - Locale string (default: 'fr-FR')
 * @returns Localized date string
 */
export function formatDate(date: Date | string, locale: string = 'fr-FR'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

/**
 * Format date and time to localized string
 * @param date - Date object or string
 * @param locale - Locale string (default: 'fr-FR')
 * @returns Localized date and time string
 */
export function formatDateTime(date: Date | string, locale: string = 'fr-FR'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Format time to localized string
 * @param date - Date object or string
 * @param locale - Locale string (default: 'fr-FR')
 * @returns Localized time string
 */
export function formatTime(date: Date | string, locale: string = 'fr-FR'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Get start of day
 * @param date - Date object or string
 * @returns Date object set to start of day
 */
export function startOfDay(date: Date | string = new Date()): Date {
    const d = typeof date === 'string' ? new Date(date) : new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Get end of day
 * @param date - Date object or string
 * @returns Date object set to end of day
 */
export function endOfDay(date: Date | string = new Date()): Date {
    const d = typeof date === 'string' ? new Date(date) : new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

/**
 * Get start of week (Monday)
 * @param date - Date object or string
 * @returns Date object set to start of week
 */
export function startOfWeek(date: Date | string = new Date()): Date {
    const d = typeof date === 'string' ? new Date(date) : new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    return new Date(d.setDate(diff));
}

/**
 * Get end of week (Sunday)
 * @param date - Date object or string
 * @returns Date object set to end of week
 */
export function endOfWeek(date: Date | string = new Date()): Date {
    const start = startOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
}

/**
 * Get start of month
 * @param date - Date object or string
 * @returns Date object set to start of month
 */
export function startOfMonth(date: Date | string = new Date()): Date {
    const d = typeof date === 'string' ? new Date(date) : new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Get end of month
 * @param date - Date object or string
 * @returns Date object set to end of month
 */
export function endOfMonth(date: Date | string = new Date()): Date {
    const d = typeof date === 'string' ? new Date(date) : new Date(date);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Add days to a date
 * @param date - Date object or string
 * @param days - Number of days to add (can be negative)
 * @returns New date object
 */
export function addDays(date: Date | string, days: number): Date {
    const d = typeof date === 'string' ? new Date(date) : new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

/**
 * Check if a date is today
 * @param date - Date object or string
 * @returns True if date is today
 */
export function isToday(date: Date | string): boolean {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
    );
}

/**
 * Check if a date is in the past
 * @param date - Date object or string
 * @returns True if date is in the past
 */
export function isPast(date: Date | string): boolean {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d < new Date();
}

/**
 * Check if a date is in the future
 * @param date - Date object or string
 * @returns True if date is in the future
 */
export function isFuture(date: Date | string): boolean {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d > new Date();
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 * @param date - Date object or string
 * @param locale - Locale string (default: 'fr-FR')
 * @returns Relative time string
 */
export function getRelativeTime(date: Date | string, locale: string = 'fr-FR'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (Math.abs(diffDay) >= 1) {
        return rtf.format(diffDay, 'day');
    } else if (Math.abs(diffHour) >= 1) {
        return rtf.format(diffHour, 'hour');
    } else if (Math.abs(diffMin) >= 1) {
        return rtf.format(diffMin, 'minute');
    } else {
        return rtf.format(diffSec, 'second');
    }
}

/**
 * Calculate business days between two dates (excluding weekends)
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of business days
 */
export function getBusinessDays(startDate: Date | string, endDate: Date | string): number {
    const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
    const end = typeof endDate === 'string' ? new Date(endDate) : new Date(endDate);

    let count = 0;
    const current = new Date(start);

    while (current <= end) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }

    return count;
}

/**
 * Format duration for display in timesheet
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "8h 30m")
 */
export function formatTimesheetDuration(seconds: number): string {
    if (seconds < 0 || !Number.isFinite(seconds)) {
        return '0m';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours === 0) {
        return `${minutes}m`;
    } else if (minutes === 0) {
        return `${hours}h`;
    } else {
        return `${hours}h ${minutes}m`;
    }
}