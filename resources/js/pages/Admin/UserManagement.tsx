import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
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

interface User {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: 'admin' | 'manager' | 'user';
    tenant_id: number;
    tenant?: {
        id: number;
        name: string;
        plan: string;
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

const UserManagement: React.FC = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // Fetch users
    const { data: usersData, isLoading } = useQuery({
        queryKey: ['admin-users', searchTerm, filterRole, filterStatus, currentPage],
        queryFn: async () => {
            const response = await axios.get('/api/admin/users', {
                params: {
                    search: searchTerm,
                    role: filterRole,
                    status: filterStatus,
                    page: currentPage,
                    per_page: 20
                }
            });
            return response.data;
        }
    });

    // Suspend user mutation
    const suspendUserMutation = useMutation({
        mutationFn: async (userId: number) => {
            await axios.post(`/api/admin/users/${userId}/suspend`);
        },
        onSuccess: () => {
            toast.success('Utilisateur suspendu');
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
        onError: () => {
            toast.error('Erreur lors de la suspension');
        }
    });

    // Activate user mutation
    const activateUserMutation = useMutation({
        mutationFn: async (userId: number) => {
            await axios.post(`/api/admin/users/${userId}/activate`);
        },
        onSuccess: () => {
            toast.success('Utilisateur activé');
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
        onError: () => {
            toast.error('Erreur lors de l\'activation');
        }
    });

    // Delete user mutation
    const deleteUserMutation = useMutation({
        mutationFn: async (userId: number) => {
            await axios.delete(`/api/admin/users/${userId}`);
        },
        onSuccess: () => {
            toast.success('Utilisateur supprimé');
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
        onError: () => {
            toast.error('Erreur lors de la suppression');
        }
    });

    // Reset password mutation
    const resetPasswordMutation = useMutation({
        mutationFn: async (userId: number) => {
            await axios.post(`/api/admin/users/${userId}/reset-password`);
        },
        onSuccess: () => {
            toast.success('Email de réinitialisation envoyé');
        },
        onError: () => {
            toast.error('Erreur lors de l\'envoi');
        }
    });

    // Impersonate user
    const impersonateUser = async (userId: number) => {
        try {
            const response = await axios.post(`/api/admin/users/${userId}/impersonate`);
            // Redirect to user's dashboard with impersonation token
            window.location.href = `/dashboard?impersonate_token=${response.data.token}`;
        } catch (error) {
            toast.error('Erreur lors de l\'impersonation');
        }
    };

    // Export users
    const exportUsers = async () => {
        try {
            const response = await axios.get('/api/admin/users/export', {
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
            toast.error('Erreur lors de l\'export');
        }
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
                        <p className="text-gray-600 mt-1">
                            {usersData?.total || 0} utilisateurs au total
                        </p>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={exportUsers}
                            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                            Exporter
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            <PlusIcon className="h-5 w-5 mr-2" />
                            Nouvel utilisateur
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
                            placeholder="Rechercher..."
                            className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Role Filter */}
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">Tous les rôles</option>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="user">Utilisateur</option>
                    </select>

                    {/* Status Filter */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">Tous les statuts</option>
                        <option value="active">Actif</option>
                        <option value="suspended">Suspendu</option>
                        <option value="verified">Email vérifié</option>
                        <option value="unverified">Email non vérifié</option>
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
                        Réinitialiser
                    </button>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Utilisateur
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Organisation
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Rôle
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Statut
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Activité
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
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
                                    Aucun utilisateur trouvé
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
                                        <div className="text-sm text-gray-900">
                                            {user.tenant?.name || '-'}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {user.tenant?.plan || '-'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                            user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {user.role}
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
                                                    Dernière connexion{' '}
                                                    {formatDistanceToNow(new Date(user.last_login_at), {
                                                        addSuffix: true,
                                                        locale: fr
                                                    })}
                                                </span>
                                            ) : (
                                                <span>Jamais connecté</span>
                                            )}
                                        </div>
                                        <div className="text-xs">
                                            {user.time_entries_count || 0} entrées • {user.invoices_count || 0} factures
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => impersonateUser(user.id)}
                                                className="text-gray-600 hover:text-gray-900"
                                                title="Impersonate"
                                            >
                                                <EyeIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setShowEditModal(true);
                                                }}
                                                className="text-indigo-600 hover:text-indigo-900"
                                                title="Éditer"
                                            >
                                                <PencilIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => resetPasswordMutation.mutate(user.id)}
                                                className="text-blue-600 hover:text-blue-900"
                                                title="Réinitialiser mot de passe"
                                            >
                                                <KeyIcon className="h-5 w-5" />
                                            </button>
                                            {user.is_active ? (
                                                <button
                                                    onClick={() => suspendUserMutation.mutate(user.id)}
                                                    className="text-yellow-600 hover:text-yellow-900"
                                                    title="Suspendre"
                                                >
                                                    <LockClosedIcon className="h-5 w-5" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => activateUserMutation.mutate(user.id)}
                                                    className="text-green-600 hover:text-green-900"
                                                    title="Activer"
                                                >
                                                    <CheckCircleIcon className="h-5 w-5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
                                                        deleteUserMutation.mutate(user.id);
                                                    }
                                                }}
                                                className="text-red-600 hover:text-red-900"
                                                title="Supprimer"
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
                                Précédent
                            </button>
                            <button
                                onClick={() => setCurrentPage(Math.min(usersData.last_page, currentPage + 1))}
                                disabled={currentPage === usersData.last_page}
                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Suivant
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Affichage de <span className="font-medium">{usersData.from}</span> à{' '}
                                    <span className="font-medium">{usersData.to}</span> sur{' '}
                                    <span className="font-medium">{usersData.total}</span> résultats
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
        </div>
    );
};

export default UserManagement;