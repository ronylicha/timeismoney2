<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Models\Payment;
use App\Models\User;

class PaymentReceivedMail extends Mailable
{
    use Queueable, SerializesModels;

    public $payment;
    public $user;
    public $locale;

    /**
     * Create a new message instance.
     */
    public function __construct(Payment $payment, User $user)
    {
        $this->payment = $payment;
        $this->user = $user;
        $this->locale = $user->locale ?? 'fr';
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $subject = match($this->locale) {
            'en' => 'Payment Received - ' . $this->payment->invoice->invoice_number,
            'es' => 'Pago Recibido - ' . $this->payment->invoice->invoice_number,
            default => 'Paiement Reçu - ' . $this->payment->invoice->invoice_number
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
            view: 'emails.payment-received',
            with: [
                'payment' => $this->payment,
                'user' => $this->user,
                'locale' => $this->locale,
                'invoice' => $this->payment->invoice,
                'client' => $this->payment->invoice->client,
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