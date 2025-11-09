import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
    UserPlusIcon,
    XMarkIcon,
    EnvelopeIcon,
    BriefcaseIcon,
    EyeIcon,
    KeyIcon,
    ShieldCheckIcon,
    PencilIcon
} from '@heroicons/react/24/outline';
import UserAvatar from '@/components/UserAvatar';

interface UserFormData {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role: 'admin' | 'manager' | 'employee';
    position: string;
    hourly_rate: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    team_member?: {
        position?: string;
        hourly_rate?: number;
    };
}

interface PasswordChangeData {
    password: string;
    password_confirmation: string;
}

const UserManagementWidget: React.FC = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [passwordData, setPasswordData] = useState<PasswordChangeData>({
        password: '',
        password_confirmation: '',
    });
    const [formData, setFormData] = useState<UserFormData>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'employee',
        position: '',
        hourly_rate: '',
    });
    const [editFormData, setEditFormData] = useState<Partial<UserFormData>>({
        name: '',
        email: '',
        role: 'employee',
        position: '',
        hourly_rate: '',
    });

    // Fetch users list
    const { data: users, isLoading: usersLoading } = useQuery<User[]>({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await axios.get('/users');
            return response.data.data || response.data;
        },
    });

    const createUserMutation = useMutation({
        mutationFn: async (data: UserFormData) => {
            const response = await axios.post('/users/register', data);
            return response.data;
        },
        onSuccess: () => {
            toast.success(t('userManagement.userCreatedSuccess'));
            setShowForm(false);
            setFormData({
                name: '',
                email: '',
                password: '',
                password_confirmation: '',
                role: 'employee',
                position: '',
                hourly_rate: '',
            });
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message || t('userManagement.userCreatedError');
            toast.error(errorMessage);
        },
    });

    const changePasswordMutation = useMutation({
        mutationFn: async ({ userId, data }: { userId: number; data: PasswordChangeData }) => {
            const response = await axios.patch(`/users/${userId}/password`, data);
            return response.data;
        },
        onSuccess: () => {
            toast.success(t('userManagement.passwordChangedSuccess'));
            setShowPasswordModal(false);
            setPasswordData({ password: '', password_confirmation: '' });
            setSelectedUser(null);
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message || t('userManagement.passwordChangedError');
            toast.error(errorMessage);
        },
    });

    const updateUserMutation = useMutation({
        mutationFn: async ({ userId, data }: { userId: number; data: Partial<UserFormData> }) => {
            const response = await axios.put(`/users/${userId}`, data);
            return response.data;
        },
        onSuccess: () => {
            toast.success(t('userManagement.userUpdatedSuccess'));
            setShowEditModal(false);
            setSelectedUser(null);
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message || t('userManagement.userUpdatedError');
            toast.error(errorMessage);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (formData.password !== formData.password_confirmation) {
            toast.error(t('userManagement.passwordMismatch'));
            return;
        }

        if (formData.password.length < 8) {
            toast.error(t('userManagement.passwordTooShort'));
            return;
        }

        createUserMutation.mutate(formData);
    };

    const handleInputChange = (field: keyof UserFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleViewDetails = (user: User) => {
        setSelectedUser(user);
        setShowDetailModal(true);
    };

    const handleChangePassword = (user: User) => {
        setSelectedUser(user);
        setShowPasswordModal(true);
    };

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setEditFormData({
            name: user.name,
            email: user.email,
            role: user.role as 'admin' | 'manager' | 'employee',
            position: user.team_member?.position || '',
            hourly_rate: user.team_member?.hourly_rate?.toString() || '',
        });
        setShowEditModal(true);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedUser) {
            updateUserMutation.mutate({
                userId: selectedUser.id,
                data: editFormData,
            });
        }
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordData.password !== passwordData.password_confirmation) {
            toast.error(t('userManagement.passwordMismatch'));
            return;
        }

        if (passwordData.password.length < 8) {
            toast.error(t('userManagement.passwordTooShort'));
            return;
        }

        if (selectedUser) {
            changePasswordMutation.mutate({
                userId: selectedUser.id,
                data: passwordData,
            });
        }
    };

    const getRoleBadge = (role: string) => {
        const colors: Record<string, string> = {
            'super-admin': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            'admin': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
            'manager': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            'employee': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
        };

        const labels: Record<string, string> = {
            'super-admin': 'Super Admin',
            'admin': t('userManagement.roles.admin'),
            'manager': t('userManagement.roles.manager'),
            'employee': t('userManagement.roles.employee'),
        };

        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[role] || colors['employee']}`}>
                {labels[role] || role}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Create User Form Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                        {t('userManagement.title')}
                    </h3>
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            <UserPlusIcon className="h-5 w-5" />
                            {t('userManagement.addUser')}
                        </button>
                    )}
                </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-md font-medium text-gray-700 dark:text-gray-300">
                            {t('userManagement.createNewUser')}
                        </h4>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('userManagement.name')} *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('userManagement.email')} *
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('userManagement.password')} *
                            </label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                required
                                minLength={8}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('userManagement.confirmPassword')} *
                            </label>
                            <input
                                type="password"
                                value={formData.password_confirmation}
                                onChange={(e) => handleInputChange('password_confirmation', e.target.value)}
                                required
                                minLength={8}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('userManagement.role')} *
                            </label>
                            <select
                                value={formData.role}
                                onChange={(e) => handleInputChange('role', e.target.value)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            >
                                <option value="employee">{t('userManagement.roles.employee')}</option>
                                <option value="manager">{t('userManagement.roles.manager')}</option>
                                <option value="admin">{t('userManagement.roles.admin')}</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('userManagement.position')}
                            </label>
                            <input
                                type="text"
                                value={formData.position}
                                onChange={(e) => handleInputChange('position', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('userManagement.hourlyRate')}
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.hourly_rate}
                            onChange={(e) => handleInputChange('hourly_rate', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="submit"
                            disabled={createUserMutation.isPending}
                            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {createUserMutation.isPending ? t('common.saving') : t('userManagement.createUser')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            disabled={createUserMutation.isPending}
                            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                        >
                            {t('common.cancel')}
                        </button>
                    </div>
                </form>
            )}

                {!showForm && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('userManagement.description')}
                    </p>
                )}
            </div>

            {/* Users List Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                    {t('userManagement.teamMembers')}
                </h3>

                {usersLoading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
                    </div>
                ) : !users || users.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-600 dark:text-gray-400">{t('userManagement.noUsers')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {users.map((user) => (
                            <div
                                key={user.id}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition"
                            >
                                <div className="flex items-start gap-3 mb-3">
                                    <UserAvatar avatar={user.avatar} name={user.name} size="md" />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-gray-800 dark:text-white truncate">
                                            {user.name}
                                        </h4>
                                        <div className="mt-1">
                                            {getRoleBadge(user.role)}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                        <EnvelopeIcon className="h-4 w-4 flex-shrink-0" />
                                        <span className="truncate">{user.email}</span>
                                    </div>

                                    {user.team_member?.position && (
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            <BriefcaseIcon className="h-4 w-4 flex-shrink-0" />
                                            <span className="truncate">{user.team_member.position}</span>
                                        </div>
                                    )}

                                    {user.team_member?.hourly_rate && (
                                        <div className="text-gray-600 dark:text-gray-400">
                                            <span className="font-medium">{t('userManagement.rate')}:</span>{' '}
                                            {user.team_member.hourly_rate}€/h
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleViewDetails(user)}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
                                        >
                                            <EyeIcon className="h-4 w-4" />
                                            {t('userManagement.viewDetails')}
                                        </button>
                                        <button
                                            onClick={() => handleEditUser(user)}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition"
                                        >
                                            <PencilIcon className="h-4 w-4" />
                                            {t('userManagement.editUser')}
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => handleChangePassword(user)}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition"
                                    >
                                        <KeyIcon className="h-4 w-4" />
                                        {t('userManagement.changePassword')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* User Detail Modal */}
            {showDetailModal && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                                {t('userManagement.userDetails')}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowDetailModal(false);
                                    setSelectedUser(null);
                                }}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* User Avatar and Name */}
                            <div className="flex items-center gap-4">
                                <UserAvatar avatar={selectedUser.avatar} name={selectedUser.name} size="lg" />
                                <div>
                                    <h4 className="text-2xl font-bold text-gray-800 dark:text-white">
                                        {selectedUser.name}
                                    </h4>
                                    <div className="mt-2">{getRoleBadge(selectedUser.role)}</div>
                                </div>
                            </div>

                            {/* User Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                                        <EnvelopeIcon className="h-5 w-5" />
                                        <span className="text-sm font-medium">{t('userManagement.email')}</span>
                                    </div>
                                    <p className="text-gray-800 dark:text-white font-medium">{selectedUser.email}</p>
                                </div>

                                {selectedUser.team_member?.position && (
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                                            <BriefcaseIcon className="h-5 w-5" />
                                            <span className="text-sm font-medium">{t('userManagement.position')}</span>
                                        </div>
                                        <p className="text-gray-800 dark:text-white font-medium">
                                            {selectedUser.team_member.position}
                                        </p>
                                    </div>
                                )}

                                {selectedUser.team_member?.hourly_rate && (
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                                            <span className="text-sm font-medium">{t('userManagement.hourlyRate')}</span>
                                        </div>
                                        <p className="text-gray-800 dark:text-white font-medium">
                                            {selectedUser.team_member.hourly_rate}€/h
                                        </p>
                                    </div>
                                )}

                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                                        <ShieldCheckIcon className="h-5 w-5" />
                                        <span className="text-sm font-medium">{t('userManagement.role')}</span>
                                    </div>
                                    <p className="text-gray-800 dark:text-white font-medium capitalize">
                                        {selectedUser.role}
                                    </p>
                                </div>
                            </div>

                            {/* Additional Information */}
                            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                                <h5 className="text-sm font-semibold text-gray-800 dark:text-white mb-2">
                                    {t('userManagement.additionalInfo')}
                                </h5>
                                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                    <p><span className="font-medium">ID:</span> {selectedUser.id}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => {
                                    setShowDetailModal(false);
                                    setSelectedUser(null);
                                }}
                                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                            >
                                {t('common.close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                                {t('userManagement.editUser')}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setSelectedUser(null);
                                }}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('userManagement.name')} *
                                </label>
                                <input
                                    type="text"
                                    value={editFormData.name}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('userManagement.email')} *
                                </label>
                                <input
                                    type="email"
                                    value={editFormData.email}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('userManagement.role')} *
                                    </label>
                                    <select
                                        value={editFormData.role}
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, role: e.target.value as 'admin' | 'manager' | 'employee' }))}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="employee">{t('userManagement.roles.employee')}</option>
                                        <option value="manager">{t('userManagement.roles.manager')}</option>
                                        <option value="admin">{t('userManagement.roles.admin')}</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('userManagement.position')}
                                    </label>
                                    <input
                                        type="text"
                                        value={editFormData.position}
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, position: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('userManagement.hourlyRate')}
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editFormData.hourly_rate}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={updateUserMutation.isPending}
                                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {updateUserMutation.isPending
                                        ? t('common.saving')
                                        : t('userManagement.updateUser')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setSelectedUser(null);
                                    }}
                                    disabled={updateUserMutation.isPending}
                                    className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                                >
                                    {t('common.cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {showPasswordModal && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                                {t('userManagement.changePasswordFor', { name: selectedUser.name })}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowPasswordModal(false);
                                    setSelectedUser(null);
                                    setPasswordData({ password: '', password_confirmation: '' });
                                }}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('userManagement.newPassword')} *
                                </label>
                                <input
                                    type="password"
                                    value={passwordData.password}
                                    onChange={(e) =>
                                        setPasswordData((prev) => ({ ...prev, password: e.target.value }))
                                    }
                                    required
                                    minLength={8}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('userManagement.confirmNewPassword')} *
                                </label>
                                <input
                                    type="password"
                                    value={passwordData.password_confirmation}
                                    onChange={(e) =>
                                        setPasswordData((prev) => ({ ...prev, password_confirmation: e.target.value }))
                                    }
                                    required
                                    minLength={8}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={changePasswordMutation.isPending}
                                    className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {changePasswordMutation.isPending
                                        ? t('common.saving')
                                        : t('userManagement.updatePassword')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        setSelectedUser(null);
                                        setPasswordData({ password: '', password_confirmation: '' });
                                    }}
                                    disabled={changePasswordMutation.isPending}
                                    className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                                >
                                    {t('common.cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagementWidget;
