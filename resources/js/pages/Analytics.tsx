import React from 'react';
import { ChartBarIcon, ArrowTrendingUpIcon, ClockIcon, CurrencyEuroIcon } from '@heroicons/react/24/outline';

const Analytics: React.FC = () => {
    return (
        <div className="p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Analytiques</h1>
                <p className="mt-2 text-gray-600">Tableaux de bord et indicateurs de performance</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Temps total</h3>
                        <ClockIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">0h</p>
                    <p className="text-sm text-green-600 mt-2">+0% ce mois</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Revenu</h3>
                        <CurrencyEuroIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">0 €</p>
                    <p className="text-sm text-green-600 mt-2">+0% ce mois</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Projets actifs</h3>
                        <ChartBarIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">0</p>
                    <p className="text-sm text-gray-600 mt-2">En cours</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Croissance</h3>
                        <ArrowTrendingUpIcon className="h-5 w-5 text-orange-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">0%</p>
                    <p className="text-sm text-gray-600 mt-2">vs mois dernier</p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Graphiques à venir</h2>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                    <p className="text-gray-500">Les graphiques seront affichés ici</p>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
