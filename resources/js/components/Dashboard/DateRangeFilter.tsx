import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { DateRangeType, dateRangeOptions, CustomDateRange } from '../../types/dashboard';

interface DateRangeFilterProps {
    value: DateRangeType;
    customRange?: CustomDateRange;
    onChange: (range: DateRangeType, customRange?: CustomDateRange) => void;
    className?: string;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
    value,
    customRange,
    onChange,
    className = '',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showCustom, setShowCustom] = useState(value === 'custom');
    const [customStart, setCustomStart] = useState(customRange?.start || '');
    const [customEnd, setCustomEnd] = useState(customRange?.end || '');

    const selectedOption = dateRangeOptions.find((opt) => opt.value === value);

    const handleSelect = (range: DateRangeType) => {
        if (range === 'custom') {
            setShowCustom(true);
        } else {
            onChange(range);
            setIsOpen(false);
            setShowCustom(false);
        }
    };

    const handleCustomApply = () => {
        if (customStart && customEnd) {
            onChange('custom', { start: customStart, end: customEnd });
            setIsOpen(false);
            setShowCustom(false);
        }
    };

    return (
        <div className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
                <Calendar size={18} className="text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {selectedOption?.label || 'Sélectionner une période'}
                </span>
                <ChevronDown
                    size={16}
                    className={`text-gray-600 dark:text-gray-400 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>

                    {/* Menu */}
                    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                        {!showCustom ? (
                            <div className="p-2">
                                {dateRangeOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => handleSelect(option.value)}
                                        className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                                            value === option.value
                                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4">
                                <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">
                                    Période personnalisée
                                </h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                            Date de début
                                        </label>
                                        <input
                                            type="date"
                                            value={customStart}
                                            onChange={(e) => setCustomStart(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                            Date de fin
                                        </label>
                                        <input
                                            type="date"
                                            value={customEnd}
                                            onChange={(e) => setCustomEnd(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm"
                                        />
                                    </div>
                                    <div className="flex space-x-2 pt-2">
                                        <button
                                            onClick={() => {
                                                setShowCustom(false);
                                                setCustomStart('');
                                                setCustomEnd('');
                                            }}
                                            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                            Retour
                                        </button>
                                        <button
                                            onClick={handleCustomApply}
                                            disabled={!customStart || !customEnd}
                                            className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                        >
                                            Appliquer
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default DateRangeFilter;
