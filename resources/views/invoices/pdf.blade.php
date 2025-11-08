<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facture {{ $invoice->invoice_number }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
        }

        .container {
            padding: 20px;
        }

        .header {
            margin-bottom: 30px;
        }

        .header-top {
            display: table;
            width: 100%;
            margin-bottom: 20px;
        }

        .company-info {
            display: table-cell;
            width: 50%;
            vertical-align: top;
        }

        .invoice-info {
            display: table-cell;
            width: 50%;
            text-align: right;
            vertical-align: top;
        }

        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }

        .invoice-title {
            font-size: 28px;
            font-weight: bold;
            color: #111827;
            margin-bottom: 10px;
        }

        .invoice-number {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 5px;
        }

        .invoice-date {
            font-size: 12px;
            color: #6b7280;
        }

        .billing-section {
            display: table;
            width: 100%;
            margin-bottom: 30px;
        }

        .billing-from, .billing-to {
            display: table-cell;
            width: 50%;
            vertical-align: top;
        }

        .billing-to {
            padding-left: 40px;
        }

        .section-title {
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            color: #6b7280;
            margin-bottom: 10px;
            letter-spacing: 0.5px;
        }

        .client-name {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .address {
            color: #4b5563;
            line-height: 1.6;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }

        th {
            background-color: #f3f4f6;
            border-bottom: 2px solid #d1d5db;
            padding: 12px;
            text-align: left;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            color: #4b5563;
            letter-spacing: 0.5px;
        }

        td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
        }

        .text-right {
            text-align: right;
        }

        .text-center {
            text-align: center;
        }

        .item-description {
            font-weight: 500;
            margin-bottom: 3px;
        }

        .item-details {
            font-size: 11px;
            color: #6b7280;
        }

        .totals-section {
            margin-top: 30px;
            display: table;
            width: 100%;
        }

        .totals-spacer {
            display: table-cell;
            width: 60%;
        }

        .totals-table {
            display: table-cell;
            width: 40%;
        }

        .total-row {
            display: table;
            width: 100%;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
        }

        .total-label {
            display: table-cell;
            text-align: right;
            padding-right: 20px;
            color: #6b7280;
        }

        .total-value {
            display: table-cell;
            text-align: right;
            font-weight: 500;
        }

        .grand-total {
            border-top: 2px solid #2563eb;
            border-bottom: none;
            padding-top: 12px;
            margin-top: 8px;
        }

        .grand-total .total-label {
            font-size: 14px;
            font-weight: bold;
            color: #111827;
        }

        .grand-total .total-value {
            font-size: 18px;
            font-weight: bold;
            color: #2563eb;
        }

        .payment-info {
            margin-top: 40px;
            padding: 20px;
            background-color: #f9fafb;
            border-radius: 8px;
        }

        .payment-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .payment-details {
            line-height: 1.6;
            color: #4b5563;
        }

        .notes-section {
            margin-top: 30px;
        }

        .notes {
            padding: 15px;
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            border-radius: 4px;
        }

        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 10px;
        }

        .nf525-compliance {
            margin-top: 30px;
            padding: 15px;
            background-color: #e0e7ff;
            border: 1px solid #a5b4fc;
            border-radius: 4px;
        }

        .nf525-title {
            font-weight: bold;
            margin-bottom: 10px;
            color: #3730a3;
        }

        .nf525-info {
            font-size: 10px;
            line-height: 1.5;
            color: #4c1d95;
        }

        .hash-info {
            font-family: 'Courier New', monospace;
            font-size: 9px;
            word-break: break-all;
            margin-top: 5px;
        }

        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
        }

        .status-paid {
            background-color: #d1fae5;
            color: #065f46;
        }

        .status-pending {
            background-color: #fed7aa;
            color: #9a3412;
        }

        .status-overdue {
            background-color: #fee2e2;
            color: #991b1b;
        }

        @page {
            margin: 0;
        }

        .page-break {
            page-break-after: always;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="header-top">
                <div class="company-info">
                    <div class="company-name">{{ $tenant->name }}</div>
                    @if($tenant->settings && $tenant->settings['company_info'])
                        @php $company = $tenant->settings['company_info']; @endphp
                        <div class="address">
                            @if(isset($company['address'])){{ $company['address'] }}<br>@endif
                            @if(isset($company['postal_code']) || isset($company['city']))
                                {{ $company['postal_code'] ?? '' }} {{ $company['city'] ?? '' }}<br>
                            @endif
                            @if(isset($company['phone']))Tél : {{ $company['phone'] }}<br>@endif
                            @if(isset($company['email']))Email : {{ $company['email'] }}<br>@endif
                            @if(isset($company['siret']))SIRET : {{ $company['siret'] }}<br>@endif
                            @if(isset($company['vat_number']))N° TVA : {{ $company['vat_number'] }}@endif
                        </div>
                    @endif
                </div>
                <div class="invoice-info">
                    <div class="invoice-title">FACTURE</div>
                    <div class="invoice-number">N° {{ $invoice->invoice_number }}</div>
                    <div class="invoice-date">Date : {{ $invoice->invoice_date->format('d/m/Y') }}</div>
                    <div class="invoice-date">Échéance : {{ $invoice->due_date->format('d/m/Y') }}</div>
                    <div style="margin-top: 10px;">
                        @if($invoice->status == 'paid')
                            <span class="status-badge status-paid">PAYÉE</span>
                        @elseif($invoice->status == 'overdue')
                            <span class="status-badge status-overdue">EN RETARD</span>
                        @else
                            <span class="status-badge status-pending">EN ATTENTE</span>
                        @endif
                    </div>
                </div>
            </div>
        </div>

        <!-- Billing Information -->
        <div class="billing-section">
            <div class="billing-from">
                <div class="section-title">Émetteur</div>
                <div class="client-name">{{ $tenant->name }}</div>
                @if($tenant->settings && $tenant->settings['company_info'])
                    @php $company = $tenant->settings['company_info']; @endphp
                    <div class="address">
                        @if(isset($company['address'])){{ $company['address'] }}<br>@endif
                        @if(isset($company['postal_code']) || isset($company['city']))
                            {{ $company['postal_code'] ?? '' }} {{ $company['city'] ?? '' }}<br>
                        @endif
                        {{ $company['country'] ?? 'France' }}
                    </div>
                @endif
            </div>
            <div class="billing-to">
                <div class="section-title">Destinataire</div>
                <div class="client-name">{{ $invoice->client->name }}</div>
                <div class="address">
                    @if($invoice->client->address){{ $invoice->client->address }}<br>@endif
                    @if($invoice->client->postal_code || $invoice->client->city)
                        {{ $invoice->client->postal_code }} {{ $invoice->client->city }}<br>
                    @endif
                    {{ $invoice->client->country ?? 'France' }}<br>
                    @if($invoice->client->vat_number)
                        N° TVA : {{ $invoice->client->vat_number }}<br>
                    @endif
                    @if($invoice->client->siret)
                        SIRET : {{ $invoice->client->siret }}
                    @endif
                </div>
            </div>
        </div>

        <!-- Invoice Items -->
        <table>
            <thead>
                <tr>
                    <th style="width: 50%;">Description</th>
                    <th class="text-center" style="width: 10%;">Qté</th>
                    <th class="text-right" style="width: 15%;">Prix Unit. HT</th>
                    <th class="text-right" style="width: 10%;">TVA</th>
                    <th class="text-right" style="width: 15%;">Total HT</th>
                </tr>
            </thead>
            <tbody>
                @foreach($invoice->items as $item)
                <tr>
                    <td>
                        <div class="item-description">{{ $item->description }}</div>
                        @if($item->type == 'time')
                            <div class="item-details">Entrées de temps</div>
                        @elseif($item->type == 'expense')
                            <div class="item-details">Dépense</div>
                        @endif
                    </td>
                    <td class="text-center">{{ number_format($item->quantity, 2, ',', ' ') }}</td>
                    <td class="text-right">{{ number_format($item->unit_price, 2, ',', ' ') }} €</td>
                    <td class="text-right">{{ number_format($item->tax_rate, 1, ',', ' ') }}%</td>
                    <td class="text-right">{{ number_format($item->total, 2, ',', ' ') }} €</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <!-- Totals -->
        <div class="totals-section">
            <div class="totals-spacer"></div>
            <div class="totals-table">
                <div class="total-row">
                    <div class="total-label">Sous-total HT</div>
                    <div class="total-value">{{ number_format($invoice->subtotal, 2, ',', ' ') }} €</div>
                </div>

                @if($invoice->discount_amount > 0)
                <div class="total-row">
                    <div class="total-label">
                        Remise
                        @if($invoice->discount_type == 'percentage')
                            ({{ $invoice->discount_amount }}%)
                        @endif
                    </div>
                    <div class="total-value">
                        -{{ number_format(
                            $invoice->discount_type == 'percentage'
                                ? ($invoice->subtotal * $invoice->discount_amount / 100)
                                : $invoice->discount_amount,
                            2, ',', ' '
                        ) }} €
                    </div>
                </div>
                @endif

                <div class="total-row">
                    <div class="total-label">TVA ({{ number_format($invoice->tax_rate, 1, ',', ' ') }}%)</div>
                    <div class="total-value">{{ number_format($invoice->tax_amount, 2, ',', ' ') }} €</div>
                </div>

                <div class="total-row grand-total">
                    <div class="total-label">TOTAL TTC</div>
                    <div class="total-value">{{ number_format($invoice->total, 2, ',', ' ') }} €</div>
                </div>
            </div>
        </div>

        <!-- Payment Information -->
        <div class="payment-info">
            <div class="payment-title">Informations de paiement</div>
            <div class="payment-details">
                <strong>Conditions de paiement :</strong> {{ $invoice->payment_terms }} jours<br>
                <strong>Date d'échéance :</strong> {{ $invoice->due_date->format('d/m/Y') }}<br>
                @if($invoice->status == 'paid' && $invoice->paid_at)
                    <strong>Payée le :</strong> {{ \Carbon\Carbon::parse($invoice->paid_at)->format('d/m/Y') }}<br>
                @endif
                @if($tenant->settings && isset($tenant->settings['company_info']['iban']))
                    <strong>IBAN :</strong> {{ $tenant->settings['company_info']['iban'] }}<br>
                @endif
                @if($tenant->settings && isset($tenant->settings['company_info']['bic']))
                    <strong>BIC :</strong> {{ $tenant->settings['company_info']['bic'] }}
                @endif
            </div>
        </div>

        <!-- Notes -->
        @if($invoice->notes)
        <div class="notes-section">
            <div class="section-title">Notes</div>
            <div class="notes">
                {{ $invoice->notes }}
            </div>
        </div>
        @endif

        <!-- NF525 Compliance -->
        <div class="nf525-compliance">
            <div class="nf525-title">Conformité NF525 - Loi Anti-Fraude</div>
            <div class="nf525-info">
                Cette facture est conforme aux exigences de la loi anti-fraude NF525.<br>
                Numéro séquentiel : {{ $invoice->sequential_number }}<br>
                Date et heure de création : {{ $invoice->created_at->format('d/m/Y H:i:s') }}<br>
                @if($invoice->hash)
                <div class="hash-info">
                    Hash de sécurité : {{ $invoice->hash }}
                </div>
                @endif
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            @if($invoice->footer)
                <div style="margin-bottom: 10px;">{{ $invoice->footer }}</div>
            @endif
            <div>
                {{ $tenant->name }}
                @if($tenant->settings && isset($tenant->settings['company_info']['siret']))
                    - SIRET : {{ $tenant->settings['company_info']['siret'] }}
                @endif
                @if($tenant->settings && isset($tenant->settings['company_info']['vat_number']))
                    - N° TVA : {{ $tenant->settings['company_info']['vat_number'] }}
                @endif
            </div>
            <div style="margin-top: 5px;">
                Facture générée le {{ now()->format('d/m/Y à H:i') }}
            </div>
        </div>
    </div>
</body>
</html>