import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
    EnvelopeIcon,
    LockClosedIcon,
    UserIcon,
    BuildingOfficeIcon,
    EyeIcon,
    EyeSlashIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';

interface RegisterFormData {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    tenant_name: string;
    agree_terms: boolean;
}

const Register: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const [formData, setFormData] = useState<RegisterFormData>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        tenant_name: '',
        agree_terms: false
    });

    const registerMutation = useMutation({
        mutationFn: async (data: RegisterFormData) => {
            // Generate base slug from tenant_name
            const baseSlug = data.tenant_name
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Remove accents
                .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
                .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

            // Add random suffix to ensure uniqueness
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            const tenant_slug = `${baseSlug}-${randomSuffix}`;

            const response = await axios.post('/register', {
                ...data,
                tenant_slug
            });
            return response.data;
        },
        onSuccess: (data) => {
            // Store auth token
            if (data.token) {
                localStorage.setItem('auth_token', data.token);
            }

            // Store user data
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
            }

            toast.success(t('auth.registerSuccess'));
            navigate('/dashboard');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || t('auth.registerError');
            const errors = error.response?.data?.errors;

            if (errors) {
                Object.values(errors).forEach((errorArray: any) => {
                    errorArray.forEach((error: string) => toast.error(error));
                });
            } else {
                toast.error(message);
            }
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.name || !formData.email || !formData.password || !formData.tenant_name) {
            toast.error(t('auth.fillAllFields'));
            return;
        }

        if (formData.password !== formData.password_confirmation) {
            toast.error(t('auth.passwordsDoNotMatch'));
            return;
        }

        if (formData.password.length < 8) {
            toast.error(t('auth.passwordTooShort'));
            return;
        }

        if (!formData.agree_terms) {
            toast.error(t('auth.mustAcceptTerms'));
            return;
        }

        registerMutation.mutate(formData);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                {/* Logo and Header */}
                <div className="text-center">
                    <div className="flex justify-center">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg p-2">
                            <img src="/images/logo/logo-96x96.png" alt="TimeIsMoney" className="w-full h-full object-contain" />
                        </div>
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        {t('auth.createAccount')}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        {t('auth.freeTrialMessage')}
                    </p>
                </div>

                {/* Register Form */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        {/* Name Field */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                {t('auth.fullName')} *
                            </label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <UserIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                    placeholder={t('auth.fullNamePlaceholder')}
                                />
                            </div>
                        </div>

                        {/* Email Field */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                {t('auth.emailAddress')} *
                            </label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                    placeholder={t('auth.emailPlaceholder')}
                                />
                            </div>
                        </div>

                        {/* Tenant Name */}
                        <div>
                            <label htmlFor="tenant_name" className="block text-sm font-medium text-gray-700">
                                {t('auth.organizationName')} *
                            </label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="tenant_name"
                                    name="tenant_name"
                                    type="text"
                                    required
                                    value={formData.tenant_name}
                                    onChange={(e) => setFormData({ ...formData, tenant_name: e.target.value })}
                                    className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                    placeholder={t('auth.organizationPlaceholder')}
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                {t('auth.password')} *
                            </label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="appearance-none block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                    placeholder={t('auth.passwordPlaceholder')}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                    ) : (
                                        <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                    )}
                                </button>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                {t('auth.passwordMinLength')}
                            </p>
                        </div>

                        {/* Password Confirmation */}
                        <div>
                            <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700">
                                {t('auth.confirmPassword')} *
                            </label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password_confirmation"
                                    name="password_confirmation"
                                    type={showPasswordConfirm ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    required
                                    value={formData.password_confirmation}
                                    onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                                    className="appearance-none block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                    placeholder={t('auth.passwordPlaceholder')}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                                >
                                    {showPasswordConfirm ? (
                                        <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                    ) : (
                                        <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Terms Checkbox */}
                        <div className="flex items-start">
                            <div className="flex items-center h-5">
                                <input
                                    id="agree_terms"
                                    name="agree_terms"
                                    type="checkbox"
                                    checked={formData.agree_terms}
                                    onChange={(e) => setFormData({ ...formData, agree_terms: e.target.checked })}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                            </div>
                            <div className="ml-2 text-sm">
                                <label htmlFor="agree_terms" className="text-gray-700">
                                    {t('auth.agreeToTerms')}{' '}
                                    <a href="#" className="text-blue-600 hover:text-blue-500">
                                        {t('auth.termsOfService')}
                                    </a>{' '}
                                    {t('auth.and')}{' '}
                                    <a href="#" className="text-blue-600 hover:text-blue-500">
                                        {t('auth.privacyPolicy')}
                                    </a>
                                </label>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={registerMutation.isPending}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {registerMutation.isPending ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    {t('auth.creatingAccount')}
                                </>
                            ) : (
                                <>
                                    {t('auth.createAccountButton')}
                                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Login Link */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            {t('auth.alreadyHaveAccount')}{' '}
                            <Link
                                to="/login"
                                className="font-medium text-blue-600 hover:text-blue-500 transition"
                            >
                                {t('auth.loginLink')}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
