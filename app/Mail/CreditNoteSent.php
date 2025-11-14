<?php

namespace App\Mail;

use App\Models\CreditNote;
use App\Services\PdfGeneratorService;
use App\Services\FacturXService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

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
        try {
            $facturXService = app(FacturXService::class);
            $facturXPath = $facturXService->generateFacturXForCreditNote($this->creditNote);

            if ($facturXPath && Storage::exists($facturXPath)) {
                Log::info('Sending credit note with FacturX attachment', [
                    'credit_note_id' => $this->creditNote->id,
                    'path' => $facturXPath,
                ]);

                return [
                    Attachment::fromStorage($facturXPath)
                        ->as("avoir-{$this->creditNote->credit_note_number}.pdf")
                        ->withMime('application/pdf'),
                ];
            }
        } catch (\Throwable $throwable) {
            Log::warning('Failed to generate FacturX for credit note email, falling back to standard PDF', [
                'credit_note_id' => $this->creditNote->id,
                'message' => $throwable->getMessage(),
            ]);
        }

        $pdf = $this->pdfService->generateCreditNotePdf($this->creditNote);

        return [
            Attachment::fromData(fn () => $pdf->output(), "avoir-{$this->creditNote->credit_note_number}.pdf")
                ->withMime('application/pdf'),
        ];
    }
}
