import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
    BellIcon,
    EnvelopeIcon,
    DevicePhoneMobileIcon,
    MegaphoneIcon,
    CheckCircleIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const AdminNotifications: React.FC = () => {
    const { t } = useTranslation();
    const [notificationType, setNotificationType] = useState('system');
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        type: 'info',
        target: 'all',
        channels: {
            email: false,
            push: false,
            inApp: true,
        },
    });

    const queryClient = useQueryClient();

    // Send notification mutation
    const sendNotificationMutation = useMutation({
        mutationFn: async (data: any) => {
            // This would be replaced with actual API call
            const response = await axios.post('/admin/notifications/send', data);
            return response.data;
        },
        onSuccess: () => {
            toast.success(t('admin.notifications.sendSuccess'));
            setFormData({
                title: '',
                message: '',
                type: 'info',
                target: 'all',
                channels: {
                    email: false,
                    push: false,
                    inApp: true,
                },
            });
        },
        onError: () => {
            toast.error(t('admin.notifications.sendError'));
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendNotificationMutation.mutate(formData);
    };

    const notificationTypes = [
        { id: 'system', name: t('admin.notifications.types.system'), icon: BellIcon, color: 'blue', description: t('admin.notifications.types.systemDesc') },
        { id: 'announcement', name: t('admin.notifications.types.announcement'), icon: MegaphoneIcon, color: 'purple', description: t('admin.notifications.types.announcementDesc') },
        { id: 'maintenance', name: t('admin.notifications.types.maintenance'), icon: XCircleIcon, color: 'yellow', description: t('admin.notifications.types.maintenanceDesc') },
        { id: 'security', name: t('admin.notifications.types.security'), icon: CheckCircleIcon, color: 'red', description: t('admin.notifications.types.securityDesc') },
    ];

    const recentNotifications = [
        {
            id: 1,
            title: t('admin.notifications.recent.systemUpdate'),
            message: t('admin.notifications.recent.systemUpdateMsg'),
            type: 'system',
            sentAt: '2025-01-08 10:30',
            recipients: 150,
        },
        {
            id: 2,
            title: t('admin.notifications.recent.newFeatures'),
            message: t('admin.notifications.recent.newFeaturesMsg'),
            type: 'announcement',
            sentAt: '2025-01-07 14:15',
            recipients: 200,
        },
        {
            id: 3,
            title: t('admin.notifications.recent.plannedMaintenance'),
            message: t('admin.notifications.recent.plannedMaintenanceMsg'),
            type: 'maintenance',
            sentAt: '2025-01-06 09:00',
            recipients: 200,
        },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">{t('admin.notifications.title')}</h1>
                <p className="mt-2 text-gray-600">{t('admin.notifications.description')}</p>
            </div>

            {/* Notification Type Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {notificationTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                        <div
                            key={type.id}
                            onClick={() => setNotificationType(type.id)}
                            className={`bg-white rounded-lg shadow p-6 cursor-pointer transition ${
                                notificationType === type.id ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'
                            }`}
                        >
                            <div className={`p-3 rounded-lg bg-${type.color}-100 text-${type.color}-600 w-fit mb-3`}>
                                <Icon className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">{type.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                        </div>
                    );
                })}
            </div>

            {/* Send Notification Form */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('admin.notifications.sendNotification')}</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('admin.notifications.form.title')}
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={t('admin.notifications.form.titlePlaceholder')}
                            required
                        />
                    </div>

                    {/* Message */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('admin.notifications.form.message')}
                        </label>
                        <textarea
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={t('admin.notifications.form.messagePlaceholder')}
                            required
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('admin.notifications.form.notificationType')}
                        </label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="info">{t('admin.notifications.form.typeInfo')}</option>
                            <option value="success">{t('admin.notifications.form.typeSuccess')}</option>
                            <option value="warning">{t('admin.notifications.form.typeWarning')}</option>
                            <option value="error">{t('admin.notifications.form.typeError')}</option>
                        </select>
                    </div>

                    {/* Target */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('admin.notifications.form.recipients')}
                        </label>
                        <select
                            value={formData.target}
                            onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">{t('admin.notifications.form.targetAll')}</option>
                            <option value="admins">{t('admin.notifications.form.targetAdmins')}</option>
                            <option value="tenants">{t('admin.notifications.form.targetTenants')}</option>
                            <option value="active">{t('admin.notifications.form.targetActive')}</option>
                        </select>
                    </div>

                    {/* Channels */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            {t('admin.notifications.form.channels')}
                        </label>
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.channels.inApp}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            channels: { ...formData.channels, inApp: e.target.checked },
                                        })
                                    }
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <BellIcon className="h-5 w-5 text-blue-600" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{t('admin.notifications.form.channelInApp')}</p>
                                    <p className="text-xs text-gray-500">{t('admin.notifications.form.channelInAppDesc')}</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.channels.email}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            channels: { ...formData.channels, email: e.target.checked },
                                        })
                                    }
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <EnvelopeIcon className="h-5 w-5 text-green-600" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{t('admin.notifications.form.channelEmail')}</p>
                                    <p className="text-xs text-gray-500">{t('admin.notifications.form.channelEmailDesc')}</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.channels.push}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            channels: { ...formData.channels, push: e.target.checked },
                                        })
                                    }
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <DevicePhoneMobileIcon className="h-5 w-5 text-purple-600" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{t('admin.notifications.form.channelPush')}</p>
                                    <p className="text-xs text-gray-500">{t('admin.notifications.form.channelPushDesc')}</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={sendNotificationMutation.isPending}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                        >
                            {sendNotificationMutation.isPending ? t('admin.notifications.form.sending') : t('admin.notifications.form.send')}
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                setFormData({
                                    title: '',
                                    message: '',
                                    type: 'info',
                                    target: 'all',
                                    channels: { email: false, push: false, inApp: true },
                                })
                            }
                            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                            {t('admin.notifications.form.reset')}
                        </button>
                    </div>
                </form>
            </div>

            {/* Recent Notifications */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('admin.notifications.recentNotifications')}</h2>
                <div className="space-y-4">
                    {recentNotifications.map((notification) => {
                        const typeConfig = notificationTypes.find((t) => t.id === notification.type);
                        const Icon = typeConfig?.icon || BellIcon;

                        return (
                            <div key={notification.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                                <div className={`p-2 rounded-lg bg-${typeConfig?.color}-100`}>
                                    <Icon className={`h-5 w-5 text-${typeConfig?.color}-600`} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-gray-900">{notification.title}</h3>
                                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                        <span>{notification.sentAt}</span>
                                        <span>•</span>
                                        <span>{t('admin.notifications.recipients', { count: notification.recipients })}</span>
                                    </div>
                                </div>
                                <button className="text-sm text-blue-600 hover:text-blue-700">
                                    {t('admin.notifications.viewDetails')}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AdminNotifications;
