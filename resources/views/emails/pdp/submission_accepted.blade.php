@extends('layouts.app')

@section('content')
<div class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto">
        <div class="bg-green-50 border border-green-200 rounded-lg p-6">
            <div class="flex items-center mb-4">
                <div class="flex-shrink-0">
                    <svg class="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div class="ml-3">
                    <h3 class="text-sm font-medium text-green-800">
                        Document accepté par le Portail Public de Facturation
                    </h3>
                </div>
            </div>

            <div class="bg-white rounded-lg p-4 border border-green-200">
                <h4 class="text-lg font-semibold text-gray-900 mb-4">
                    Votre {{ $documentType }} n°{{ $documentNumber }} a été acceptée
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
                        <span class="text-gray-600">Référence PDP :</span>
                        <span class="font-medium">{{ $submission->pdp_id ?? 'N/A' }}</span>
                    </div>
                    
                    <div class="flex justify-between py-2 border-b border-gray-200">
                        <span class="text-gray-600">Date d'acceptation :</span>
                        <span class="font-medium">{{ $submission->accepted_at?->format('d/m/Y H:i') ?? 'N/A' }}</span>
                    </div>
                    
                    <div class="flex justify-between py-2">
                        <span class="text-gray-600">Mode :</span>
                        <span class="font-medium">{{ $submission->pdp_mode === 'simulation' ? 'Simulation' : 'Production' }}</span>
                    </div>
                </div>

                <div class="mt-6 p-4 bg-green-50 rounded-lg">
                    <p class="text-sm text-green-800">
                        <strong>✅ Conformité validée</strong><br>
                        Le document est maintenant conforme aux exigences de facturation électronique B2B 
                        et a été accepté par le Portail Public de Facturation de la DGFIP.
                    </p>
                </div>

                <div class="mt-6">
                    <a href="{{ $documentUrl }}" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Voir le document
                    </a>
                </div>
            </div>
        </div>

        <div class="mt-6 text-center text-sm text-gray-500">
            <p>Cet email a été envoyé automatiquement par TimeIsMoney</p>
            <p>Si vous n'êtes pas à l'origine de cette action, veuillez contacter notre support.</p>
        </div>
    </div>
</div>
@endsection