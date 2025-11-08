import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ToastContainer } from 'react-toastify';
import { I18nextProvider } from 'react-i18next';
import 'react-toastify/dist/ReactToastify.css';

// i18n configuration
import i18n from './i18n/config';

// Layout Components
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth Components
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import TwoFactorAuth from './pages/auth/TwoFactorAuth';

// Dashboard
import Dashboard from './pages/Dashboard';

// Time Tracking
import TimeTracking from './pages/TimeTracking';
import TimeSheet from './pages/TimeSheet';

// Projects & Tasks
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Tasks from './pages/Tasks';
import KanbanBoard from './pages/KanbanBoard';

// Clients
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';

// Invoicing
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import CreateInvoice from './pages/CreateInvoice';
import Quotes from './pages/Quotes';
import QuoteDetail from './pages/QuoteDetail';

// Expenses
import Expenses from './pages/Expenses';
import ExpenseCategories from './pages/ExpenseCategories';

// Reports & Analytics
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';

// Settings
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import TeamManagement from './pages/TeamManagement';
import Integrations from './pages/Integrations';

// Admin
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminUsers from './pages/Admin/UserManagement';
import AdminTenants from './pages/Admin/TenantManagement';
import AdminSettings from './pages/Admin/SystemSettings';
import AdminAuditLogs from './pages/Admin/AuditLogs';
import AdminMonitoring from './pages/Admin/Monitoring';
import AdminNotifications from './pages/Admin/Notifications';
import AdminReports from './pages/Admin/Reports';

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

    // If we have a custom API URL from env, use it
    if (apiUrl) {
        return apiUrl;
    }

    // If we're on production domain
    if (currentHost === 'timeismoney.fr' || currentHost === 'www.timeismoney.fr') {
        return 'https://timeismoney.fr/api';
    }

    // Default for local development
    return '/api';
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
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Only redirect if not already on login/register pages AND not during login request
            const currentPath = window.location.pathname;
            const authPaths = ['/login', '/register', '/forgot-password', '/2fa'];
            const isLoginRequest = error.config?.url?.includes('/login') ||
                                   error.config?.url?.includes('/register');

            // Don't redirect if we're on an auth page or making an auth request
            if (!authPaths.includes(currentPath) && !isLoginRequest) {
                // Only clear and redirect if we actually have an invalid token
                const hasToken = localStorage.getItem('auth_token');

                if (hasToken) {
                    console.error('Authentication failed - clearing session');
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user');

                    // Use a small delay to avoid race conditions
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 100);
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
            console.log('Application is online');
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

    return (
        <I18nextProvider i18n={i18n}>
            <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
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
                                        <Route path="/projects/new" element={<ProjectDetail />} />
                                        <Route path="/projects/:id" element={<ProjectDetail />} />
                                        <Route path="/projects/:id/kanban" element={<KanbanBoard />} />
                                        <Route path="/tasks" element={<Tasks />} />
                                        <Route path="/tasks/new" element={<Tasks />} />

                                        {/* Clients */}
                                        <Route path="/clients" element={<Clients />} />
                                        <Route path="/clients/new" element={<ClientDetail />} />
                                        <Route path="/clients/:id" element={<ClientDetail />} />

                                        {/* Invoicing */}
                                        <Route path="/invoices" element={<Invoices />} />
                                        <Route path="/invoices/new" element={<CreateInvoice />} />
                                        <Route path="/invoices/:id" element={<InvoiceDetail />} />
                                        <Route path="/quotes" element={<Quotes />} />
                                        <Route path="/quotes/new" element={<QuoteDetail />} />
                                        <Route path="/quotes/:id" element={<QuoteDetail />} />

                                        {/* Expenses */}
                                        <Route path="/expenses" element={<Expenses />} />
                                        <Route path="/expenses/new" element={<Expenses />} />
                                        <Route path="/expense-categories" element={<ExpenseCategories />} />

                                        {/* Reports & Analytics */}
                                        <Route path="/reports" element={<Reports />} />
                                        <Route path="/analytics" element={<Analytics />} />

                                        {/* Settings */}
                                        <Route path="/settings" element={<Settings />} />
                                        <Route path="/profile" element={<Profile />} />
                                        <Route path="/team" element={<TeamManagement />} />
                                        <Route path="/integrations" element={<Integrations />} />
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