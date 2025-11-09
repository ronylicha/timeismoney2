import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { ArrowDownTrayIcon, CalendarIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

interface FecExportFormProps {
    invoiceId?: number;
    invoiceNumber?: string;
}

const FecExportForm: React.FC<FecExportFormProps> = ({ invoiceId, invoiceNumber }) => {
    const { t } = useTranslation();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [format, setFormat] = useState<'txt' | 'csv'>('txt');
    const [encoding, setEncoding] = useState<'utf8' | 'cp1252'>('utf8');
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Export FEC mutation
    const exportMutation = useMutation({
        mutationFn: async () => {
            const params: any = {
                format,
                encoding,
            };

            // If specific invoice, export only that one
            if (invoiceId) {
                params.invoice_id = invoiceId;
            } else {
                // Otherwise export by date range
                if (!startDate || !endDate) {
                    throw new Error('Dates requises pour l\'export');
                }
                params.start_date = startDate;
                params.end_date = endDate;
            }

            const response = await axios.post('/compliance/export/fec', params, {
                responseType: 'blob',
            });
            return response.data;
        },
        onSuccess: (data) => {
            const url = window.URL.createObjectURL(new Blob([data]));
            const link = document.createElement('a');
            link.href = url;
            
            // Generate filename
            const dateStr = invoiceId 
                ? invoiceNumber?.replace(/[^a-zA-Z0-9]/g, '_')
                : `${startDate}_${endDate}`;
            link.setAttribute('download', `FEC_${dateStr}.${format}`);
            
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success(t('compliance.fec.exportSuccess', 'Export FEC réussi'));
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || error.message || t('compliance.fec.exportError', 'Erreur lors de l\'export FEC');
            toast.error(message);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!invoiceId && (!startDate || !endDate)) {
            toast.error(t('compliance.fec.datesRequired', 'Veuillez sélectionner une période'));
            return;
        }

        if (!invoiceId && new Date(endDate) < new Date(startDate)) {
            toast.error(t('compliance.fec.invalidDateRange', 'La date de fin doit être après la date de début'));
            return;
        }

        exportMutation.mutate();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {invoiceId 
                        ? t('compliance.fec.exportInvoiceTitle', 'Export FEC - Facture')
                        : t('compliance.fec.exportPeriodTitle', 'Export FEC - Période')
                    }
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                    {t('compliance.fec.description', 'Fichier des Écritures Comptables conforme à l\'article A47 A-1 du LPF')}
                </p>
            </div>

            {invoiceId ? (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                        <strong>{t('compliance.fec.invoice', 'Facture')}:</strong> {invoiceNumber}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
                            <CalendarIcon className="h-4 w-4 inline mr-1" />
                            {t('compliance.fec.startDate', 'Date de début')}
                        </label>
                        <input
                            type="date"
                            id="start-date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
                            <CalendarIcon className="h-4 w-4 inline mr-1" />
                            {t('compliance.fec.endDate', 'Date de fin')}
                        </label>
                        <input
                            type="date"
                            id="end-date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>
            )}

            {/* Advanced options */}
            <div>
                <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                >
                    <Cog6ToothIcon className="h-4 w-4 mr-1" />
                    {showAdvanced 
                        ? t('compliance.fec.hideAdvanced', 'Masquer les options avancées')
                        : t('compliance.fec.showAdvanced', 'Options avancées')
                    }
                </button>

                {showAdvanced && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                        <div>
                            <label htmlFor="format" className="block text-sm font-medium text-gray-700 mb-2">
                                {t('compliance.fec.format', 'Format')}
                            </label>
                            <select
                                id="format"
                                value={format}
                                onChange={(e) => setFormat(e.target.value as 'txt' | 'csv')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="txt">TXT (Texte tabulé)</option>
                                <option value="csv">CSV (Séparateur virgule)</option>
                            </select>
                            <p className="mt-1 text-xs text-gray-500">
                                {t('compliance.fec.formatHelp', 'TXT est le format recommandé par l\'administration fiscale')}
                            </p>
                        </div>

                        <div>
                            <label htmlFor="encoding" className="block text-sm font-medium text-gray-700 mb-2">
                                {t('compliance.fec.encoding', 'Encodage')}
                            </label>
                            <select
                                id="encoding"
                                value={encoding}
                                onChange={(e) => setEncoding(e.target.value as 'utf8' | 'cp1252')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="utf8">UTF-8 (Moderne)</option>
                                <option value="cp1252">Windows-1252 (Ancien)</option>
                            </select>
                            <p className="mt-1 text-xs text-gray-500">
                                {t('compliance.fec.encodingHelp', 'UTF-8 est recommandé pour les systèmes modernes')}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Export button */}
            <div className="flex justify-end pt-4">
                <button
                    type="submit"
                    disabled={exportMutation.isPending}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                    {exportMutation.isPending ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>{t('compliance.fec.exporting', 'Export en cours...')}</span>
                        </>
                    ) : (
                        <>
                            <ArrowDownTrayIcon className="h-5 w-5" />
                            <span>{t('compliance.fec.export', 'Exporter FEC')}</span>
                        </>
                    )}
                </button>
            </div>

            {/* Information notice */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="text-sm font-semibold text-yellow-900 mb-2">
                    {t('compliance.fec.infoTitle', 'Informations importantes')}
                </h4>
                <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
                    <li>{t('compliance.fec.info1', 'Le FEC inclut toutes les factures et avoirs de la période')}</li>
                    <li>{t('compliance.fec.info2', 'Les avoirs génèrent des écritures inversées (montants négatifs)')}</li>
                    <li>{t('compliance.fec.info3', 'Format conforme à l\'article A47 A-1 du Livre des Procédures Fiscales')}</li>
                    <li>{t('compliance.fec.info4', 'Obligatoire lors d\'un contrôle fiscal pour les entreprises tenant une comptabilité informatisée')}</li>
                </ul>
            </div>
        </form>
    );
};

export default FecExportForm;
