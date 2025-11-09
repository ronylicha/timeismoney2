import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    HomeIcon,
    ClockIcon,
    FolderIcon,
    UserGroupIcon,
    DocumentTextIcon,
    BanknotesIcon,
    ChartBarIcon,
    Cog6ToothIcon,
    Bars3Icon,
    XMarkIcon,
    UserCircleIcon,
    ArrowRightOnRectangleIcon,
    ShieldCheckIcon,
    ClipboardDocumentListIcon,
    UsersIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/UserAvatar';
import LanguageSelector from '@/components/LanguageSelector';
import NotificationBell from '@/components/Notifications/NotificationBell';

interface MainLayoutProps {
    isAdmin?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ isAdmin = false }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { t } = useTranslation();

    const isSuperAdmin = user?.role === 'super-admin';
    const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

    const adminNavigation = [
        { name: t('nav.adminDashboard'), href: '/admin', icon: HomeIcon },
        { name: t('nav.userDashboard'), href: '/dashboard', icon: UserCircleIcon },
        { name: t('nav.users'), href: '/admin/users', icon: UserGroupIcon },
        { name: t('nav.organizations'), href: '/admin/tenants', icon: FolderIcon },
        { name: t('nav.auditLogs'), href: '/admin/audit-logs', icon: ClipboardDocumentListIcon },
        ...(isSuperAdmin ? [{ name: t('nav.settings'), href: '/admin/settings', icon: Cog6ToothIcon }] : []),
    ];

    const navigation = isAdmin ? adminNavigation : [
        { name: t('nav.dashboard'), href: '/dashboard', icon: HomeIcon },
        { name: t('nav.time'), href: '/time', icon: ClockIcon },
        { name: t('nav.timesheet'), href: '/timesheet', icon: ClipboardDocumentListIcon },
        { name: t('nav.clients'), href: '/clients', icon: UserGroupIcon },
        { name: t('nav.projects'), href: '/projects', icon: FolderIcon },
        { name: t('nav.quotes'), href: '/quotes', icon: DocumentTextIcon },
        { name: t('nav.invoices'), href: '/invoices', icon: DocumentTextIcon },
        { name: t('nav.expenses'), href: '/expenses', icon: BanknotesIcon },
        { name: t('nav.reports'), href: '/reports', icon: ChartBarIcon },
        ...(isAdminOrManager ? [{ name: t('nav.teamManagement'), href: '/team', icon: UsersIcon }] : []),
        { name: t('nav.settings'), href: '/settings', icon: Cog6ToothIcon },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path: string) => {
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Mobile sidebar */}
            <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
                <div className={`fixed inset-0 bg-gray-600 transition-opacity ${sidebarOpen ? 'opacity-75' : 'opacity-0'}`} onClick={() => setSidebarOpen(false)} />

                <div className={`fixed inset-y-0 left-0 flex flex-col w-64 bg-white transform transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="flex items-center justify-between h-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
                        <div className="flex items-center">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                                <ClockIcon className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="ml-2 text-white font-bold">TimeIsMoney</span>
                        </div>
                        <button onClick={() => setSidebarOpen(false)} className="text-white">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition ${
                                    isActive(item.href)
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <item.icon className="mr-3 h-5 w-5" />
                                {item.name}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Desktop sidebar */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
                <div className="flex flex-col flex-grow bg-white border-r border-gray-200 overflow-y-auto">
                    <div className="flex items-center h-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                            <ClockIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="ml-2 text-white font-bold">TimeIsMoney</span>
                    </div>

                    <nav className="flex-1 px-2 py-4 space-y-1">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition ${
                                    isActive(item.href)
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <item.icon className="mr-3 h-5 w-5" />
                                {item.name}
                            </Link>
                        ))}
                    </nav>

                    {/* User info */}
                    {user && (
                        <div className="p-4 border-t border-gray-200">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <UserAvatar avatar={user.avatar} name={user.name} size="md" />
                                </div>
                                <div className="ml-3 flex-1">
                                    <p className="text-sm font-medium text-gray-700">{user.name}</p>
                                    <p className="text-xs text-gray-500">{user.email}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main content */}
            <div className="lg:pl-64 flex flex-col flex-1">
                {/* Top bar */}
                <div className="sticky top-0 z-10 flex h-16 bg-white border-b border-gray-200 shadow-sm">
                    <button
                        type="button"
                        className="px-4 text-gray-500 focus:outline-none lg:hidden"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Bars3Icon className="h-6 w-6" />
                    </button>

                    <div className="flex-1 flex justify-between px-4">
                        <div className="flex-1 flex items-center">
                            {/* Breadcrumb or page title could go here */}
                        </div>

                        <div className="ml-4 flex items-center space-x-4">
                            {/* Language Selector */}
                            <LanguageSelector />

                            {/* Notifications */}
                            <NotificationBell />

                            {/* User menu */}
                            <div className="relative">
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center text-sm focus:outline-none"
                                >
                                    <UserAvatar avatar={user?.avatar} name={user?.name} size="sm" />
                                </button>

                                {userMenuOpen && (
                                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                                        <div className="py-1">
                                            <Link
                                                to="/profile"
                                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                onClick={() => setUserMenuOpen(false)}
                                            >
                                                <div className="mr-3">
                                                    <UserAvatar avatar={user?.avatar} name={user?.name} size="xs" />
                                                </div>
                                                {t('userMenu.profile')}
                                            </Link>
                                            <Link
                                                to="/settings"
                                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                onClick={() => setUserMenuOpen(false)}
                                            >
                                                <Cog6ToothIcon className="mr-3 h-5 w-5 text-gray-400" />
                                                {t('userMenu.settings')}
                                            </Link>
                                            {user?.role === 'super-admin' && (
                                                location.pathname.startsWith('/admin') ? (
                                                    <Link
                                                        to="/dashboard"
                                                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                        onClick={() => setUserMenuOpen(false)}
                                                    >
                                                        <HomeIcon className="mr-3 h-5 w-5 text-gray-400" />
                                                        {t('userMenu.dashboard')}
                                                    </Link>
                                                ) : (
                                                    <Link
                                                        to="/admin"
                                                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                        onClick={() => setUserMenuOpen(false)}
                                                    >
                                                        <ShieldCheckIcon className="mr-3 h-5 w-5 text-gray-400" />
                                                        {t('userMenu.administration')}
                                                    </Link>
                                                )
                                            )}
                                            <div className="border-t border-gray-100"></div>
                                            <button
                                                onClick={() => {
                                                    setUserMenuOpen(false);
                                                    handleLogout();
                                                }}
                                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                            >
                                                <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
                                                {t('userMenu.logout')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page content */}
                <main className="flex-1">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
