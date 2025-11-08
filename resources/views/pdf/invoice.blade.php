@extends('pdf.layouts.base')

@section('title', 'Invoice ' . $invoice->invoice_number)

@section('content')
    <!-- Header -->
    <div class="header">
        <div class="header-content">
            <div class="header-left">
                <div class="company-name">{{ $tenant->name }}</div>
                <div class="company-info">
                    @if($tenant->address)
                        {{ $tenant->address }}<br>
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
                    @if($tenant->siret)
                        SIRET: {{ $tenant->siret }}<br>
                    @endif
                    @if($tenant->vat_number)
                        TVA: {{ $tenant->vat_number }}
                    @endif
                </div>
            </div>
            <div class="header-right">
                <div class="document-title">FACTURE</div>
                <div class="document-number">{{ $invoice->invoice_number }}</div>
                <div style="margin-top: 15px;">
                    @if($invoice->status === 'paid')
                        <span class="status-badge status-paid">Payée</span>
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

        <div class="totals-row">
            <div class="totals-label">TVA</div>
            <div class="totals-value">{{ number_format($invoice->tax, 2, ',', ' ') }} €</div>
        </div>

        <div class="totals-row total">
            <div class="totals-label">Total TTC</div>
            <div class="totals-value">{{ number_format($invoice->total, 2, ',', ' ') }} €</div>
        </div>
    </div>

    <!-- Notes -->
    @if($invoice->notes)
    <div class="notes">
        <div class="notes-title">Notes</div>
        <div class="notes-content">{{ $invoice->notes }}</div>
    </div>
    @endif

    <!-- Payment Information -->
    <div class="payment-info">
        <div class="payment-title">Informations de paiement</div>
        <div class="payment-details">
            @if($invoice->payment_terms)
                <strong>Conditions:</strong> {{ $invoice->payment_terms }}<br>
            @endif
            @if($tenant->bank_name || $tenant->iban)
                <strong>Coordonnées bancaires:</strong><br>
                @if($tenant->bank_name)
                    Banque: {{ $tenant->bank_name }}<br>
                @endif
                @if($tenant->iban)
                    IBAN: {{ $tenant->iban }}<br>
                @endif
                @if($tenant->bic)
                    BIC: {{ $tenant->bic }}<br>
                @endif
            @endif
            <br>
            <em>En cas de retard de paiement, une pénalité de 3 fois le taux d'intérêt légal sera exigible,
            ainsi qu'une indemnité forfaitaire de 40 € pour frais de recouvrement.</em>
        </div>
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
    {{ $tenant->name }} - {{ $tenant->address }} - {{ $tenant->city }}<br>
    @if($tenant->siret)
        SIRET: {{ $tenant->siret }} -
    @endif
    @if($tenant->vat_number)
        TVA: {{ $tenant->vat_number }}
    @endif
@endsection
