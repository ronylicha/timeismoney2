@extends('pdf.layouts.base')

@section('title', 'Avoir ' . $creditNote->credit_note_number)

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
                <div class="document-title" style="color: #dc2626;">AVOIR</div>
                <div class="document-number">{{ $creditNote->credit_note_number }}</div>
                <div style="margin-top: 15px;">
                    <span class="status-badge status-overdue">Avoir</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Reference Invoice -->
    @if($invoice)
    <div style="background-color: #fef3c7; padding: 10px 15px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
        <strong>Facture d'origine:</strong> {{ $invoice->invoice_number }}
        du {{ \Carbon\Carbon::parse($invoice->invoice_date)->format('d/m/Y') }}
    </div>
    @endif

    <!-- Client Info -->
    <div class="client-info">
        <div class="client-label">Client:</div>
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
                <span class="meta-label">Date de l'avoir:</span>
                {{ \Carbon\Carbon::parse($creditNote->credit_note_date)->format('d/m/Y') }}
            </div>
        </div>
    </div>

    <!-- Reason/Description -->
    @if($creditNote->reason || $creditNote->description)
    <div style="margin: 20px 0; padding: 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b;">
        <div style="font-weight: bold; margin-bottom: 5px;">Motif de l'avoir:</div>
        @if($creditNote->reason)
        <div style="margin-bottom: 5px;"><strong>{{ $creditNote->reason }}</strong></div>
        @endif
        @if($creditNote->description)
        <div style="font-size: 9pt; color: #666;">{{ $creditNote->description }}</div>
        @endif
    </div>
    @endif

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
                <td class="text-right" style="color: #dc2626;">-{{ number_format($item->total, 2, ',', ' ') }} €</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
        <div class="totals-row">
            <div class="totals-label">Sous-total HT</div>
            <div class="totals-value" style="color: #dc2626;">-{{ number_format($creditNote->subtotal, 2, ',', ' ') }} €</div>
        </div>

        @if($creditNote->discount > 0)
        <div class="totals-row">
            <div class="totals-label">Remise</div>
            <div class="totals-value">{{ number_format($creditNote->discount, 2, ',', ' ') }} €</div>
        </div>
        @endif

        <div class="totals-row">
            <div class="totals-label">TVA</div>
            <div class="totals-value" style="color: #dc2626;">-{{ number_format($creditNote->tax, 2, ',', ' ') }} €</div>
        </div>

        <div class="totals-row total" style="background-color: #dc2626;">
            <div class="totals-label">Total TTC</div>
            <div class="totals-value">-{{ number_format($creditNote->total, 2, ',', ' ') }} €</div>
        </div>
    </div>

    <!-- Notes -->
    @if($creditNote->notes)
    <div class="notes">
        <div class="notes-title">Notes</div>
        <div class="notes-content">{{ $creditNote->notes }}</div>
    </div>
    @endif

    <!-- Credit Note Information -->
    <div style="margin-top: 30px; padding: 15px; background-color: #fee2e2; border-left: 4px solid #dc2626;">
        <div style="font-weight: bold; color: #991b1b; margin-bottom: 10px;">Information sur l'avoir</div>
        <div style="font-size: 9pt; color: #7f1d1d; line-height: 1.6;">
            Cet avoir annule et remplace tout ou partie de la facture {{ $invoice ? $invoice->invoice_number : 'originale' }}.<br>
            Le montant de <strong>{{ number_format($creditNote->total, 2, ',', ' ') }} €</strong> sera déduit de votre solde
            ou fera l'objet d'un remboursement selon les modalités convenues.<br>
            @if($creditNote->payment_method)
                <br><strong>Mode de remboursement:</strong> {{ $creditNote->payment_method }}
            @endif
        </div>
    </div>

    <!-- NF525 Compliance -->
    @if($creditNote->compliance_hash)
    <div class="compliance-info">
        <div class="compliance-title">Informations de conformité (NF525)</div>
        <div style="margin-top: 5px;">
            Date de signature: {{ \Carbon\Carbon::parse($creditNote->compliance_date)->format('d/m/Y H:i:s') }}<br>
            Empreinte numérique: <span class="hash-value">{{ $creditNote->compliance_hash }}</span>
        </div>
    </div>
    @endif
@endsection

@section('footer')
    {{ $tenant->name }} - {{ $tenant->address }} - {{ $tenant->city }}<br>
    @if($tenant->siret)
        SIRET: {{ $tenant->siret }} -
    @endif
    @if($tenant->vat_number)
        TVA: {{ $tenant->vat_number }}
    @endif
@endsection
