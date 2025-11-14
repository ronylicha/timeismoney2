import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { syncServiceWorkerAuthToken } from '../../utils/serviceWorker';

const TwoFactorAuth: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [code, setCode] = useState('');
    const [useRecoveryCode, setUseRecoveryCode] = useState(false);

    const verifyMutation = useMutation({
        mutationFn: async (data: { code: string; recovery?: boolean }) => {
            const endpoint = data.recovery ? '/2fa/recovery' : '/2fa/verify';
            const response = await axios.post(endpoint, { code: data.code });
            return response.data;
        },
        onSuccess: (data) => {
            if (data.token) {
                localStorage.setItem('auth_token', data.token);
                syncServiceWorkerAuthToken(data.token);
            }
            toast.success(t('auth.twoFactorSuccess'));
            navigate('/dashboard');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || t('auth.invalidCode');
            toast.error(message);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!code) {
            toast.error(t('auth.enterCode'));
            return;
        }

        verifyMutation.mutate({ code, recovery: useRecoveryCode });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="flex justify-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <ShieldCheckIcon className="w-10 h-10 text-white" />
                        </div>
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        {t('auth.twoFactorTitle')}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        {useRecoveryCode
                            ? t('auth.recoveryCodeDescription')
                            : t('auth.twoFactorDescription')}
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                                {useRecoveryCode ? t('auth.recoveryCode') : t('auth.verificationCode')}
                            </label>
                            <input
                                id="code"
                                name="code"
                                type="text"
                                required
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="mt-1 appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-center text-2xl tracking-widest"
                                placeholder={useRecoveryCode ? '' : '000000'}
                                maxLength={useRecoveryCode ? 16 : 6}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={verifyMutation.isPending}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {verifyMutation.isPending ? t('auth.verifying') : t('auth.verify')}
                        </button>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setUseRecoveryCode(!useRecoveryCode);
                                    setCode('');
                                }}
                                className="text-sm text-blue-600 hover:text-blue-500 transition"
                            >
                                {useRecoveryCode
                                    ? t('auth.useAuthCode')
                                    : t('auth.useRecoveryCode')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TwoFactorAuth;
