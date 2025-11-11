import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DocumentCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface DownloadFacturXButtonProps {
    invoiceId: number;
    invoiceNumber: string;
    className?: string;
    variant?: 'primary' | 'secondary';
}

interface MissingField {
    field: string;
    label: string;
    description: string;
    location: string;
}

interface MissingFields {
    tenant?: MissingField[];
    client?: MissingField[];
    invoice?: MissingField[];
}

const DownloadFacturXButton: React.FC<DownloadFacturXButtonProps> = ({
    invoiceId,
    invoiceNumber,
    className = '',
    variant = 'secondary',
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isGenerating, setIsGenerating] = useState(false);

    const handleValidationError = (error: any) => {
        const missingFields: MissingFields = error.response?.data?.missing_fields || {};
        const formattedMessage = error.response?.data?.formatted_message;

        // Construire un message détaillé avec les champs manquants
        let errorMessage = 'Impossible de générer le FacturX - Champs obligatoires manquants:\n\n';

        if (missingFields.tenant && missingFields.tenant.length > 0) {
            errorMessage += '🏢 Paramètres de votre entreprise:\n';
            missingFields.tenant.forEach((field: MissingField) => {
                errorMessage += `  • ${field.label}: ${field.description}\n`;
            });
            errorMessage += '\n';
        }

        if (missingFields.client && missingFields.client.length > 0) {
            errorMessage += '👤 Informations du client:\n';
            missingFields.client.forEach((field: MissingField) => {
                errorMessage += `  • ${field.label}: ${field.description}\n`;
            });
            errorMessage += '\n';
        }

        if (missingFields.invoice && missingFields.invoice.length > 0) {
            errorMessage += '📄 Données de la facture:\n';
            missingFields.invoice.forEach((field: MissingField) => {
                errorMessage += `  • ${field.label}: ${field.description}\n`;
            });
            errorMessage += '\n';
        }

        // Afficher un toast avec navigation vers les paramètres si nécessaire
        if (missingFields.tenant && missingFields.tenant.length > 0) {
            toast.error(
                <div>
                    <div className="font-bold mb-2 flex items-center">
                        <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                        Paramètres de facturation incomplets
                    </div>
                    <div className="text-sm whitespace-pre-line mb-2">{errorMessage}</div>
                    <button
                        onClick={() => navigate('/settings/billing')}
                        className="mt-2 text-blue-600 hover:text-blue-800 underline text-sm"
                    >
                        → Accéder aux paramètres de facturation
                    </button>
                </div>,
                { autoClose: 15000 }
            );
        } else {
            toast.error(
                <div>
                    <div className="font-bold mb-2 flex items-center">
                        <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                        Champs obligatoires manquants
                    </div>
                    <div className="text-sm whitespace-pre-line">{errorMessage}</div>
                </div>,
                { autoClose: 12000 }
            );
        }
    };

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
            // Check for validation errors (422)
            if (error.response?.status === 422 && error.response?.data?.error === 'FACTURX_VALIDATION_ERROR') {
                handleValidationError(error);
                return;
            }

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
        onError: (error: any) => {
            setIsGenerating(false);

            // Check for validation errors (422)
            if (error.response?.status === 422 && error.response?.data?.error === 'FACTURX_VALIDATION_ERROR') {
                handleValidationError(error);
                return;
            }

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
