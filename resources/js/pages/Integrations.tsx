import React from 'react';
import { LinkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

const Integrations: React.FC = () => {
    const { t } = useTranslation();

    const integrations = [
        { name: 'Stripe', description: t('integrations.stripe.description'), connected: false },
        { name: 'Google Calendar', description: t('integrations.googleCalendar.description'), connected: false },
        { name: 'Slack', description: t('integrations.slack.description'), connected: false },
        { name: 'GitHub', description: t('integrations.github.description'), connected: false },
        { name: 'Trello', description: t('integrations.trello.description'), connected: false },
        { name: 'Zapier', description: t('integrations.zapier.description'), connected: false },
    ];

    return (
        <div className="p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">{t('integrations.title')}</h1>
                <p className="mt-2 text-gray-600">{t('integrations.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {integrations.map((integration, index) => (
                    <div
                        key={index}
                        className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                    {integration.name}
                                </h3>
                                <p className="text-sm text-gray-600">{integration.description}</p>
                            </div>
                            {integration.connected ? (
                                <CheckCircleIcon className="h-6 w-6 text-green-600" />
                            ) : (
                                <LinkIcon className="h-6 w-6 text-gray-400" />
                            )}
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                            {integration.connected ? (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-green-600 font-medium">{t('integrations.connected')}</span>
                                    <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                                        {t('integrations.disconnect')}
                                    </button>
                                </div>
                            ) : (
                                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                                    {t('integrations.connect')}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Integrations;
