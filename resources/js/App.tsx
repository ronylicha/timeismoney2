import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ToastContainer } from 'react-toastify';
import { I18nextProvider } from 'react-i18next';
import 'react-toastify/dist/ReactToastify.css';

// i18n configuration
import i18n from './i18n/config';

// Layout Components (keep eagerly loaded for better UX)
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth Components (keep eagerly loaded for better UX)
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import TwoFactorAuth from './pages/auth/TwoFactorAuth';

// Lazy load all other pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const TimeTracking = lazy(() => import('./pages/TimeTracking'));
const TimeSheet = lazy(() => import('./pages/TimeSheet'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const CreateProject = lazy(() => import('./pages/CreateProject'));
const EditProject = lazy(() => import('./pages/EditProject'));
const Tasks = lazy(() => import('./pages/Tasks'));
const KanbanBoard = lazy(() => import('./pages/KanbanBoard'));
const Clients = lazy(() => import('./pages/Clients'));
const ClientDetail = lazy(() => import('./pages/ClientDetail'));
const CreateClient = lazy(() => import('./pages/CreateClient'));
const EditClient = lazy(() => import('./pages/EditClient'));
const Invoices = lazy(() => import('./pages/Invoices'));
const InvoiceDetail = lazy(() => import('./pages/InvoiceDetail'));
const CreateInvoice = lazy(() => import('./pages/CreateInvoice'));
const Quotes = lazy(() => import('./pages/Quotes'));
const QuoteDetail = lazy(() => import('./pages/QuoteDetail'));
const CreateQuote = lazy(() => import('./pages/CreateQuote'));
const Expenses = lazy(() => import('./pages/Expenses'));
const CreateExpense = lazy(() => import('./pages/CreateExpense'));
const ExpenseCategories = lazy(() => import('./pages/ExpenseCategories'));
const Reports = lazy(() => import('./pages/Reports'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));
const TenantBillingSettings = lazy(() => import('./pages/TenantBillingSettings'));
const Profile = lazy(() => import('./pages/Profile'));
const TeamManagement = lazy(() => import('./pages/TeamManagement'));
const Integrations = lazy(() => import('./pages/Integrations'));
const NotificationCenter = lazy(() => import('./pages/NotificationCenter'));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/Admin/UserManagement'));
const AdminTenants = lazy(() => import('./pages/Admin/TenantManagement'));
const AdminSettings = lazy(() => import('./pages/Admin/SystemSettings'));
const AdminAuditLogs = lazy(() => import('./pages/Admin/AuditLogs'));
const AdminMonitoring = lazy(() => import('./pages/Admin/Monitoring'));
const AdminNotifications = lazy(() => import('./pages/Admin/Notifications'));
const AdminReports = lazy(() => import('./pages/Admin/Reports'));
const Compliance = lazy(() => import('./pages/Compliance'));

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { OfflineProvider } from './contexts/OfflineContext';
import { LanguageProvider } from './contexts/LanguageContext';

// Guards
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';

// PWA
import { registerServiceWorker } from './utils/serviceWorker';
import { InstallPromptBanner } from './components/PWAInstallPrompt';
import { ServiceWorkerUpdatePrompt } from './components/ServiceWorkerUpdatePrompt';

// Create QueryClient instance
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            cacheTime: 1000 * 60 * 10, // 10 minutes
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        },
    },
});

// Configure axios defaults
import axios from 'axios';

// Configure axios baseURL based on environment
const configureAxiosBaseURL = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const currentHost = window.location.hostname;
    const currentPort = window.location.port;
    const currentProtocol = window.location.protocol;

    // If we have a custom API URL from env, use it
    if (apiUrl) {
        return apiUrl;
    }

    // If we're on production domain
    if (currentHost === 'timeismoney.fr' || currentHost === 'www.timeismoney.fr') {
        return 'https://timeismoney.fr/api';
    }

    // For local development, use the current origin to avoid CORS issues
    // This ensures we use the same hostname (localhost or 127.0.0.1) as the page
    const portPart = currentPort ? `:${currentPort}` : '';
    return `${currentProtocol}//${currentHost}${portPart}/api`;
};

axios.defaults.baseURL = configureAxiosBaseURL();
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
// Don't use withCredentials since we're using Bearer tokens, not cookies
// axios.defaults.withCredentials = true;

// Add auth token to requests
axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Handle auth errors globally
// Flag to prevent multiple redirects
let isRedirecting = false;

axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Only redirect if not already on login/register pages AND not during login request
            const currentPath = window.location.pathname;
            const authPaths = ['/login', '/register', '/forgot-password', '/2fa'];
            const isLoginRequest = error.config?.url?.includes('/login') ||
                                   error.config?.url?.includes('/register');

            // Don't redirect if we're on an auth page or making an auth request or already redirecting
            if (!authPaths.includes(currentPath) && !isLoginRequest && !isRedirecting) {
                // Only clear and redirect if we actually have an invalid token
                const hasToken = localStorage.getItem('auth_token');

                if (hasToken) {
                    isRedirecting = true;
                    if (import.meta.env.DEV) {
                        console.error('Authentication failed - clearing session');
                    }
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user');

                    // Redirect immediately without delay
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

function App() {
    useEffect(() => {
        // Register service worker for PWA functionality
        if ('serviceWorker' in navigator && import.meta.env.PROD) {
            registerServiceWorker();
        }

        // Setup offline detection
        const handleOnline = () => {
            if (import.meta.env.DEV) {
                console.log('Application is online');
            }
            queryClient.refetchQueries();
        };

        const handleOffline = () => {
            console.log('Application is offline');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Loading component for Suspense fallback
    const LoadingFallback = () => (
        <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
        </div>
    );

    return (
        <I18nextProvider i18n={i18n}>
            <Suspense fallback={<LoadingFallback />}>
                <QueryClientProvider client={queryClient}>
                    <Router>
                        <LanguageProvider>
                            <ThemeProvider>
                                <OfflineProvider>
                                    <AuthProvider>
                            <Routes>
                                {/* Public Auth Routes */}
                                <Route element={<AuthLayout />}>
                                    <Route path="/login" element={<Login />} />
                                    <Route path="/register" element={<Register />} />
                                    <Route path="/forgot-password" element={<ForgotPassword />} />
                                    <Route path="/2fa" element={<TwoFactorAuth />} />
                                </Route>

                                {/* Private Routes */}
                                <Route element={<PrivateRoute />}>
                                    <Route element={<MainLayout />}>
                                        {/* Dashboard */}
                                        <Route path="/" element={<Dashboard />} />
                                        <Route path="/dashboard" element={<Dashboard />} />

                                        {/* Time Tracking */}
                                        <Route path="/time" element={<TimeTracking />} />
                                        <Route path="/timesheet" element={<TimeSheet />} />

                                        {/* Projects & Tasks */}
                                        <Route path="/projects" element={<Projects />} />
                                        <Route path="/projects/new" element={<CreateProject />} />
                                        <Route path="/projects/:id" element={<ProjectDetail />} />
                                        <Route path="/projects/:id/edit" element={<EditProject />} />
                                        <Route path="/projects/:id/kanban" element={<KanbanBoard />} />
                                        <Route path="/tasks" element={<Tasks />} />
                                        <Route path="/tasks/new" element={<Tasks />} />

                                        {/* Clients */}
                                        <Route path="/clients" element={<Clients />} />
                                        <Route path="/clients/new" element={<CreateClient />} />
                                        <Route path="/clients/:id" element={<ClientDetail />} />
                                        <Route path="/clients/:id/edit" element={<EditClient />} />

                                        {/* Invoicing */}
                                        <Route path="/invoices" element={<Invoices />} />
                                        <Route path="/invoices/new" element={<CreateInvoice />} />
                                        <Route path="/invoices/:id/edit" element={<CreateInvoice />} />
                                        <Route path="/invoices/:id" element={<InvoiceDetail />} />
                                        <Route path="/quotes" element={<Quotes />} />
                                        <Route path="/quotes/new" element={<CreateQuote />} />
                                        <Route path="/quotes/:id/edit" element={<CreateQuote />} />
                                        <Route path="/quotes/:id" element={<QuoteDetail />} />

                                        {/* Expenses */}
                                        <Route path="/expenses" element={<Expenses />} />
                                        <Route path="/expenses/new" element={<CreateExpense />} />
                                        <Route path="/expense-categories" element={<ExpenseCategories />} />

                                        {/* Reports & Analytics */}
                                        <Route path="/reports" element={<Reports />} />
                                        <Route path="/analytics" element={<Analytics />} />

                                        {/* Compliance */}
                                        <Route path="/compliance" element={<Compliance />} />

                                        {/* Settings */}
                                        <Route path="/settings" element={<Settings />} />
                                        <Route path="/settings/billing" element={<TenantBillingSettings />} />
                                        <Route path="/profile" element={<Profile />} />
                                        <Route path="/team" element={<TeamManagement />} />
                                        <Route path="/integrations" element={<Integrations />} />

                                        {/* Notifications */}
                                        <Route path="/notifications" element={<NotificationCenter />} />
                                    </Route>
                                </Route>

                                {/* Admin Routes */}
                                <Route element={<AdminRoute />}>
                                    <Route element={<MainLayout isAdmin />}>
                                        <Route path="/admin" element={<AdminDashboard />} />
                                        <Route path="/admin/users" element={<AdminUsers />} />
                                        <Route path="/admin/tenants" element={<AdminTenants />} />
                                        <Route path="/admin/settings" element={<AdminSettings />} />
                                        <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
                                        <Route path="/admin/monitoring" element={<AdminMonitoring />} />
                                        <Route path="/admin/notifications" element={<AdminNotifications />} />
                                        <Route path="/admin/reports" element={<AdminReports />} />
                                    </Route>
                                </Route>

                                {/* Redirect unknown routes */}
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>

                            {/* Toast Notifications */}
                            <ToastContainer
                                position="top-right"
                                autoClose={5000}
                                hideProgressBar={false}
                                newestOnTop
                                closeOnClick
                                rtl={false}
                                pauseOnFocusLoss
                                draggable
                                pauseOnHover
                                theme="light"
                            />

                            {/* PWA Install Prompt */}
                            <InstallPromptBanner />

                            {/* Service Worker Update Prompt */}
                            <ServiceWorkerUpdatePrompt />
                                    </AuthProvider>
                                </OfflineProvider>
                            </ThemeProvider>
                        </LanguageProvider>

                        {/* React Query Dev Tools - Only in development */}
                        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
                    </Router>
                </QueryClientProvider>
            </Suspense>
        </I18nextProvider>
    );
}

export default App;