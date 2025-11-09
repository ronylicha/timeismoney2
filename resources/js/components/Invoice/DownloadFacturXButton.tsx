import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { DocumentCheckIcon } from '@heroicons/react/24/outline';

interface DownloadFacturXButtonProps {
    invoiceId: number;
    invoiceNumber: string;
    className?: string;
    variant?: 'primary' | 'secondary';
}

const DownloadFacturXButton: React.FC<DownloadFacturXButtonProps> = ({
    invoiceId,
    invoiceNumber,
    className = '',
    variant = 'secondary',
}) => {
    const { t } = useTranslation();
    const [isGenerating, setIsGenerating] = useState(false);

    // Download existing FacturX
    const downloadMutation = useMutation({
        mutationFn: async () => {
            const response = await axios.get(`/invoices/${invoiceId}/facturx`, {
                responseType: 'blob',
            });
            return response.data;
        },
        onSuccess: (data) => {
            const url = window.URL.createObjectURL(new Blob([data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `facturx-${invoiceNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success(t('invoices.facturx.downloadSuccess', 'FacturX téléchargé avec succès'));
        },
        onError: async (error: any) => {
            // If 404, try to generate it first
            if (error.response?.status === 404) {
                setIsGenerating(true);
                generateMutation.mutate();
            } else {
                toast.error(t('invoices.facturx.downloadError', 'Erreur lors du téléchargement'));
            }
        },
    });

    // Generate then download FacturX
    const generateMutation = useMutation({
        mutationFn: async () => {
            const response = await axios.post(`/invoices/${invoiceId}/generate-facturx`, {}, {
                responseType: 'blob',
            });
            return response.data;
        },
        onSuccess: (data) => {
            const url = window.URL.createObjectURL(new Blob([data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `facturx-${invoiceNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            setIsGenerating(false);
            toast.success(t('invoices.facturx.generateSuccess', 'FacturX généré et téléchargé'));
        },
        onError: () => {
            setIsGenerating(false);
            toast.error(t('invoices.facturx.generateError', 'Erreur lors de la génération'));
        },
    });

    const handleDownload = () => {
        downloadMutation.mutate();
    };

    const isLoading = downloadMutation.isPending || generateMutation.isPending || isGenerating;

    const baseClasses = 'flex items-center space-x-2 px-4 py-2 rounded-lg transition text-sm disabled:opacity-50';
    const variantClasses = variant === 'primary'
        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
        : 'bg-white text-indigo-600 border-2 border-indigo-600 hover:bg-indigo-50';

    return (
        <button
            onClick={handleDownload}
            disabled={isLoading}
            className={`${baseClasses} ${variantClasses} ${className}`}
            title={t('invoices.facturx.downloadTooltip', 'Télécharger au format FacturX (EN 16931)')}
        >
            {isLoading ? (
                <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    <span>
                        {isGenerating 
                            ? t('invoices.facturx.generating', 'Génération...')
                            : t('common.loading', 'Chargement...')
                        }
                    </span>
                </>
            ) : (
                <>
                    <DocumentCheckIcon className="h-4 w-4" />
                    <span>{t('invoices.facturx.download', 'FacturX')}</span>
                </>
            )}
        </button>
    );
};

export default DownloadFacturXButton;
