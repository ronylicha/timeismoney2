<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Devis déjà signé - {{ $quote->quote_number }}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full">
            <div class="bg-white shadow-sm rounded-lg p-8 text-center">
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                
                <h1 class="text-2xl font-bold text-gray-900 mb-2">Devis déjà signé</h1>
                <p class="text-gray-600 mb-6">Le devis <strong>{{ $quote->quote_number }}</strong> a déjà été accepté et signé.</p>
                
                @if($quote->accepted_at)
                <div class="bg-gray-50 rounded-md p-4 mb-6">
                    <p class="text-sm text-gray-500">Date d'acceptation</p>
                    <p class="font-medium text-gray-900">{{ $quote->accepted_at->format('d/m/Y à H:i') }}</p>
                    
                    @if($quote->signer_name)
                    <p class="text-sm text-gray-500 mt-3">Signé par</p>
                    <p class="font-medium text-gray-900">{{ $quote->signer_name }}</p>
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
