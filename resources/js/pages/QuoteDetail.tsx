import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeftIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const QuoteDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const isNewQuote = !id || id === 'new';

    const { data: quote, isLoading } = useQuery({
        queryKey: ['quote', id],
        queryFn: async () => {
            const response = await axios.get(`/quotes/${id}`);
            return response.data.data;
        },
        enabled: !isNewQuote, // Only fetch if we have a valid ID
    });

    const getStatusBadge = (status: string) => {
        const colors = {
            draft: 'bg-gray-100 text-gray-800',
            sent: 'bg-blue-100 text-blue-800',
            accepted: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
            expired: 'bg-orange-100 text-orange-800',
        };

        const labels = {
            draft: 'Brouillon',
            sent: 'Envoyé',
            accepted: 'Accepté',
            rejected: 'Refusé',
            expired: 'Expiré',
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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Devis non trouvé</h3>
                    <Link
                        to="/quotes"
                        className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                        <span>Retour aux devis</span>
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
                        <span>Retour</span>
                    </Link>
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-3xl font-bold text-gray-900">{quote.quote_number}</h1>
                        {getStatusBadge(quote.status)}
                    </div>

                    <div className="flex items-center gap-3 mt-4 md:mt-0">
                        <button className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm">
                            <DocumentArrowDownIcon className="h-4 w-4" />
                            <span>Télécharger PDF</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-8">
                <div className="flex justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">DEVIS</h2>
                        <p className="text-gray-600">{quote.quote_number}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-600">Date d'émission</p>
                        <p className="font-semibold text-gray-900">
                            {format(new Date(quote.issue_date), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">Valide jusqu'au</p>
                        <p className="font-semibold text-gray-900">
                            {format(new Date(quote.valid_until), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                    </div>
                </div>

                {quote.client && (
                    <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-600 mb-2">Client</h3>
                        <p className="font-semibold text-gray-900">{quote.client.name}</p>
                        <p className="text-gray-600">{quote.client.email}</p>
                    </div>
                )}

                <div className="mb-8">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-gray-300">
                                <th className="text-left py-3 text-sm font-semibold text-gray-700">Description</th>
                                <th className="text-right py-3 text-sm font-semibold text-gray-700">Qté</th>
                                <th className="text-right py-3 text-sm font-semibold text-gray-700">Prix unitaire</th>
                                <th className="text-right py-3 text-sm font-semibold text-gray-700">Total</th>
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
                            <span>Sous-total</span>
                            <span>
                                {new Intl.NumberFormat('fr-FR', {
                                    style: 'currency',
                                    currency: 'EUR',
                                }).format(quote.subtotal)}
                            </span>
                        </div>
                        <div className="flex justify-between text-gray-700">
                            <span>TVA ({quote.tax_rate}%)</span>
                            <span>
                                {new Intl.NumberFormat('fr-FR', {
                                    style: 'currency',
                                    currency: 'EUR',
                                }).format(quote.tax_amount)}
                            </span>
                        </div>
                        <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t-2 border-gray-300">
                            <span>Total</span>
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
                        <h3 className="text-sm font-medium text-gray-600 mb-2">Notes</h3>
                        <p className="text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuoteDetail;
