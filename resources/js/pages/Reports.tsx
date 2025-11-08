import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import {
    ChartBarIcon,
    DocumentChartBarIcon,
    CurrencyEuroIcon,
    ClockIcon,
    UserGroupIcon,
    FolderIcon,
    ArrowDownTrayIcon,
    CalendarIcon,
    FunnelIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'react-toastify';

interface ReportType {
    id: string;
    name: string;
    description: string;
    type: string;
    icon: any;
    color: string;
}

const Reports: React.FC = () => {
    const [selectedReport, setSelectedReport] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        start_date: format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'),
        end_date: format(new Date(), 'yyyy-MM-dd'),
        project_id: '',
        user_id: '',
        client_id: '',
    });
    const [reportData, setReportData] = useState<any>(null);
    const [showFilters, setShowFilters] = useState(false);

    const reportTypes: ReportType[] = [
        {
            id: 'time_summary',
            name: 'Rapport de temps',
            description: 'Résumé du temps suivi par utilisateurs, projets et clients',
            type: 'time',
            icon: ClockIcon,
            color: 'blue',
        },
        {
            id: 'invoice_summary',
            name: 'Rapport de facturation',
            description: 'Résumé des factures par statut et période',
            type: 'financial',
            icon: DocumentChartBarIcon,
            color: 'green',
        },
        {
            id: 'expense_summary',
            name: 'Rapport de dépenses',
            description: 'Résumé des dépenses par catégorie et projet',
            type: 'financial',
            icon: CurrencyEuroIcon,
            color: 'red',
        },
        {
            id: 'project_profitability',
            name: 'Rentabilité des projets',
            description: 'Analyse des revenus vs coûts par projet',
            type: 'analytics',
            icon: FolderIcon,
            color: 'purple',
        },
        {
            id: 'user_productivity',
            name: 'Productivité des utilisateurs',
            description: 'Métriques de temps et productivité par utilisateur',
            type: 'productivity',
            icon: UserGroupIcon,
            color: 'orange',
        },
    ];

    // Fetch projects for filter
    const { data: projects } = useQuery({
        queryKey: ['projects-list'],
        queryFn: async () => {
            const response = await axios.get('/projects');
            return response.data.data;
        },
    });

    // Fetch users for filter
    const { data: users } = useQuery({
        queryKey: ['users-list'],
        queryFn: async () => {
            const response = await axios.get('/users');
            return response.data.data;
        },
    });

    // Fetch clients for filter
    const { data: clients } = useQuery({
        queryKey: ['clients-list'],
        queryFn: async () => {
            const response = await axios.get('/clients');
            return response.data.data;
        },
    });

    // Generate report mutation
    const generateReportMutation = useMutation({
        mutationFn: async (reportType: string) => {
            const response = await axios.post('/reports/generate', {
                report_type: reportType,
                ...filters,
            });
            return response.data;
        },
        onSuccess: (data) => {
            setReportData(data);
            toast.success('Rapport généré avec succès');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Erreur lors de la génération du rapport');
        },
    });

    // Export FEC
    const exportFECMutation = useMutation({
        mutationFn: async (year: number) => {
            const response = await axios.get('/reports/fec', {
                params: { year },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `FEC_${year}.txt`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        },
        onSuccess: () => {
            toast.success('Export FEC téléchargé');
        },
        onError: () => {
            toast.error('Erreur lors de l\'export FEC');
        },
    });

    const handleGenerateReport = (reportType: string) => {
        setSelectedReport(reportType);
        setShowFilters(true);
    };

    const handleSubmitFilters = () => {
        if (selectedReport) {
            generateReportMutation.mutate(selectedReport);
        }
    };

    const getColorClass = (color: string) => {
        const colors: Record<string, string> = {
            blue: 'bg-blue-100 text-blue-600',
            green: 'bg-green-100 text-green-600',
            red: 'bg-red-100 text-red-600',
            purple: 'bg-purple-100 text-purple-600',
            orange: 'bg-orange-100 text-orange-600',
        };
        return colors[color] || 'bg-gray-100 text-gray-600';
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount);
    };

    const formatHours = (hours: number) => {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}h${m > 0 ? ` ${m}m` : ''}`;
    };

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Rapports</h1>
                    <p className="mt-2 text-gray-600">Générez et consultez vos rapports d'activité</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => exportFECMutation.mutate(new Date().getFullYear())}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        <ArrowDownTrayIcon className="h-5 w-5" />
                        Export FEC {new Date().getFullYear()}
                    </button>
                </div>
            </div>

            {/* Report Types Grid */}
            {!showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reportTypes.map((report) => {
                        const Icon = report.icon;
                        return (
                            <div
                                key={report.id}
                                onClick={() => handleGenerateReport(report.id)}
                                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-3 rounded-lg ${getColorClass(report.color)}`}>
                                        <Icon className="h-8 w-8" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">{report.name}</h3>
                                <p className="text-gray-600 text-sm">{report.description}</p>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">
                            {reportTypes.find((r) => r.id === selectedReport)?.name}
                        </h2>
                        <button
                            onClick={() => {
                                setShowFilters(false);
                                setReportData(null);
                                setSelectedReport(null);
                            }}
                            className="text-gray-600 hover:text-gray-900"
                        >
                            ✕ Fermer
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Date de début
                            </label>
                            <input
                                type="date"
                                value={filters.start_date}
                                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Date de fin
                            </label>
                            <input
                                type="date"
                                value={filters.end_date}
                                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Projet (optionnel)
                            </label>
                            <select
                                value={filters.project_id}
                                onChange={(e) => setFilters({ ...filters, project_id: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Tous les projets</option>
                                {projects?.map((project: any) => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Utilisateur (optionnel)
                            </label>
                            <select
                                value={filters.user_id}
                                onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Tous les utilisateurs</option>
                                {users?.map((user: any) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Client (optionnel)
                            </label>
                            <select
                                value={filters.client_id}
                                onChange={(e) => setFilters({ ...filters, client_id: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Tous les clients</option>
                                {clients?.map((client: any) => (
                                    <option key={client.id} value={client.id}>
                                        {client.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={handleSubmitFilters}
                        disabled={generateReportMutation.isPending}
                        className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                    >
                        {generateReportMutation.isPending ? 'Génération...' : 'Générer le rapport'}
                    </button>
                </div>
            )}

            {/* Report Results */}
            {reportData && (
                <div className="space-y-6">
                    {/* Time Summary Report */}
                    {selectedReport === 'time_summary' && reportData.data && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-600 mb-2">Heures totales</h3>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {formatHours(reportData.data.summary.total_hours)}
                                    </p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-600 mb-2">Heures facturables</h3>
                                    <p className="text-2xl font-bold text-green-600">
                                        {formatHours(reportData.data.summary.billable_hours)}
                                    </p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-600 mb-2">Heures non facturables</h3>
                                    <p className="text-2xl font-bold text-red-600">
                                        {formatHours(reportData.data.summary.non_billable_hours)}
                                    </p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-600 mb-2">% Facturable</h3>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {reportData.data.summary.billable_percentage}%
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* By User */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Par utilisateur</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={reportData.data.by_user}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="user" />
                                            <YAxis />
                                            <Tooltip formatter={(value: number) => formatHours(value)} />
                                            <Legend />
                                            <Bar dataKey="total_hours" fill="#3B82F6" name="Heures totales" />
                                            <Bar dataKey="billable_hours" fill="#10B981" name="Heures facturables" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* By Project */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Par projet</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={reportData.data.by_project}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={(entry) => entry.project}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="total_hours"
                                            >
                                                {reportData.data.by_project.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: number) => formatHours(value)} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Invoice Summary Report */}
                    {selectedReport === 'invoice_summary' && reportData.data && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-600 mb-2">Total factures</h3>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {reportData.data.summary.total_invoices}
                                    </p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-600 mb-2">Montant total</h3>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {formatCurrency(reportData.data.summary.total_amount)}
                                    </p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-600 mb-2">Montant payé</h3>
                                    <p className="text-2xl font-bold text-green-600">
                                        {formatCurrency(reportData.data.summary.paid_amount)}
                                    </p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-600 mb-2">En attente</h3>
                                    <p className="text-2xl font-bold text-orange-600">
                                        {formatCurrency(reportData.data.summary.pending_amount)}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Par statut</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={reportData.data.by_status}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="status" />
                                        <YAxis />
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                        <Legend />
                                        <Bar dataKey="total_amount" fill="#3B82F6" name="Montant total" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    )}

                    {/* Expense Summary Report */}
                    {selectedReport === 'expense_summary' && reportData.data && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-600 mb-2">Total dépenses</h3>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {reportData.data.summary.total_expenses}
                                    </p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-600 mb-2">Montant total</h3>
                                    <p className="text-2xl font-bold text-red-600">
                                        {formatCurrency(reportData.data.summary.total_amount)}
                                    </p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-sm font-medium text-gray-600 mb-2">Montant facturable</h3>
                                    <p className="text-2xl font-bold text-green-600">
                                        {formatCurrency(reportData.data.summary.billable_amount)}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Par catégorie</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={reportData.data.by_category}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={(entry) => entry.category}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="total_amount"
                                        >
                                            {reportData.data.by_category.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    )}

                    {/* Project Profitability Report */}
                    {selectedReport === 'project_profitability' && reportData.data && (
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Projet</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenus</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coûts</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marge</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Heures</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {reportData.data.projects.map((project: any, index: number) => (
                                            <tr key={index}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {project.project_name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                                                    {formatCurrency(project.revenue)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                                                    {formatCurrency(project.costs)}
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                                                    project.profit >= 0 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                    {formatCurrency(project.profit)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {project.profit_margin}%
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {formatHours(project.hours_tracked)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* User Productivity Report */}
                    {selectedReport === 'user_productivity' && reportData.data && (
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Heures totales</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Heures facturables</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">% Facturable</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Projets</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tâches</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {reportData.data.users.map((user: any, index: number) => (
                                            <tr key={index}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {user.user}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {formatHours(user.total_hours)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                                                    {formatHours(user.billable_hours)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                                                    {user.billable_percentage}%
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {user.projects_count}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {user.tasks_count}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Report Metadata */}
                    {reportData.metadata && (
                        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                            <p>
                                Rapport généré le {format(new Date(reportData.metadata.generated_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                                {' '}par {reportData.metadata.generated_by}
                            </p>
                            <p>
                                Période: du {format(new Date(reportData.metadata.period.start), 'dd/MM/yyyy', { locale: fr })}
                                {' '}au {format(new Date(reportData.metadata.period.end), 'dd/MM/yyyy', { locale: fr })}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Reports;
