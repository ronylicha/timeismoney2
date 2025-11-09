@extends('emails.layouts.base')

@section('title', 'Nouveau devis')

@section('content')
    <h1>Nouveau devis</h1>

    <p>Bonjour {{ $client->contact_name ?: $client->name }},</p>

    <p>Nous avons le plaisir de vous transmettre notre devis <strong>{{ $quote->quote_number }}</strong> d'un montant de <strong>{{ number_format($quote->total, 2, ',', ' ') }} €</strong>.</p>

    <div class="info-box">
        <table style="width: 100%; border: none; margin: 0;">
            <tr>
                <td style="border: none; padding: 5px 0;"><strong>Numéro de devis:</strong></td>
                <td style="border: none; padding: 5px 0;">{{ $quote->quote_number }}</td>
            </tr>
            <tr>
                <td style="border: none; padding: 5px 0;"><strong>Date d'émission:</strong></td>
                <td style="border: none; padding: 5px 0;">{{ \Carbon\Carbon::parse($quote->quote_date)->format('d/m/Y') }}</td>
            </tr>
            @if($quote->valid_until)
            <tr>
                <td style="border: none; padding: 5px 0;"><strong>Valide jusqu'au:</strong></td>
                <td style="border: none; padding: 5px 0;">{{ \Carbon\Carbon::parse($quote->valid_until)->format('d/m/Y') }}</td>
            </tr>
            @endif
            <tr>
                <td style="border: none; padding: 5px 0;"><strong>Montant total:</strong></td>
                <td style="border: none; padding: 5px 0; font-size: 18px; color: #2563eb;"><strong>{{ number_format($quote->total, 2, ',', ' ') }} €</strong></td>
            </tr>
        </table>
    </div>

    @if($quote->valid_until)
    <div class="warning-box">
        <p style="margin: 0;">
            <strong>⚠ Attention:</strong> Ce devis est valable jusqu'au <strong>{{ \Carbon\Carbon::parse($quote->valid_until)->format('d/m/Y') }}</strong>
            ({{ \Carbon\Carbon::parse($quote->quote_date)->diffInDays(\Carbon\Carbon::parse($quote->valid_until)) }} jours).
        </p>
    </div>
    @endif

    @if($quote->payment_terms)
    <p style="margin-top: 20px;">
        <strong>Conditions de paiement:</strong> {{ $quote->payment_terms }}
    </p>
    @endif

    @if($quote->notes)
    <div style="margin-top: 20px; padding: 15px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">
        <p style="margin: 0;"><strong>Notes:</strong></p>
        <p style="margin: 10px 0 0 0;">{{ $quote->notes }}</p>
    </div>
    @endif

    <p style="margin-top: 30px;">
        Le devis complet est joint à cet email au format PDF.
    </p>

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $signatureUrl }}" 
           style="display: inline-block; padding: 15px 40px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            📝 Signer le devis en ligne
        </a>
        <p style="margin-top: 15px; font-size: 14px; color: #6b7280;">
            Vous pouvez accepter ce devis en le signant directement en ligne<br>
            (signature électronique sécurisée, aucune inscription requise)
        </p>
    </div>

    <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
        Alternativement, vous pouvez nous retourner le PDF joint signé avec la mention "Bon pour accord".
    </p>

    <p>
        Nous restons à votre disposition pour toute question ou modification.
    </p>

    <p style="margin-top: 30px;">
        Cordialement,<br>
        <strong>{{ $tenant->name }}</strong>
    </p>
@endsection
