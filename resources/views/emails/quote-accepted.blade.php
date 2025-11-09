@extends('emails.layouts.base')

@section('title', 'Devis accepté')

@section('content')
    <h1>✓ Devis accepté</h1>

    <p>Bonjour {{ $client->contact_name ?: $client->name }},</p>

    <p>Nous vous confirmons la bonne réception de votre acceptation du devis <strong>{{ $quote->quote_number }}</strong>.</p>

    <div class="success-box" style="margin: 20px 0; padding: 20px; background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 4px;">
        <p style="margin: 0 0 10px 0; font-size: 16px; color: #16a34a;">
            <strong>✓ Devis signé électroniquement</strong>
        </p>
        <table style="width: 100%; border: none; margin: 0;">
            <tr>
                <td style="border: none; padding: 5px 0;"><strong>Numéro de devis:</strong></td>
                <td style="border: none; padding: 5px 0;">{{ $quote->quote_number }}</td>
            </tr>
            <tr>
                <td style="border: none; padding: 5px 0;"><strong>Signataire:</strong></td>
                <td style="border: none; padding: 5px 0;">{{ $quote->signatory_name }}</td>
            </tr>
            <tr>
                <td style="border: none; padding: 5px 0;"><strong>Date de signature:</strong></td>
                <td style="border: none; padding: 5px 0;">{{ \Carbon\Carbon::parse($quote->accepted_at)->format('d/m/Y à H:i') }}</td>
            </tr>
            <tr>
                <td style="border: none; padding: 5px 0;"><strong>Montant total:</strong></td>
                <td style="border: none; padding: 5px 0; font-size: 18px; color: #16a34a;"><strong>{{ number_format($quote->total, 2, ',', ' ') }} €</strong></td>
            </tr>
        </table>
    </div>

    <div class="info-box">
        <p style="margin: 0 0 10px 0;">
            <strong>Prochaines étapes:</strong>
        </p>
        <ul style="margin: 0; padding-left: 20px;">
            <li>Nous commencerons les travaux selon les modalités convenues</li>
            @if($quote->payment_conditions)
            <li>Conditions de paiement: {{ $quote->payment_conditions }}</li>
            @endif
            <li>Une facture vous sera adressée conformément aux conditions du devis</li>
        </ul>
    </div>

    <div style="margin-top: 20px; padding: 15px; background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 4px;">
        <p style="margin: 0;"><strong>Valeur juridique:</strong></p>
        <p style="margin: 10px 0 0 0; font-size: 13px; color: #666;">
            Cette signature électronique a la même valeur qu'une signature manuscrite conformément au règlement eIDAS (UE) n°910/2014 
            et au Code civil français (articles 1366 et 1367). Le devis signé est joint à cet email au format PDF.
        </p>
    </div>

    @if($quote->notes)
    <div style="margin-top: 20px; padding: 15px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">
        <p style="margin: 0;"><strong>Notes:</strong></p>
        <p style="margin: 10px 0 0 0;">{{ $quote->notes }}</p>
    </div>
    @endif

    <p style="margin-top: 30px;">
        Nous vous remercions pour votre confiance et restons à votre disposition pour toute question.
    </p>

    <p style="margin-top: 30px;">
        Cordialement,<br>
        <strong>{{ $tenant->name }}</strong>
    </p>
@endsection
