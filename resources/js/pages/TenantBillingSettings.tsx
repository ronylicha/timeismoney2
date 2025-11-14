import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
    BuildingOfficeIcon,
    BanknotesIcon,
    DocumentTextIcon,
    PhotoIcon,
    CheckCircleIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { COUNTRIES } from '../constants/countries';
import VatConfigWizard from '../components/VatConfigWizard';
import AddressAutocomplete from '../components/AddressAutocomplete';

interface BillingSettings {
    company_name: string;
    legal_form: string;
    siret: string;
    rcs_number: string;
    rcs_city: string;
    rm_number: string;
    capital: number | null;
    ape_code: string;
    vat_number: string;
    vat_subject: boolean;
    vat_regime: 'franchise_base' | 'normal' | 'intracommunity' | 'export' | 'exempt_article_261' | 'other';
    accounting_method: 'cash' | 'accrual';
    main_activity: 'general' | 'insurance' | 'training' | 'medical' | 'banking' | 'real_estate_rental' | 'education' | 'sports' | 'other_exempt';
    vat_deduction_coefficient: number;
    activity_license_number: string | null;
    vat_exemption_reason: string;
    vat_explanation?: string;
    business_type: 'services' | 'goods' | 'mixed';
    vat_threshold_services: number | null;
    vat_threshold_goods: number | null;
    vat_threshold_year_total: number;
    vat_threshold_exceeded_at: string | null;
    auto_apply_vat_on_threshold: boolean;
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
    default_quote_conditions: string;
    default_invoice_conditions: string;
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
    const [showWizard, setShowWizard] = useState<boolean>(false);

    const [formData, setFormData] = useState<BillingSettings>({
        company_name: '',
        legal_form: '',
        siret: '',
        rcs_number: '',
        rcs_city: '',
        rm_number: '',
        capital: null,
        ape_code: '',
        vat_number: '',
        vat_subject: true,
        vat_regime: 'normal',
        accounting_method: 'cash',
        main_activity: 'general',
        vat_deduction_coefficient: 100,
        activity_license_number: null,
        vat_exemption_reason: '',
        business_type: 'services',
        vat_threshold_services: 36800,
        vat_threshold_goods: 91900,
        vat_threshold_year_total: 0,
        vat_threshold_exceeded_at: null,
        auto_apply_vat_on_threshold: true,
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
        default_quote_conditions: '',
        default_invoice_conditions: '',
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
            // Ensure all fields have default values (no null for string/number inputs)
            setFormData({
                company_name: billingSettings.company_name || '',
                legal_form: billingSettings.legal_form || '',
                siret: billingSettings.siret || '',
                rcs_number: billingSettings.rcs_number || '',
                rcs_city: billingSettings.rcs_city || '',
                rm_number: billingSettings.rm_number || '',
                capital: billingSettings.capital,
                ape_code: billingSettings.ape_code || '',
                vat_number: billingSettings.vat_number || '',
                vat_subject: billingSettings.vat_subject ?? true,
                vat_regime: billingSettings.vat_regime || 'normal',
                accounting_method: billingSettings.accounting_method || 'cash',
                main_activity: billingSettings.main_activity || 'general',
                vat_deduction_coefficient: billingSettings.vat_deduction_coefficient ?? 100,
                activity_license_number: billingSettings.activity_license_number || null,
                vat_exemption_reason: billingSettings.vat_exemption_reason || '',
                vat_explanation: billingSettings.vat_explanation,
                business_type: billingSettings.business_type || 'services',
                vat_threshold_services: billingSettings.vat_threshold_services ?? 36800,
                vat_threshold_goods: billingSettings.vat_threshold_goods ?? 91900,
                vat_threshold_year_total: billingSettings.vat_threshold_year_total ?? 0,
                vat_threshold_exceeded_at: billingSettings.vat_threshold_exceeded_at || null,
                auto_apply_vat_on_threshold: billingSettings.auto_apply_vat_on_threshold ?? true,
                address_line1: billingSettings.address_line1 || '',
                address_line2: billingSettings.address_line2 || '',
                postal_code: billingSettings.postal_code || '',
                city: billingSettings.city || '',
                country: billingSettings.country || 'FR',
                email: billingSettings.email || '',
                phone: billingSettings.phone || '',
                iban: billingSettings.iban || '',
                bic: billingSettings.bic || '',
                bank_name: billingSettings.bank_name || '',
                website: billingSettings.website || '',
                late_payment_penalty_text: billingSettings.late_payment_penalty_text || '',
                recovery_indemnity_text: billingSettings.recovery_indemnity_text || '',
                footer_legal_text: billingSettings.footer_legal_text || '',
                default_quote_conditions: billingSettings.default_quote_conditions || '',
                default_invoice_conditions: billingSettings.default_invoice_conditions || '',
                logo: billingSettings.logo || null,
            });

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
        onSuccess: (response) => {
            // Recharger les données depuis le serveur pour avoir les valeurs à jour
            // (par ex. si vat_subject a été modifié par la vérification du seuil)
            queryClient.invalidateQueries({ queryKey: ['billing-settings'] });
            
            // Mettre à jour aussi le formData avec les nouvelles valeurs du backend
            if (response.data) {
                const updatedData = response.data;
                setFormData(prev => ({
                    ...prev,
                    vat_subject: updatedData.vat_subject ?? prev.vat_subject,
                    vat_threshold_year_total: updatedData.vat_threshold_year_total ?? prev.vat_threshold_year_total,
                    vat_threshold_exceeded_at: updatedData.vat_threshold_exceeded_at,
                }));
            }
            
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

    const handleAddressChange = useCallback((fullAddress: string, components: {
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
                c.nameFr?.toLowerCase() === countryCode.toLowerCase()
            );
            countryCode = foundCountry?.code || 'FR';
        }

        // Build street address (number + street only, no city/postal)
        const streetAddress = [components.housenumber, components.street]
            .filter(Boolean)
            .join(' ') || fullAddress.split(',')[0] || '';

        setFormData(prev => ({
            ...prev,
            address_line1: streetAddress,
            city: components.city || '',
            postal_code: components.postal_code || '',
            country: countryCode
        }));
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
                                Numéro RM (Répertoire des Métiers)
                                <span className="text-gray-500 text-xs ml-1">(Pour les artisans)</span>
                            </label>
                            <input
                                type="text"
                                value={formData.rm_number}
                                onChange={(e) => handleInputChange('rm_number', e.target.value)}
                                placeholder="Ex: 123456789"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Obligatoire si vous êtes inscrit au Répertoire des Métiers
                            </p>
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
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <DocumentTextIcon className="h-6 w-6 text-gray-600" />
                            <h2 className="text-lg font-semibold text-gray-900">{t('settings.vatInformation')}</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowWizard(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
                        >
                            <SparklesIcon className="h-5 w-5" />
                            <span className="font-medium">Assistant de configuration</span>
                        </button>
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

                        {/* Régime de TVA */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Régime de TVA
                            </label>
                            <select
                                value={formData.vat_regime}
                                onChange={(e) => handleInputChange('vat_regime', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="franchise_base">Franchise en base (micro-entreprise) - Seuils applicables</option>
                                <option value="normal">Régime normal (société, assujetti)</option>
                                <option value="intracommunity">Intracommunautaire</option>
                                <option value="export">Export hors UE</option>
                                <option value="exempt_article_261">Exonéré article 261 CGI (médical, enseignement...)</option>
                                <option value="other">Autre régime spécifique</option>
                            </select>
                            <p className="mt-1 text-xs text-gray-500">
                                {formData.vat_regime === 'franchise_base' && '✅ Les seuils de TVA s\'appliquent'}
                                {formData.vat_regime !== 'franchise_base' && '⚠️ Les seuils de TVA ne s\'appliquent pas'}
                            </p>
                        </div>

                        {/* Méthode comptable */}
                        <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                            <label className="block text-sm font-semibold text-blue-900 mb-2">
                                Méthode comptable <span className="text-red-600">*</span>
                            </label>
                            <select
                                value={formData.accounting_method}
                                onChange={(e) => handleInputChange('accounting_method', e.target.value)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            >
                                <option value="cash">Comptabilité d'encaissement (TVA sur encaissement)</option>
                                <option value="accrual">Comptabilité d'engagement (TVA sur débit)</option>
                            </select>
                            <div className="mt-3 text-xs text-blue-900 space-y-2">
                                <p className="font-medium">
                                    {formData.accounting_method === 'cash' ? '💰 Comptabilité d\'encaissement :' : '📊 Comptabilité d\'engagement :'}
                                </p>
                                {formData.accounting_method === 'cash' ? (
                                    <>
                                        <p>• Le chiffre d'affaires est comptabilisé au moment du paiement effectif</p>
                                        <p>• Les avoirs ne réduisent le CA que s'ils concernent une facture payée</p>
                                        <p>• Par défaut pour les prestations de services (Article 269-2-c du CGI)</p>
                                        <p>• Option disponible pour les autres activités si autorisée</p>
                                    </>
                                ) : (
                                    <>
                                        <p>• Le chiffre d'affaires est comptabilisé dès l'émission de la facture</p>
                                        <p>• Les avoirs réduisent le CA même si la facture n'est pas payée</p>
                                        <p>• Obligatoire pour les ventes de marchandises (Article 269-2-a du CGI)</p>
                                        <p>• Permet une meilleure anticipation de la trésorerie</p>
                                    </>
                                )}
                            </div>
                            <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-900">
                                <strong>⚠️ Important :</strong> Ce paramètre impacte le calcul de votre chiffre d'affaires dans tous les rapports et graphiques.
                            </div>
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

                        {/* Franchise en base de TVA - Seuils (toujours affiché) */}
                        <div className={`mt-6 p-4 rounded-lg border ${
                            formData.vat_subject 
                                ? 'bg-orange-50 border-orange-200' 
                                : 'bg-blue-50 border-blue-200'
                        }`}>
                            <h4 className={`text-sm font-semibold mb-3 flex items-center ${
                                formData.vat_subject ? 'text-orange-900' : 'text-blue-900'
                            }`}>
                                <BanknotesIcon className="h-5 w-5 mr-2" />
                                {formData.vat_subject 
                                    ? 'Suivi des seuils de TVA (assujetti)' 
                                    : 'Gestion automatique des seuils de TVA'}
                            </h4>
                            
                            {formData.vat_subject && (
                                <div className="mb-4 p-3 bg-orange-100 border border-orange-300 rounded text-sm">
                                    <p className="font-semibold text-orange-900 mb-1">
                                        ✓ Vous êtes actuellement assujetti à la TVA
                                    </p>
                                    {formData.vat_threshold_exceeded_at && (
                                        <p className="text-orange-800 text-xs">
                                            Seuil dépassé le {new Date(formData.vat_threshold_exceeded_at).toLocaleDateString('fr-FR')}
                                        </p>
                                    )}
                                    <p className="text-orange-700 text-xs mt-2">
                                        Pour revenir en franchise de base, décochez "Assujetti à la TVA" ci-dessus.
                                    </p>
                                </div>
                            )}
                                
                            <div className="space-y-4">
                                {/* Type d'activité */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Type d'activité principale
                                    </label>
                                    <select
                                        value={formData.business_type}
                                        onChange={(e) => handleInputChange('business_type', e.target.value)}
                                        disabled={formData.vat_subject}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    >
                                        <option value="services">Prestations de services</option>
                                        <option value="goods">Ventes de marchandises</option>
                                        <option value="mixed">Activité mixte</option>
                                    </select>
                                    <p className="mt-1 text-xs text-gray-500">
                                        Détermine le seuil de franchise en base applicable
                                    </p>
                                </div>

                                {/* Seuils */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Seuil services (€)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.vat_threshold_services ?? 36800}
                                            onChange={(e) => handleInputChange('vat_threshold_services', parseFloat(e.target.value))}
                                            disabled={formData.vat_subject}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Défaut: 36 800€ (2024)</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Seuil marchandises (€)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.vat_threshold_goods ?? 91900}
                                            onChange={(e) => handleInputChange('vat_threshold_goods', parseFloat(e.target.value))}
                                            disabled={formData.vat_subject}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Défaut: 91 900€ (2024)</p>
                                    </div>
                                </div>

                                {/* Auto-application */}
                                {!formData.vat_subject && (
                                    <div className="flex items-start">
                                        <input
                                            type="checkbox"
                                            checked={formData.auto_apply_vat_on_threshold}
                                            onChange={(e) => handleInputChange('auto_apply_vat_on_threshold', e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                                        />
                                        <div className="ml-3">
                                            <label className="text-sm font-medium text-gray-700">
                                                Basculer automatiquement en TVA si seuil dépassé
                                            </label>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Le système appliquera automatiquement la TVA à 20% dès que votre CA annuel HT dépasse le seuil configuré
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Statut actuel */}
                                <div className={`mt-4 p-3 border rounded ${
                                    formData.vat_subject 
                                        ? 'bg-white border-orange-200' 
                                        : 'bg-white border-blue-200'
                                }`}>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-medium text-gray-700">CA annuel HT (année en cours):</span>
                                        <span className={`text-lg font-bold ${
                                            formData.vat_subject ? 'text-orange-600' : 'text-blue-600'
                                        }`}>
                                            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(formData.vat_threshold_year_total ?? 0)}
                                        </span>
                                    </div>
                                    {!formData.vat_subject && formData.vat_threshold_year_total > 0 && (
                                        <div className="mt-2 text-xs">
                                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                                <div 
                                                    className={`h-2 rounded-full ${
                                                        (formData.vat_threshold_year_total / (formData.vat_threshold_services ?? 36800)) >= 0.9
                                                            ? 'bg-orange-500'
                                                            : 'bg-blue-500'
                                                    }`}
                                                    style={{
                                                        width: `${Math.min(100, (formData.vat_threshold_year_total / (formData.vat_threshold_services ?? 36800)) * 100)}%`
                                                    }}
                                                />
                                            </div>
                                            <p className="text-gray-600 mt-1">
                                                {Math.round((formData.vat_threshold_year_total / (formData.vat_threshold_services ?? 36800)) * 100)}% du seuil atteint
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="text-xs text-gray-600 mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                                    <strong>📋 Réglementation:</strong> En France, les seuils de franchise en base de TVA 2024 sont:
                                    <ul className="list-disc list-inside mt-1 ml-2">
                                        <li>Prestations de services: 36 800€</li>
                                        <li>Ventes de marchandises: 91 900€</li>
                                    </ul>
                                    {formData.vat_subject ? (
                                        <p className="mt-2 text-orange-700 font-medium">
                                            ⚠️ Votre CA a dépassé le seuil, vous êtes assujetti à la TVA.
                                        </p>
                                    ) : (
                                        <p className="mt-2">
                                            Au-delà, vous devenez assujetti à la TVA.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Address Information */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.addressInformation')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Champ de recherche d'adresse */}
                        <div className="md:col-span-2">
                            <AddressAutocomplete
                                value=""
                                onChange={handleAddressChange}
                                placeholder="Rechercher une adresse..."
                                className="w-full"
                                name="address-search"
                                id="tenant-address-search"
                                label="Rechercher une adresse"
                                showLabel={true}
                                required={false}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Utilisez ce champ pour rechercher et sélectionner une adresse. Les champs ci-dessous seront remplis automatiquement.
                            </p>
                        </div>

                        {/* Adresse ligne 1 (remplie automatiquement) */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.addressLine1')} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.address_line1}
                                onChange={(e) => handleInputChange('address_line1', e.target.value)}
                                placeholder="Numéro et nom de rue"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>

                        {/* Adresse ligne 2 (complément optionnel) */}
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
                                {t('settings.postalCode')} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.postal_code}
                                onChange={(e) => handleInputChange('postal_code', e.target.value)}
                                placeholder={t('settings.postalCodePlaceholder')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.city')} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.city}
                                onChange={(e) => handleInputChange('city', e.target.value)}
                                placeholder={t('settings.cityPlaceholder')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
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

                {/* Default Conditions */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <DocumentTextIcon className="h-6 w-6 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">{t('settings.defaultConditions')}</h2>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{t('settings.defaultConditionsDescription')}</p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.defaultQuoteConditions')}
                            </label>
                            <textarea
                                value={formData.default_quote_conditions}
                                onChange={(e) => handleInputChange('default_quote_conditions', e.target.value)}
                                placeholder={t('settings.defaultQuoteConditionsPlaceholder')}
                                rows={5}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('settings.defaultInvoiceConditions')}
                            </label>
                            <textarea
                                value={formData.default_invoice_conditions}
                                onChange={(e) => handleInputChange('default_invoice_conditions', e.target.value)}
                                placeholder={t('settings.defaultInvoiceConditionsPlaceholder')}
                                rows={5}
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

            {/* Wizard Modal */}
            {showWizard && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Assistant de configuration TVA</h2>
                            <button
                                onClick={() => setShowWizard(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <VatConfigWizard
                                initialData={{
                                    legalForm: formData.legal_form,
                                    mainActivity: formData.main_activity,
                                    vatRegime: formData.vat_regime,
                                    vatSubject: formData.vat_subject,
                                    vatExemptionReason: formData.vat_exemption_reason,
                                    businessType: formData.business_type,
                                    vatDeductionCoefficient: formData.vat_deduction_coefficient,
                                    activityLicenseNumber: formData.activity_license_number || '',
                                    autoApplyVatOnThreshold: formData.auto_apply_vat_on_threshold,
                                }}
                                onComplete={(config) => {
                                    // Mettre à jour le formulaire avec la config du wizard
                                    setFormData(prev => ({
                                        ...prev,
                                        legal_form: config.legalForm,
                                        main_activity: config.mainActivity as any,
                                        vat_regime: config.vatRegime as any,
                                        vat_subject: config.vatSubject,
                                        vat_exemption_reason: config.vatExemptionReason,
                                        business_type: config.businessType as any,
                                        vat_deduction_coefficient: config.vatDeductionCoefficient,
                                        activity_license_number: config.activityLicenseNumber || null,
                                        auto_apply_vat_on_threshold: config.autoApplyVatOnThreshold,
                                    }));
                                    setShowWizard(false);
                                    toast.success('Configuration TVA mise à jour ! Pensez à enregistrer vos modifications.');
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TenantBillingSettings;
