@extends('layouts.app')

@section('content')
<div class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto">
        <div class="bg-red-50 border border-red-200 rounded-lg p-6">
            <div class="flex items-center mb-4">
                <div class="flex-shrink-0">
                    <svg class="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div class="ml-3">
                    <h3 class="text-sm font-medium text-red-800">
                        Document rejeté par le Portail Public de Facturation
                    </h3>
                </div>
            </div>

            <div class="bg-white rounded-lg p-4 border border-red-200">
                <h4 class="text-lg font-semibold text-gray-900 mb-4">
                    Votre {{ $documentType }} n°{{ $documentNumber }} a été rejetée
                </h4>

                <div class="space-y-3">
                    <div class="flex justify-between py-2 border-b border-gray-200">
                        <span class="text-gray-600">Type de document :</span>
                        <span class="font-medium">{{ ucfirst($documentType) }}</span>
                    </div>
                    
                    <div class="flex justify-between py-2 border-b border-gray-200">
                        <span class="text-gray-600">Numéro :</span>
                        <span class="font-medium">{{ $documentNumber }}</span>
                    </div>
                    
                    <div class="flex justify-between py-2 border-b border-gray-200">
                        <span class="text-gray-600">ID de soumission :</span>
                        <span class="font-medium">{{ $submission->submission_id }}</span>
                    </div>
                    
                    <div class="flex justify-between py-2 border-b border-gray-200">
                        <span class="text-gray-600">Motif du rejet :</span>
                        <span class="font-medium text-red-600">{{ $submission->error_message ?? 'Non spécifié' }}</span>
                    </div>
                    
                    @if($submission->error_code)
                    <div class="flex justify-between py-2 border-b border-gray-200">
                        <span class="text-gray-600">Code erreur :</span>
                        <span class="font-medium">{{ $submission->error_code }}</span>
                    </div>
                    @endif
                    
                    <div class="flex justify-between py-2 border-b border-gray-200">
                        <span class="text-gray-600">Date du rejet :</span>
                        <span class="font-medium">{{ $submission->rejected_at?->format('d/m/Y H:i') ?? 'N/A' }}</span>
                    </div>
                    
                    <div class="flex justify-between py-2">
                        <span class="text-gray-600">Mode :</span>
                        <span class="font-medium">{{ $submission->pdp_mode === 'simulation' ? 'Simulation' : 'Production' }}</span>
                    </div>
                </div>

                <div class="mt-6 p-4 bg-red-50 rounded-lg">
                    <p class="text-sm text-red-800">
                        <strong>❌ Actions requises</strong><br>
                        Veuillez corriger les problèmes signalés dans le document et le soumettre à nouveau. 
                        Assurez-vous que toutes les informations requises sont présentes et conformes 
                        aux spécifications du Portail Public de Facturation.
                    </p>
                </div>

                <div class="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h5 class="font-medium text-blue-900 mb-2">📋 Checklist de correction :</h5>
                    <ul class="text-sm text-blue-800 space-y-1">
                        <li>• Vérifier les informations sur l'émetteur (SIRET, TVA)</li>
                        <li>• Vérifier les informations sur le destinataire</li>
                        <li>• Contrôler le format et la structure du fichier Factur-X</li>
                        <li>• Valider les montants et les calculs de TVA</li>
                        <li>• S'assurer que le numéro de facture est unique</li>
                    </ul>
                </div>

                <div class="mt-6 flex space-x-3">
                    <a href="{{ $documentUrl }}" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Corriger le document
                    </a>
                    
                    @if($submission->canRetry())
                    <button class="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Retenter la soumission
                    </button>
                    @endif
                </div>
            </div>
        </div>

        <div class="mt-6 text-center text-sm text-gray-500">
            <p>Cet email a été envoyé automatiquement par TimeIsMoney</p>
            <p>Si vous avez besoin d'aide pour corriger ce document, contactez notre support technique.</p>
        </div>
    </div>
</div>
@endsection