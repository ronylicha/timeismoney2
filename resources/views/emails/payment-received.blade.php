@extends('emails.layouts.base')

@section('title', 'Paiement reçu')

@section('content')
    <h1>✓ Paiement reçu</h1>

    <p>Bonjour {{ $client->contact_name ?: $client->name }},</p>

    <p>J'accuse réception de votre paiement de <strong>{{ number_format($amount, 2, ',', ' ') }} €</strong> pour ma facture <strong>{{ $invoice->invoice_number }}</strong>.</p>

    <div class="success-box">
        <table style="width: 100%; border: none; margin: 0;">
            <tr>
                <td style="border: none; padding: 5px 0;"><strong>Facture:</strong></td>
                <td style="border: none; padding: 5px 0;">{{ $invoice->invoice_number }}</td>
            </tr>
            <tr>
                <td style="border: none; padding: 5px 0;"><strong>Montant payé:</strong></td>
                <td style="border: none; padding: 5px 0; font-size: 18px; color: #10b981;"><strong>{{ number_format($amount, 2, ',', ' ') }} €</strong></td>
            </tr>
            @if($paymentMethod)
            <tr>
                <td style="border: none; padding: 5px 0;"><strong>Mode de paiement:</strong></td>
                <td style="border: none; padding: 5px 0;">{{ $paymentMethod }}</td>
            </tr>
            @endif
            <tr>
                <td style="border: none; padding: 5px 0;"><strong>Date de réception:</strong></td>
                <td style="border: none; padding: 5px 0;">{{ now()->format('d/m/Y') }}</td>
            </tr>
        </table>
    </div>

    @if($invoice->status === 'paid')
    <div class="success-box" style="margin-top: 20px;">
        <p style="margin: 0;">
            <strong>✓ Statut:</strong> Cette facture est maintenant entièrement payée.
        </p>
    </div>
    @else
    <div class="info-box" style="margin-top: 20px;">
        <p style="margin: 0;">
            <strong>Solde restant:</strong> {{ number_format($invoice->total - $amount, 2, ',', ' ') }} €
        </p>
    </div>
    @endif

    <p style="margin-top: 30px;">
        Je vous remercie pour votre confiance et reste à votre disposition pour toute question.
    </p>

    <p style="margin-top: 30px;">
        Cordialement,<br>
        {{ $tenant->name }}
    </p>
@endsection
