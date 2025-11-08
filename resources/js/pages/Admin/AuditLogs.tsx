import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
    ClockIcon,
    UserIcon,
    ComputerDesktopIcon,
    GlobeAltIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    ArrowDownTrayIcon,
    ArrowPathIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    InformationCircleIcon,
    XCircleIcon,
    DocumentTextIcon,
    CurrencyEuroIcon,
    FolderIcon,
    ClipboardDocumentCheckIcon,
    ArrowRightOnRectangleIcon,
    ArrowLeftOnRectangleIcon,
    ShieldCheckIcon,
    CogIcon,
    TrashIcon,
    PencilIcon,
    PlusIcon
} from '@heroicons/react/24/outline';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ActivityLog {
    id: number;
    user_id: number;
    tenant_id: number;
    type: string;
    description: string;
    properties: any;
    ip_address: string;
    user_agent: string;
    created_at: string;
    user?: {
        id: number;
        name: string;
        email: string;
    };
    tenant?: {
        id: number;
        name: string;
    };
}

const AuditLogs: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [filterUser, setFilterUser] = useState<string>('all');
    const [filterTenant, setFilterTenant] = useState<string>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedLog, setExpandedLog] = useState<number | null>(null);

    // Activity types for filtering
    const activityTypes = [
        { value: 'all', label: 'Tous les types' },
        { value: 'authentication', label: 'Authentification', types: ['user_login', 'user_logout', 'user_2fa_enabled', 'user_2fa_disabled'] },
        { value: 'user_management', label: 'Gestion utilisateurs', types: ['user_created', 'user_updated', 'user_deleted', 'user_suspended'] },
        { value: 'tenant_management', label: 'Gestion tenants', types: ['tenant_created', 'tenant_updated', 'tenant_deleted'] },
        { value: 'projects', label: 'Projets', types: ['project_created', 'project_updated', 'project_deleted'] },
        { value: 'invoices', label: 'Factures', types: ['invoice_created', 'invoice_sent', 'invoice_paid', 'chorus_pro_sent'] },
        { value: 'system', label: 'Système', types: ['settings_updated', 'system_error', 'maintenance_mode_enabled'] }
    ];

    // Fetch audit logs
    const { data: logsData, isLoading, refetch } = useQuery({
        queryKey: ['admin-audit-logs', currentPage, searchTerm, filterType, filterUser, filterTenant, dateFrom, dateTo],
        queryFn: async () => {
            const params: any = {
                page: currentPage,
                per_page: 50,
                search: searchTerm
            };

            if (filterType !== 'all') {
                const typeGroup = activityTypes.find(t => t.value === filterType);
                if (typeGroup && typeGroup.types) {
                    params.types = typeGroup.types.join(',');
                }
            }

            if (filterUser !== 'all') params.user_id = filterUser;
            if (filterTenant !== 'all') params.tenant_id = filterTenant;
            if (dateFrom) params.date_from = startOfDay(parseISO(dateFrom)).toISOString();
            if (dateTo) params.date_to = endOfDay(parseISO(dateTo)).toISOString();

            const response = await axios.get('/api/admin/audit-logs', { params });
            return response.data;
        }
    });

    // Fetch users for filter
    const { data: users } = useQuery({
        queryKey: ['admin-users-list'],
        queryFn: async () => {
            const response = await axios.get('/api/admin/users', { params: { per_page: 100 } });
            return response.data.data;
        }
    });

    // Fetch tenants for filter
    const { data: tenants } = useQuery({
        queryKey: ['admin-tenants-list'],
        queryFn: async () => {
            const response = await axios.get('/api/admin/tenants', { params: { per_page: 100 } });
            return response.data.data;
        }
    });

    // Export logs
    const exportLogs = async () => {
        try {
            const params: any = {
                search: searchTerm,
                format: 'csv'
            };

            if (filterType !== 'all') {
                const typeGroup = activityTypes.find(t => t.value === filterType);
                if (typeGroup && typeGroup.types) {
                    params.types = typeGroup.types.join(',');
                }
            }

            if (filterUser !== 'all') params.user_id = filterUser;
            if (filterTenant !== 'all') params.tenant_id = filterTenant;
            if (dateFrom) params.date_from = startOfDay(parseISO(dateFrom)).toISOString();
            if (dateTo) params.date_to = endOfDay(parseISO(dateTo)).toISOString();

            const response = await axios.get('/api/admin/audit-logs/export', {
                params,
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `audit_logs_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Export error:', error);
        }
    };

    // Get icon for activity type
    const getActivityIcon = (type: string) => {
        const iconMap: { [key: string]: any } = {
            'user_login': ArrowRightOnRectangleIcon,
            'user_logout': ArrowLeftOnRectangleIcon,
            'user_2fa_enabled': ShieldCheckIcon,
            'user_2fa_disabled': ShieldCheckIcon,
            'user_created': PlusIcon,
            'user_updated': PencilIcon,
            'user_deleted': TrashIcon,
            'project_created': FolderIcon,
            'project_updated': FolderIcon,
            'task_completed': ClipboardDocumentCheckIcon,
            'invoice_created': DocumentTextIcon,
            'invoice_paid': CurrencyEuroIcon,
            'settings_updated': CogIcon,
            'system_error': ExclamationTriangleIcon
        };

        const Icon = iconMap[type] || InformationCircleIcon;
        return <Icon className="h-5 w-5" />;
    };

    // Get color for activity type
    const getActivityColor = (type: string) => {
        if (type.includes('delete') || type.includes('error') || type.includes('fail')) return 'text-red-600 bg-red-100';
        if (type.includes('create') || type.includes('add')) return 'text-green-600 bg-green-100';
        if (type.includes('update') || type.includes('edit')) return 'text-blue-600 bg-blue-100';
        if (type.includes('login') || type.includes('logout')) return 'text-purple-600 bg-purple-100';
        if (type.includes('suspend') || type.includes('warning')) return 'text-yellow-600 bg-yellow-100';
        return 'text-gray-600 bg-gray-100';
    };

    // Get severity level
    const getSeverityLevel = (type: string) => {
        if (type.includes('error') || type.includes('fail') || type.includes('delete')) return 'high';
        if (type.includes('suspend') || type.includes('warning')) return 'medium';
        return 'low';
    };

    // Format user agent
    const formatUserAgent = (userAgent: string) => {
        if (!userAgent) return 'Unknown';

        // Extract browser and OS
        const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/);
        const osMatch = userAgent.match(/(Windows|Mac|Linux|Android|iOS)/);

        const browser = browserMatch ? browserMatch[1] : 'Unknown Browser';
        const os = osMatch ? osMatch[1] : 'Unknown OS';

        return `${browser} on ${os}`;
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Journaux d'Audit</h1>
                <p className="text-gray-600">
                    Suivi complet de toutes les activités et modifications du système
                </p>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <ClockIcon className="h-8 w-8 text-blue-600 mr-3" />
                        <div>
                            <p className="text-sm text-gray-600">Dernière activité</p>
                            <p className="text-lg font-semibold">
                                {logsData?.data?.[0] ?
                                    format(parseISO(logsData.data[0].created_at), 'HH:mm', { locale: fr })
                                    : '-'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <UserIcon className="h-8 w-8 text-green-600 mr-3" />
                        <div>
                            <p className="text-sm text-gray-600">Utilisateurs actifs</p>
                            <p className="text-lg font-semibold">
                                {logsData?.stats?.unique_users || 0}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <ExclamationTriangleIcon className="h-8 w-8 text-red-600 mr-3" />
                        <div>
                            <p className="text-sm text-gray-600">Erreurs système</p>
                            <p className="text-lg font-semibold">
                                {logsData?.stats?.errors || 0}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <DocumentTextIcon className="h-8 w-8 text-purple-600 mr-3" />
                        <div>
                            <p className="text-sm text-gray-600">Total événements</p>
                            <p className="text-lg font-semibold">
                                {logsData?.total || 0}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {/* Search */}
                    <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Recherche</label>
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Rechercher dans les logs..."
                                className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Type Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            {activityTypes.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* User Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Utilisateur</label>
                        <select
                            value={filterUser}
                            onChange={(e) => setFilterUser(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">Tous</option>
                            {users?.map((user: any) => (
                                <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date From */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Du</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Date To */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Au</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex justify-between">
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setFilterType('all');
                            setFilterUser('all');
                            setFilterTenant('all');
                            setDateFrom('');
                            setDateTo('');
                            setCurrentPage(1);
                        }}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Réinitialiser
                    </button>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => refetch()}
                            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            <ArrowPathIcon className="h-5 w-5 mr-2" />
                            Actualiser
                        </button>
                        <button
                            onClick={exportLogs}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                            Exporter
                        </button>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Chargement des journaux...</p>
                    </div>
                ) : logsData?.data?.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <ClockIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>Aucun journal trouvé pour ces critères</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date/Heure
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Description
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Utilisateur
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Détails
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {logsData?.data?.map((log: ActivityLog) => (
                                        <React.Fragment key={log.id}>
                                            <tr
                                                className={`hover:bg-gray-50 cursor-pointer ${
                                                    getSeverityLevel(log.type) === 'high' ? 'bg-red-50' :
                                                    getSeverityLevel(log.type) === 'medium' ? 'bg-yellow-50' : ''
                                                }`}
                                                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div>
                                                        {format(parseISO(log.created_at), 'dd/MM/yyyy', { locale: fr })}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {format(parseISO(log.created_at), 'HH:mm:ss', { locale: fr })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActivityColor(log.type)}`}>
                                                        {getActivityIcon(log.type)}
                                                        <span className="ml-1">{log.type}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900 max-w-xs truncate">
                                                        {log.description}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {log.user ? (
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {log.user.name}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {log.user.email}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-gray-500">Système</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                                                        <ComputerDesktopIcon className="h-4 w-4" />
                                                        <span>{formatUserAgent(log.user_agent)}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                                                        <GlobeAltIcon className="h-4 w-4" />
                                                        <span>{log.ip_address}</span>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Expanded Details */}
                                            {expandedLog === log.id && log.properties && Object.keys(log.properties).length > 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-4 bg-gray-50">
                                                        <div className="text-sm">
                                                            <h4 className="font-medium text-gray-900 mb-2">Propriétés additionnelles:</h4>
                                                            <pre className="bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                                                                {JSON.stringify(log.properties, null, 2)}
                                                            </pre>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {logsData && logsData.last_page > 1 && (
                            <div className="px-6 py-3 bg-gray-50 flex items-center justify-between">
                                <div className="text-sm text-gray-700">
                                    Affichage de {logsData.from} à {logsData.to} sur {logsData.total} entrées
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setCurrentPage(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1 border border-gray-300 rounded-md hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeftIcon className="h-5 w-5" />
                                    </button>

                                    {/* Page numbers */}
                                    <div className="flex space-x-1">
                                        {[...Array(Math.min(5, logsData.last_page))].map((_, i) => {
                                            const page = i + 1;
                                            if (page === currentPage ||
                                                (page === 1) ||
                                                (page === logsData.last_page) ||
                                                (page >= currentPage - 1 && page <= currentPage + 1)) {
                                                return (
                                                    <button
                                                        key={page}
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`px-3 py-1 rounded-md ${
                                                            page === currentPage
                                                                ? 'bg-blue-600 text-white'
                                                                : 'border border-gray-300 hover:bg-white'
                                                        }`}
                                                    >
                                                        {page}
                                                    </button>
                                                );
                                            }
                                            return null;
                                        })}
                                        {logsData.last_page > 5 && currentPage < logsData.last_page - 2 && (
                                            <>
                                                <span className="px-2">...</span>
                                                <button
                                                    onClick={() => setCurrentPage(logsData.last_page)}
                                                    className="px-3 py-1 border border-gray-300 rounded-md hover:bg-white"
                                                >
                                                    {logsData.last_page}
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => setCurrentPage(currentPage + 1)}
                                        disabled={currentPage === logsData.last_page}
                                        className="px-3 py-1 border border-gray-300 rounded-md hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRightIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AuditLogs;