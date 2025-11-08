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

const AdminNotifications: React.FC = () => {
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
            toast.success('Notification envoyée avec succès');
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
            toast.error('Erreur lors de l\'envoi de la notification');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendNotificationMutation.mutate(formData);
    };

    const notificationTypes = [
        { id: 'system', name: 'Système', icon: BellIcon, color: 'blue', description: 'Notifications système' },
        { id: 'announcement', name: 'Annonce', icon: MegaphoneIcon, color: 'purple', description: 'Annonces générales' },
        { id: 'maintenance', name: 'Maintenance', icon: XCircleIcon, color: 'yellow', description: 'Alertes maintenance' },
        { id: 'security', name: 'Sécurité', icon: CheckCircleIcon, color: 'red', description: 'Alertes sécurité' },
    ];

    const recentNotifications = [
        {
            id: 1,
            title: 'Mise à jour système',
            message: 'Le système sera mis à jour ce soir à 22h00',
            type: 'system',
            sentAt: '2025-01-08 10:30',
            recipients: 150,
        },
        {
            id: 2,
            title: 'Nouvelles fonctionnalités',
            message: 'Découvrez les nouvelles fonctionnalités de reporting',
            type: 'announcement',
            sentAt: '2025-01-07 14:15',
            recipients: 200,
        },
        {
            id: 3,
            title: 'Maintenance planifiée',
            message: 'Maintenance planifiée demain de 2h à 4h du matin',
            type: 'maintenance',
            sentAt: '2025-01-06 09:00',
            recipients: 200,
        },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Notifications Système</h1>
                <p className="mt-2 text-gray-600">Envoyez des notifications à tous les utilisateurs ou groupes spécifiques</p>
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
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Envoyer une notification</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Titre de la notification
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex: Mise à jour système"
                            required
                        />
                    </div>

                    {/* Message */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Message
                        </label>
                        <textarea
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Votre message ici..."
                            required
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Type de notification
                        </label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="info">Information</option>
                            <option value="success">Succès</option>
                            <option value="warning">Avertissement</option>
                            <option value="error">Erreur</option>
                        </select>
                    </div>

                    {/* Target */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Destinataires
                        </label>
                        <select
                            value={formData.target}
                            onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">Tous les utilisateurs</option>
                            <option value="admins">Administrateurs uniquement</option>
                            <option value="tenants">Tous les tenants</option>
                            <option value="active">Utilisateurs actifs uniquement</option>
                        </select>
                    </div>

                    {/* Channels */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Canaux de diffusion
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
                                    <p className="text-sm font-medium text-gray-900">Notification dans l'app</p>
                                    <p className="text-xs text-gray-500">Affichée dans l'interface utilisateur</p>
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
                                    <p className="text-sm font-medium text-gray-900">Email</p>
                                    <p className="text-xs text-gray-500">Envoyée par email</p>
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
                                    <p className="text-sm font-medium text-gray-900">Notification push</p>
                                    <p className="text-xs text-gray-500">Sur mobile et navigateur</p>
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
                            {sendNotificationMutation.isPending ? 'Envoi...' : 'Envoyer la notification'}
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
                            Réinitialiser
                        </button>
                    </div>
                </form>
            </div>

            {/* Recent Notifications */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Notifications récentes</h2>
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
                                        <span>{notification.recipients} destinataires</span>
                                    </div>
                                </div>
                                <button className="text-sm text-blue-600 hover:text-blue-700">
                                    Voir détails
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
