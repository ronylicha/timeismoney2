import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

type UserRole = 'super-admin' | 'admin' | 'manager' | 'employee' | 'accountant' | 'client';

interface UserFormProps {
    user?: {
        id: number;
        name: string;
        email: string;
        phone: string | null;
        role: UserRole;
        tenant_id: number;
        is_active: boolean;
    };
    onSubmit: (data: any) => Promise<void>;
    onClose: () => void;
    isLoading?: boolean;
}

interface Tenant {
    id: number;
    name: string;
}

const UserForm: React.FC<UserFormProps> = ({ user, onSubmit, onClose, isLoading }) => {
    const { user: currentUser } = useAuth();
    const isEditing = !!user;
    const isSuperAdmin = currentUser?.role === 'super-admin';

    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        password: '',
        password_confirmation: '',
        phone: user?.phone || '',
        role: user?.role || 'employee' as UserRole,
        tenant_id: user?.tenant_id?.toString() || currentUser?.tenant_id?.toString() || '',
        is_active: user?.is_active !== undefined ? user.is_active : true
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Fetch tenants (for super-admin only)
    const { data: tenantsData } = useQuery({
        queryKey: ['admin-tenants'],
        queryFn: async () => {
            const response = await axios.get('/admin/tenants');
            return response.data;
        },
        enabled: isSuperAdmin
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));

        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name) newErrors.name = 'Le nom est requis';
        if (!formData.email) newErrors.email = 'L\'email est requis';
        if (!formData.role) newErrors.role = 'Le rôle est requis';

        if (!isEditing) {
            if (!formData.password) {
                newErrors.password = 'Le mot de passe est requis';
            } else if (formData.password.length < 8) {
                newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
            }

            if (formData.password !== formData.password_confirmation) {
                newErrors.password_confirmation = 'Les mots de passe ne correspondent pas';
            }
        }

        if (isSuperAdmin && !formData.tenant_id) {
            newErrors.tenant_id = 'L\'organisation est requise';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        try {
            const submitData = { ...formData };

            // Remove password fields if editing and password is empty
            if (isEditing && !submitData.password) {
                delete submitData.password;
                delete submitData.password_confirmation;
            }

            await onSubmit(submitData);
        } catch (error: any) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {isEditing ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nom complet *
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white`}
                            placeholder="Jean Dupont"
                        />
                        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Email *
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className={`w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white`}
                            placeholder="jean.dupont@example.com"
                        />
                        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Téléphone
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                            placeholder="+33 1 23 45 67 89"
                        />
                    </div>

                    {/* Password */}
                    {!isEditing && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Mot de passe *
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className={`w-full px-3 py-2 border ${errors.password ? 'border-red-500' : 'border-gray-300'} dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white`}
                                    placeholder="Minimum 8 caractères"
                                />
                                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Confirmer le mot de passe *
                                </label>
                                <input
                                    type="password"
                                    name="password_confirmation"
                                    value={formData.password_confirmation}
                                    onChange={handleChange}
                                    className={`w-full px-3 py-2 border ${errors.password_confirmation ? 'border-red-500' : 'border-gray-300'} dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white`}
                                />
                                {errors.password_confirmation && <p className="text-red-500 text-sm mt-1">{errors.password_confirmation}</p>}
                            </div>
                        </>
                    )}

                    {/* Role */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Rôle *
                        </label>
                        <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            disabled={!isSuperAdmin && user?.role === 'super-admin'}
                            className={`w-full px-3 py-2 border ${errors.role ? 'border-red-500' : 'border-gray-300'} dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white disabled:opacity-50`}
                        >
                            {isSuperAdmin && <option value="super-admin">Super Admin</option>}
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="employee">Employé</option>
                            <option value="accountant">Comptable</option>
                            <option value="client">Client</option>
                        </select>
                        {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
                        {!isSuperAdmin && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Seul un super-admin peut créer des super-admins
                            </p>
                        )}
                    </div>

                    {/* Tenant (Super-admin only) */}
                    {isSuperAdmin && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Organisation *
                            </label>
                            <select
                                name="tenant_id"
                                value={formData.tenant_id}
                                onChange={handleChange}
                                className={`w-full px-3 py-2 border ${errors.tenant_id ? 'border-red-500' : 'border-gray-300'} dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white`}
                            >
                                <option value="">Sélectionner une organisation...</option>
                                {tenantsData?.data?.map((tenant: Tenant) => (
                                    <option key={tenant.id} value={tenant.id}>
                                        {tenant.name}
                                    </option>
                                ))}
                            </select>
                            {errors.tenant_id && <p className="text-red-500 text-sm mt-1">{errors.tenant_id}</p>}
                        </div>
                    )}

                    {/* Active Status */}
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            name="is_active"
                            checked={formData.is_active}
                            onChange={handleChange}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                            Compte actif
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                            disabled={isLoading}
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserForm;
