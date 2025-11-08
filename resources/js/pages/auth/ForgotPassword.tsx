import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { EnvelopeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [emailSent, setEmailSent] = useState(false);

    const resetMutation = useMutation({
        mutationFn: async (email: string) => {
            const response = await axios.post('/forgot-password', { email });
            return response.data;
        },
        onSuccess: () => {
            setEmailSent(true);
            toast.success('Email de réinitialisation envoyé !');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Erreur lors de l\'envoi';
            toast.error(message);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            toast.error('Veuillez entrer votre adresse email');
            return;
        }

        resetMutation.mutate(email);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="flex justify-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        Mot de passe oublié ?
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Pas de problème. Entrez votre email et nous vous enverrons un lien de réinitialisation.
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {emailSent ? (
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="mt-4 text-lg font-medium text-gray-900">Email envoyé !</h3>
                            <p className="mt-2 text-sm text-gray-600">
                                Vérifiez votre boîte de réception et suivez les instructions pour réinitialiser votre mot de passe.
                            </p>
                            <Link
                                to="/login"
                                className="mt-6 inline-flex items-center text-blue-600 hover:text-blue-500 transition"
                            >
                                <ArrowLeftIcon className="mr-2 h-5 w-5" />
                                Retour à la connexion
                            </Link>
                        </div>
                    ) : (
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                    Adresse email
                                </label>
                                <div className="mt-1 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                        placeholder="vous@exemple.com"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={resetMutation.isPending}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {resetMutation.isPending ? 'Envoi en cours...' : 'Envoyer le lien'}
                            </button>

                            <div className="text-center">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition"
                                >
                                    <ArrowLeftIcon className="mr-2 h-4 w-4" />
                                    Retour à la connexion
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
