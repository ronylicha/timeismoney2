import React, { useEffect, useState } from 'react';
import {
    CalculatorIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface AdvanceCalculatorProps {
    selectedAdvances: any[];
    currentTotal: number;
    onSuggestedTotalCalculated?: (suggestedTotal: number) => void;
}

const AdvanceCalculator: React.FC<AdvanceCalculatorProps> = ({
    selectedAdvances,
    currentTotal,
    onSuggestedTotalCalculated,
}) => {
    const [calculatedProjectTotal, setCalculatedProjectTotal] = useState<number | null>(null);
    const [totalAdvancesAmount, setTotalAdvancesAmount] = useState<number>(0);
    const [totalAdvancesPercentage, setTotalAdvancesPercentage] = useState<number>(0);
    const [remainingPercentage, setRemainingPercentage] = useState<number>(0);

    useEffect(() => {
        if (selectedAdvances.length === 0) {
            setCalculatedProjectTotal(null);
            setTotalAdvancesAmount(0);
            setTotalAdvancesPercentage(0);
            setRemainingPercentage(0);
            return;
        }

        // Calculer le total des acomptes en euros et en pourcentage
        let totalAmount = 0;
        let totalPercent = 0;
        let hasPercentages = false;
        let calculatedTotal: number | null = null;

        selectedAdvances.forEach((advance) => {
            totalAmount += parseFloat(advance.total) || 0;
            
            if (advance.advance_percentage && advance.advance_percentage > 0) {
                hasPercentages = true;
                totalPercent += parseFloat(advance.advance_percentage);
                
                // Calculer le montant total du projet basé sur cet acompte
                // Formule: Montant total = (Montant acompte × 100) / Pourcentage acompte
                const projectTotal = (parseFloat(advance.total) * 100) / parseFloat(advance.advance_percentage);
                
                // Prendre le premier calcul ou vérifier la cohérence
                if (calculatedTotal === null) {
                    calculatedTotal = projectTotal;
                }
            }
        });

        setTotalAdvancesAmount(totalAmount);
        setTotalAdvancesPercentage(totalPercent);
        setRemainingPercentage(100 - totalPercent);

        if (hasPercentages && calculatedTotal !== null) {
            setCalculatedProjectTotal(calculatedTotal);
            
            // Notifier le parent du montant suggéré
            if (onSuggestedTotalCalculated) {
                onSuggestedTotalCalculated(calculatedTotal);
            }
        } else {
            setCalculatedProjectTotal(null);
        }
    }, [selectedAdvances, onSuggestedTotalCalculated]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount);
    };

    const formatPercentage = (percent: number) => {
        return `${percent.toFixed(0)}%`;
    };

    if (selectedAdvances.length === 0 || calculatedProjectTotal === null) {
        return null;
    }

    const suggestedBalance = calculatedProjectTotal - totalAdvancesAmount;
    const isCurrentTotalCorrect = Math.abs(currentTotal - calculatedProjectTotal) < 0.01;
    const isCurrentTotalTooLow = currentTotal < calculatedProjectTotal - 0.01;
    const isCurrentTotalTooHigh = currentTotal > calculatedProjectTotal + 0.01;

    return (
        <div className="bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-purple-400 dark:border-purple-700 rounded-lg p-5 shadow-md">
            <div className="flex items-center space-x-2 mb-4">
                <CalculatorIcon className="w-6 h-6 text-purple-700 dark:text-purple-400" />
                <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100">
                    Calculateur automatique
                </h3>
            </div>

            {/* Analyse des acomptes */}
            <div className="space-y-3 mb-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase">
                        📊 Analyse des acomptes sélectionnés
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <div className="text-gray-700 dark:text-gray-300">Nombre d'acomptes:</div>
                            <div className="font-bold text-purple-700 dark:text-purple-400">
                                {selectedAdvances.length}
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-700 dark:text-gray-300">Total en €:</div>
                            <div className="font-bold text-purple-700 dark:text-purple-400">
                                {formatCurrency(totalAdvancesAmount)}
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-700 dark:text-gray-300">Total en %:</div>
                            <div className="font-bold text-purple-700 dark:text-purple-400">
                                {formatPercentage(totalAdvancesPercentage)}
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-700 dark:text-gray-300">Reste à payer:</div>
                            <div className="font-bold text-green-700 dark:text-green-400">
                                {formatPercentage(remainingPercentage)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Montant suggéré */}
                <div className="bg-gradient-to-r from-purple-200 to-blue-200 dark:from-purple-900/40 dark:to-blue-900/40 rounded-lg p-4 border-2 border-purple-500 dark:border-purple-600">
                    <div className="text-sm font-semibold text-purple-900 dark:text-purple-200 mb-2">
                        💡 Montant total suggéré du projet:
                    </div>
                    <div className="text-3xl font-bold text-purple-950 dark:text-purple-100 mb-2">
                        {formatCurrency(calculatedProjectTotal)}
                    </div>
                    <div className="text-xs text-purple-800 dark:text-purple-300 font-medium">
                        Calculé depuis: {formatCurrency(totalAdvancesAmount)} ÷ {formatPercentage(totalAdvancesPercentage)} × 100%
                    </div>
                </div>

                {/* Solde restant */}
                <div className="bg-green-100 dark:bg-green-900/20 rounded-lg p-3 border-2 border-green-600 dark:border-green-700">
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-bold text-black dark:text-green-300">
                            Solde restant à facturer:
                        </div>
                        <div className="text-xl font-bold text-black dark:text-green-400">
                            {formatCurrency(suggestedBalance)}
                        </div>
                    </div>
                    <div className="text-xs text-black dark:text-green-400 mt-1 font-semibold">
                        ({formatPercentage(remainingPercentage)} du total)
                    </div>
                </div>
            </div>

            {/* Validation du montant saisi */}
            {currentTotal > 0 && (
                <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-700">
                    {isCurrentTotalCorrect ? (
                        <div className="flex items-start space-x-2 p-3 bg-green-100 dark:bg-green-900/40 rounded-lg border border-green-400">
                            <CheckCircleIcon className="w-5 h-5 text-green-700 dark:text-green-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-green-900 dark:text-green-200">
                                    ✅ Montant correct!
                                </p>
                                <p className="text-xs text-green-800 dark:text-green-300 mt-1 font-medium">
                                    Le montant de votre facture correspond au calcul basé sur les acomptes.
                                </p>
                            </div>
                        </div>
                    ) : isCurrentTotalTooLow ? (
                        <div className="flex items-start space-x-2 p-3 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg border border-yellow-500">
                            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-800 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-yellow-900 dark:text-yellow-200">
                                    ⚠️ Montant inférieur au suggéré
                                </p>
                                <p className="text-xs text-yellow-900 dark:text-yellow-300 mt-1 font-medium">
                                    Montant actuel: {formatCurrency(currentTotal)} <br/>
                                    Différence: -{formatCurrency(calculatedProjectTotal - currentTotal)}
                                </p>
                            </div>
                        </div>
                    ) : isCurrentTotalTooHigh ? (
                        <div className="flex items-start space-x-2 p-3 bg-orange-100 dark:bg-orange-900/40 rounded-lg border border-orange-500">
                            <ExclamationTriangleIcon className="w-5 h-5 text-orange-800 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-orange-900 dark:text-orange-200">
                                    ⚠️ Montant supérieur au suggéré
                                </p>
                                <p className="text-xs text-orange-900 dark:text-orange-300 mt-1 font-medium">
                                    Montant actuel: {formatCurrency(currentTotal)} <br/>
                                    Différence: +{formatCurrency(currentTotal - calculatedProjectTotal)}
                                </p>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Aide */}
            <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg border border-blue-500 dark:border-blue-700">
                <div className="text-xs text-black dark:text-blue-300 font-medium">
                    <strong className="font-bold">💡 Comment ça marche?</strong><br/>
                    Le calculateur analyse les pourcentages des acomptes sélectionnés et extrapole le montant total du projet.
                    Par exemple, si un acompte de 6000€ représente 30%, le montant total du projet est de 20 000€.
                </div>
            </div>
        </div>
    );
};

export default AdvanceCalculator;
