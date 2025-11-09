<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Signature de devis - {{ $quote->quote_number }}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        #signature-canvas {
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            cursor: crosshair;
            touch-action: none;
        }
        .signature-wrapper {
            position: relative;
            display: inline-block;
        }
        .signature-placeholder {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #9ca3af;
            pointer-events: none;
            font-size: 14px;
        }
    </style>
</head>
<body class="bg-gray-50">
    <div class="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-4xl mx-auto">
            <!-- Header -->
            <div class="bg-white shadow-sm rounded-lg p-6 mb-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-900">Signature de devis</h1>
                        <p class="text-sm text-gray-500 mt-1">{{ $quote->tenant->name }}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-gray-500">Numéro de devis</p>
                        <p class="text-xl font-bold text-blue-600">{{ $quote->quote_number }}</p>
                    </div>
                </div>
            </div>

            <!-- Quote Details -->
            <div class="bg-white shadow-sm rounded-lg p-6 mb-6">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Détails du devis</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <p class="text-sm text-gray-500">Client</p>
                        <p class="font-medium text-gray-900">{{ $quote->client->name }}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">Date d'émission</p>
                        <p class="font-medium text-gray-900">{{ $quote->quote_date->format('d/m/Y') }}</p>
                    </div>
                    @if($quote->valid_until)
                    <div>
                        <p class="text-sm text-gray-500">Valable jusqu'au</p>
                        <p class="font-medium text-gray-900">{{ $quote->valid_until->format('d/m/Y') }}</p>
                    </div>
                    @endif
                    <div>
                        <p class="text-sm text-gray-500">Montant total</p>
                        <p class="text-2xl font-bold text-blue-600">{{ number_format($quote->total, 2, ',', ' ') }} €</p>
                    </div>
                </div>

                @if($quote->description)
                <div class="border-t pt-4">
                    <p class="text-sm text-gray-500 mb-2">Description</p>
                    <p class="text-gray-900">{{ $quote->description }}</p>
                </div>
                @endif

                <!-- Items -->
                @if($quote->items && $quote->items->count() > 0)
                <div class="border-t pt-4 mt-4">
                    <p class="text-sm font-semibold text-gray-700 mb-3">Détail des prestations</p>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                    <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantité</th>
                                    <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Prix unitaire</th>
                                    <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                @foreach($quote->items as $item)
                                <tr>
                                    <td class="px-4 py-2 text-sm text-gray-900">{{ $item->description }}</td>
                                    <td class="px-4 py-2 text-sm text-gray-900 text-right">{{ $item->quantity }}</td>
                                    <td class="px-4 py-2 text-sm text-gray-900 text-right">{{ number_format($item->unit_price, 2, ',', ' ') }} €</td>
                                    <td class="px-4 py-2 text-sm font-medium text-gray-900 text-right">{{ number_format($item->total, 2, ',', ' ') }} €</td>
                                </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                </div>
                @endif
            </div>

            <!-- Signature Form -->
            <div class="bg-white shadow-sm rounded-lg p-6">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Signature électronique</h2>
                
                <form id="signature-form" class="space-y-6">
                    @csrf
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Nom du signataire *</label>
                            <input type="text" id="signer_name" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input type="email" id="signer_email"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Fonction</label>
                        <input type="text" id="signer_position"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Signature *</label>
                        <p class="text-xs text-gray-500 mb-3">Dessinez votre signature ci-dessous (utilisez votre souris ou votre doigt)</p>
                        
                        <div class="signature-wrapper">
                            <canvas id="signature-canvas" width="600" height="200"></canvas>
                            <div id="signature-placeholder" class="signature-placeholder">Signez ici</div>
                        </div>
                        
                        <button type="button" id="clear-signature" 
                                class="mt-2 text-sm text-blue-600 hover:text-blue-800">
                            🗑️ Effacer la signature
                        </button>
                    </div>

                    <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <p class="text-sm text-blue-800">
                            <strong>En signant ce devis, vous acceptez:</strong>
                        </p>
                        <ul class="text-sm text-blue-700 mt-2 ml-4 list-disc">
                            <li>Les prestations et montants indiqués ci-dessus</li>
                            <li>Les conditions générales de vente</li>
                            <li>Les conditions de paiement mentionnées</li>
                        </ul>
                    </div>

                    <div id="error-message" class="hidden bg-red-50 border border-red-200 rounded-md p-4">
                        <p class="text-sm text-red-800"></p>
                    </div>

                    <div id="success-message" class="hidden bg-green-50 border border-green-200 rounded-md p-4">
                        <p class="text-sm text-green-800">✅ Devis signé avec succès! Vous allez recevoir une confirmation par email.</p>
                    </div>

                    <div class="flex gap-3">
                        <button type="submit" id="submit-btn"
                                class="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            ✍️ Signer et accepter le devis
                        </button>
                    </div>
                </form>
            </div>

            <!-- Footer -->
            <div class="text-center mt-8 text-sm text-gray-500">
                <p>{{ $quote->tenant->name }}</p>
                @if($quote->tenant->email)
                <p>{{ $quote->tenant->email }}</p>
                @endif
            </div>
        </div>
    </div>

    <script>
        // Signature canvas functionality
        const canvas = document.getElementById('signature-canvas');
        const ctx = canvas.getContext('2d');
        const placeholder = document.getElementById('signature-placeholder');
        let isDrawing = false;
        let hasSignature = false;

        // Set canvas background to white
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        function startDrawing(e) {
            isDrawing = true;
            hasSignature = true;
            placeholder.style.display = 'none';
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX || e.touches[0].clientX) - rect.left;
            const y = (e.clientY || e.touches[0].clientY) - rect.top;
            ctx.beginPath();
            ctx.moveTo(x, y);
        }

        function draw(e) {
            if (!isDrawing) return;
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX || e.touches[0].clientX) - rect.left;
            const y = (e.clientY || e.touches[0].clientY) - rect.top;
            ctx.lineTo(x, y);
            ctx.stroke();
        }

        function stopDrawing() {
            isDrawing = false;
        }

        // Mouse events
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);

        // Touch events
        canvas.addEventListener('touchstart', startDrawing);
        canvas.addEventListener('touchmove', draw);
        canvas.addEventListener('touchend', stopDrawing);

        // Clear signature
        document.getElementById('clear-signature').addEventListener('click', () => {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            hasSignature = false;
            placeholder.style.display = 'block';
        });

        // Form submission
        document.getElementById('signature-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const errorDiv = document.getElementById('error-message');
            const successDiv = document.getElementById('success-message');
            const submitBtn = document.getElementById('submit-btn');
            
            errorDiv.classList.add('hidden');
            successDiv.classList.add('hidden');

            // Validate
            if (!hasSignature) {
                errorDiv.querySelector('p').textContent = 'Veuillez signer le devis avant de soumettre.';
                errorDiv.classList.remove('hidden');
                return;
            }

            const signerName = document.getElementById('signer_name').value.trim();
            if (!signerName) {
                errorDiv.querySelector('p').textContent = 'Veuillez indiquer le nom du signataire.';
                errorDiv.classList.remove('hidden');
                return;
            }

            // Get signature data
            const signatureData = canvas.toDataURL('image/png');

            // Submit
            submitBtn.disabled = true;
            submitBtn.textContent = 'Envoi en cours...';

            try {
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                    },
                    body: JSON.stringify({
                        signature_data: signatureData,
                        signer_name: signerName,
                        signer_email: document.getElementById('signer_email').value,
                        signer_position: document.getElementById('signer_position').value
                    })
                });

                const data = await response.json();

                if (data.success) {
                    successDiv.classList.remove('hidden');
                    document.getElementById('signature-form').style.display = 'none';
                    
                    // Redirect to "already signed" page after 2 seconds
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                } else {
                    errorDiv.querySelector('p').textContent = data.message || 'Une erreur est survenue.';
                    errorDiv.classList.remove('hidden');
                    submitBtn.disabled = false;
                    submitBtn.textContent = '✍️ Signer et accepter le devis';
                }
            } catch (error) {
                errorDiv.querySelector('p').textContent = 'Erreur de connexion. Veuillez réessayer.';
                errorDiv.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.textContent = '✍️ Signer et accepter le devis';
            }
        });
    </script>
</body>
</html>
