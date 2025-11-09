import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import {
    UserIcon,
    EnvelopeIcon,
    PhoneIcon,
    BuildingOfficeIcon,
    CalendarIcon,
    CheckCircleIcon,
    XCircleIcon,
    PencilIcon,
    TrashIcon,
    KeyIcon,
    ShieldCheckIcon,
    LockClosedIcon,
    EyeIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    PlusIcon,
    ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import UserForm from '../../components/Admin/UserForm';

type UserRole = 'super-admin' | 'admin' | 'manager' | 'employee' | 'accountant' | 'client';

interface User {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: UserRole;
    role_names?: string[];
    tenant_id: number;
    tenant?: {
        id: number;
        name: string;
    };
    email_verified_at: string | null;
    two_factor_enabled: boolean;
    is_active: boolean;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
    time_entries_count?: number;
    invoices_count?: number;
}

interface Tenant {
    id: number;
    name: string;
}

const UserManagement: React.FC = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [refreshKey, setRefreshKey] = useState(0);

    // Fetch users with proper cache invalidation
    const { data: usersData, isLoading, error, refetch } = useQuery({
        queryKey: ['admin-users', searchTerm, filterRole, filterStatus, currentPage, refreshKey],
        queryFn: async () => {
            const response = await axios.get('/admin/users', {
                params: {
                    search: searchTerm,
                    role: filterRole,
                    status: filterStatus,
                    page: currentPage,
                    per_page: 20
                }
            });
            console.log('Admin users response:', response.data);
            return response.data;
        },
        staleTime: 0,
        gcTime: 0,
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        retry: 2
    });

    // Suspend user mutation
    const suspendUserMutation = useMutation({
        mutationFn: async (userId: number) => {
            await axios.post(`/admin/users/${userId}/suspend`);
        },
        onSuccess: () => {
            toast.success(t('admin.users.suspendSuccess'));
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
        onError: () => {
            toast.error(t('admin.users.suspendError'));
        }
    });

    // Activate user mutation
    const activateUserMutation = useMutation({
        mutationFn: async (userId: number) => {
            await axios.post(`/admin/users/${userId}/activate`);
        },
        onSuccess: () => {
            toast.success(t('admin.users.activateSuccess'));
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
        onError: () => {
            toast.error(t('admin.users.activateError'));
        }
    });

    // Delete user mutation
    const deleteUserMutation = useMutation({
        mutationFn: async (userId: number) => {
            await axios.delete(`/admin/users/${userId}`);
        },
        onSuccess: () => {
            toast.success(t('admin.users.deleteSuccess'));
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
        onError: () => {
            toast.error(t('admin.users.deleteError'));
        }
    });

    // Reset password mutation
    const resetPasswordMutation = useMutation({
        mutationFn: async (userId: number) => {
            await axios.post(`/admin/users/${userId}/reset-password`);
        },
        onSuccess: () => {
            toast.success(t('admin.users.resetPasswordSuccess'));
        },
        onError: () => {
            toast.error(t('admin.users.resetPasswordError'));
        }
    });

    // Create user mutation
    const createUserMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await axios.post('/admin/users', data);
            return response.data;
        },
        onSuccess: () => {
            toast.success(t('admin.users.createSuccess'));
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setShowCreateModal(false);
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || t('admin.users.createError');
            toast.error(message);
            throw error;
        }
    });

    // Update user mutation
    const updateUserMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: any }) => {
            const response = await axios.put(`/admin/users/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            toast.success(t('admin.users.updateSuccess'));
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setShowEditModal(false);
            setSelectedUser(null);
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || t('admin.users.updateError');
            toast.error(message);
            throw error;
        }
    });

    // Impersonate user
    const impersonateUser = async (userId: number) => {
        try {
            const response = await axios.post(`/admin/users/${userId}/impersonate`);
            // Redirect to user's dashboard with impersonation token
            window.location.href = `/dashboard?impersonate_token=${response.data.token}`;
        } catch (error) {
            toast.error(t('admin.users.impersonateError'));
        }
    };

    // Export users
    const exportUsers = async () => {
        try {
            const response = await axios.get('/admin/users/export', {
                responseType: 'blob',
                params: {
                    search: searchTerm,
                    role: filterRole,
                    status: filterStatus
                }
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `users_${new Date().toISOString()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            toast.error(t('admin.users.exportError'));
        }
    };

    return (
        <div className="p-6">
            {/* Error Display */}
            {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    <p className="font-bold">{t('common.error')}</p>
                    <p className="text-sm">{(error as any)?.response?.data?.message || t('admin.users.loadError')}</p>
                    <button
                        onClick={() => setRefreshKey(prev => prev + 1)}
                        className="mt-2 text-sm underline hover:text-red-900"
                    >
                        {t('common.retry')}
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('admin.users.title')}</h1>
                        <p className="text-gray-600 mt-1">
                            {usersData?.total || 0} {t('admin.users.totalUsers')}
                        </p>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => setRefreshKey(prev => prev + 1)}
                            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            title={t('common.refresh')}
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                        <button
                            onClick={exportUsers}
                            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                            {t('admin.users.export')}
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            <PlusIcon className="h-5 w-5 mr-2" />
                            {t('admin.users.newUser')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t('admin.users.searchPlaceholder')}
                            className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Role Filter */}
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">{t('admin.users.allRoles')}</option>
                        <option value="super-admin">{t('admin.users.roles.superAdmin')}</option>
                        <option value="admin">{t('admin.users.roles.admin')}</option>
                        <option value="manager">{t('admin.users.roles.manager')}</option>
                        <option value="employee">{t('admin.users.roles.employee')}</option>
                        <option value="accountant">{t('admin.users.roles.accountant')}</option>
                        <option value="client">{t('admin.users.roles.client')}</option>
                    </select>

                    {/* Status Filter */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">{t('admin.users.allStatuses')}</option>
                        <option value="active">{t('admin.users.status.active')}</option>
                        <option value="suspended">{t('admin.users.status.suspended')}</option>
                        <option value="verified">{t('admin.users.status.verified')}</option>
                        <option value="unverified">{t('admin.users.status.unverified')}</option>
                    </select>

                    {/* Clear Filters */}
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setFilterRole('all');
                            setFilterStatus('all');
                        }}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        {t('common.reset')}
                    </button>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t('admin.users.table.user')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t('admin.users.table.organization')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t('admin.users.table.role')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t('admin.users.table.status')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t('admin.users.table.activity')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t('admin.users.table.actions')}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                                </td>
                            </tr>
                        ) : usersData?.data?.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-gray-500">
                                    {t('admin.users.noUsers')}
                                </td>
                            </tr>
                        ) : (
                            usersData?.data?.map((user: User) => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                                <UserIcon className="h-5 w-5 text-indigo-600" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {user.name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {user.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900 dark:text-white">
                                            {user.tenant?.name || '-'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                            user.role === 'super-admin' ? 'bg-red-100 text-red-800' :
                                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                            user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                                            user.role === 'accountant' ? 'bg-green-100 text-green-800' :
                                            user.role === 'employee' ? 'bg-gray-100 text-gray-800' :
                                            user.role === 'client' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {user.role === 'super-admin' ? t('admin.users.roles.superAdmin') :
                                             user.role === 'admin' ? t('admin.users.roles.admin') :
                                             user.role === 'manager' ? t('admin.users.roles.manager') :
                                             user.role === 'accountant' ? t('admin.users.roles.accountant') :
                                             user.role === 'employee' ? t('admin.users.roles.employee') :
                                             user.role === 'client' ? t('admin.users.roles.client') :
                                             user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center space-x-2">
                                            {user.is_active ? (
                                                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                            ) : (
                                                <XCircleIcon className="h-5 w-5 text-red-500" />
                                            )}
                                            {user.email_verified_at && (
                                                <EnvelopeIcon className="h-4 w-4 text-green-500" />
                                            )}
                                            {user.two_factor_enabled && (
                                                <ShieldCheckIcon className="h-4 w-4 text-blue-500" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div>
                                            {user.last_login_at ? (
                                                <span>
                                                    {t('admin.users.lastLogin')}{' '}
                                                    {formatDistanceToNow(new Date(user.last_login_at), {
                                                        addSuffix: true,
                                                        locale: fr
                                                    })}
                                                </span>
                                            ) : (
                                                <span>{t('admin.users.neverLoggedIn')}</span>
                                            )}
                                        </div>
                                        <div className="text-xs">
                                            {user.time_entries_count || 0} {t('admin.users.entries')} • {user.invoices_count || 0} {t('admin.users.invoices')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => impersonateUser(user.id)}
                                                className="text-gray-600 hover:text-gray-900"
                                                title={t('admin.users.actions.impersonate')}
                                            >
                                                <EyeIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setShowEditModal(true);
                                                }}
                                                className="text-indigo-600 hover:text-indigo-900"
                                                title={t('common.edit')}
                                            >
                                                <PencilIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => resetPasswordMutation.mutate(user.id)}
                                                className="text-blue-600 hover:text-blue-900"
                                                title={t('admin.users.actions.resetPassword')}
                                            >
                                                <KeyIcon className="h-5 w-5" />
                                            </button>
                                            {user.is_active ? (
                                                <button
                                                    onClick={() => suspendUserMutation.mutate(user.id)}
                                                    className="text-yellow-600 hover:text-yellow-900"
                                                    title={t('admin.users.actions.suspend')}
                                                >
                                                    <LockClosedIcon className="h-5 w-5" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => activateUserMutation.mutate(user.id)}
                                                    className="text-green-600 hover:text-green-900"
                                                    title={t('admin.users.actions.activate')}
                                                >
                                                    <CheckCircleIcon className="h-5 w-5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    if (confirm(t('admin.users.confirmDelete'))) {
                                                        deleteUserMutation.mutate(user.id);
                                                    }
                                                }}
                                                className="text-red-600 hover:text-red-900"
                                                title={t('common.delete')}
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {usersData && usersData.last_page > 1 && (
                    <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                {t('common.previous')}
                            </button>
                            <button
                                onClick={() => setCurrentPage(Math.min(usersData.last_page, currentPage + 1))}
                                disabled={currentPage === usersData.last_page}
                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                {t('common.next')}
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    {t('common.showing')} <span className="font-medium">{usersData.from}</span> {t('common.to')}{' '}
                                    <span className="font-medium">{usersData.to}</span> {t('common.of')}{' '}
                                    <span className="font-medium">{usersData.total}</span> {t('common.results')}
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                    {Array.from({ length: usersData.last_page }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                                page === currentPage
                                                    ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <UserForm
                    onSubmit={async (data) => {
                        await createUserMutation.mutateAsync(data);
                    }}
                    onClose={() => setShowCreateModal(false)}
                    isLoading={createUserMutation.isLoading}
                />
            )}

            {/* Edit User Modal */}
            {showEditModal && selectedUser && (
                <UserForm
                    user={selectedUser}
                    onSubmit={async (data) => {
                        await updateUserMutation.mutateAsync({ id: selectedUser.id, data });
                    }}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedUser(null);
                    }}
                    isLoading={updateUserMutation.isLoading}
                />
            )}
        </div>
    );
};

export default UserManagement;