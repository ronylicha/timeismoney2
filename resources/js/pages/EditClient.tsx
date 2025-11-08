import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { COUNTRIES } from '../constants/countries';

interface ClientFormData {
    name: string;
    company_name: string;
    is_company: boolean;
    legal_form: string;
    siret: string;
    vat_number: string;
    address: string;
    city: string;
    postal_code: string;
    country: string;
    phone: string;
    email: string;
    website: string;
    billing_email: string;
    payment_terms: number;
    payment_method: string;
    discount_percentage: number;
    vat_exempt: boolean;
    hourly_rate: number;
    currency: string;
    status: string;
    notes: string;
}

const EditClient: React.FC = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState<ClientFormData>({
        name: '',
        company_name: '',
        is_company: false,
        legal_form: '',
        siret: '',
        vat_number: '',
        address: '',
        city: '',
        postal_code: '',
        country: '',
        phone: '',
        email: '',
        website: '',
        billing_email: '',
        payment_terms: 30,
        payment_method: 'bank_transfer',
        discount_percentage: 0,
        vat_exempt: false,
        hourly_rate: 0,
        currency: 'EUR',
        status: 'prospect',
        notes: ''
    });
    const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

    // Fetch client details
    const { data: client, isLoading, error } = useQuery({
        queryKey: ['client', id],
        queryFn: async () => {
            const response = await axios.get(`/clients/${id}`);
            return response.data;
        },
        enabled: !!id,
    });

    // Update form when client data is loaded
    useEffect(() => {
        if (client) {
            setFormData({
                name: client.name || '',
                company_name: client.company_name || '',
                is_company: client.is_company || false,
                legal_form: client.legal_form || '',
                siret: client.siret || '',
                vat_number: client.vat_number || '',
                address: client.address || '',
                city: client.city || '',
                postal_code: client.postal_code || '',
                country: client.country || 'FR', // Default to France as per DB default
                phone: client.phone || '',
                email: client.email || '',
                website: client.website || '',
                billing_email: client.billing_email || '',
                payment_terms: client.payment_terms || 30,
                payment_method: client.payment_method || 'bank_transfer',
                discount_percentage: client.discount_percentage || 0,
                vat_exempt: client.vat_exempt || false,
                hourly_rate: client.hourly_rate || 0,
                currency: client.currency || 'EUR',
                status: client.status || 'prospect',
                notes: client.notes || ''
            });
        }
    }, [client]);

    // Update client mutation
    const updateClientMutation = useMutation({
        mutationFn: async (data: ClientFormData) => {
            const response = await axios.put(`/clients/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            toast.success(t('clients.clientUpdatedSuccess'));
            queryClient.invalidateQueries({ queryKey: ['client', id] });
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            navigate(`/clients/${id}`);
        },
        onError: (error: any) => {
            // Handle validation errors
            if (error.response?.status === 422 && error.response?.data?.errors) {
                setValidationErrors(error.response.data.errors);
                toast.error(t('clients.validationError') || 'Veuillez corriger les erreurs dans le formulaire');
            } else {
                const message = error.response?.data?.message || t('clients.clientUpdatedError');
                toast.error(message);
            }
        }
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        // Clear validation error for this field
        if (validationErrors[name]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
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
        // Convert country name to ISO code if needed
        let countryCode = components.country || 'FR';

        // If the country from API is a full name, try to match it to a code
        if (countryCode && countryCode.length > 2) {
            const foundCountry = COUNTRIES.find(c =>
                c.name.toLowerCase() === countryCode.toLowerCase() ||
                c.nameFr.toLowerCase() === countryCode.toLowerCase()
            );
            countryCode = foundCountry?.code || 'FR';
        }

        setFormData(prev => ({
            ...prev,
            address: address,
            city: components.city || '',
            postal_code: components.postal_code || '',
            country: countryCode
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error(t('clients.nameRequired'));
            return;
        }

        if (!formData.country.trim()) {
            toast.error(t('clients.countryRequired') || 'Le pays est requis');
            return;
        }

        // Basic email validation (only if email is provided)
        if (formData.email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                toast.error(t('clients.emailInvalid'));
                return;
            }
        }

        updateClientMutation.mutate(formData);
    };

    // Sort countries by French name for better UX
    const sortedCountries = [...COUNTRIES].sort((a, b) =>
        a.nameFr.localeCompare(b.nameFr, 'fr')
    );

    // Helper to get field error
    const getFieldError = (fieldName: string): string | null => {
        return validationErrors[fieldName]?.[0] || null;
    };

    // Helper to check if field has error
    const hasFieldError = (fieldName: string): boolean => {
        return !!validationErrors[fieldName];
    };

    // Get field class with error state
    const getFieldClass = (fieldName: string): string => {
        const baseClass = "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none transition";
        if (hasFieldError(fieldName)) {
            return `${baseClass} border-red-300 focus:ring-red-500 focus:border-red-500`;
        }
        return `${baseClass} border-gray-300 focus:ring-blue-500 focus:border-transparent`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !client) {
        return (
            <div className="p-6">
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('clients.clientNotFound')}</h3>
                    <p className="text-gray-600 mb-6">{t('clients.clientNotFoundDescription')}</p>
                    <Link
                        to="/clients"
                        className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                        <span>{t('clients.backToClients')}</span>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center mb-4">
                    <Link
                        to={`/clients/${id}`}
                        className="flex items-center text-gray-600 hover:text-gray-900 transition mr-4"
                    >
                        <ArrowLeftIcon className="h-5 w-5 mr-1" />
                        <span>{t('clients.backToClient')}</span>
                    </Link>
                </div>
                <div className="flex items-center">
                    <UserGroupIcon className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('clients.editClient')}</h1>
                        <p className="text-gray-600">{t('clients.updateClientInfo')}</p>
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
                                {t('clients.name')} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className={getFieldClass('name')}
                                placeholder={t('clients.namePlaceholder')}
                                required
                            />
                            {getFieldError('name') && (
                                <p className="mt-1 text-sm text-red-600">{getFieldError('name')}</p>
                            )}
                        </div>

                        {formData.is_company && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('clients.companyName')}
                                    </label>
                                    <input
                                        type="text"
                                        name="company_name"
                                        value={formData.company_name}
                                        onChange={handleInputChange}
                                        className={getFieldClass('company_name')}
                                        placeholder={t('clients.companyNamePlaceholder')}
                                    />
                                    {getFieldError('company_name') && (
                                        <p className="mt-1 text-sm text-red-600">{getFieldError('company_name')}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('clients.legalForm')}
                                    </label>
                                    <select
                                        name="legal_form"
                                        value={formData.legal_form}
                                        onChange={handleInputChange}
                                        className={getFieldClass('legal_form')}
                                    >
                                        <option value="">{t('clients.selectLegalForm')}</option>
                                        <option value="SARL">SARL</option>
                                        <option value="SAS">SAS</option>
                                        <option value="SA">SA</option>
                                        <option value="EI">EI</option>
                                        <option value="EIRL">EIRL</option>
                                        <option value="EURL">EURL</option>
                                        <option value="SNC">SNC</option>
                                        <option value="SCI">SCI</option>
                                        <option value="Association">Association</option>
                                        <option value="Other">{t('clients.other')}</option>
                                    </select>
                                    {getFieldError('legal_form') && (
                                        <p className="mt-1 text-sm text-red-600">{getFieldError('legal_form')}</p>
                                    )}
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('clients.email')}
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className={getFieldClass('email')}
                                placeholder={t('clients.emailPlaceholder')}
                            />
                            {getFieldError('email') && (
                                <p className="mt-1 text-sm text-red-600">{getFieldError('email')}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('clients.billingEmail')}
                            </label>
                            <input
                                type="email"
                                name="billing_email"
                                value={formData.billing_email}
                                onChange={handleInputChange}
                                className={getFieldClass('billing_email')}
                                placeholder={t('clients.billingEmailPlaceholder')}
                            />
                            {getFieldError('billing_email') && (
                                <p className="mt-1 text-sm text-red-600">{getFieldError('billing_email')}</p>
                            )}
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
                                className={getFieldClass('phone')}
                                placeholder={t('clients.phonePlaceholder')}
                            />
                            {getFieldError('phone') && (
                                <p className="mt-1 text-sm text-red-600">{getFieldError('phone')}</p>
                            )}
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
                                className={getFieldClass('website')}
                                placeholder={t('clients.websitePlaceholder')}
                            />
                            {getFieldError('website') && (
                                <p className="mt-1 text-sm text-red-600">{getFieldError('website')}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('clients.status')}
                            </label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className={getFieldClass('status')}
                            >
                                <option value="prospect">{t('clients.prospect')}</option>
                                <option value="active">{t('clients.active')}</option>
                                <option value="inactive">{t('clients.inactive')}</option>
                            </select>
                            {getFieldError('status') && (
                                <p className="mt-1 text-sm text-red-600">{getFieldError('status')}</p>
                            )}
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
                                {t('clients.country')} <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="country"
                                value={formData.country}
                                onChange={handleInputChange}
                                className={getFieldClass('country')}
                                required
                            >
                                <option value="">{t('clients.selectCountry')}</option>
                                {sortedCountries.map(country => (
                                    <option key={country.code} value={country.code}>
                                        {country.nameFr}
                                    </option>
                                ))}
                            </select>
                            {getFieldError('country') && (
                                <p className="mt-1 text-sm text-red-600">{getFieldError('country')}</p>
                            )}
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
                                    className={getFieldClass('vat_number')}
                                    placeholder={t('clients.vatNumberPlaceholder')}
                                />
                                {getFieldError('vat_number') && (
                                    <p className="mt-1 text-sm text-red-600">{getFieldError('vat_number')}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('clients.siretNumber')}
                                </label>
                                <input
                                    type="text"
                                    name="siret"
                                    value={formData.siret}
                                    onChange={handleInputChange}
                                    className={getFieldClass('siret')}
                                    placeholder={t('clients.siretNumberPlaceholder')}
                                />
                                {getFieldError('siret') && (
                                    <p className="mt-1 text-sm text-red-600">{getFieldError('siret')}</p>
                                )}
                            </div>

                            <div className="flex items-center md:col-span-2">
                                <input
                                    type="checkbox"
                                    name="vat_exempt"
                                    id="vat_exempt"
                                    checked={formData.vat_exempt}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="vat_exempt" className="ml-2 block text-sm text-gray-700">
                                    {t('clients.vatExempt')}
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Payment & Billing Information */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <EnvelopeIcon className="h-5 w-5 mr-2" />
                        {t('clients.paymentBilling')}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('clients.paymentMethod')}
                            </label>
                            <select
                                name="payment_method"
                                value={formData.payment_method}
                                onChange={handleInputChange}
                                className={getFieldClass('payment_method')}
                            >
                                <option value="bank_transfer">{t('clients.bankTransfer')}</option>
                                <option value="check">{t('clients.check')}</option>
                                <option value="cash">{t('clients.cash')}</option>
                                <option value="card">{t('clients.card')}</option>
                                <option value="other">{t('clients.other')}</option>
                            </select>
                            {getFieldError('payment_method') && (
                                <p className="mt-1 text-sm text-red-600">{getFieldError('payment_method')}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('clients.paymentTerms')} ({t('clients.days')})
                            </label>
                            <input
                                type="number"
                                name="payment_terms"
                                value={formData.payment_terms}
                                onChange={handleInputChange}
                                min="0"
                                className={getFieldClass('payment_terms')}
                                placeholder="30"
                            />
                            {getFieldError('payment_terms') && (
                                <p className="mt-1 text-sm text-red-600">{getFieldError('payment_terms')}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('clients.discountPercentage')} (%)
                            </label>
                            <input
                                type="number"
                                name="discount_percentage"
                                value={formData.discount_percentage}
                                onChange={handleInputChange}
                                min="0"
                                max="100"
                                step="0.01"
                                className={getFieldClass('discount_percentage')}
                                placeholder="0"
                            />
                            {getFieldError('discount_percentage') && (
                                <p className="mt-1 text-sm text-red-600">{getFieldError('discount_percentage')}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('clients.hourlyRate')} ({formData.currency})
                            </label>
                            <input
                                type="number"
                                name="hourly_rate"
                                value={formData.hourly_rate}
                                onChange={handleInputChange}
                                min="0"
                                step="0.01"
                                className={getFieldClass('hourly_rate')}
                                placeholder="0.00"
                            />
                            {getFieldError('hourly_rate') && (
                                <p className="mt-1 text-sm text-red-600">{getFieldError('hourly_rate')}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('clients.currency')}
                            </label>
                            <select
                                name="currency"
                                value={formData.currency}
                                onChange={handleInputChange}
                                className={getFieldClass('currency')}
                            >
                                <option value="EUR">EUR (€)</option>
                                <option value="USD">USD ($)</option>
                                <option value="GBP">GBP (£)</option>
                                <option value="CHF">CHF</option>
                                <option value="CAD">CAD</option>
                            </select>
                            {getFieldError('currency') && (
                                <p className="mt-1 text-sm text-red-600">{getFieldError('currency')}</p>
                            )}
                        </div>
                    </div>
                </div>

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
                        to={`/clients/${id}`}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    >
                        {t('common.cancel')}
                    </Link>
                    <button
                        type="submit"
                        disabled={updateClientMutation.isPending}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center"
                    >
                        {updateClientMutation.isPending ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                {t('common.updating')}
                            </>
                        ) : (
                            <>
                                <CheckCircleIcon className="h-5 w-5 mr-2" />
                                {t('clients.updateClient')}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditClient;
