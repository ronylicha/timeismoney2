<?php

namespace App\Mail;

use App\Models\Invoice;
use App\Services\PdfGeneratorService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Queue\SerializesModels;

class InvoiceSent extends Mailable
{
    use Queueable, SerializesModels;

    public Invoice $invoice;
    private int $invoiceId;

    /**
     * Create a new message instance.
     */
    public function __construct(
        Invoice $invoice,
        private PdfGeneratorService $pdfService
    ) {
        // Store only the ID to avoid serialization issues with circular relationships
        $this->invoiceId = $invoice->id;
        // Load only safe relations
        $this->invoice = $invoice->loadMissing(['client', 'tenant', 'items']);
    }

    /**
     * Prepare the invoice for serialization
     */
    public function __serialize(): array
    {
        return [
            'invoiceId' => $this->invoiceId,
        ];
    }

    /**
     * Restore the invoice after unserialization
     */
    public function __unserialize(array $data): void
    {
        $this->invoiceId = $data['invoiceId'];
        // Reload the invoice with only safe relations
        $this->invoice = Invoice::with(['client', 'tenant', 'items'])->findOrFail($this->invoiceId);
        $this->pdfService = app(PdfGeneratorService::class);
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Facture {$this->invoice->invoice_number} - {$this->invoice->tenant->name}",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.invoice-sent',
            with: [
                'invoice' => $this->invoice,
                'client' => $this->invoice->client,
                'tenant' => $this->invoice->tenant,
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
        $pdf = $this->pdfService->generateInvoicePdf($this->invoice);

        return [
            Attachment::fromData(fn () => $pdf->output(), "invoice-{$this->invoice->invoice_number}.pdf")
                ->withMime('application/pdf'),
        ];
    }
}
