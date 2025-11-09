<?php

namespace App\Services;

use App\Mail\InvoiceSent;
use App\Mail\QuoteSent;
use App\Mail\CreditNoteSent;
use App\Mail\PaymentReceived;
use App\Mail\InvoiceReminder;
use App\Models\Invoice;
use App\Models\Quote;
use App\Models\CreditNote;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class EmailService
{
    public function __construct(
        private PdfGeneratorService $pdfService
    ) {
        //
    }

    /**
     * Send invoice to client
     */
    public function sendInvoice(Invoice $invoice, ?string $recipientEmail = null): bool
    {
        try {
            $email = $recipientEmail ?: $invoice->client->email;

            if (!$email) {
                Log::warning("No email address for client {$invoice->client->id}");
                return false;
            }

            Mail::to($email)->send(new InvoiceSent($invoice, $this->pdfService));

            Log::info("Invoice {$invoice->invoice_number} sent to {$email}");
            return true;
        } catch (\Exception $e) {
            Log::error("Failed to send invoice {$invoice->invoice_number}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Send quote to client
     */
    public function sendQuote(Quote $quote, ?string $recipientEmail = null): bool
    {
        try {
            // Debug logging
            Log::info("Attempting to send quote", [
                'quote_id' => $quote->id,
                'quote_number' => $quote->quote_number,
                'has_client' => $quote->client !== null,
                'has_tenant' => $quote->tenant !== null,
                'client_email' => $quote->client?->email ?? 'NULL',
                'recipient_email' => $recipientEmail
            ]);
            
            $email = $recipientEmail ?: $quote->client->email;

            if (!$email) {
                Log::warning("No email address for client {$quote->client->id}");
                return false;
            }

            Mail::to($email)->send(new QuoteSent($quote, $this->pdfService));

            Log::info("Quote {$quote->quote_number} sent to {$email}");
            return true;
        } catch (\Exception $e) {
            Log::error("Failed to send quote {$quote->quote_number}: " . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }

    /**
     * Send credit note to client
     */
    public function sendCreditNote(CreditNote $creditNote, ?string $recipientEmail = null): bool
    {
        try {
            $email = $recipientEmail ?: $creditNote->client->email;

            if (!$email) {
                Log::warning("No email address for client {$creditNote->client->id}");
                return false;
            }

            Mail::to($email)->send(new CreditNoteSent($creditNote, $this->pdfService));

            Log::info("Credit note {$creditNote->credit_note_number} sent to {$email}");
            return true;
        } catch (\Exception $e) {
            Log::error("Failed to send credit note {$creditNote->credit_note_number}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Send payment received confirmation
     */
    public function sendPaymentReceived(
        Invoice $invoice,
        float $amount,
        ?string $paymentMethod = null,
        ?string $recipientEmail = null
    ): bool {
        try {
            $email = $recipientEmail ?: $invoice->client->email;

            if (!$email) {
                Log::warning("No email address for client {$invoice->client->id}");
                return false;
            }

            Mail::to($email)->send(new PaymentReceived($invoice, $amount, $paymentMethod));

            Log::info("Payment confirmation sent for invoice {$invoice->invoice_number} to {$email}");
            return true;
        } catch (\Exception $e) {
            Log::error("Failed to send payment confirmation for invoice {$invoice->invoice_number}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Send invoice reminder
     */
    public function sendInvoiceReminder(Invoice $invoice, ?string $recipientEmail = null): bool
    {
        try {
            $email = $recipientEmail ?: $invoice->client->email;

            if (!$email) {
                Log::warning("No email address for client {$invoice->client->id}");
                return false;
            }

            $daysOverdue = 0;
            if ($invoice->due_date && now()->greaterThan($invoice->due_date)) {
                $daysOverdue = now()->diffInDays($invoice->due_date);
            }

            Mail::to($email)->send(new InvoiceReminder($invoice, $this->pdfService, $daysOverdue));

            Log::info("Invoice reminder sent for {$invoice->invoice_number} to {$email}");
            return true;
        } catch (\Exception $e) {
            Log::error("Failed to send invoice reminder for {$invoice->invoice_number}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Queue invoice email for async sending
     */
    public function queueInvoice(Invoice $invoice, ?string $recipientEmail = null): void
    {
        $email = $recipientEmail ?: $invoice->client->email;

        if ($email) {
            Mail::to($email)->queue(new InvoiceSent($invoice, $this->pdfService));
        }
    }

    /**
     * Queue quote email for async sending
     */
    public function queueQuote(Quote $quote, ?string $recipientEmail = null): void
    {
        $email = $recipientEmail ?: $quote->client->email;

        if ($email) {
            Mail::to($email)->queue(new QuoteSent($quote, $this->pdfService));
        }
    }

    /**
     * Queue credit note email for async sending
     */
    public function queueCreditNote(CreditNote $creditNote, ?string $recipientEmail = null): void
    {
        $email = $recipientEmail ?: $creditNote->client->email;

        if ($email) {
            Mail::to($email)->queue(new CreditNoteSent($creditNote, $this->pdfService));
        }
    }

    /**
     * Queue payment received confirmation for async sending
     */
    public function queuePaymentReceived(
        Invoice $invoice,
        float $amount,
        ?string $paymentMethod = null,
        ?string $recipientEmail = null
    ): void {
        $email = $recipientEmail ?: $invoice->client->email;

        if ($email) {
            Mail::to($email)->queue(new PaymentReceived($invoice, $amount, $paymentMethod));
            Log::info("Payment confirmation queued for invoice {$invoice->invoice_number} to {$email}");
        }
    }
}
