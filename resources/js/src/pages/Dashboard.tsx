import React from 'react';

const Dashboard: React.FC = () => {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">
                Tableau de Bord - Time Is Money
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Temps Total</h3>
                    <p className="text-3xl font-bold text-blue-600">0h 00m</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Projets Actifs</h3>
                    <p className="text-3xl font-bold text-green-600">0</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Tâches en cours</h3>
                    <p className="text-3xl font-bold text-orange-600">0</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Factures à traiter</h3>
                    <p className="text-3xl font-bold text-purple-600">0</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;