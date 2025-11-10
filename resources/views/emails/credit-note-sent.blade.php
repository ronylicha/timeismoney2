@extends('emails.layouts.base')

@section('title', 'Avoir émis')

@section('content')
    <h1>Avoir émis</h1>

    <p>Bonjour {{ $client->contact_name ?: $client->name }},</p>

    <p>Je vous informe que j'ai émis un avoir <strong>{{ $creditNote->credit_note_number }}</strong> pour un montant de <strong>{{ number_format($creditNote->total, 2, ',', ' ') }} €</strong>.</p>

    <div class="success-box">
        <table style="width: 100%; border: none; margin: 0;">
            <tr>
                <td style="border: none; padding: 5px 0;"><strong>Numéro d'avoir:</strong></td>
                <td style="border: none; padding: 5px 0;">{{ $creditNote->credit_note_number }}</td>
            </tr>
            <tr>
                <td style="border: none; padding: 5px 0;"><strong>Date d'émission:</strong></td>
                <td style="border: none; padding: 5px 0;">{{ \Carbon\Carbon::parse($creditNote->credit_note_date)->format('d/m/Y') }}</td>
            </tr>
            @if($invoice)
            <tr>
                <td style="border: none; padding: 5px 0;"><strong>Facture d'origine:</strong></td>
                <td style="border: none; padding: 5px 0;">{{ $invoice->invoice_number }}</td>
            </tr>
            @endif
            <tr>
                <td style="border: none; padding: 5px 0;"><strong>Montant de l'avoir:</strong></td>
                <td style="border: none; padding: 5px 0; font-size: 18px; color: #10b981;"><strong>{{ number_format($creditNote->total, 2, ',', ' ') }} €</strong></td>
            </tr>
        </table>
    </div>

    @if($creditNote->reason)
    <div class="info-box">
        <p style="margin: 0 0 5px 0;"><strong>Raison de l'avoir:</strong></p>
        <p style="margin: 0;">{{ $creditNote->reason }}</p>
    </div>
    @endif

    @if($creditNote->description)
    <div style="margin-top: 20px; padding: 15px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">
        <p style="margin: 0;"><strong>Description:</strong></p>
        <p style="margin: 10px 0 0 0;">{{ $creditNote->description }}</p>
    </div>
    @endif

    <p style="margin-top: 20px;">
        Ce montant sera déduit de votre solde ou fera l'objet d'un remboursement selon les modalités convenues.
    </p>

    @if($creditNote->payment_method)
    <p>
        <strong>Mode de remboursement:</strong> {{ $creditNote->payment_method }}
    </p>
    @endif

    <p style="margin-top: 30px;">
        L'avoir complet est joint à cet email au format PDF.
    </p>

    <p>
        Pour toute question, n'hésitez pas à me contacter.
    </p>

    <p style="margin-top: 30px;">
        Cordialement,<br>
        {{ $tenant->name }}
    </p>
@endsection
