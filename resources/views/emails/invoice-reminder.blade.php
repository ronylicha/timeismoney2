@extends('emails.layouts.base')

@section('title', 'Rappel de paiement')

@section('content')
    <h1>Rappel de paiement</h1>

    <p>Bonjour {{ $client->contact_name ?: $client->name }},</p>

    <p>Nous nous permettons de vous rappeler que la facture <strong>{{ $invoice->invoice_number }}</strong> d'un montant de <strong>{{ number_format($invoice->total, 2, ',', ' ') }} €</strong> est en attente de paiement.</p>

    <div class="warning-box">
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
                <td style="border: none; padding: 5px 0; color: #dc2626;">
                    <strong>{{ \Carbon\Carbon::parse($invoice->due_date)->format('d/m/Y') }}</strong>
                    @if($daysOverdue > 0)
                        <span style="color: #dc2626;">({{ $daysOverdue }} jour{{ $daysOverdue > 1 ? 's' : '' }} de retard)</span>
                    @endif
                </td>
            </tr>
            @endif
            <tr>
                <td style="border: none; padding: 5px 0;"><strong>Montant dû:</strong></td>
                <td style="border: none; padding: 5px 0; font-size: 18px; color: #dc2626;"><strong>{{ number_format($invoice->total, 2, ',', ' ') }} €</strong></td>
            </tr>
        </table>
    </div>

    @if($invoice->stripe_payment_link)
    <div style="margin: 30px 0; text-align: center;">
        <a href="{{ $invoice->stripe_payment_link }}"
           style="display: inline-block; padding: 16px 32px; background-color: #635BFF; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            💳 Payer maintenant par carte bancaire
        </a>
        <p style="margin-top: 15px; color: #6b7280; font-size: 14px;">
            Paiement sécurisé via Stripe - Règlement immédiat
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

    <p style="margin-top: 20px;">
        Si vous avez déjà effectué ce paiement, merci de ne pas tenir compte de ce message.
    </p>

    <div style="margin-top: 20px; padding: 15px; background-color: #fee2e2; border-left: 4px solid #dc2626; border-radius: 4px; font-size: 12px;">
        <p style="margin: 0; color: #991b1b;">
            <strong>Rappel légal:</strong> En cas de retard de paiement, des pénalités de retard de 3 fois le taux d'intérêt légal seront exigibles,
            ainsi qu'une indemnité forfaitaire de 40 € pour frais de recouvrement, conformément aux articles L441-6 et D441-5 du Code de Commerce.
        </p>
    </div>

    <p style="margin-top: 30px;">
        La facture est jointe à cet email pour votre commodité.
    </p>

    <p>
        Pour toute question ou si vous rencontrez des difficultés, n'hésitez pas à nous contacter au plus vite.
    </p>

    <p style="margin-top: 30px;">
        Cordialement,<br>
        <strong>{{ $tenant->name }}</strong>
    </p>
@endsection
