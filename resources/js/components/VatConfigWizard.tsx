import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

interface VatConfig {
  legalForm: string;
  mainActivity: string;
  vatRegime: string;
  vatSubject: boolean;
  vatExemptionReason: string;
  businessType: string;
  vatDeductionCoefficient: number;
  activityLicenseNumber: string;
  autoApplyVatOnThreshold: boolean;
}

interface ActivityRule {
  name: string;
  exempt: boolean;
  articleCgi: string;
  defaultRate: number;
  description: string;
  requiresLicense: boolean;
  licenseLabel?: string;
  mixedActivity?: boolean;
  note?: string;
}

const ACTIVITIES: Record<string, ActivityRule> = {
  general: {
    name: 'Activité générale',
    exempt: false,
    articleCgi: '',
    defaultRate: 20.0,
    description: 'Commerce, prestations de services classiques',
    requiresLicense: false,
  },
  insurance: {
    name: 'Assurances',
    exempt: true,
    articleCgi: 'Article 261 C CGI',
    defaultRate: 0.0,
    description: 'Opérations d\'assurance, réassurance et capitalisation',
    requiresLicense: false,
    mixedActivity: true,
  },
  training: {
    name: 'Formation professionnelle',
    exempt: true,
    articleCgi: 'Article 261-4-4° CGI',
    defaultRate: 0.0,
    description: 'Formation professionnelle continue',
    requiresLicense: true,
    licenseLabel: 'Numéro d\'agrément formation (BPF)',
    mixedActivity: true,
  },
  medical: {
    name: 'Professions médicales',
    exempt: true,
    articleCgi: 'Article 261-4-1° CGI',
    defaultRate: 0.0,
    description: 'Soins médicaux et paramédicaux',
    requiresLicense: false,
  },
  banking: {
    name: 'Banques et finances',
    exempt: true,
    articleCgi: 'Article 261 B CGI',
    defaultRate: 0.0,
    description: 'Opérations bancaires et financières',
    requiresLicense: false,
    mixedActivity: true,
  },
  real_estate_rental: {
    name: 'Location immobilière nue',
    exempt: true,
    articleCgi: 'Article 261 D CGI',
    defaultRate: 0.0,
    description: 'Location d\'immeubles nus',
    requiresLicense: false,
    note: 'Option possible pour la TVA (Art. 260-2°)',
  },
  education: {
    name: 'Enseignement',
    exempt: true,
    articleCgi: 'Article 261-4-4° bis CGI',
    defaultRate: 0.0,
    description: 'Enseignement scolaire, universitaire',
    requiresLicense: false,
  },
  sports: {
    name: 'Éducation sportive',
    exempt: true,
    articleCgi: 'Article 261-6° CGI',
    defaultRate: 0.0,
    description: 'Enseignement sportif et éducation physique',
    requiresLicense: false,
  },
  other_exempt: {
    name: 'Autre activité exonérée',
    exempt: true,
    articleCgi: 'À préciser',
    defaultRate: 0.0,
    description: 'Autre activité exonérée de TVA',
    requiresLicense: false,
    mixedActivity: true,
  },
};

const LEGAL_FORMS = [
  { value: 'SARL', label: 'SARL - Société à Responsabilité Limitée', franchiseEligible: false },
  { value: 'SAS', label: 'SAS - Société par Actions Simplifiée', franchiseEligible: false },
  { value: 'SA', label: 'SA - Société Anonyme', franchiseEligible: false },
  { value: 'EI', label: 'EI - Entreprise Individuelle', franchiseEligible: true },
  { value: 'EIRL', label: 'EIRL - Entrepreneur Individuel à Responsabilité Limitée', franchiseEligible: true },
  { value: 'EURL', label: 'EURL - Entreprise Unipersonnelle à Responsabilité Limitée', franchiseEligible: false },
  { value: 'SNC', label: 'SNC - Société en Nom Collectif', franchiseEligible: false },
  { value: 'SCI', label: 'SCI - Société Civile Immobilière', franchiseEligible: false },
  { value: 'Association', label: 'Association', franchiseEligible: false },
  { value: 'Other', label: 'Autre', franchiseEligible: false },
];

interface Props {
  onComplete: (config: VatConfig) => void;
  initialData?: Partial<VatConfig>;
}

const VatConfigWizard: React.FC<Props> = ({ onComplete, initialData }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<VatConfig>({
    legalForm: initialData?.legalForm || '',
    mainActivity: initialData?.mainActivity || 'general',
    vatRegime: initialData?.vatRegime || 'normal',
    vatSubject: initialData?.vatSubject ?? true,
    vatExemptionReason: initialData?.vatExemptionReason || '',
    businessType: initialData?.businessType || 'services',
    vatDeductionCoefficient: initialData?.vatDeductionCoefficient || 100,
    activityLicenseNumber: initialData?.activityLicenseNumber || '',
    autoApplyVatOnThreshold: initialData?.autoApplyVatOnThreshold ?? true,
  });

  const selectedLegalForm = LEGAL_FORMS.find(f => f.value === config.legalForm);
  const selectedActivity = ACTIVITIES[config.mainActivity];
  const canUseFranchise = selectedLegalForm?.franchiseEligible && !selectedActivity?.exempt;

  // Calculer la configuration automatique
  const autoConfig = () => {
    if (canUseFranchise) {
      // Micro-entreprise / EI → Franchise en base
      return {
        vatRegime: 'franchise_base',
        vatSubject: false,
        vatExemptionReason: 'TVA non applicable - Article 293 B du CGI (franchise en base)',
        autoApplyVatOnThreshold: true,
      };
    } else if (selectedActivity?.exempt) {
      // Activité exonérée → Régime normal sans TVA
      return {
        vatRegime: 'normal',
        vatSubject: false,
        vatExemptionReason: `TVA non applicable - ${selectedActivity.articleCgi}`,
        autoApplyVatOnThreshold: false,
      };
    } else {
      // Société classique → Assujetti
      return {
        vatRegime: 'normal',
        vatSubject: true,
        vatExemptionReason: '',
        autoApplyVatOnThreshold: false,
      };
    }
  };

  const handleNext = () => {
    if (step === 3) {
      // Appliquer la configuration automatique
      const auto = autoConfig();
      setConfig({ ...config, ...auto });
      setStep(4);
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => setStep(step - 1);

  const handleComplete = () => {
    onComplete(config);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Étape {step} sur 4</span>
          <span className="text-sm text-gray-500">{Math.round((step / 4) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1: Forme juridique */}
      {step === 1 && (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quelle est votre forme juridique ?</h2>
          <p className="text-gray-600 mb-6">
            Cette information nous aide à déterminer votre régime de TVA applicable
          </p>

          <div className="space-y-3">
            {LEGAL_FORMS.map((form) => (
              <label
                key={form.value}
                className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  config.legalForm === form.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="legalForm"
                  value={form.value}
                  checked={config.legalForm === form.value}
                  onChange={(e) => setConfig({ ...config, legalForm: e.target.value })}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="ml-3 text-gray-900 font-medium">{form.label}</span>
                {form.franchiseEligible && (
                  <span className="ml-auto text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Franchise possible
                  </span>
                )}
              </label>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleNext}
              disabled={!config.legalForm}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <span>Suivant</span>
              <ArrowRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Activité principale */}
      {step === 2 && (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quelle est votre activité principale ?</h2>
          <p className="text-gray-600 mb-6">
            Certaines activités sont exonérées de TVA selon le Code Général des Impôts
          </p>

          <div className="space-y-3">
            {Object.entries(ACTIVITIES).map(([key, activity]) => (
              <label
                key={key}
                className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  config.mainActivity === key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start">
                  <input
                    type="radio"
                    name="mainActivity"
                    value={key}
                    checked={config.mainActivity === key}
                    onChange={(e) => setConfig({ ...config, mainActivity: e.target.value })}
                    className="h-4 w-4 text-blue-600 mt-1"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-900 font-medium">{activity.name}</span>
                      {activity.exempt ? (
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                          Exonéré de TVA
                        </span>
                      ) : (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          TVA à 20%
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                    {activity.articleCgi && (
                      <p className="text-xs text-gray-500 mt-1">{activity.articleCgi}</p>
                    )}
                    {activity.mixedActivity && (
                      <p className="text-xs text-orange-600 mt-1 flex items-center">
                        <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                        Activité mixte : certaines prestations peuvent être à 20%
                      </p>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-8 flex justify-between">
            <button
              onClick={handleBack}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span>Retour</span>
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <span>Suivant</span>
              <ArrowRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Analyse et suggestion */}
      {step === 3 && (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyse de votre situation</h2>
          <p className="text-gray-600 mb-6">
            Voici ce que nous recommandons pour votre configuration
          </p>

          <div className="space-y-4">
            {/* Résumé des choix */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Vos choix</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                  <span>Forme juridique : <strong>{selectedLegalForm?.label}</strong></span>
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                  <span>Activité : <strong>{selectedActivity?.name}</strong></span>
                </li>
              </ul>
            </div>

            {/* Configuration recommandée */}
            <div className={`rounded-lg p-6 ${
              canUseFranchise ? 'bg-blue-50 border border-blue-200' :
              selectedActivity?.exempt ? 'bg-orange-50 border border-orange-200' :
              'bg-green-50 border border-green-200'
            }`}>
              <div className="flex items-start space-x-3">
                <InformationCircleIcon className={`h-6 w-6 flex-shrink-0 ${
                  canUseFranchise ? 'text-blue-600' :
                  selectedActivity?.exempt ? 'text-orange-600' :
                  'text-green-600'
                }`} />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Configuration recommandée</h3>
                  
                  {canUseFranchise && (
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-blue-900">
                        ✅ Régime de franchise en base de TVA
                      </p>
                      <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                        <li>Vos factures seront à <strong>0% de TVA</strong></li>
                        <li>Seuils applicables : <strong>36 800€</strong> (services) ou <strong>91 900€</strong> (marchandises)</li>
                        <li>Bascule automatique en TVA si vous dépassez le seuil</li>
                        <li>Mention obligatoire : "TVA non applicable - Art. 293 B du CGI"</li>
                      </ul>
                    </div>
                  )}

                  {!canUseFranchise && selectedActivity?.exempt && (
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-orange-900">
                        ✅ Activité exonérée de TVA
                      </p>
                      <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                        <li>Activité principale : <strong>0% de TVA</strong></li>
                        <li>Article applicable : <strong>{selectedActivity.articleCgi}</strong></li>
                        <li>Pas de seuils à respecter (exonération permanente)</li>
                        {selectedActivity.mixedActivity && (
                          <li className="text-orange-700">
                            ⚠️ Activités annexes hors activité principale : <strong>20% de TVA</strong>
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {!canUseFranchise && !selectedActivity?.exempt && (
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-green-900">
                        ✅ Régime normal - Assujetti à la TVA
                      </p>
                      <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                        <li>Vos factures seront à <strong>20% de TVA</strong></li>
                        <li>Vous pourrez récupérer la TVA sur vos achats</li>
                        <li>Déclarations de TVA obligatoires</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Licence si nécessaire */}
            {selectedActivity?.requiresLicense && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 mb-1">Agrément requis</h4>
                    <p className="text-sm text-yellow-800 mb-3">
                      Votre activité nécessite un numéro d'agrément pour bénéficier de l'exonération de TVA
                    </p>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {selectedActivity.licenseLabel}
                    </label>
                    <input
                      type="text"
                      value={config.activityLicenseNumber}
                      onChange={(e) => setConfig({ ...config, activityLicenseNumber: e.target.value })}
                      placeholder="Ex: 11 75 12345 75"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-between">
            <button
              onClick={handleBack}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span>Retour</span>
            </button>
            <button
              onClick={handleNext}
              disabled={selectedActivity?.requiresLicense && !config.activityLicenseNumber}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <span>Appliquer la configuration</span>
              <ArrowRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Récapitulatif et validation */}
      {step === 4 && (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircleIcon className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Configuration terminée !</h2>
            <p className="text-gray-600">
              Votre régime de TVA a été configuré automatiquement
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">Récapitulatif de votre configuration</h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Forme juridique :</span>
                <p className="font-medium text-gray-900">{selectedLegalForm?.label}</p>
              </div>
              <div>
                <span className="text-gray-600">Activité principale :</span>
                <p className="font-medium text-gray-900">{selectedActivity?.name}</p>
              </div>
              <div>
                <span className="text-gray-600">Régime de TVA :</span>
                <p className="font-medium text-gray-900">
                  {config.vatRegime === 'franchise_base' ? 'Franchise en base' : 'Régime normal'}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Assujetti à la TVA :</span>
                <p className="font-medium text-gray-900">{config.vatSubject ? 'Oui (20%)' : 'Non (0%)'}</p>
              </div>
              {config.vatExemptionReason && (
                <div className="col-span-2">
                  <span className="text-gray-600">Raison d'exonération :</span>
                  <p className="font-medium text-gray-900">{config.vatExemptionReason}</p>
                </div>
              )}
              {config.activityLicenseNumber && (
                <div className="col-span-2">
                  <span className="text-gray-600">Numéro d'agrément :</span>
                  <p className="font-medium text-gray-900">{config.activityLicenseNumber}</p>
                </div>
              )}
              {config.vatRegime === 'franchise_base' && (
                <div className="col-span-2">
                  <span className="text-gray-600">Bascule automatique :</span>
                  <p className="font-medium text-gray-900">
                    {config.autoApplyVatOnThreshold ? '✅ Activée (passage auto à 20% si seuil dépassé)' : '❌ Désactivée'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <button
              onClick={handleBack}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span>Retour</span>
            </button>
            <button
              onClick={handleComplete}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <CheckCircleIcon className="h-5 w-5" />
              <span>Valider et enregistrer</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VatConfigWizard;
