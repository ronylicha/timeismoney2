@extends('pdf.layouts.base')

@section('title', 'Devis ' . $quote->quote_number)

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
                <div class="document-title">DEVIS</div>
                <div class="document-number">{{ $quote->quote_number }}</div>
                <div style="margin-top: 15px;">
                    @if($quote->status === 'accepted')
                        <span class="status-badge status-paid">Accepté</span>
                    @elseif($quote->status === 'rejected')
                        <span class="status-badge status-overdue">Refusé</span>
                    @elseif($quote->status === 'sent')
                        <span class="status-badge status-sent">Envoyé</span>
                    @else
                        <span class="status-badge status-draft">Brouillon</span>
                    @endif
                </div>
            </div>
        </div>
    </div>

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
                <span class="meta-label">Date du devis:</span>
                {{ \Carbon\Carbon::parse($quote->quote_date)->format('d/m/Y') }}
            </div>
            @if($quote->valid_until)
            <div class="meta-item">
                <span class="meta-label">Valide jusqu'au:</span>
                {{ \Carbon\Carbon::parse($quote->valid_until)->format('d/m/Y') }}
            </div>
            @endif
        </div>
        <div class="meta-right">
            @if($quote->project)
            <div class="meta-item">
                <span class="meta-label">Projet:</span>
                {{ $quote->project->name }}
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
            <div class="totals-value">{{ number_format($quote->subtotal, 2, ',', ' ') }} €</div>
        </div>

        @if($quote->discount > 0)
        <div class="totals-row">
            <div class="totals-label">Remise</div>
            <div class="totals-value">-{{ number_format($quote->discount, 2, ',', ' ') }} €</div>
        </div>
        @endif

        <div class="totals-row">
            <div class="totals-label">TVA</div>
            <div class="totals-value">{{ number_format($quote->tax, 2, ',', ' ') }} €</div>
        </div>

        <div class="totals-row total">
            <div class="totals-label">Total TTC</div>
            <div class="totals-value">{{ number_format($quote->total, 2, ',', ' ') }} €</div>
        </div>
    </div>

    <!-- Notes -->
    @if($quote->notes)
    <div class="notes">
        <div class="notes-title">Notes</div>
        <div class="notes-content">{{ $quote->notes }}</div>
    </div>
    @endif

    <!-- Terms and Conditions -->
    <div class="payment-info">
        <div class="payment-title">Conditions</div>
        <div class="payment-details">
            @if($quote->payment_terms)
                <strong>Conditions de paiement:</strong> {{ $quote->payment_terms }}<br><br>
            @endif
            <em>Ce devis est valable {{ \Carbon\Carbon::parse($quote->quote_date)->diffInDays(\Carbon\Carbon::parse($quote->valid_until)) }} jours
            à compter de la date d'émission. Une fois accepté, il fera l'objet d'une facture selon les conditions indiquées.</em>
        </div>
    </div>

    <!-- Acceptance Section -->
    @if($quote->status === 'sent' || $quote->status === 'draft')
    <div style="margin-top: 50px; padding: 20px; border: 2px solid #2563eb; border-radius: 5px;">
        <div style="font-weight: bold; margin-bottom: 15px; font-size: 11pt;">Bon pour accord</div>
        <div style="display: table; width: 100%;">
            <div style="display: table-cell; width: 50%; padding-right: 20px;">
                <div style="margin-bottom: 5px;">Date: ___________________</div>
                <div style="margin-bottom: 5px;">Nom: ___________________</div>
                <div>Signature:</div>
                <div style="margin-top: 40px; border-bottom: 1px solid #000; width: 200px;"></div>
            </div>
            <div style="display: table-cell; width: 50%; padding-left: 20px; font-size: 8pt; color: #666;">
                <div style="background-color: #f3f4f6; padding: 10px; border-radius: 3px;">
                    <strong>Mention obligatoire:</strong><br>
                    « Bon pour accord et signature du devis d'un montant de
                    {{ number_format($quote->total, 2, ',', ' ') }} € TTC. »
                </div>
            </div>
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
