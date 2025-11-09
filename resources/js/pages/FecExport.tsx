import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, DocumentTextIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import FecExportForm from '../components/Compliance/FecExportForm';

const FecExport: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center mb-4">
                    <Link
                        to="/invoices"
                        className="flex items-center text-gray-600 hover:text-gray-900 transition mr-4"
                    >
                        <ArrowLeftIcon className="h-5 w-5 mr-1" />
                        <span>{t('common.back', 'Retour')}</span>
                    </Link>
                </div>

                <div className="flex items-center space-x-4 mb-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                        <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {t('compliance.fec.title', 'Export FEC')}
                        </h1>
                        <p className="text-gray-600 mt-1">
                            {t('compliance.fec.subtitle', 'Fichier des Écritures Comptables')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="bg-white rounded-lg shadow p-8 mb-6">
                <FecExportForm />
            </div>

            {/* Compliance information */}
            <div className="bg-white rounded-lg shadow p-8">
                <div className="flex items-start space-x-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                        <ShieldCheckIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-lg font-semibold text-gray-900 mb-3">
                            {t('compliance.fec.aboutTitle', 'À propos du FEC')}
                        </h2>
                        
                        <div className="space-y-4 text-sm text-gray-700">
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">
                                    {t('compliance.fec.whatIsTitle', 'Qu\'est-ce que le FEC ?')}
                                </h3>
                                <p>
                                    {t('compliance.fec.whatIsDesc', 
                                        'Le Fichier des Écritures Comptables (FEC) est un fichier informatique regroupant l\'ensemble des données comptables d\'un exercice. Il doit être remis à l\'administration fiscale en cas de contrôle.'
                                    )}
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">
                                    {t('compliance.fec.whoNeedsTitle', 'Qui est concerné ?')}
                                </h3>
                                <p>
                                    {t('compliance.fec.whoNeedsDesc', 
                                        'Toutes les entreprises qui tiennent une comptabilité informatisée sont concernées, y compris les micro-entreprises au régime réel.'
                                    )}
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">
                                    {t('compliance.fec.formatTitle', 'Format du fichier')}
                                </h3>
                                <p className="mb-2">
                                    {t('compliance.fec.formatDesc', 
                                        'Le FEC doit respecter la norme définie par l\'article A47 A-1 du Livre des Procédures Fiscales (LPF). Notre export génère automatiquement :'
                                    )}
                                </p>
                                <ul className="list-disc list-inside space-y-1 ml-4">
                                    <li>{t('compliance.fec.format1', 'Écritures pour chaque facture émise')}</li>
                                    <li>{t('compliance.fec.format2', 'Écritures inversées pour chaque avoir')}</li>
                                    <li>{t('compliance.fec.format3', 'Numérotation séquentielle des écritures')}</li>
                                    <li>{t('compliance.fec.format4', 'Comptes client (411xxx) et produits (7xxxxx)')}</li>
                                    <li>{t('compliance.fec.format5', 'TVA collectée sur compte dédié')}</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">
                                    {t('compliance.fec.validationTitle', 'Validation')}
                                </h3>
                                <p>
                                    {t('compliance.fec.validationDesc', 
                                        'Le fichier généré est conforme aux exigences de l\'administration fiscale. Vous pouvez le tester avec l\'outil Test Compta Demat de la DGFiP.'
                                    )}
                                </p>
                            </div>

                            <div className="pt-4 border-t border-gray-200">
                                <h3 className="font-semibold text-gray-900 mb-2">
                                    {t('compliance.fec.referencesTitle', 'Références légales')}
                                </h3>
                                <ul className="text-xs space-y-1">
                                    <li>• Article L47 A du Livre des Procédures Fiscales</li>
                                    <li>• Article A47 A-1 du Livre des Procédures Fiscales</li>
                                    <li>• Arrêté du 29 juillet 2013 (JO du 31 juillet 2013)</li>
                                    <li>• BOI-CF-IOR-60-40-20 (Bulletin Officiel des Impôts)</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FecExport;
