import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
    CheckCircle, 
    XCircle, 
    AlertTriangle, 
    TrendingUp,
    FileText,
    Shield,
    QrCode,
    AlertCircle
} from 'lucide-react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface ComplianceMetrics {
    total_invoices: number;
    compliant_invoices: number;
    compliance_rate: number;
    pending_validation: number;
    total_warnings: number;
    total_errors: number;
    with_qr_code: number;
    qr_code_rate: number;
    electronic_ready: number;
    electronic_rate: number;
    sequence_valid: boolean;
    sequence_gaps: number;
    chorus_sent: number;
}

interface NonCompliantInvoice {
    id: number;
    invoice_number: string;
    client_name: string;
    date: string;
    total: number;
    is_compliant: boolean;
    compliance_score: number;
    errors: string[];
    warnings: string[];
    critical_issues: number;
}

export default function Compliance() {
    const { t } = useTranslation();

    // Récupérer les métriques de conformité
    const { data: metrics, isLoading: metricsLoading } = useQuery<ComplianceMetrics>({
        queryKey: ['compliance-metrics'],
        queryFn: async () => {
            const response = await axios.get('/api/compliance/metrics');
            return response.data.data;
        },
    });

    // Récupérer les factures non conformes
    const { data: nonCompliant, isLoading: nonCompliantLoading } = useQuery<NonCompliantInvoice[]>({
        queryKey: ['non-compliant-invoices'],
        queryFn: async () => {
            const response = await axios.get('/api/compliance/non-compliant');
            return response.data.data;
        },
    });

    if (metricsLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const getComplianceColor = (rate: number) => {
        if (rate >= 90) return 'text-green-600';
        if (rate >= 70) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getComplianceBackground = (rate: number) => {
        if (rate >= 90) return 'bg-green-50 border-green-200';
        if (rate >= 70) return 'bg-yellow-50 border-yellow-200';
        return 'bg-red-50 border-red-200';
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Conformité Facturation Française
                        </h1>
                        <p className="mt-2 text-gray-600">
                            Vérification automatique de la conformité légale de vos factures
                        </p>
                    </div>
                    <Link
                        to="/compliance/fec-export"
                        className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <ArrowDownTrayIcon className="h-5 w-5" />
                        <span>Export FEC</span>
                    </Link>
                </div>
            </div>

            {/* Métriques principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Taux de conformité */}
                <div className={`rounded-lg border-2 p-6 ${getComplianceBackground(metrics?.compliance_rate || 0)}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Taux de Conformité</p>
                            <p className={`text-3xl font-bold mt-2 ${getComplianceColor(metrics?.compliance_rate || 0)}`}>
                                {metrics?.compliance_rate.toFixed(1)}%
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                {metrics?.compliant_invoices}/{metrics?.total_invoices} factures
                            </p>
                        </div>
                        {metrics?.compliance_rate >= 90 ? (
                            <CheckCircle className="h-12 w-12 text-green-600" />
                        ) : (
                            <AlertTriangle className="h-12 w-12 text-yellow-600" />
                        )}
                    </div>
                </div>

                {/* QR Code SEPA */}
                <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">QR Code SEPA</p>
                            <p className="text-3xl font-bold text-indigo-600 mt-2">
                                {metrics?.qr_code_rate.toFixed(0)}%
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                {metrics?.with_qr_code} factures
                            </p>
                        </div>
                        <QrCode className="h-12 w-12 text-indigo-600" />
                    </div>
                </div>

                {/* Facturation électronique 2026 */}
                <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Prêt 2026</p>
                            <p className="text-3xl font-bold text-purple-600 mt-2">
                                {metrics?.electronic_rate.toFixed(0)}%
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                {metrics?.electronic_ready} factures
                            </p>
                        </div>
                        <FileText className="h-12 w-12 text-purple-600" />
                    </div>
                </div>

                {/* Numérotation */}
                <div className={`rounded-lg border-2 p-6 ${metrics?.sequence_valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Numérotation</p>
                            <p className={`text-3xl font-bold mt-2 ${metrics?.sequence_valid ? 'text-green-600' : 'text-red-600'}`}>
                                {metrics?.sequence_valid ? 'Valide' : 'Problème'}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                {metrics?.sequence_gaps > 0 ? `${metrics.sequence_gaps} trou(s)` : 'Aucun trou'}
                            </p>
                        </div>
                        <Shield className={`h-12 w-12 ${metrics?.sequence_valid ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                </div>
            </div>

            {/* Alertes */}
            {metrics && (metrics.total_errors > 0 || metrics.sequence_gaps > 0) && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <div className="flex">
                        <AlertCircle className="h-5 w-5 text-red-400" />
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">
                                Attention : Problèmes de conformité détectés
                            </h3>
                            <div className="mt-2 text-sm text-red-700">
                                <ul className="list-disc list-inside space-y-1">
                                    {metrics.total_errors > 0 && (
                                        <li>{metrics.total_errors} erreur(s) critique(s) à corriger</li>
                                    )}
                                    {metrics.sequence_gaps > 0 && (
                                        <li>{metrics.sequence_gaps} trou(s) dans la numérotation séquentielle</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Liste des factures non conformes */}
            {nonCompliant && nonCompliant.length > 0 && (
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Factures à corriger ({nonCompliant.length})
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Facture
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Client
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Score
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Problèmes
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {nonCompliant.slice(0, 10).map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {invoice.invoice_number}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{invoice.client_name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{invoice.date}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                invoice.compliance_score >= 90 ? 'bg-green-100 text-green-800' :
                                                invoice.compliance_score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {invoice.compliance_score.toFixed(0)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm space-y-1">
                                                {invoice.errors.length > 0 && (
                                                    <div className="flex items-center text-red-600">
                                                        <XCircle className="h-4 w-4 mr-1" />
                                                        <span>{invoice.errors.length} erreur(s)</span>
                                                    </div>
                                                )}
                                                {invoice.warnings.length > 0 && (
                                                    <div className="flex items-center text-yellow-600">
                                                        <AlertTriangle className="h-4 w-4 mr-1" />
                                                        <span>{invoice.warnings.length} warning(s)</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Info législation */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <div className="flex">
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">
                            📅 Facturation électronique obligatoire dès le 1er septembre 2026
                        </h3>
                        <div className="mt-2 text-sm text-blue-700">
                            <p>
                                Toutes les entreprises françaises devront émettre leurs factures au format électronique (Factur-X, UBL ou CII).
                                Préparez-vous dès maintenant pour éviter les pénalités de 15€ par facture non conforme.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
