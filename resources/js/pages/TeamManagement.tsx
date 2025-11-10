import React from 'react';
import { useTranslation } from 'react-i18next';
import { UserManagementWidget } from '../components/Dashboard/Widgets';
import { UsersIcon } from '@heroicons/react/24/outline';

const TeamManagement: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <UsersIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            {t('nav.teamManagement')}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            {t('teamManagement.pageDescription')}
                        </p>
                    </div>
                </div>
            </div>

            {/* User Management Widget */}
            <UserManagementWidget />
        </div>
    );
};

export default TeamManagement;
