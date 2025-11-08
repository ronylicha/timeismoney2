<?php

namespace App\Mail;

use App\Models\CreditNote;
use App\Services\PdfGeneratorService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Queue\SerializesModels;

class CreditNoteSent extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public CreditNote $creditNote,
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
            subject: "Avoir {$this->creditNote->credit_note_number} - {$this->creditNote->tenant->name}",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.credit-note-sent',
            with: [
                'creditNote' => $this->creditNote,
                'client' => $this->creditNote->client,
                'tenant' => $this->creditNote->tenant,
                'invoice' => $this->creditNote->invoice,
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
        $pdf = $this->pdfService->generateCreditNotePdf($this->creditNote);

        return [
            Attachment::fromData(fn () => $pdf->output(), "credit-note-{$this->creditNote->credit_note_number}.pdf")
                ->withMime('application/pdf'),
        ];
    }
}
