<?php

namespace App\Mail;

use App\Models\Quote;
use App\Services\PdfGeneratorService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Queue\SerializesModels;

class QuoteAccepted extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public Quote $quote,
        private PdfGeneratorService $pdfService
    ) {
        //
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Devis accepté {$this->quote->quote_number} - {$this->quote->tenant->name}",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.quote-accepted',
            with: [
                'quote' => $this->quote,
                'client' => $this->quote->client,
                'tenant' => $this->quote->tenant,
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        $pdf = $this->pdfService->generateQuotePdf($this->quote);

        return [
            Attachment::fromData(fn () => $pdf->output(), "quote-signed-{$this->quote->quote_number}.pdf")
                ->withMime('application/pdf'),
        ];
    }
}
