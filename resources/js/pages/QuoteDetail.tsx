import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, DocumentArrowDownIcon, CheckCircleIcon, PencilIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-toastify';
import SignatureModal from '../components/SignatureModal';

const QuoteDetail: React.FC = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const isNewQuote = !id || id === 'new';
    const [showSignatureModal, setShowSignatureModal] = useState(false);

    const { data: quote, isLoading } = useQuery({
        queryKey: ['quote', id],
        queryFn: async () => {
            const response = await axios.get(`/quotes/${id}`);
            return response.data.data;
        },
        enabled: !isNewQuote, // Only fetch if we have a valid ID
    });

    // Accept quote with signature
    const acceptQuoteMutation = useMutation({
        mutationFn: async (data: { signature: string; signatory_name: string; accepted_terms: boolean }) => {
            const response = await axios.post(`/quotes/${id}/accept`, {
                signature: data.signature,
                signatory_name: data.signatory_name,
                accepted_terms: data.accepted_terms,
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quote', id] });
            setShowSignatureModal(false);
            toast.success('Devis accepté et signé avec succès!');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Erreur lors de l\'acceptation du devis');
        },
    });

    const handleSignatureConfirm = (signatureData: string, acceptedTerms: boolean) => {
        // Extract signatory name from quote client name as default
        acceptQuoteMutation.mutate({
            signature: signatureData,
            signatory_name: quote?.client?.name || '',
            accepted_terms: acceptedTerms,
        });
    };

    const getStatusBadge = (status: string) => {
        const colors = {
            draft: 'bg-gray-100 text-gray-800',
            sent: 'bg-blue-100 text-blue-800',
            accepted: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
            expired: 'bg-orange-100 text-orange-800',
        };

        const labels = {
            draft: t('quotes.status.draft'),
            sent: t('quotes.status.sent'),
            accepted: t('quotes.status.accepted'),
            rejected: t('quotes.status.rejected'),
            expired: t('quotes.status.expired'),
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

    if (!quote) {
        return (
            <div className="p-6">
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('quotes.notFound')}</h3>
                    <Link
                        to="/quotes"
                        className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                        <span>{t('quotes.backToQuotes')}</span>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="mb-8">
                <div className="flex items-center mb-4">
                    <Link to="/quotes" className="flex items-center text-gray-600 hover:text-gray-900 transition mr-4">
                        <ArrowLeftIcon className="h-5 w-5 mr-1" />
                        <span>{t('common.back')}</span>
                    </Link>
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-3xl font-bold text-gray-900">{quote.quote_number}</h1>
                        {getStatusBadge(quote.status)}
                    </div>

                    <div className="flex items-center gap-3 mt-4 md:mt-0">
                        {/* Edit Quote Button (only if status is draft or sent) */}
                        {(quote.status === 'draft' || quote.status === 'sent') && (
                            <Link
                                to={`/quotes/${id}/edit`}
                                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                            >
                                <PencilIcon className="h-4 w-4" />
                                <span>{t('common.edit')}</span>
                            </Link>
                        )}

                        {/* Accept Quote Button (only if status is draft or sent) */}
                        {(quote.status === 'draft' || quote.status === 'sent') && (
                            <button
                                onClick={() => setShowSignatureModal(true)}
                                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
                            >
                                <CheckCircleIcon className="h-4 w-4" />
                                <span>Accepter et signer le devis</span>
                            </button>
                        )}

                        <button className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm">
                            <DocumentArrowDownIcon className="h-4 w-4" />
                            <span>{t('quotes.downloadPDF')}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-8">
                <div className="flex justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('quotes.quote')}</h2>
                        <p className="text-gray-600">{quote.quote_number}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-600">{t('quotes.issueDate')}</p>
                        <p className="font-semibold text-gray-900">
                            {format(new Date(quote.issue_date), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">{t('quotes.validUntil')}</p>
                        <p className="font-semibold text-gray-900">
                            {format(new Date(quote.valid_until), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                    </div>
                </div>

                {quote.client && (
                    <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-600 mb-2">{t('quotes.client')}</h3>
                        <p className="font-semibold text-gray-900">{quote.client.name}</p>
                        <p className="text-gray-600">{quote.client.email}</p>
                    </div>
                )}

                <div className="mb-8">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-gray-300">
                                <th className="text-left py-3 text-sm font-semibold text-gray-700">{t('quotes.description')}</th>
                                <th className="text-right py-3 text-sm font-semibold text-gray-700">{t('quotes.quantity')}</th>
                                <th className="text-right py-3 text-sm font-semibold text-gray-700">{t('quotes.unitPrice')}</th>
                                <th className="text-right py-3 text-sm font-semibold text-gray-700">{t('quotes.total')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quote.items?.map((item: any) => (
                                <tr key={item.id} className="border-b border-gray-200">
                                    <td className="py-4 text-gray-900">{item.description}</td>
                                    <td className="text-right py-4 text-gray-700">{item.quantity}</td>
                                    <td className="text-right py-4 text-gray-700">
                                        {new Intl.NumberFormat('fr-FR', {
                                            style: 'currency',
                                            currency: 'EUR',
                                        }).format(item.unit_price)}
                                    </td>
                                    <td className="text-right py-4 font-semibold text-gray-900">
                                        {new Intl.NumberFormat('fr-FR', {
                                            style: 'currency',
                                            currency: 'EUR',
                                        }).format(item.total)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                        <div className="flex justify-between text-gray-700">
                            <span>{t('quotes.subtotal')}</span>
                            <span>
                                {new Intl.NumberFormat('fr-FR', {
                                    style: 'currency',
                                    currency: 'EUR',
                                }).format(quote.subtotal)}
                            </span>
                        </div>
                        <div className="flex justify-between text-gray-700">
                            <span>{t('quotes.tax', { rate: quote.tax_rate })}</span>
                            <span>
                                {new Intl.NumberFormat('fr-FR', {
                                    style: 'currency',
                                    currency: 'EUR',
                                }).format(quote.tax_amount)}
                            </span>
                        </div>
                        <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t-2 border-gray-300">
                            <span>{t('quotes.total')}</span>
                            <span>
                                {new Intl.NumberFormat('fr-FR', {
                                    style: 'currency',
                                    currency: 'EUR',
                                }).format(quote.total_amount)}
                            </span>
                        </div>
                    </div>
                </div>

                {quote.notes && (
                    <div className="mt-8 pt-8 border-t border-gray-200">
                        <h3 className="text-sm font-medium text-gray-600 mb-2">{t('quotes.notes')}</h3>
                        <p className="text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
                    </div>
                )}

                {/* Signature Section - Display when quote is accepted */}
                {quote.status === 'accepted' && quote.signature_path && (
                    <div className="mt-8 pt-8 border-t border-gray-200">
                        <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                                    Signé électroniquement
                                </span>
                            </div>
                        </div>
                        
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Signature Image */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-600 mb-3">Signature</h3>
                                <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
                                    <img 
                                        src={`/storage/${quote.signature_path}`} 
                                        alt="Signature électronique"
                                        className="max-w-full h-auto max-h-32"
                                    />
                                </div>
                            </div>

                            {/* Signature Details */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-600 mb-3">Informations de signature</h3>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="font-medium text-gray-700">Signataire:</span>
                                        <span className="ml-2 text-gray-900">{quote.signatory_name}</span>
                                    </div>
                                    <div>
                                        <span className="font-medium text-gray-700">Date de signature:</span>
                                        <span className="ml-2 text-gray-900">
                                            {quote.accepted_at && format(new Date(quote.accepted_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                                        </span>
                                    </div>
                                    {quote.signature_ip && (
                                        <div>
                                            <span className="font-medium text-gray-700">Adresse IP:</span>
                                            <span className="ml-2 text-gray-600 font-mono text-xs">{quote.signature_ip}</span>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Legal Notice */}
                                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-xs text-blue-900 leading-relaxed">
                                        <strong>Valeur juridique:</strong> Cette signature électronique a la même valeur 
                                        qu'une signature manuscrite conformément au règlement eIDAS (UE) n°910/2014 
                                        et au Code civil français (articles 1366 et 1367).
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Signature Modal */}
            <SignatureModal
                isOpen={showSignatureModal}
                onClose={() => setShowSignatureModal(false)}
                onConfirm={handleSignatureConfirm}
                quoteNumber={quote?.quote_number || ''}
                clientName={quote?.client?.name || ''}
                total={quote?.total_amount || 0}
            />
        </div>
    );
};

export default QuoteDetail;
