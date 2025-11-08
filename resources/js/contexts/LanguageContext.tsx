import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

interface LanguageContextType {
    language: string;
    changeLanguage: (lng: string) => Promise<void>;
    languages: Array<{ code: string; name: string; nativeName: string }>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

interface LanguageProviderProps {
    children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
    const { i18n } = useTranslation();
    const [language, setLanguage] = useState<string>(i18n.language || 'fr');

    const languages = [
        { code: 'fr', name: 'French', nativeName: 'Français' },
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'es', name: 'Spanish', nativeName: 'Español' },
    ];

    useEffect(() => {
        // Get initial language from localStorage or user preferences
        const savedLanguage = localStorage.getItem('i18nextLng');
        if (savedLanguage && savedLanguage !== language) {
            i18n.changeLanguage(savedLanguage);
            setLanguage(savedLanguage);
        }
    }, []);

    const changeLanguage = async (lng: string) => {
        try {
            await i18n.changeLanguage(lng);
            setLanguage(lng);
            localStorage.setItem('i18nextLng', lng);

            // Update user preference on backend
            const token = localStorage.getItem('auth_token');
            if (token) {
                await axios.patch('/user/preferences', {
                    locale: lng,
                }).catch((error) => {
                    console.error('Failed to update language preference:', error);
                });
            }
        } catch (error) {
            console.error('Failed to change language:', error);
        }
    };

    const value = {
        language,
        changeLanguage,
        languages,
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export default LanguageContext;
