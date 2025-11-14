import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'fr',
        supportedLngs: ['en', 'fr', 'es', 'pt'],
        debug: false,

        interpolation: {
            escapeValue: false, // React already escapes
        },

        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
            // Add cache busting with a version parameter
            queryStringParams: { v: import.meta.env.VITE_APP_VERSION || Date.now().toString() },
        },

        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng',
        },

        react: {
            useSuspense: true,
        },
    });

export default i18n;
