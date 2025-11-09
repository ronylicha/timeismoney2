@extends('emails.layouts.base')

@section('title', 'Nouvelle facture')

@section('content')
    <h1>Nouvelle facture</h1>

    <p>Bonjour {{ $client->contact_name ?: $client->name }},</p>

    <p>Veuillez trouver ci-joint la facture <strong>{{ $invoice->invoice_number }}</strong> d'un montant de <strong>{{ number_format($invoice->total, 2, ',', ' ') }} €</strong>.</p>

    <div class="info-box">
        <table style="width: 100%; border: none; margin: 0;">
            <tr>
                <td style="border: none; padding: 5px 0;"><strong>Numéro de facture:</strong></td>
                <td style="border: none; padding: 5px 0;">{{ $invoice->invoice_number }}</td>
            </tr>
            <tr>
                <td style="border: none; padding: 5px 0;"><strong>Date d'émission:</strong></td>
                <td style="border: none; padding: 5px 0;">{{ \Carbon\Carbon::parse($invoice->invoice_date)->format('d/m/Y') }}</td>
            </tr>
            @if($invoice->due_date)
            <tr>
                <td style="border: none; padding: 5px 0;"><strong>Date d'échéance:</strong></td>
                <td style="border: none; padding: 5px 0;">{{ \Carbon\Carbon::parse($invoice->due_date)->format('d/m/Y') }}</td>
            </tr>
            @endif
            <tr>
                <td style="border: none; padding: 5px 0;"><strong>Montant total:</strong></td>
                <td style="border: none; padding: 5px 0; font-size: 18px; color: #2563eb;"><strong>{{ number_format($invoice->total, 2, ',', ' ') }} €</strong></td>
            </tr>
        </table>
    </div>

    @if($invoice->stripe_payment_link)
    <div style="margin: 30px 0; text-align: center;">
        <a href="{{ $invoice->stripe_payment_link }}"
           style="display: inline-block; padding: 16px 32px; background-color: #635BFF; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            💳 Payer en ligne par carte bancaire
        </a>
        <p style="margin-top: 15px; color: #6b7280; font-size: 14px;">
            Paiement sécurisé via Stripe
        </p>
    </div>
    @endif

    @if($tenant->iban)
    <div class="info-box">
        <p style="margin: 0 0 10px 0;"><strong>{{ $invoice->stripe_payment_link ? 'Ou payer par virement bancaire:' : 'Coordonnées bancaires pour le paiement:' }}</strong></p>
        @if($tenant->bank_name)
            <p style="margin: 5px 0;">Banque: {{ $tenant->bank_name }}</p>
        @endif
        <p style="margin: 5px 0;">IBAN: {{ $tenant->iban }}</p>
        @if($tenant->bic)
            <p style="margin: 5px 0;">BIC: {{ $tenant->bic }}</p>
        @endif
    </div>
    @endif

    @if($invoice->payment_terms)
    <p style="margin-top: 20px;">
        <strong>Conditions de paiement:</strong> {{ $invoice->payment_terms }}
    </p>
    @endif

    @if($invoice->notes)
    <div style="margin-top: 20px; padding: 15px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">
        <p style="margin: 0;"><strong>Notes:</strong></p>
        <p style="margin: 10px 0 0 0;">{{ $invoice->notes }}</p>
    </div>
    @endif

    <p style="margin-top: 30px;">
        La facture complète est jointe à cet email au <strong>format FacturX</strong> (norme européenne EN 16931).
    </p>

    <div style="margin-top: 20px; padding: 15px; background-color: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px;"><strong>ℹ️ Qu'est-ce que FacturX ?</strong></p>
        <p style="margin: 10px 0 0 0; font-size: 13px; color: #1e40af;">
            FacturX est un format hybride PDF/XML conforme à la norme européenne, permettant l'import automatique 
            de la facture dans votre logiciel comptable. Le fichier joint peut être ouvert comme un PDF classique 
            et contient également les données structurées pour votre comptabilité.
        </p>
    </div>

    <p style="margin-top: 20px;">
        Pour toute question concernant cette facture, n'hésitez pas à nous contacter.
    </p>

    <p style="margin-top: 30px;">
        Cordialement,<br>
        <strong>{{ $tenant->name }}</strong>
    </p>
@endsection
