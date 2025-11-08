import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
    BuildingOfficeIcon,
    BanknotesIcon,
    DocumentTextIcon,
    PhotoIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { COUNTRIES } from '../constants/countries';

interface BillingSettings {
    company_name: string;
    legal_form: string;
    siret: string;
    rcs_number: string;
    rcs_city: string;
    capital: number | null;
    ape_code: string;
    vat_number: string;
    vat_subject: boolean;
    vat_exemption_reason: string;
    address_line1: string;
    address_line2: string;
    postal_code: string;
    city: string;
    country: string;
    email: string;
    phone: string;
    iban: string;
    bic: string;
    bank_name: string;
    website: string;
    late_payment_penalty_text: string;
    recovery_indemnity_text: string;
    footer_legal_text: string;
    logo: string | null;
}

// Predefined VAT exemption reasons
const VAT_EXEMPTION_REASONS = [
    'article_293b_cgi', // France - Article 293 B du CGI (micro-entreprise)
    'intracommunity', // Intracommunity supply
    'export_outside_eu', // Export outside EU
    'article_261_cgi', // France - Article 261 du CGI
    'reverse_charge', // Reverse charge mechanism
    'margin_scheme', // Margin scheme
    'custom' // Custom reason
];

// Predefined legal forms (same as client pages)
const LEGAL_FORMS = [
    'SARL',
    'SAS',
    'SA',
    'EI',
    'EIRL',
    'EURL',
    'SNC',
    'SCI',
    'Association',
    'Other'
];

const TenantBillingSettings: React.FC = () => {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [vatExemptionType, setVatExemptionType] = useState<string>('custom');

    const [formData, setFormData] = useState<BillingSettings>({
        company_name: '',
        legal_form: '',
        siret: '',
        rcs_number: '',
        rcs_city: '',
        capital: null,
        ape_code: '',
        vat_number: '',
        vat_subject: true,
        vat_exemption_reason: '',
        address_line1: '',
        address_line2: '',
        postal_code: '',
        city: '',
        country: 'FR',
        email: '',
        phone: '',
        iban: '',
        bic: '',
        bank_name: '',
        website: '',
        late_payment_penalty_text: '',
        recovery_indemnity_text: '',
        footer_legal_text: '',
        logo: null,
    });

    // Fetch billing settings
    const { data: billingSettings, isLoading } = useQuery({
        queryKey: ['billing-settings'],
        queryFn: async () => {
            const response = await axios.get('/settings/billing');
            return response.data.data;
        },
    });

    useEffect(() => {
        if (billingSettings) {
            setFormData(billingSettings);

            // Detect VAT exemption type from existing data
            if (billingSettings.vat_exemption_reason) {
                const matchedReason = VAT_EXEMPTION_REASONS.find(reason => {
                    if (reason === 'custom') return false;
                    const translatedText = t(`settings.vatExemptionReasons.${reason}`);
                    return billingSettings.vat_exemption_reason.includes(translatedText) ||
                           billingSettings.vat_exemption_reason === translatedText;
                });
                setVatExemptionType(matchedReason || 'custom');
            }
        }
    }, [billingSettings, t]);

    // Update billing settings mutation
    const updateBillingMutation = useMutation({
        mutationFn: async (data: Partial<BillingSettings>) => {
            const response = await axios.post('/settings/billing', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['billing-settings'] });
            toast.success(t('settings.billingSettingsSaved'));
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || t('settings.billingSettingsError'));
        },
    });

    // Upload logo mutation
    const uploadLogoMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('logo', file);
            const response = await axios.post('/settings/billing/logo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['billing-settings'] });
            toast.success(t('settings.logoUploadSuccess'));
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || t('settings.logoUploadError'));
        },
    });

    // Delete logo mutation
    const deleteLogoMutation = useMutation({
        mutationFn: async () => {
            const response = await axios.delete('/settings/billing/logo');
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['billing-settings'] });
            toast.success(t('settings.logoDeleteSuccess'));
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || t('common.error'));
        },
    });

    const handleInputChange = useCallback((field: keyof BillingSettings, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleSave = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        updateBillingMutation.mutate(formData);
    }, [formData, updateBillingMutation]);

    const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadLogoMutation.mutate(file);
        }
    }, [uploadLogoMutation]);

    const handleLogoDelete = useCallback(() => {
        if (confirm(t('settings.deleteLogo') + '?')) {
            deleteLogoMutation.mutate();
        }
    }, [deleteLogoMutation, t]);

    if (isLoading) {
        return (
            <div className="p-6 max-w-6xl mx-auto">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="space-y-4">
                        <div className="bg-white rounded-lg shadow p-6 h-48"></div>
                        <div className="bg-white rounded-lg shadow p-6 h-48"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">{t('settings.billingSettings')}</h1>
                <p className="mt-2 text-gray-600">{t('settings.billingSettingsDescription')}</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Logo Section */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <PhotoIcon className="h-6 w-6 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">{t('settings.logoSettings')}</h2>
                    </div>
                    <div className="flex items-center space-x-4">
                        {formData.logo && (
                            <div className="relative">
                                <img
                                    src={`/storage/${formData.logo}`}
                                    alt="Logo"
                                    className="h-24 w-24 object-contain border border-gray-300 rounded"
                                />
                                <button
                                    type="button"
                                    onClick={handleLogoDelete}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                {t('settings.uploadLogo')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Company Information */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <BuildingOfficeIcon className="h-6 w-6 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">{t('settings.companyInformation')}</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.companyName')}
                            </label>
                            <input
                                type="text"
                                value={formData.company_name}
                                onChange={(e) => handleInputChange('company_name', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.legalForm')}
                            </label>
                            <select
                                value={formData.legal_form}
                                onChange={(e) => handleInputChange('legal_form', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">{t('settings.legalFormPlaceholder')}</option>
                                {LEGAL_FORMS.map(form => (
                                    <option key={form} value={form}>
                                        {form}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.siret')}
                            </label>
                            <input
                                type="text"
                                value={formData.siret}
                                onChange={(e) => handleInputChange('siret', e.target.value)}
                                placeholder={t('settings.siretPlaceholder')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.rcsNumber')}
                            </label>
                            <input
                                type="text"
                                value={formData.rcs_number}
                                onChange={(e) => handleInputChange('rcs_number', e.target.value)}
                                placeholder={t('settings.rcsNumberPlaceholder')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.rcsCity')}
                            </label>
                            <input
                                type="text"
                                value={formData.rcs_city}
                                onChange={(e) => handleInputChange('rcs_city', e.target.value)}
                                placeholder={t('settings.rcsCityPlaceholder')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.capital')}
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.capital || ''}
                                onChange={(e) => handleInputChange('capital', e.target.value ? parseFloat(e.target.value) : null)}
                                placeholder={t('settings.capitalPlaceholder')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.apeCode')}
                            </label>
                            <input
                                type="text"
                                value={formData.ape_code}
                                onChange={(e) => handleInputChange('ape_code', e.target.value)}
                                placeholder={t('settings.apeCodePlaceholder')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* VAT Information */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <DocumentTextIcon className="h-6 w-6 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">{t('settings.vatInformation')}</h2>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.vatNumber')}
                            </label>
                            <input
                                type="text"
                                value={formData.vat_number}
                                onChange={(e) => handleInputChange('vat_number', e.target.value)}
                                placeholder={t('settings.vatNumberPlaceholder')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={formData.vat_subject}
                                onChange={(e) => handleInputChange('vat_subject', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-3 text-gray-700">
                                {t('settings.vatSubject')}
                            </label>
                        </div>
                        {!formData.vat_subject && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('settings.vatExemptionReason')}
                                    </label>
                                    <select
                                        value={vatExemptionType}
                                        onChange={(e) => {
                                            const selectedType = e.target.value;
                                            setVatExemptionType(selectedType);
                                            if (selectedType !== 'custom') {
                                                handleInputChange('vat_exemption_reason', t(`settings.vatExemptionReasons.${selectedType}`));
                                            } else {
                                                handleInputChange('vat_exemption_reason', '');
                                            }
                                        }}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        {VAT_EXEMPTION_REASONS.map(reason => (
                                            <option key={reason} value={reason}>
                                                {t(`settings.vatExemptionReasons.${reason}`)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {vatExemptionType === 'custom' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {t('settings.customVatExemptionReason')}
                                        </label>
                                        <textarea
                                            value={formData.vat_exemption_reason}
                                            onChange={(e) => handleInputChange('vat_exemption_reason', e.target.value)}
                                            placeholder={t('settings.vatExemptionReasonPlaceholder')}
                                            rows={3}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Address Information */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.addressInformation')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.addressLine1')}
                            </label>
                            <input
                                type="text"
                                value={formData.address_line1}
                                onChange={(e) => handleInputChange('address_line1', e.target.value)}
                                placeholder={t('settings.addressLine1Placeholder')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.addressLine2')}
                            </label>
                            <input
                                type="text"
                                value={formData.address_line2}
                                onChange={(e) => handleInputChange('address_line2', e.target.value)}
                                placeholder={t('settings.addressLine2Placeholder')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.postalCode')}
                            </label>
                            <input
                                type="text"
                                value={formData.postal_code}
                                onChange={(e) => handleInputChange('postal_code', e.target.value)}
                                placeholder={t('settings.postalCodePlaceholder')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.city')}
                            </label>
                            <input
                                type="text"
                                value={formData.city}
                                onChange={(e) => handleInputChange('city', e.target.value)}
                                placeholder={t('settings.cityPlaceholder')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.country')}
                            </label>
                            <select
                                value={formData.country}
                                onChange={(e) => handleInputChange('country', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">{t('settings.countryPlaceholder')}</option>
                                {COUNTRIES.map(country => (
                                    <option key={country.code} value={country.code}>
                                        {i18n.language === 'fr' ? country.nameFr : country.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Contact Information */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.contactInformation')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.email')}
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                placeholder={t('settings.emailPlaceholder')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.phone')}
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                placeholder={t('settings.phonePlaceholder')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.website')}
                            </label>
                            <input
                                type="url"
                                value={formData.website}
                                onChange={(e) => handleInputChange('website', e.target.value)}
                                placeholder={t('settings.websitePlaceholder')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Bank Information */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <BanknotesIcon className="h-6 w-6 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">{t('settings.bankInformation')}</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.iban')}
                            </label>
                            <input
                                type="text"
                                value={formData.iban}
                                onChange={(e) => handleInputChange('iban', e.target.value)}
                                placeholder={t('settings.ibanPlaceholder')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.bic')}
                            </label>
                            <input
                                type="text"
                                value={formData.bic}
                                onChange={(e) => handleInputChange('bic', e.target.value)}
                                placeholder={t('settings.bicPlaceholder')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.bankName')}
                            </label>
                            <input
                                type="text"
                                value={formData.bank_name}
                                onChange={(e) => handleInputChange('bank_name', e.target.value)}
                                placeholder={t('settings.bankNamePlaceholder')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Legal Texts */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.legalTexts')}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.latePaymentPenaltyText')}
                            </label>
                            <textarea
                                value={formData.late_payment_penalty_text}
                                onChange={(e) => handleInputChange('late_payment_penalty_text', e.target.value)}
                                placeholder={t('settings.latePaymentPenaltyTextPlaceholder')}
                                rows={2}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.recoveryIndemnityText')}
                            </label>
                            <textarea
                                value={formData.recovery_indemnity_text}
                                onChange={(e) => handleInputChange('recovery_indemnity_text', e.target.value)}
                                placeholder={t('settings.recoveryIndemnityTextPlaceholder')}
                                rows={2}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.footerLegalText')}
                            </label>
                            <textarea
                                value={formData.footer_legal_text}
                                onChange={(e) => handleInputChange('footer_legal_text', e.target.value)}
                                placeholder={t('settings.footerLegalTextPlaceholder')}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={updateBillingMutation.isPending}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 flex items-center space-x-2"
                    >
                        {updateBillingMutation.isPending ? (
                            <span>{t('common.saving')}</span>
                        ) : (
                            <>
                                <CheckCircleIcon className="h-5 w-5" />
                                <span>{t('common.save')}</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TenantBillingSettings;
