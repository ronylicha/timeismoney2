import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { XMarkIcon, ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';

interface SignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (signatureData: string, acceptedTerms: boolean) => void;
    quoteNumber: string;
    clientName: string;
    total: number;
}

const SignatureModal: React.FC<SignatureModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    quoteNumber,
    clientName,
    total,
}) => {
    const signatureRef = useRef<SignatureCanvas>(null);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [signatureName, setSignatureName] = useState('');
    const [signatureDate] = useState(new Date().toLocaleDateString('fr-FR'));

    const clearSignature = () => {
        signatureRef.current?.clear();
    };

    const handleConfirm = () => {
        if (signatureRef.current && !signatureRef.current.isEmpty() && acceptedTerms && signatureName.trim()) {
            const signatureData = signatureRef.current.toDataURL();
            onConfirm(signatureData, acceptedTerms);
        }
    };

    const isSignatureEmpty = () => {
        return !signatureRef.current || signatureRef.current.isEmpty();
    };

    const canConfirm = !isSignatureEmpty() && acceptedTerms && signatureName.trim().length > 0;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Signature électronique du devis
                            </h2>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Quote Details */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
                                Détails du devis
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-blue-700 dark:text-blue-300">Numéro de devis:</span>
                                    <span className="font-semibold text-blue-900 dark:text-blue-100">{quoteNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-blue-700 dark:text-blue-300">Client:</span>
                                    <span className="font-semibold text-blue-900 dark:text-blue-100">{clientName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-blue-700 dark:text-blue-300">Montant total TTC:</span>
                                    <span className="font-bold text-lg text-blue-900 dark:text-blue-100">
                                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(total)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-blue-700 dark:text-blue-300">Date:</span>
                                    <span className="font-semibold text-blue-900 dark:text-blue-100">{signatureDate}</span>
                                </div>
                            </div>
                        </div>

                        {/* Terms Acceptance */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                                Acceptation des conditions
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-start space-x-3">
                                    <input
                                        type="checkbox"
                                        id="acceptTerms"
                                        checked={acceptedTerms}
                                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                                        className="mt-1 h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <label htmlFor="acceptTerms" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                        <span className="font-bold">Lu et approuvé.</span> Je certifie avoir lu et accepté les conditions générales 
                                        de vente ainsi que les termes de ce devis. Je m'engage à honorer les conditions de paiement spécifiées.
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Signatory Name */}
                        <div>
                            <label htmlFor="signatureName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Nom du signataire *
                            </label>
                            <input
                                type="text"
                                id="signatureName"
                                value={signatureName}
                                onChange={(e) => setSignatureName(e.target.value)}
                                placeholder="Prénom NOM"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>

                        {/* Signature Pad */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Signature manuscrite *
                                </label>
                                <button
                                    type="button"
                                    onClick={clearSignature}
                                    className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                >
                                    <ArrowPathIcon className="h-4 w-4" />
                                    <span>Effacer</span>
                                </button>
                            </div>
                            
                            <div className="border-4 border-gray-800 dark:border-gray-600 rounded-lg bg-white p-2">
                                <div className="border-2 border-dashed border-gray-300 dark:border-gray-500 rounded">
                                    <SignatureCanvas
                                        ref={signatureRef}
                                        canvasProps={{
                                            className: 'signature-canvas w-full h-48 cursor-crosshair',
                                            style: { touchAction: 'none' }
                                        }}
                                        backgroundColor="white"
                                        penColor="black"
                                    />
                                </div>
                                <div className="text-center mt-2">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Signez dans le cadre ci-dessus avec votre souris ou votre doigt
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Legal Notice */}
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                            <p className="text-xs text-yellow-800 dark:text-yellow-200">
                                <strong>⚖️ Valeur juridique:</strong> Conformément au règlement eIDAS (UE) n°910/2014 
                                et au Code civil français, cette signature électronique simple a la même valeur 
                                qu'une signature manuscrite pour l'acceptation de ce devis commercial.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 p-6">
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition font-medium"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={!canConfirm}
                                className={`
                                    flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition
                                    ${canConfirm 
                                        ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer' 
                                        : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                    }
                                `}
                            >
                                <CheckIcon className="h-5 w-5" />
                                <span>Signer et accepter le devis</span>
                            </button>
                        </div>
                        {!canConfirm && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-2 text-right">
                                Veuillez cocher "Lu et approuvé", saisir votre nom et signer dans le cadre
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignatureModal;
