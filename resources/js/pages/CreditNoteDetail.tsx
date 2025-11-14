import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeftIcon,
    TrashIcon,
    DocumentArrowDownIcon,
    PaperAirplaneIcon,
    CheckCircleIcon,
    PrinterIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import DownloadFacturXButton from '../components/Invoice/DownloadFacturXButton';

interface CreditNote {
    id: number;
    credit_note_number: string;
    credit_note_date: string;
    applied_date?: string;
    invoice_id: number;
    invoice?: {
        invoice_number: string;
    };
    client_id: number;
    client?: {
        id: number;
        name: string;
        email: string;
        company: string | null;
        address: string | null;
    };
    reason: string;
    description: string | null;
    status: string;
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    currency: string;
    payment_method: string | null;
    notes: string | null;
    items?: CreditNoteItem[];
    facturx_path: string | null;
}

interface CreditNoteItem {
    id: number;
    description: string;
    details: string | null;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    tax_amount: number;
    total: number;
}

const CreditNoteDetail: React.FC = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showSendModal, setShowSendModal] = useState(false);
    const [recipientEmail, setRecipientEmail] = useState('');
    const [sendEmailError, setSendEmailError] = useState<string | null>(null);

    // Fetch credit note details
    const { data: creditNote, isLoading } = useQuery({
        queryKey: ['credit-note', id],
        queryFn: async () => {
            const response = await axios.get(`/credit-notes/${id}`);
            return response.data.data;
        },
    });

    // Issue credit note mutation
    const issueCreditNoteMutation = useMutation({
        mutationFn: async () => {
            const response = await axios.post(`/credit-notes/${id}/issue`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['credit-note', id] });
            queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
            toast.success(t('creditNotes.issued', 'Avoir émis avec succès'));
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || t('creditNotes.issueError', 'Erreur lors de l\'émission');
            toast.error(message);
        },
    });

    // Delete credit note mutation
    const deleteCreditNoteMutation = useMutation({
        mutationFn: async () => {
            await axios.delete(`/credit-notes/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
            toast.success(t('creditNotes.deleteSuccess', 'Avoir supprimé avec succès'));
            navigate('/credit-notes');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || t('creditNotes.deleteError', 'Erreur lors de la suppression');
            toast.error(message);
        },
    });

    // Download PDF mutation
    const downloadPdfMutation = useMutation({
        mutationFn: async () => {
            const response = await axios.get(`/credit-notes/${id}/pdf`, {
                responseType: 'blob',
            });
            return response.data;
        },
        onSuccess: (data) => {
            const url = window.URL.createObjectURL(new Blob([data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `avoir-${creditNote?.credit_note_number}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success(t('creditNotes.downloadSuccess', 'PDF téléchargé avec succès'));
        },
        onError: () => {
            toast.error(t('creditNotes.downloadError', 'Erreur lors du téléchargement'));
        },
    });

    const printCreditNoteMutation = useMutation({
        mutationFn: async () => {
            const response = await axios.get(`/credit-notes/${id}/pdf`, {
                responseType: 'blob',
            });
            return response.data;
        },
        onSuccess: (data) => {
            const pdfBlob = new Blob([data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(pdfBlob);
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            iframe.src = url;

            iframe.onload = () => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                setTimeout(() => {
                    iframe.parentNode?.removeChild(iframe);
                    window.URL.revokeObjectURL(url);
                }, 1000);
            };

            document.body.appendChild(iframe);
            toast.success(t('creditNotes.printReady', 'PDF généré, impression en cours...'));
        },
        onError: () => {
            toast.error(t('creditNotes.printError', 'Impossible de générer le PDF pour l\'impression'));
        },
    });

    // Send credit note mutation
    const sendCreditNoteMutation = useMutation({
        mutationFn: async (recipientEmail?: string) => {
            await axios.post(`/credit-notes/${id}/send`, {
                recipient_email: recipientEmail
            });
        },
        onSuccess: () => {
            setShowSendModal(false);
            setSendEmailError(null);
            queryClient.invalidateQueries({ queryKey: ['credit-note', id] });
            toast.success(t('creditNotes.sendSuccess', 'Avoir envoyé avec succès'));
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || t('creditNotes.sendError', 'Erreur lors de l\'envoi');
            toast.error(message);
        },
    });

    const handleOpenSendModal = () => {
        setRecipientEmail(creditNote?.client?.email || '');
        setSendEmailError(null);
        setShowSendModal(true);
    };

    const handleSendCreditNote = () => {
        if (!recipientEmail) {
            setSendEmailError(t('creditNotes.recipientEmailRequired', 'Adresse email requise'));
            return;
        }

        setSendEmailError(null);
        sendCreditNoteMutation.mutate(recipientEmail);
    };

    const getStatusBadge = (status: string) => {
        const colors = {
            draft: 'bg-gray-100 text-gray-800',
            issued: 'bg-blue-100 text-blue-800',
            applied: 'bg-green-100 text-green-800',
        };

        const labels = {
            draft: t('creditNotes.status.draft', 'Brouillon'),
            issued: t('creditNotes.status.issued', 'Émis'),
            applied: t('creditNotes.status.applied', 'Appliqué'),
        };

        return (
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
                {labels[status as keyof typeof labels] || status}
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!creditNote) {
        return (
            <div className="p-6">
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('creditNotes.notFound', 'Avoir introuvable')}</h3>
                    <p className="text-gray-600 mb-6">{t('creditNotes.notFoundDescription', 'Cet avoir n\'existe pas ou a été supprimé')}</p>
                    <Link
                        to="/credit-notes"
                        className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                        <span>{t('creditNotes.backToCreditNotes', 'Retour aux avoirs')}</span>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center mb-4">
                    <Link
                        to="/credit-notes"
                        className="flex items-center text-gray-600 hover:text-gray-900 transition mr-4"
                    >
                        <ArrowLeftIcon className="h-5 w-5 mr-1" />
                        <span>{t('common.back', 'Retour')}</span>
                    </Link>
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <div className="flex items-center space-x-4 mb-4 md:mb-0">
                        <h1 className="text-3xl font-bold text-gray-900">{creditNote.credit_note_number}</h1>
                        {getStatusBadge(creditNote.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {creditNote.status === 'draft' && (
                            <>
                                <button
                                    onClick={() => issueCreditNoteMutation.mutate()}
                                    disabled={issueCreditNoteMutation.isPending}
                                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-50"
                                >
                                    <CheckCircleIcon className="h-4 w-4" />
                                    <span>{t('creditNotes.issue', 'Émettre')}</span>
                                </button>
                            </>
                        )}

                        {creditNote.status !== 'draft' && (
                            <button
                                onClick={handleOpenSendModal}
                                className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm"
                            >
                                <PaperAirplaneIcon className="h-4 w-4" />
                                <span>{t('creditNotes.send', 'Envoyer')}</span>
                            </button>
                        )}

                        <button
                            onClick={() => downloadPdfMutation.mutate()}
                            disabled={downloadPdfMutation.isPending}
                            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm disabled:opacity-50"
                        >
                            <DocumentArrowDownIcon className="h-4 w-4" />
                            <span>{t('creditNotes.downloadPDF', 'Télécharger PDF')}</span>
                        </button>

                        {creditNote.status !== 'draft' && (
                            <DownloadFacturXButton
                                invoiceId={creditNote.id}
                                invoiceNumber={creditNote.credit_note_number}
                                variant="secondary"
                                isCreditNote={true}
                            />
                        )}

                        <button
                            onClick={() => printCreditNoteMutation.mutate()}
                            disabled={printCreditNoteMutation.isPending}
                            className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition text-sm disabled:opacity-50"
                        >
                            <PrinterIcon className="h-4 w-4" />
                            <span>{t('common.print', 'Imprimer')}</span>
                        </button>

                        {creditNote.status === 'draft' && (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm"
                            >
                                <TrashIcon className="h-4 w-4" />
                                <span>{t('common.delete', 'Supprimer')}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Credit Note Content */}
            <div className="bg-white rounded-lg shadow p-8 mb-8">
                {/* Header Info */}
                <div className="flex justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('creditNotes.title', 'Avoir')}</h2>
                        <p className="text-gray-600">{creditNote.credit_note_number}</p>
                        {creditNote.invoice && (
                            <p className="text-sm text-gray-600 mt-1">
                                {t('creditNotes.relatedInvoice', 'Facture liée')} :
                                <Link
                                    to={`/invoices/${creditNote.invoice_id}`}
                                    className="ml-1 text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    {creditNote.invoice.invoice_number}
                                </Link>
                            </p>
                        )}
                    </div>
                    <div className="text-right space-y-3">
                        <div>
                            <p className="text-sm text-gray-600">{t('creditNotes.date', 'Date')}</p>
                            <p className="font-semibold text-gray-900">
                                {creditNote.credit_note_date ? format(new Date(creditNote.credit_note_date), 'dd MMMM yyyy', { locale: fr }) : '-'}
                            </p>
                        </div>
                        {creditNote.applied_date && (
                            <div className="pt-2 border-t border-gray-200">
                                <p className="text-sm text-gray-600">{t('creditNotes.appliedDate', 'Date d\'application')}</p>
                                <p className="font-semibold text-green-600">
                                    {format(new Date(creditNote.applied_date), 'dd MMMM yyyy', { locale: fr })}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Client Info */}
                {creditNote.client && (
                    <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-600 mb-2">{t('creditNotes.creditedTo', 'Crédité à')}</h3>
                        <p className="font-semibold text-gray-900">{creditNote.client.name}</p>
                        {creditNote.client.company && (
                            <p className="text-gray-700">{creditNote.client.company}</p>
                        )}
                        <p className="text-gray-600">{creditNote.client.email}</p>
                        {creditNote.client.address && (
                            <p className="text-gray-600 mt-2 whitespace-pre-wrap">{creditNote.client.address}</p>
                        )}
                    </div>
                )}

                {/* Reason and Description */}
                {(creditNote.reason || creditNote.description) && (
                    <div className="mb-8 p-4 bg-amber-50 border-l-4 border-amber-500 rounded">
                        <h3 className="text-sm font-medium text-amber-900 mb-2">{t('creditNotes.reasonTitle', 'Motif de l\'avoir')}</h3>
                        {creditNote.reason && (
                            <p className="font-semibold text-amber-900 mb-1">{creditNote.reason}</p>
                        )}
                        {creditNote.description && (
                            <p className="text-sm text-amber-800">{creditNote.description}</p>
                        )}
                    </div>
                )}

                {/* Items Table */}
                <div className="mb-8">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-gray-200">
                                <th className="text-left py-3 text-sm font-medium text-gray-600">{t('creditNotes.description', 'Description')}</th>
                                <th className="text-right py-3 text-sm font-medium text-gray-600">{t('creditNotes.quantity', 'Quantité')}</th>
                                <th className="text-right py-3 text-sm font-medium text-gray-600">{t('creditNotes.unitPrice', 'Prix unitaire')}</th>
                                <th className="text-right py-3 text-sm font-medium text-gray-600">{t('creditNotes.taxRate', 'TVA')}</th>
                                <th className="text-right py-3 text-sm font-medium text-gray-600">{t('creditNotes.total', 'Total')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {creditNote.items?.map((item) => (
                                <tr key={item.id} className="border-b border-gray-100">
                                    <td className="py-4">
                                        <p className="font-medium text-gray-900">{item.description}</p>
                                        {item.details && (
                                            <p className="text-sm text-gray-600 mt-1">{item.details}</p>
                                        )}
                                    </td>
                                    <td className="text-right py-4 text-gray-700">{item.quantity}</td>
                                    <td className="text-right py-4 text-gray-700">
                                        {new Intl.NumberFormat('fr-FR', {
                                            style: 'currency',
                                            currency: creditNote.currency || 'EUR',
                                        }).format(item.unit_price)}
                                    </td>
                                    <td className="text-right py-4 text-gray-700">{item.tax_rate}%</td>
                                    <td className="text-right py-4 font-medium text-gray-900">
                                        {new Intl.NumberFormat('fr-FR', {
                                            style: 'currency',
                                            currency: creditNote.currency || 'EUR',
                                        }).format(item.total)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-8">
                    <div className="w-full md:w-1/2 space-y-2">
                        <div className="flex justify-between py-2">
                            <span className="text-gray-600">{t('creditNotes.subtotal', 'Sous-total')}</span>
                            <span className="font-medium text-gray-900">
                                {new Intl.NumberFormat('fr-FR', {
                                    style: 'currency',
                                    currency: creditNote.currency || 'EUR',
                                }).format(creditNote.subtotal)}
                            </span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span className="text-gray-600">{t('creditNotes.tax', 'TVA')}</span>
                            <span className="font-medium text-gray-900">
                                {new Intl.NumberFormat('fr-FR', {
                                    style: 'currency',
                                    currency: creditNote.currency || 'EUR',
                                }).format(creditNote.tax)}
                            </span>
                        </div>
                        {creditNote.discount > 0 && (
                            <div className="flex justify-between py-2">
                                <span className="text-gray-600">{t('creditNotes.discount', 'Remise')}</span>
                                <span className="font-medium text-red-600">
                                    - {new Intl.NumberFormat('fr-FR', {
                                        style: 'currency',
                                        currency: creditNote.currency || 'EUR',
                                    }).format(creditNote.discount)}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between py-3 border-t-2 border-gray-200">
                            <span className="text-lg font-bold text-gray-900">{t('creditNotes.totalAmount', 'Montant total')}</span>
                            <span className="text-lg font-bold text-red-600">
                                - {new Intl.NumberFormat('fr-FR', {
                                    style: 'currency',
                                    currency: creditNote.currency || 'EUR',
                                }).format(creditNote.total)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {creditNote.notes && (
                    <div className="pt-6 border-t border-gray-200">
                        <h3 className="text-sm font-medium text-gray-600 mb-2">{t('creditNotes.notes', 'Notes')}</h3>
                        <p className="text-gray-700 whitespace-pre-wrap">{creditNote.notes}</p>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            {t('creditNotes.confirmDelete', 'Confirmer la suppression')}
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {t('creditNotes.confirmDeleteMessage', 'Êtes-vous sûr de vouloir supprimer cet avoir ? Cette action est irréversible.')}
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                            >
                                {t('common.cancel', 'Annuler')}
                            </button>
                            <button
                                onClick={() => {
                                    deleteCreditNoteMutation.mutate();
                                    setShowDeleteConfirm(false);
                                }}
                                disabled={deleteCreditNoteMutation.isPending}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                            >
                                {t('common.delete', 'Supprimer')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Send Modal */}
            {showSendModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            {t('creditNotes.sendByEmail', 'Envoyer par email')}
                        </h3>
                        <p className="text-gray-600 mb-4">
                            {t('creditNotes.sendConfirmMessage', 'Saisissez l\'adresse email du destinataire :')}
                        </p>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="credit-note-recipient-email">
                                {t('creditNotes.recipientEmailLabel', 'Adresse email du destinataire')}
                            </label>
                            <input
                                id="credit-note-recipient-email"
                                type="email"
                                value={recipientEmail}
                                onChange={(event) => {
                                    setRecipientEmail(event.target.value);
                                    setSendEmailError(null);
                                }}
                                placeholder={t('creditNotes.recipientEmailPlaceholder', 'client@example.com')}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            {sendEmailError && (
                                <p className="text-sm text-red-600 mt-1">{sendEmailError}</p>
                            )}
                        </div>
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                            <h4 className="text-sm font-semibold text-indigo-900 mb-2">
                                {t('creditNotes.emailAttachmentsTitle', 'Pièces jointes incluses')}
                            </h4>
                            <ul className="text-xs text-indigo-800 space-y-1 mb-4 list-disc list-inside">
                                <li>{t('creditNotes.emailAttachments.standard', 'Avoir PDF conforme NF525')}</li>
                                <li>{t('creditNotes.emailAttachments.facturx', 'FacturX (EN 16931) pour import comptable')}</li>
                            </ul>
                            <div className="bg-white/70 border border-indigo-100 rounded-lg p-3">
                                <p className="text-xs font-semibold text-indigo-900">
                                    {t('creditNotes.emailTemplateTitle', 'Modèle d\'email utilisé')}
                                </p>
                                <p className="text-xs font-mono text-indigo-800">
                                    {t('creditNotes.emailTemplateValue', 'emails.credit-note-sent')}
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowSendModal(false);
                                    setSendEmailError(null);
                                }}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                            >
                                {t('common.cancel', 'Annuler')}
                            </button>
                            <button
                                onClick={handleSendCreditNote}
                                disabled={sendCreditNoteMutation.isPending}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                            >
                                {sendCreditNoteMutation.isPending ? t('creditNotes.sending', 'Envoi...') : t('creditNotes.send', 'Envoyer')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreditNoteDetail;
