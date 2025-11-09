<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Devis annulé - {{ $quote->quote_number }}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full">
            <div class="bg-white shadow-sm rounded-lg p-8 text-center">
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
                
                <h1 class="text-2xl font-bold text-gray-900 mb-2">Devis annulé</h1>
                <p class="text-gray-600 mb-6">Le devis <strong>{{ $quote->quote_number }}</strong> a été annulé et ne peut plus être signé.</p>
                
                @if($quote->cancelled_at)
                <div class="bg-gray-50 rounded-md p-4 mb-6">
                    <p class="text-sm text-gray-500">Date d'annulation</p>
                    <p class="font-medium text-gray-900">{{ $quote->cancelled_at->format('d/m/Y à H:i') }}</p>
                    
                    @if($quote->cancellation_reason)
                    <p class="text-sm text-gray-500 mt-3">Raison</p>
                    <p class="font-medium text-gray-900">{{ $quote->cancellation_reason }}</p>
                    @endif
                </div>
                @endif
                
                <p class="text-sm text-gray-500">
                    Si vous avez des questions, veuillez contacter <strong>{{ $quote->tenant->name }}</strong>
                    @if($quote->tenant->email)
                    à <a href="mailto:{{ $quote->tenant->email }}" class="text-blue-600 hover:underline">{{ $quote->tenant->email }}</a>
                    @endif
                </p>
            </div>
        </div>
    </div>
</body>
</html>
