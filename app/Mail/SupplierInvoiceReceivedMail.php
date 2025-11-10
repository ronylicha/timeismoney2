<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Models\SupplierInvoice;
use App\Models\User;

class SupplierInvoiceReceivedMail extends Mailable
{
    use Queueable, SerializesModels;

    public $supplierInvoice;
    public $user;
    public $locale;

    /**
     * Create a new message instance.
     */
    public function __construct(SupplierInvoice $supplierInvoice, User $user)
    {
        $this->supplierInvoice = $supplierInvoice;
        $this->user = $user;
        $this->locale = $user->locale ?? 'fr';
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $subject = match($this->locale) {
            'en' => 'New Supplier Invoice Received - ' . $this->supplierInvoice->invoice_number,
            'es' => 'Nueva Factura de Proveedor Recibida - ' . $this->supplierInvoice->invoice_number,
            default => 'Nouvelle Facture Fournisseur Reçue - ' . $this->supplierInvoice->invoice_number
        };

        return new Envelope(
            subject: $subject,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.supplier-invoice-received',
            with: [
                'supplierInvoice' => $this->supplierInvoice,
                'user' => $this->user,
                'locale' => $this->locale,
                'supplier' => $this->supplierInvoice->supplier,
            ]
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}