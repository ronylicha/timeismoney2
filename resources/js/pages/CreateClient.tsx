import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeftIcon,
    UserGroupIcon,
    EnvelopeIcon,
    PhoneIcon,
    MapPinIcon,
    BuildingOfficeIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Client } from '../types';
import AddressAutocomplete from '../components/AddressAutocomplete';

interface ClientFormData {
    name: string;
    email: string;
    phone: string;
    website: string;
    address: string;
    city: string;
    postal_code: string;
    country: string;
    vat_number: string;
    siret: string;
    legal_form: string;
    is_company: boolean;
    payment_terms: number;
    discount_percentage: number;
    hourly_rate: number;
    currency: string;
    notes: string;
}

const CreateClient: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [formData, setFormData] = useState<ClientFormData>({
        name: '',
        email: '',
        phone: '',
        website: '',
        address: '',
        city: '',
        postal_code: '',
        country: '',
        vat_number: '',
        siret: '',
        legal_form: '',
        is_company: false,
        payment_terms: 30,
        discount_percentage: 0,
        hourly_rate: 0,
        currency: 'EUR',
        notes: ''
    });

    // Create client mutation
    const createClientMutation = useMutation({
        mutationFn: async (data: ClientFormData) => {
            const response = await axios.post('/clients', data);
            return response.data;
        },
        onSuccess: (client) => {
            toast.success(t('clients.clientCreatedSuccess'));
            navigate(`/clients/${client.id}`);
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || t('clients.clientCreatedError');
            toast.error(message);
        }
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAddressChange = (address: string, components: {
        street?: string;
        housenumber?: string;
        city?: string;
        postal_code?: string;
        country?: string;
        latitude?: string;
        longitude?: string;
    }) => {
        setFormData(prev => ({
            ...prev,
            address: address,
            city: components.city || '',
            postal_code: components.postal_code || '',
            country: components.country || 'FR'
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error(t('clients.nameRequired'));
            return;
        }

        if (!formData.email.trim()) {
            toast.error(t('clients.emailRequired'));
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            toast.error(t('clients.emailInvalid'));
            return;
        }

        createClientMutation.mutate(formData);
    };


    const commonCountries = [
        'France', 'Belgique', 'Suisse', 'Luxembourg', 'Canada', 'États-Unis',
        'Royaume-Uni', 'Allemagne', 'Espagne', 'Italie', 'Portugal', 'Pays-Bas'
    ];

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center mb-4">
                    <Link
                        to="/clients"
                        className="flex items-center text-gray-600 hover:text-gray-900 transition mr-4"
                    >
                        <ArrowLeftIcon className="h-5 w-5 mr-1" />
                        <span>{t('clients.backToClients')}</span>
                    </Link>
                </div>
                <div className="flex items-center">
                    <UserGroupIcon className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('clients.newClient')}</h1>
                        <p className="text-gray-600">{t('clients.addNewClientDescription')}</p>
                    </div>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('clients.generalInfo')}</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('clients.clientType')}
                            </label>
                            <select
                                name="is_company"
                                value={formData.is_company.toString()}
                                onChange={(e) => setFormData(prev => ({ ...prev, is_company: e.target.value === 'true' }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="false">{t('clients.individual')}</option>
                                <option value="true">{t('clients.company')}</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('clients.name')} *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={t('clients.namePlaceholder')}
                                required
                            />
                        </div>

                        {formData.is_company && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('clients.legalForm')}
                                </label>
                                <input
                                    type="text"
                                    name="legal_form"
                                    value={formData.legal_form}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder={t('clients.legalFormPlaceholder')}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('clients.email')} *
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={t('clients.emailPlaceholder')}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('clients.phone')}
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={t('clients.phonePlaceholder')}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('clients.website')}
                            </label>
                            <input
                                type="url"
                                name="website"
                                value={formData.website}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={t('clients.websitePlaceholder')}
                            />
                        </div>
                    </div>
                </div>

                {/* Address Information */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <MapPinIcon className="h-5 w-5 mr-2" />
                        {t('clients.address')}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <AddressAutocomplete
                                value={formData.address}
                                onChange={handleAddressChange}
                                placeholder={t('clients.searchAddress')}
                                className="w-full"
                                name="address"
                                id="client-address"
                                label={t('clients.address')}
                                showLabel={true}
                                required={false}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('clients.postalCode')}
                            </label>
                            <input
                                type="text"
                                name="postal_code"
                                value={formData.postal_code}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={t('clients.postalCodePlaceholder')}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('clients.city')}
                            </label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={t('clients.cityPlaceholder')}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('clients.country')}
                            </label>
                            <select
                                name="country"
                                value={formData.country}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">{t('clients.selectCountry')}</option>
                                {commonCountries.map(country => (
                                    <option key={country} value={country}>
                                        {country}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Business Information */}
                {formData.is_company && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                            {t('clients.businessInfo')}
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('clients.vatNumber')}
                                </label>
                                <input
                                    type="text"
                                    name="vat_number"
                                    value={formData.vat_number}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder={t('clients.vatNumberPlaceholder')}
                                />
                            </div>

                            {formData.is_company && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('clients.siretNumber')}
                                    </label>
                                    <input
                                        type="text"
                                        name="siret"
                                        value={formData.siret}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder={t('clients.siretNumberPlaceholder')}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Notes */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('clients.notes')}</h2>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('clients.internalNotes')}
                        </label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={t('clients.notesPlaceholder')}
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4">
                    <Link
                        to="/clients"
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    >
                        {t('common.cancel')}
                    </Link>
                    <button
                        type="submit"
                        disabled={createClientMutation.isPending}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center"
                    >
                        {createClientMutation.isPending ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                {t('common.creating')}
                            </>
                        ) : (
                            <>
                                <CheckCircleIcon className="h-5 w-5 mr-2" />
                                {t('clients.createClient')}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateClient;
