import React from 'react';
import { ChartBarIcon, DocumentChartBarIcon, CurrencyEuroIcon, ClockIcon } from '@heroicons/react/24/outline';

const Reports: React.FC = () => {
    return (
        <div className="p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Rapports</h1>
                <p className="mt-2 text-gray-600">Générez et consultez vos rapports d'activité</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <ClockIcon className="h-8 w-8 text-blue-600" />
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Rapport de temps</h3>
                    <p className="text-gray-600 text-sm">Analyse détaillée du temps passé sur les projets et tâches</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <CurrencyEuroIcon className="h-8 w-8 text-green-600" />
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Rapport financier</h3>
                    <p className="text-gray-600 text-sm">Vue d'ensemble des revenus, dépenses et rentabilité</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <ChartBarIcon className="h-8 w-8 text-purple-600" />
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Rapport de projet</h3>
                    <p className="text-gray-600 text-sm">Suivi de l'avancement et des performances des projets</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <DocumentChartBarIcon className="h-8 w-8 text-orange-600" />
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Rapport client</h3>
                    <p className="text-gray-600 text-sm">Analyse de l'activité et du chiffre d'affaires par client</p>
                </div>
            </div>
        </div>
    );
};

export default Reports;
