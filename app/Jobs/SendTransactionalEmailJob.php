<?php

namespace App\Jobs;

use App\Models\CreditNote;
use App\Models\Invoice;
use App\Models\Quote;
use App\Services\EmailService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendTransactionalEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public string $action,
        public int $entityId,
        public array $payload = [],
        public ?string $recipientEmail = null
    ) {
        $this->onQueue(config('queue.mail.queue', 'emails'));

        if ($connection = config('queue.mail.connection')) {
            $this->onConnection($connection);
        }
    }

    /**
     * Execute the job.
     */
    public function handle(EmailService $emailService): void
    {
        try {
            match ($this->action) {
                'invoice' => $this->sendInvoice($emailService),
                'invoice_reminder' => $this->sendInvoiceReminder($emailService),
                'quote' => $this->sendQuote($emailService),
                'credit_note' => $this->sendCreditNote($emailService),
                'payment_received' => $this->sendPaymentConfirmation($emailService),
                default => Log::warning('Unknown transactional email action', [
                    'action' => $this->action,
                    'entity_id' => $this->entityId,
                ]),
            };
        } catch (\Throwable $throwable) {
            Log::error('Transactional email job failed', [
                'action' => $this->action,
                'entity_id' => $this->entityId,
                'message' => $throwable->getMessage(),
            ]);

            throw $throwable;
        }
    }

    private function sendInvoice(EmailService $emailService): void
    {
        $invoice = Invoice::with('client')->find($this->entityId);

        if (!$invoice) {
            Log::warning('Invoice not found for transactional email', ['id' => $this->entityId]);
            return;
        }

        $emailService->sendInvoice($invoice, $this->recipientEmail);
    }

    private function sendInvoiceReminder(EmailService $emailService): void
    {
        $invoice = Invoice::with('client')->find($this->entityId);

        if (!$invoice) {
            Log::warning('Invoice not found for reminder email', ['id' => $this->entityId]);
            return;
        }

        $emailService->sendInvoiceReminder($invoice, $this->recipientEmail);
    }

    private function sendQuote(EmailService $emailService): void
    {
        $quote = Quote::with(['client', 'tenant'])->find($this->entityId);

        if (!$quote) {
            Log::warning('Quote not found for transactional email', ['id' => $this->entityId]);
            return;
        }

        $emailService->sendQuote($quote, $this->recipientEmail);
    }

    private function sendCreditNote(EmailService $emailService): void
    {
        $creditNote = CreditNote::with(['client', 'invoice'])->find($this->entityId);

        if (!$creditNote) {
            Log::warning('Credit note not found for transactional email', ['id' => $this->entityId]);
            return;
        }

        $emailService->sendCreditNote($creditNote, $this->recipientEmail);
    }

    private function sendPaymentConfirmation(EmailService $emailService): void
    {
        $invoice = Invoice::with('client')->find($this->entityId);

        if (!$invoice) {
            Log::warning('Invoice not found for payment confirmation email', ['id' => $this->entityId]);
            return;
        }

        $emailService->sendPaymentReceived(
            $invoice,
            (float) ($this->payload['amount'] ?? $invoice->total),
            $this->payload['payment_method'] ?? null,
            $this->recipientEmail
        );
    }
}
