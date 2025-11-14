@extends('pdf.layouts.base')

@section('title', 'Invoice ' . $invoice->invoice_number)

@section('content')
    <!-- Header -->
    <div class="header">
        <div class="header-content">
            <div class="header-left">
                @if($tenant->logo)
                    <div style="margin-bottom: 10px;">
                        @php
                            $logoPath = storage_path('app/public/' . $tenant->logo);
                            if (file_exists($logoPath)) {
                                $imageData = base64_encode(file_get_contents($logoPath));
                                $extension = pathinfo($logoPath, PATHINFO_EXTENSION);
                                $mimeType = $extension === 'svg' ? 'image/svg+xml' : 'image/' . $extension;
                                echo '<img src="data:' . $mimeType . ';base64,' . $imageData . '" alt="Logo" style="max-height: 60px; max-width: 200px;">';
                            }
                        @endphp
                    </div>
                @endif
                <div class="company-name">{{ $tenant->company_name ?? $tenant->name }}</div>
                <div class="company-info">
                    @if($tenant->legal_form)
                        {{ $tenant->legal_form }}<br>
                    @endif
                    @if($tenant->address_line1)
                        {{ $tenant->address_line1 }}<br>
                    @endif
                    @if($tenant->address_line2)
                        {{ $tenant->address_line2 }}<br>
                    @endif
                    @if($tenant->city || $tenant->postal_code)
                        {{ $tenant->postal_code }} {{ $tenant->city }}<br>
                    @endif
                    @if($tenant->country)
                        {{ $tenant->country }}<br>
                    @endif
                    @if($tenant->phone)
                        Tél: {{ $tenant->phone }}<br>
                    @endif
                    @if($tenant->email)
                        Email: {{ $tenant->email }}<br>
                    @endif
                    @if($tenant->website)
                        Web: {{ $tenant->website }}<br>
                    @endif
                    <br>
                    @if($tenant->siret)
                        SIRET: {{ $tenant->siret }}<br>
                    @endif
                    @if($tenant->rcs_number && $tenant->rcs_city)
                        RCS {{ $tenant->rcs_city }} {{ $tenant->rcs_number }}<br>
                    @endif
                    @if($tenant->capital)
                        Capital social: {{ number_format($tenant->capital, 2, ',', ' ') }} €<br>
                    @endif
                    @if($tenant->ape_code)
                        APE: {{ $tenant->ape_code }}<br>
                    @endif
                    @if($tenant->vat_subject && $tenant->vat_number)
                        TVA: {{ $tenant->vat_number }}
                    @elseif(!$tenant->vat_subject && $tenant->vat_exemption_reason)
                        {{ $tenant->vat_exemption_reason }}
                    @endif
                </div>
            </div>
            <div class="header-right">
                <div class="document-title">
                    @if($invoice->type === 'advance')
                        FACTURE D'ACOMPTE
                    @elseif($invoice->type === 'final')
                        FACTURE DE SOLDE
                    @else
                        FACTURE
                    @endif
                </div>
                <div class="document-number">{{ $invoice->invoice_number }}</div>
                @if($invoice->type === 'advance' && $invoice->advance_percentage)
                    <div style="margin-top: 5px; font-size: 11pt; color: #4F46E5; font-weight: bold;">
                        Acompte de {{ number_format($invoice->advance_percentage, 0) }}%
                    </div>
                @endif
                <div style="margin-top: 15px;">
                    @if($invoice->status === 'paid')
                        <span class="status-badge status-paid">Payée</span>
                    @elseif($invoice->status === 'sent')
                        <span class="status-badge status-sent">Envoyée</span>
                    @elseif($invoice->status === 'unpaid' && $invoice->due_date && now()->greaterThan($invoice->due_date))
                        <span class="status-badge status-overdue">En retard</span>
                    @elseif($invoice->status === 'unpaid')
                        <span class="status-badge status-unpaid">Non payée</span>
                    @else
                        <span class="status-badge status-draft">Brouillon</span>
                    @endif
                </div>
            </div>
        </div>
    </div>

    <!-- Client Info -->
    <div class="client-info">
        <div class="client-label">Facturé à:</div>
        <div class="client-details">
            <strong>{{ $client->name }}</strong><br>
            @if($client->contact_name)
                Att: {{ $client->contact_name }}<br>
            @endif
            @if($client->address)
                {{ $client->address }}<br>
            @endif
            @if($client->city || $client->postal_code)
                {{ $client->postal_code }} {{ $client->city }}<br>
            @endif
            @if($client->country)
                {{ $client->country }}<br>
            @endif
            @if($client->vat_number)
                TVA: {{ $client->vat_number }}
            @endif
        </div>
    </div>

    <!-- Meta Information -->
    <div class="meta-info">
        <div class="meta-left">
            <div class="meta-item">
                <span class="meta-label">Date de facture:</span>
                {{ \Carbon\Carbon::parse($invoice->invoice_date)->format('d/m/Y') }}
            </div>
            @if($invoice->due_date)
            <div class="meta-item">
                <span class="meta-label">Date d'échéance:</span>
                {{ \Carbon\Carbon::parse($invoice->due_date)->format('d/m/Y') }}
            </div>
            @endif
        </div>
        <div class="meta-right">
            @if($invoice->project)
            <div class="meta-item">
                <span class="meta-label">Projet:</span>
                {{ $invoice->project->name }}
            </div>
            @endif
            @if($invoice->po_number)
            <div class="meta-item">
                <span class="meta-label">Bon de commande:</span>
                {{ $invoice->po_number }}
            </div>
            @endif
        </div>
    </div>

    <!-- Items Table -->
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 50%;">Description</th>
                <th style="width: 10%;" class="text-center">Qté</th>
                <th style="width: 15%;" class="text-right">Prix unit.</th>
                <th style="width: 10%;" class="text-center">TVA</th>
                <th style="width: 15%;" class="text-right">Montant</th>
            </tr>
        </thead>
        <tbody>
            @foreach($items as $item)
            <tr>
                <td>
                    <strong>{{ $item->description }}</strong>
                    @if($item->details)
                        <br><span style="font-size: 9pt; color: #666;">{{ $item->details }}</span>
                    @endif
                </td>
                <td class="text-center">{{ $item->quantity }}</td>
                <td class="text-right">{{ number_format($item->unit_price, 2, ',', ' ') }} €</td>
                <td class="text-center">{{ $item->tax_rate }}%</td>
                <td class="text-right">{{ number_format($item->total, 2, ',', ' ') }} €</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
        <div class="totals-row">
            <div class="totals-label">Sous-total HT</div>
            <div class="totals-value">{{ number_format($invoice->subtotal, 2, ',', ' ') }} €</div>
        </div>

        @if($invoice->discount > 0)
        <div class="totals-row">
            <div class="totals-label">Remise</div>
            <div class="totals-value">-{{ number_format($invoice->discount, 2, ',', ' ') }} €</div>
        </div>
        @endif

        {{-- Tax breakdown by rate --}}
        @if(isset($taxByRate) && count($taxByRate) > 0)
            @foreach($taxByRate as $rate => $taxInfo)
            <div class="totals-row" style="font-size: 10px; color: #666;">
                <div class="totals-label">TVA {{ $rate }}% sur {{ number_format($taxInfo['base'], 2, ',', ' ') }} €</div>
                <div class="totals-value">{{ number_format($taxInfo['amount'], 2, ',', ' ') }} €</div>
            </div>
            @endforeach
        @endif

        <div class="totals-row">
            <div class="totals-label"><strong>Total TVA</strong></div>
            <div class="totals-value"><strong>{{ number_format($invoice->tax_amount, 2, ',', ' ') }} €</strong></div>
        </div>

        <div class="totals-row total">
            <div class="totals-label">Total TTC</div>
            <div class="totals-value">{{ number_format($invoice->total, 2, ',', ' ') }} €</div>
        </div>

        @if($invoice->type === 'final' && $invoice->advances && $invoice->advances->count() > 0)
        {{-- Section des acomptes pour factures de solde --}}
        <div style="border-top: 1px solid #e5e7eb; margin-top: 10px; padding-top: 10px;">
            <div class="totals-row" style="font-size: 11px; color: #4F46E5; font-weight: bold;">
                <div class="totals-label">ACOMPTES VERSÉS</div>
                <div class="totals-value"></div>
            </div>
            @foreach($invoice->advances as $advance)
            <div class="totals-row" style="font-size: 10px; color: #666;">
                <div class="totals-label">{{ $advance->invoice_number }} du {{ $advance->date->format('d/m/Y') }}</div>
                <div class="totals-value">-{{ number_format($advance->pivot->advance_amount, 2, ',', ' ') }} €</div>
            </div>
            @endforeach
            <div class="totals-row" style="font-weight: bold; border-top: 1px solid #e5e7eb; margin-top: 5px; padding-top: 5px;">
                <div class="totals-label">Total des acomptes</div>
                <div class="totals-value">-{{ number_format($invoice->total_advances, 2, ',', ' ') }} €</div>
            </div>
        </div>

        <div class="totals-row total" style="border-top: 2px solid #4F46E5; margin-top: 10px; padding-top: 10px; font-size: 14pt;">
            <div class="totals-label">SOLDE À PAYER</div>
            <div class="totals-value">{{ number_format($invoice->remaining_balance, 2, ',', ' ') }} €</div>
        </div>
        @endif
    </div>

    <!-- Notes -->
    @if($invoice->notes)
    <div class="notes">
        <div class="notes-title">Notes</div>
        <div class="notes-content">{{ $invoice->notes }}</div>
    </div>
    @endif

    <!-- Payment Information & Legal Mentions -->
    <div class="payment-info">
        <div class="payment-title">Informations de paiement et mentions légales</div>
        <div class="payment-details">
            {{-- Lien de paiement Stripe si disponible --}}
            @if($invoice->stripe_payment_link && $invoice->status !== 'paid')
                <div style="background-color: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 15px; margin-bottom: 20px; text-align: center;">
                    <div style="font-size: 14pt; font-weight: bold; color: #0369a1; margin-bottom: 8px;">
                        💳 Payer cette facture en ligne
                    </div>
                    <div style="font-size: 11pt; color: #0c4a6e; margin-bottom: 12px;">
                        Paiement sécurisé par carte bancaire
                    </div>
                    <div style="font-family: monospace; font-size: 10pt; background-color: #ffffff; border: 1px dashed #0ea5e9; padding: 8px; border-radius: 4px; word-break: break-all; margin-bottom: 10px;">
                        {{ $invoice->stripe_payment_link }}
                    </div>
                    <div style="font-size: 9pt; color: #64748b;">
                        Scannez le QR code ci-dessous ou copiez le lien dans votre navigateur
                    </div>
                    {{-- QR Code pour le lien de paiement --}}
                    @php
                        try {
                            $qrCode = new \Endroid\QrCode\QrCode($invoice->stripe_payment_link);
                            $qrCode->setSize(120);
                            $qrCode->setMargin(5);
                            $writer = new \Endroid\QrCode\Writer\PngWriter();
                            $qrCodeDataUri = $writer->write($qrCode)->getDataUri();
                            echo '<div style="margin-top: 10px;"><img src="' . $qrCodeDataUri . '" alt="QR Code paiement" style="width: 120px; height: 120px; border: 1px solid #e2e8f0; border-radius: 4px;"></div>';
                        } catch (\Exception $e) {
                            // Fallback si QR code non disponible
                        }
                    @endphp
                </div>
                <br>
            @endif
            
            {{-- Conditions de règlement (OBLIGATOIRE - Art. L441-3) --}}
            @if($invoice->payment_conditions)
                <strong>Conditions de règlement:</strong> {{ $invoice->payment_conditions }}<br>
            @elseif($invoice->payment_terms)
                <strong>Conditions de règlement:</strong> Paiement à {{ $invoice->payment_terms }} jours<br>
            @endif
            
            {{-- Escompte pour paiement anticipé (si applicable) --}}
            @if($invoice->early_payment_discount && $invoice->early_payment_discount > 0)
                <strong>Escompte pour paiement anticipé:</strong> {{ number_format($invoice->early_payment_discount, 2) }}%<br>
            @endif
            
            {{-- Coordonnées bancaires --}}
            @if($tenant->iban)
                <strong>Coordonnées bancaires:</strong><br>
                IBAN: {{ $tenant->iban }}<br>
                @if($tenant->bic)
                    BIC: {{ $tenant->bic }}<br>
                @endif
            @endif
            
            <br>
            
            {{-- Pénalités de retard (OBLIGATOIRE - Art. L441-3) --}}
            <strong>Pénalités de retard (Art. L441-3 Code Commerce):</strong><br>
            @if($invoice->late_payment_penalty_rate)
                <em>Taux des pénalités de retard: {{ number_format($invoice->late_payment_penalty_rate, 2) }}% (soit 3 fois le taux d'intérêt légal)</em><br>
            @else
                <em>En cas de retard de paiement, une pénalité de 3 fois le taux d'intérêt légal sera exigible.</em><br>
            @endif
            
            {{-- Indemnité forfaitaire de recouvrement (OBLIGATOIRE - Art. L441-3) --}}
            @if($invoice->recovery_indemnity)
                <em>Indemnité forfaitaire pour frais de recouvrement: {{ number_format($invoice->recovery_indemnity, 2) }} € (Art. D.441-5)</em><br>
            @else
                <em>Indemnité forfaitaire de 40 € pour frais de recouvrement (Art. D.441-5).</em><br>
            @endif
            
            {{-- Références documents (si applicables) --}}
            @if($invoice->quote && $invoice->quote->quote_number)
                <strong>Devis de référence:</strong> {{ $invoice->quote->quote_number }}<br>
            @endif
            @if($invoice->purchase_order_number)
                <strong>Bon de commande:</strong> {{ $invoice->purchase_order_number }}<br>
            @endif
            @if($invoice->contract_reference)
                <strong>Référence contrat:</strong> {{ $invoice->contract_reference }}<br>
            @endif
        </div>
        
        {{-- QR Code SEPA pour paiement facile --}}
        @if($invoice->qr_code_sepa)
        <div class="qr-code-sepa" style="margin-top: 10px; text-align: center;">
            <div style="font-size: 10pt; margin-bottom: 5px;"><strong>Payer par QR Code</strong></div>
            {!! $invoice->qr_code_sepa !!}
            <div style="font-size: 8pt; color: #666; margin-top: 3px;">Scannez avec votre application bancaire</div>
        </div>
        @endif
    </div>

    <!-- NF525 Compliance -->
    @if($invoice->compliance_hash)
    <div class="compliance-info">
        <div class="compliance-title">Informations de conformité (NF525)</div>
        <div style="margin-top: 5px;">
            Date de signature: {{ \Carbon\Carbon::parse($invoice->compliance_date)->format('d/m/Y H:i:s') }}<br>
            Empreinte numérique: <span class="hash-value">{{ $invoice->compliance_hash }}</span>
        </div>
    </div>
    @endif
@endsection

@section('footer')
    {{-- Footer légal généré automatiquement par LegalFooterService --}}
    <div style="font-size: 7pt; line-height: 1.4; color: #666; text-align: center;">
        {!! nl2br(e($legalFooter ?? '')) !!}
    </div>
@endsection
