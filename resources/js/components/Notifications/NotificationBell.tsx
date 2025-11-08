import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface NotificationItem {
    id: number;
    type: string;
    data: {
        title: string;
        body: string;
        url?: string;
        icon?: string;
    };
    read: boolean;
    sent_at: string;
}

const NotificationBell: React.FC = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    // Fetch unread count
    const { data: unreadCount = 0 } = useQuery({
        queryKey: ['notification-unread-count'],
        queryFn: async () => {
            try {
                const response = await axios.get('/api/notifications/unread-count');
                return response.data?.unread_count ?? 0;
            } catch (error) {
                console.error('Failed to fetch unread count:', error);
                return 0;
            }
        },
        refetchInterval: 30000, // Refetch every 30 seconds
        retry: 1,
    });

    // Fetch recent notifications
    const { data: notifications = [], refetch: refetchNotifications } = useQuery({
        queryKey: ['recent-notifications'],
        queryFn: async () => {
            try {
                const response = await axios.get('/api/notifications/history', {
                    params: { per_page: 10, unread_only: false }
                });
                return response.data?.data ?? [];
            } catch (error) {
                console.error('Failed to fetch notifications:', error);
                return [];
            }
        },
        enabled: isOpen, // Only fetch when menu is open
        retry: 1,
    });

    // Mark as read mutation
    const markAsReadMutation = useMutation({
        mutationFn: async (id: number) => {
            await axios.put(`/api/notifications/${id}/read`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
            queryClient.invalidateQueries({ queryKey: ['recent-notifications'] });
        }
    });

    // Mark all as read mutation
    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            await axios.put('/api/notifications/read-all');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
            queryClient.invalidateQueries({ queryKey: ['recent-notifications'] });
        }
    });

    // Listen for push notifications
    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'NOTIFICATION_RECEIVED') {
                    // Refetch unread count when a new notification is received
                    queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });

                    // Show browser notification if permission granted
                    if (Notification.permission === 'granted') {
                        new Notification(event.data.title, {
                            body: event.data.body,
                            icon: event.data.icon,
                            badge: event.data.badge,
                            tag: event.data.tag,
                        });
                    }
                }
            });
        }
    }, [queryClient]);

    // Handle notification click
    const handleNotificationClick = (notification: NotificationItem) => {
        if (!notification.read) {
            markAsReadMutation.mutate(notification.id);
        }

        if (notification.data.url) {
            window.location.href = notification.data.url;
        }

        setIsOpen(false);
    };

    // Get icon for notification type
    const getNotificationIcon = (type: string): string => {
        const icons: Record<string, string> = {
            invoice_created: '📄',
            invoice_sent: '📨',
            invoice_overdue: '⚠️',
            payment_received: '💰',
            task_assigned: '👤',
            task_due_soon: '⏰',
            task_completed: '✅',
            timer_reminder: '⏱️',
            expense_approved: '✓',
            expense_rejected: '✗',
            chorus_pro_update: '🏛️',
            daily_summary: '📊',
            weekly_report: '📈',
            monthly_report: '📉',
        };
        return icons[type] || '🔔';
    };

    return (
        <Menu as="div" className="relative">
            <Menu.Button
                className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-full"
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) {
                        refetchNotifications();
                    }
                }}
            >
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </Menu.Button>

            <Transition
                as={Fragment}
                show={isOpen}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">{t('notifications.title')}</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllAsReadMutation.mutate()}
                                    className="text-sm text-indigo-600 hover:text-indigo-800"
                                >
                                    {t('notifications.markAllRead')}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {notifications.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                {t('notifications.noRecent')}
                            </div>
                        ) : (
                            notifications.map((notification: NotificationItem) => (
                                <Menu.Item key={notification.id}>
                                    {({ active }) => (
                                        <button
                                            onClick={() => handleNotificationClick(notification)}
                                            className={`${
                                                active ? 'bg-gray-50' : ''
                                            } ${
                                                !notification.read ? 'bg-blue-50' : ''
                                            } w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors`}
                                        >
                                            <div className="flex items-start">
                                                <span className="text-2xl mr-3">
                                                    {getNotificationIcon(notification.type)}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {notification.data.title}
                                                    </p>
                                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                        {notification.data.body}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {formatDistanceToNow(new Date(notification.sent_at), {
                                                            addSuffix: true,
                                                            locale: fr
                                                        })}
                                                    </p>
                                                </div>
                                                {!notification.read && (
                                                    <span className="ml-2 h-2 w-2 bg-blue-600 rounded-full"></span>
                                                )}
                                            </div>
                                        </button>
                                    )}
                                </Menu.Item>
                            ))
                        )}
                    </div>

                    <div className="p-3 border-t border-gray-200">
                        <Link
                            to="/notifications"
                            className="block text-center text-sm text-indigo-600 hover:text-indigo-800"
                            onClick={() => setIsOpen(false)}
                        >
                            {t('notifications.viewAll')}
                        </Link>
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
};

export default NotificationBell;