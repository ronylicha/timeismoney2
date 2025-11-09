import React, { useState, useEffect } from 'react';
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

interface SendQuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (email: string) => void;
    defaultEmail: string;
    quoteNumber: string;
    clientName: string;
    isPending?: boolean;
}

const SendQuoteModal: React.FC<SendQuoteModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    defaultEmail,
    quoteNumber,
    clientName,
    isPending = false
}) => {
    const [email, setEmail] = useState(defaultEmail);
    const [emailError, setEmailError] = useState('');

    useEffect(() => {
        setEmail(defaultEmail);
        setEmailError('');
    }, [defaultEmail, isOpen]);

    if (!isOpen) return null;

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!email.trim()) {
            setEmailError('L\'adresse email est requise');
            return;
        }

        if (!validateEmail(email)) {
            setEmailError('Veuillez saisir une adresse email valide');
            return;
        }

        setEmailError('');
        onConfirm(email);
    };

    const handleClose = () => {
        if (!isPending) {
            setEmail(defaultEmail);
            setEmailError('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
                    {/* Header */}
                    <div className="bg-blue-600 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500">
                                    <PaperAirplaneIcon className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">
                                        Envoyer le devis
                                    </h3>
                                    <p className="text-sm text-blue-100">
                                        {quoteNumber}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                disabled={isPending}
                                className="rounded-full p-1 text-blue-100 hover:bg-blue-500 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-4">
                                Le devis sera envoyé par email au client <strong>{clientName}</strong> avec un lien de signature électronique.
                            </p>

                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Adresse email du destinataire *
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setEmailError('');
                                }}
                                disabled={isPending}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition ${
                                    emailError
                                        ? 'border-red-300 focus:ring-red-500'
                                        : 'border-gray-300 focus:ring-blue-500'
                                } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                                placeholder="exemple@email.com"
                                required
                            />
                            {emailError && (
                                <p className="mt-1 text-sm text-red-600">{emailError}</p>
                            )}
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <h4 className="text-sm font-semibold text-blue-900 mb-2">
                                📧 Contenu de l'email
                            </h4>
                            <ul className="text-xs text-blue-800 space-y-1">
                                <li>• Devis en pièce jointe (PDF)</li>
                                <li>• Lien de signature électronique sécurisé</li>
                                <li>• Détails du devis (montant, validité, etc.)</li>
                                <li>• Instructions pour accepter le devis</li>
                            </ul>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isPending}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                            >
                                {isPending ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        <span>Envoi en cours...</span>
                                    </>
                                ) : (
                                    <>
                                        <PaperAirplaneIcon className="h-4 w-4" />
                                        <span>Envoyer le devis</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SendQuoteModal;
