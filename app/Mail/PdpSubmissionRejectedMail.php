<?php

namespace App\Mail;

use App\Models\PdpSubmission;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PdpSubmissionRejectedMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(
        private PdpSubmission $submission,
        private mixed $document
    ) {}

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $documentType = $this->document instanceof \App\Models\Invoice ? 'Facture' : 'Avoir';
        $documentNumber = $this->document->invoice_number ?? $this->document->credit_note_number;

        return new Envelope(
            subject: "❌ {$documentType} n°{$documentNumber} rejetée par le PDP",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        $documentType = $this->document instanceof \App\Models\Invoice ? 'facture' : 'avoir';
        $documentNumber = $this->document->invoice_number ?? $this->document->credit_note_number;
        $documentUrl = $this->getDocumentUrl();

        return new Content(
            view: 'emails.pdp.submission_rejected',
            with: [
                'submission' => $this->submission,
                'document' => $this->document,
                'documentType' => $documentType,
                'documentNumber' => $documentNumber,
                'documentUrl' => $documentUrl,
            ]
        );
    }

    /**
     * Get the attachments for the message.
     */
    public function attachments(): array
    {
        return [];
    }

    /**
     * Get the URL for the document
     */
    private function getDocumentUrl(): string
    {
        $baseUrl = config('app.url');
        
        if ($this->document instanceof \App\Models\Invoice) {
            return "{$baseUrl}/invoices/{$this->document->id}";
        } elseif ($this->document instanceof \App\Models\CreditNote) {
            return "{$baseUrl}/credit-notes/{$this->document->id}";
        }

        return $baseUrl;
    }
}