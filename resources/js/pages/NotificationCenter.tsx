import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    BellIcon,
    CheckCircleIcon,
    XCircleIcon,
    FunnelIcon,
    TrashIcon,
    CheckIcon,
    ClockIcon,
    DocumentTextIcon,
    CurrencyEuroIcon,
    UserGroupIcon,
    FolderIcon,
    ChartBarIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    CogIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

interface Notification {
    id: number;
    type: string;
    data: {
        title: string;
        body: string;
        url?: string;
        icon?: string;
        level?: 'info' | 'success' | 'warning' | 'error';
        metadata?: any;
    };
    read: boolean;
    sent_at: string;
    read_at?: string;
}

const NotificationCenter: React.FC = () => {
    const queryClient = useQueryClient();
    const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'read'>('all');
    const [selectedType, setSelectedType] = useState<string>('all');
    const [selectedNotifications, setSelectedNotifications] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Notification types with icons and colors
    const notificationTypes = {
        all: { label: 'Toutes', icon: BellIcon, color: 'gray' },
        timer: { label: 'Timer', icon: ClockIcon, color: 'blue' },
        invoice: { label: 'Factures', icon: DocumentTextIcon, color: 'green' },
        payment: { label: 'Paiements', icon: CurrencyEuroIcon, color: 'emerald' },
        project: { label: 'Projets', icon: FolderIcon, color: 'purple' },
        task: { label: 'Tâches', icon: CheckCircleIcon, color: 'indigo' },
        expense: { label: 'Dépenses', icon: XCircleIcon, color: 'red' },
        team: { label: 'Équipe', icon: UserGroupIcon, color: 'orange' },
        report: { label: 'Rapports', icon: ChartBarIcon, color: 'cyan' },
        system: { label: 'Système', icon: CogIcon, color: 'gray' },
    };

    // Fetch notifications with filters
    const { data: notificationsData, isLoading, refetch } = useQuery({
        queryKey: ['notifications-center', selectedFilter, selectedType, searchQuery],
        queryFn: async () => {
            const params: any = { per_page: 100 };

            if (selectedFilter === 'unread') params.unread_only = true;
            if (selectedFilter === 'read') params.read_only = true;
            if (selectedType !== 'all') params.type = selectedType;
            if (searchQuery) params.search = searchQuery;

            const response = await axios.get('/api/notifications/history', { params });
            return response.data;
        }
    });

    const notifications = notificationsData?.data || [];
    const meta = notificationsData?.meta || {};

    // Mark as read mutation
    const markAsReadMutation = useMutation({
        mutationFn: async (ids: number[]) => {
            await Promise.all(ids.map(id => axios.put(`/api/notifications/${id}/read`)));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications-center'] });
            queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
            toast.success(`${selectedNotifications.length} notification(s) marquée(s) comme lue(s)`);
            setSelectedNotifications([]);
        }
    });

    // Mark all as read mutation
    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            await axios.put('/api/notifications/read-all');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications-center'] });
            queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
            toast.success('Toutes les notifications ont été marquées comme lues');
        }
    });

    // Delete notifications mutation
    const deleteNotificationsMutation = useMutation({
        mutationFn: async (ids: number[]) => {
            await Promise.all(ids.map(id => axios.delete(`/api/notifications/${id}`)));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications-center'] });
            toast.success(`${selectedNotifications.length} notification(s) supprimée(s)`);
            setSelectedNotifications([]);
        }
    });

    // Get icon for notification type
    const getNotificationIcon = (type: string) => {
        const typeCategory = type.split('_')[0];
        const IconComponent = notificationTypes[typeCategory as keyof typeof notificationTypes]?.icon || BellIcon;
        const color = notificationTypes[typeCategory as keyof typeof notificationTypes]?.color || 'gray';

        return (
            <div className={`p-2 bg-${color}-100 text-${color}-600 rounded-lg`}>
                <IconComponent className="h-5 w-5" />
            </div>
        );
    };

    // Get level icon
    const getLevelIcon = (level?: string) => {
        switch (level) {
            case 'success':
                return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
            case 'warning':
                return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
            case 'error':
                return <XCircleIcon className="h-5 w-5 text-red-500" />;
            default:
                return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
        }
    };

    // Format date
    const formatNotificationDate = (date: string) => {
        const parsedDate = parseISO(date);

        if (isToday(parsedDate)) {
            return `Aujourd'hui à ${format(parsedDate, 'HH:mm', { locale: fr })}`;
        } else if (isYesterday(parsedDate)) {
            return `Hier à ${format(parsedDate, 'HH:mm', { locale: fr })}`;
        } else {
            return format(parsedDate, 'dd MMM yyyy à HH:mm', { locale: fr });
        }
    };

    // Group notifications by date
    const groupedNotifications = notifications.reduce((acc: any, notification: Notification) => {
        const date = format(parseISO(notification.sent_at), 'yyyy-MM-dd');
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(notification);
        return acc;
    }, {});

    // Handle select all
    const handleSelectAll = () => {
        if (selectedNotifications.length === notifications.length) {
            setSelectedNotifications([]);
        } else {
            setSelectedNotifications(notifications.map((n: Notification) => n.id));
        }
    };

    // Handle notification click
    const handleNotificationClick = (notification: Notification) => {
        if (notification.data.url) {
            window.location.href = notification.data.url;
        }

        if (!notification.read) {
            markAsReadMutation.mutate([notification.id]);
        }
    };

    // Stats
    const unreadCount = notifications.filter((n: Notification) => !n.read).length;
    const todayCount = notifications.filter((n: Notification) => isToday(parseISO(n.sent_at))).length;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Centre de Notifications</h1>
                <p className="mt-2 text-gray-600">Gérez et consultez toutes vos notifications</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Non lues</p>
                            <p className="text-2xl font-bold text-gray-900">{unreadCount}</p>
                        </div>
                        <div className="p-3 bg-red-100 rounded-lg">
                            <BellIcon className="h-6 w-6 text-red-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Aujourd'hui</p>
                            <p className="text-2xl font-bold text-gray-900">{todayCount}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <ClockIcon className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Cette semaine</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {notifications.filter((n: Notification) => {
                                    const date = parseISO(n.sent_at);
                                    const now = new Date();
                                    const weekAgo = new Date(now.setDate(now.getDate() - 7));
                                    return date > weekAgo;
                                }).length}
                            </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <ChartBarIcon className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total</p>
                            <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <FolderIcon className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters and Actions */}
            <div className="bg-white rounded-lg shadow mb-6">
                <div className="p-4 border-b border-gray-200">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Search */}
                        <div className="flex-1 max-w-md">
                            <input
                                type="text"
                                placeholder="Rechercher dans les notifications..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setSelectedFilter('all')}
                                className={`px-4 py-2 rounded-lg font-medium transition ${
                                    selectedFilter === 'all'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                Toutes
                            </button>
                            <button
                                onClick={() => setSelectedFilter('unread')}
                                className={`px-4 py-2 rounded-lg font-medium transition ${
                                    selectedFilter === 'unread'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                Non lues ({unreadCount})
                            </button>
                            <button
                                onClick={() => setSelectedFilter('read')}
                                className={`px-4 py-2 rounded-lg font-medium transition ${
                                    selectedFilter === 'read'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                Lues
                            </button>
                        </div>

                        {/* Bulk Actions */}
                        {selectedNotifications.length > 0 && (
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => markAsReadMutation.mutate(selectedNotifications)}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                                >
                                    <CheckIcon className="h-4 w-4 inline mr-1" />
                                    Marquer comme lu ({selectedNotifications.length})
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm('Êtes-vous sûr de vouloir supprimer ces notifications ?')) {
                                            deleteNotificationsMutation.mutate(selectedNotifications);
                                        }
                                    }}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                                >
                                    <TrashIcon className="h-4 w-4 inline mr-1" />
                                    Supprimer ({selectedNotifications.length})
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Type Filter */}
                    <div className="mt-4 flex items-center space-x-2 overflow-x-auto">
                        {Object.entries(notificationTypes).map(([key, type]) => (
                            <button
                                key={key}
                                onClick={() => setSelectedType(key)}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                                    selectedType === key
                                        ? `bg-${type.color}-100 text-${type.color}-700`
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <type.icon className="h-4 w-4" />
                                <span>{type.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Actions Bar */}
                {notifications.length > 0 && (
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={selectedNotifications.length === notifications.length}
                                onChange={handleSelectAll}
                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <label className="ml-2 text-sm text-gray-600">
                                Tout sélectionner
                            </label>
                        </div>

                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllAsReadMutation.mutate()}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Tout marquer comme lu
                            </button>
                        )}
                    </div>
                )}

                {/* Notifications List */}
                <div className="divide-y divide-gray-200">
                    {isLoading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Chargement des notifications...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-8 text-center">
                            <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">Aucune notification trouvée</p>
                            <p className="text-sm text-gray-500 mt-2">
                                {searchQuery ? 'Essayez avec d\'autres critères de recherche' : 'Vous êtes à jour !'}
                            </p>
                        </div>
                    ) : (
                        Object.entries(groupedNotifications).map(([date, dateNotifications]: [string, any]) => (
                            <div key={date}>
                                <div className="px-4 py-2 bg-gray-50">
                                    <h3 className="text-sm font-semibold text-gray-700">
                                        {isToday(parseISO(date + 'T00:00:00'))
                                            ? 'Aujourd\'hui'
                                            : isYesterday(parseISO(date + 'T00:00:00'))
                                            ? 'Hier'
                                            : format(parseISO(date), 'EEEE d MMMM yyyy', { locale: fr })}
                                    </h3>
                                </div>
                                {dateNotifications.map((notification: Notification) => (
                                    <div
                                        key={notification.id}
                                        className={`px-4 py-4 hover:bg-gray-50 transition ${
                                            !notification.read ? 'bg-blue-50' : ''
                                        }`}
                                    >
                                        <div className="flex items-start space-x-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedNotifications.includes(notification.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedNotifications([...selectedNotifications, notification.id]);
                                                    } else {
                                                        setSelectedNotifications(
                                                            selectedNotifications.filter(id => id !== notification.id)
                                                        );
                                                    }
                                                }}
                                                className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            />

                                            {getNotificationIcon(notification.type)}

                                            <div
                                                className="flex-1 cursor-pointer"
                                                onClick={() => handleNotificationClick(notification)}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            {notification.data.title}
                                                        </p>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {notification.data.body}
                                                        </p>
                                                        <div className="flex items-center space-x-4 mt-2">
                                                            <p className="text-xs text-gray-500">
                                                                {formatNotificationDate(notification.sent_at)}
                                                            </p>
                                                            {notification.read && notification.read_at && (
                                                                <p className="text-xs text-gray-400">
                                                                    Lu {formatDistanceToNow(parseISO(notification.read_at), {
                                                                        addSuffix: true,
                                                                        locale: fr
                                                                    })}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="ml-4 flex items-center space-x-2">
                                                        {getLevelIcon(notification.data.level)}
                                                        {!notification.read && (
                                                            <span className="h-2 w-2 bg-blue-600 rounded-full"></span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {meta.last_page > 1 && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-700">
                                Affichage de <span className="font-medium">{meta.from}</span> à{' '}
                                <span className="font-medium">{meta.to}</span> sur{' '}
                                <span className="font-medium">{meta.total}</span> notifications
                            </p>
                            {/* Add pagination controls here if needed */}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationCenter;