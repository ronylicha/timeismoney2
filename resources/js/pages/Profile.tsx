import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { UserCircleIcon, EnvelopeIcon, PhoneIcon, MapPinIcon, CameraIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

const Profile: React.FC = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch user profile
    const { data: user, isLoading } = useQuery({
        queryKey: ['user-profile'],
        queryFn: async () => {
            const response = await axios.get('/user/profile');
            return response.data;
        },
    });

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        job_title: '',
        department: '',
        bio: '',
    });

    // Update form data when user data is loaded
    React.useEffect(() => {
        if (user) {
            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || '',
                phone: user.phone || '',
                job_title: user.job_title || '',
                department: user.department || '',
                bio: user.bio || '',
            });
        }
    }, [user]);

    // Update profile mutation
    const updateProfileMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const response = await axios.patch('/user/profile', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-profile'] });
            toast.success(t('profile.updateSuccess'));
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || t('profile.updateError'));
        },
    });

    // Upload avatar mutation
    const uploadAvatarMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('avatar', file);
            const response = await axios.post('/user/avatar', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-profile'] });
            toast.success(t('profile.avatarUploadSuccess'));
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || t('profile.avatarUploadError'));
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateProfileMutation.mutate(formData);
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                toast.error(t('profile.avatarSizeError'));
                return;
            }
            uploadAvatarMutation.mutate(file);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    if (isLoading) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="h-24 w-24 bg-gray-200 rounded-full mb-4"></div>
                        <div className="space-y-4">
                            <div className="h-10 bg-gray-200 rounded"></div>
                            <div className="h-10 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const avatarUrl = user?.avatar
        ? `/storage/${user.avatar}`
        : null;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">{t('profile.title')}</h1>
                <p className="mt-2 text-gray-600">{t('profile.subtitle')}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex items-center space-x-6 mb-6">
                    <div className="relative">
                        <div className="h-24 w-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                                <UserCircleIcon className="h-16 w-16 text-gray-400" />
                            )}
                        </div>
                        <button
                            onClick={triggerFileInput}
                            className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
                            disabled={uploadAvatarMutation.isPending}
                        >
                            <CameraIcon className="h-4 w-4" />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                        />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            {user?.first_name || user?.last_name
                                ? `${user.first_name} ${user.last_name}`.trim()
                                : user?.name || t('profile.title')}
                        </h2>
                        <p className="text-gray-600">{user?.email}</p>
                        {uploadAvatarMutation.isPending && (
                            <p className="text-sm text-blue-600 mt-2">{t('profile.uploading')}</p>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('profile.firstName')}
                            </label>
                            <input
                                type="text"
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="John"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('profile.lastName')}
                            </label>
                            <input
                                type="text"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Doe"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <EnvelopeIcon className="h-4 w-4 inline mr-1" />
                                {t('profile.email')} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="john.doe@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <PhoneIcon className="h-4 w-4 inline mr-1" />
                                {t('profile.phone')}
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="+33 6 12 34 56 78"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('profile.jobTitle')}
                            </label>
                            <input
                                type="text"
                                value={formData.job_title}
                                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Developer"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('profile.department')}
                            </label>
                            <input
                                type="text"
                                value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="IT"
                            />
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.bio')}</h3>
                        <textarea
                            rows={4}
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={t('profile.bioPlaceholder')}
                        />
                    </div>

                    <div className="mt-6">
                        <p className="text-sm text-gray-500">
                            <span className="text-red-500">*</span> {t('profile.requiredFields')}
                        </p>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={() => {
                                if (user) {
                                    setFormData({
                                        first_name: user.first_name || '',
                                        last_name: user.last_name || '',
                                        email: user.email || '',
                                        phone: user.phone || '',
                                        job_title: user.job_title || '',
                                        department: user.department || '',
                                        bio: user.bio || '',
                                    });
                                }
                            }}
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={updateProfileMutation.isPending}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                        >
                            {updateProfileMutation.isPending ? t('common.loading') : t('common.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Profile;
