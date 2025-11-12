<?php

namespace Tests\Feature;

use App\Jobs\SendTransactionalEmailJob;
use App\Models\Client;
use App\Models\CreditNote;
use App\Models\Invoice;
use App\Models\Quote;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\Queue;
use App\Models\Payment;
use Tests\TestCase;

class TransactionalEmailJobTest extends TestCase
{
    use DatabaseMigrations;

    private Tenant $tenant;
    private User $user;
    private Client $client;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::factory()->create();
        $this->user = User::factory()->create([
            'tenant_id' => $this->tenant->id,
        ]);
        $this->client = Client::factory()->create([
            'tenant_id' => $this->tenant->id,
            'created_by' => $this->user->id,
        ]);

        Payment::unsetEventDispatcher();
    }

    public function test_invoice_send_dispatches_job(): void
    {
        Queue::fake();
        $invoice = $this->createInvoice();

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/invoices/{$invoice->id}/send");

        $response->assertOk();

        Queue::assertPushed(SendTransactionalEmailJob::class, function (SendTransactionalEmailJob $job) use ($invoice) {
            return $job->action === 'invoice' && $job->entityId === $invoice->id;
        });

        $this->assertEquals('sent', $invoice->fresh()->status);
    }

    public function test_invoice_reminder_dispatches_job(): void
    {
        Queue::fake();
        $invoice = $this->createInvoice(['status' => 'sent']);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/invoices/{$invoice->id}/send-reminder");

        $response->assertOk();

        Queue::assertPushed(SendTransactionalEmailJob::class, function (SendTransactionalEmailJob $job) use ($invoice) {
            return $job->action === 'invoice_reminder' && $job->entityId === $invoice->id;
        });
    }

    public function test_mark_as_paid_dispatches_payment_confirmation_job(): void
    {
        Queue::fake();
        $invoice = $this->createInvoice(['status' => 'sent']);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/invoices/{$invoice->id}/mark-paid", [
                'paid_amount' => 120,
                'payment_method' => 'bank_transfer',
                'send_confirmation' => true,
            ]);

        $response->assertOk();

        Queue::assertPushed(SendTransactionalEmailJob::class, function (SendTransactionalEmailJob $job) use ($invoice) {
            return $job->action === 'payment_received' && $job->entityId === $invoice->id;
        });
    }

    public function test_quote_send_dispatches_job(): void
    {
        Queue::fake();
        $quote = $this->createQuote();

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/quotes/{$quote->id}/send");

        $response->assertOk();

        Queue::assertPushed(SendTransactionalEmailJob::class, function (SendTransactionalEmailJob $job) use ($quote) {
            return $job->action === 'quote' && $job->entityId === $quote->id;
        });
    }

    public function test_credit_note_send_dispatches_job(): void
    {
        Queue::fake();
        $invoice = $this->createInvoice(['status' => 'sent']);
        $creditNote = CreditNote::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'invoice_id' => $invoice->id,
            'status' => 'draft',
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/credit-notes/{$creditNote->id}/send");

        $response->assertOk();

        Queue::assertPushed(SendTransactionalEmailJob::class, function (SendTransactionalEmailJob $job) use ($creditNote) {
            return $job->action === 'credit_note' && $job->entityId === $creditNote->id;
        });
    }

    private function createInvoice(array $overrides = []): Invoice
    {
        return Invoice::factory()->create(array_merge([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'status' => 'draft',
            'subtotal' => 100,
            'tax_amount' => 20,
            'total' => 120,
            'balance_due' => 120,
            'created_by' => $this->user->id,
        ], $overrides));
    }

    private function createQuote(): Quote
    {
        return Quote::create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'quote_number' => 'Q-' . uniqid(),
            'sequence_number' => 1,
            'quote_date' => now()->toDateString(),
            'valid_until' => now()->addDays(15)->toDateString(),
            'status' => 'draft',
            'subtotal' => 100,
            'tax_amount' => 20,
            'total' => 120,
            'currency' => 'EUR',
            'created_by' => $this->user->id,
        ]);
    }
}
