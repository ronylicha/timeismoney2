import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/solid';

export const LanguageSelector: React.FC = () => {
    const { language, changeLanguage, languages } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLanguageChange = (code: string) => {
        changeLanguage(code);
        setIsOpen(false);
    };

    const currentLanguage = languages.find(lang => lang.code === language);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Select language"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <GlobeAltIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <span className="hidden sm:inline-block">{currentLanguage?.nativeName}</span>
                <span className="sm:hidden">{currentLanguage?.code.toUpperCase()}</span>
                <ChevronDownIcon
                    className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {isOpen && (
                <div className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none animate-fadeIn">
                    <div className="py-1" role="listbox" aria-label="Language options">
                        {languages.map((lang) => {
                            const isSelected = lang.code === language;
                            return (
                                <button
                                    key={lang.code}
                                    type="button"
                                    className={`
                                        w-full text-left px-4 py-2 text-sm flex items-center justify-between
                                        transition-colors duration-150
                                        ${isSelected
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }
                                    `}
                                    onClick={() => handleLanguageChange(lang.code)}
                                    role="option"
                                    aria-selected={isSelected}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg" role="img" aria-label={`${lang.nativeName} flag`}>
                                            {lang.flag}
                                        </span>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{lang.nativeName}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {lang.name}
                                            </span>
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <CheckIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LanguageSelector;