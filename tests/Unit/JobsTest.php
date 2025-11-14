<?php

namespace Tests\Unit;

use App\Jobs\SendTransactionalEmailJob;
use App\Models\Client;
use App\Models\CreditNote;
use App\Models\Invoice;
use App\Models\Quote;
use App\Models\Tenant;
use App\Models\User;
use App\Services\EmailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class JobsTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;
    private Client $client;
    private Invoice $invoice;
    private Quote $quote;
    private CreditNote $creditNote;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::factory()->create();
        $this->user = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->client = Client::factory()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'client@test.com',
        ]);

        $this->invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'invoice_number' => 'INV-001',
        ]);

        $this->quote = Quote::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'quote_number' => 'QTE-001',
        ]);

        $this->creditNote = CreditNote::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'invoice_id' => $this->invoice->id,
            'credit_note_number' => 'CN-001',
        ]);

        $this->actingAs($this->user);
    }

    /** @test */
    public function send_transactional_email_job_can_be_instantiated()
    {
        $job = new SendTransactionalEmailJob('invoice', $this->invoice->id);

        $this->assertInstanceOf(SendTransactionalEmailJob::class, $job);
        $this->assertEquals('invoice', $job->action);
        $this->assertEquals($this->invoice->id, $job->entityId);
    }

    /** @test */
    public function send_transactional_email_job_accepts_recipient_email()
    {
        $job = new SendTransactionalEmailJob('invoice', $this->invoice->id, [], 'custom@email.com');

        $this->assertEquals('custom@email.com', $job->recipientEmail);
    }

    /** @test */
    public function send_transactional_email_job_accepts_payload()
    {
        $payload = ['key' => 'value'];
        $job = new SendTransactionalEmailJob('invoice', $this->invoice->id, $payload);

        $this->assertEquals($payload, $job->payload);
    }

    /** @test */
    public function send_transactional_email_job_implements_should_queue()
    {
        $job = new SendTransactionalEmailJob('invoice', $this->invoice->id);

        $this->assertInstanceOf(\Illuminate\Contracts\Queue\ShouldQueue::class, $job);
    }

    /** @test */
    public function send_transactional_email_job_uses_required_traits()
    {
        $job = new SendTransactionalEmailJob('invoice', $this->invoice->id);

        $reflection = new \ReflectionClass($job);
        $traits = $reflection->getTraitNames();

        $this->assertContains('Illuminate\Bus\Queueable', $traits);
        $this->assertContains('Illuminate\Queue\InteractsWithQueue', $traits);
        $this->assertContains('Illuminate\Queue\SerializesModels', $traits);
        $this->assertContains('Illuminate\Foundation\Bus\Dispatchable', $traits);
    }

    /** @test */
    public function send_transactional_email_job_can_be_dispatched()
    {
        Queue::fake();

        SendTransactionalEmailJob::dispatch('invoice', $this->invoice->id);

        Queue::assertPushed(SendTransactionalEmailJob::class);
    }

    /** @test */
    public function send_transactional_email_job_handles_invoice_action()
    {
        $emailService = $this->mock(EmailService::class);
        $emailService->shouldReceive('sendInvoice')
            ->once()
            ->with(\Mockery::type(Invoice::class), null);

        $job = new SendTransactionalEmailJob('invoice', $this->invoice->id);
        $job->handle($emailService);
    }

    /** @test */
    public function send_transactional_email_job_handles_quote_action()
    {
        $emailService = $this->mock(EmailService::class);
        $emailService->shouldReceive('sendQuote')
            ->once()
            ->with(\Mockery::type(Quote::class), null);

        $job = new SendTransactionalEmailJob('quote', $this->quote->id);
        $job->handle($emailService);
    }

    /** @test */
    public function send_transactional_email_job_handles_credit_note_action()
    {
        $emailService = $this->mock(EmailService::class);
        $emailService->shouldReceive('sendCreditNote')
            ->once()
            ->with(\Mockery::type(CreditNote::class), null);

        $job = new SendTransactionalEmailJob('credit_note', $this->creditNote->id);
        $job->handle($emailService);
    }

    /** @test */
    public function send_transactional_email_job_logs_warning_for_unknown_action()
    {
        Log::shouldReceive('warning')
            ->once()
            ->withArgs(function ($message, $context) {
                return str_contains($message, 'Unknown transactional email action')
                    && $context['action'] === 'unknown_action';
            });

        $emailService = $this->mock(EmailService::class);

        $job = new SendTransactionalEmailJob('unknown_action', 999);
        $job->handle($emailService);
    }

    /** @test */
    public function send_transactional_email_job_handles_missing_invoice()
    {
        Log::shouldReceive('warning')
            ->once()
            ->withArgs(function ($message, $context) {
                return str_contains($message, 'Invoice not found');
            });

        $emailService = $this->mock(EmailService::class);
        $emailService->shouldNotReceive('sendInvoice');

        $job = new SendTransactionalEmailJob('invoice', 99999);
        $job->handle($emailService);
    }

    /** @test */
    public function send_transactional_email_job_handles_missing_quote()
    {
        Log::shouldReceive('warning')
            ->once()
            ->withArgs(function ($message) {
                return str_contains($message, 'Quote not found');
            });

        $emailService = $this->mock(EmailService::class);
        $emailService->shouldNotReceive('sendQuote');

        $job = new SendTransactionalEmailJob('quote', 99999);
        $job->handle($emailService);
    }

    /** @test */
    public function send_transactional_email_job_handles_missing_credit_note()
    {
        Log::shouldReceive('warning')
            ->once()
            ->withArgs(function ($message) {
                return str_contains($message, 'CreditNote not found');
            });

        $emailService = $this->mock(EmailService::class);
        $emailService->shouldNotReceive('sendCreditNote');

        $job = new SendTransactionalEmailJob('credit_note', 99999);
        $job->handle($emailService);
    }

    /** @test */
    public function send_transactional_email_job_logs_error_on_exception()
    {
        Log::shouldReceive('error')
            ->once()
            ->withArgs(function ($message, $context) {
                return str_contains($message, 'Transactional email job failed')
                    && isset($context['action'])
                    && isset($context['entity_id'])
                    && isset($context['message']);
            });

        $emailService = $this->mock(EmailService::class);
        $emailService->shouldReceive('sendInvoice')
            ->andThrow(new \Exception('Test exception'));

        $job = new SendTransactionalEmailJob('invoice', $this->invoice->id);

        $this->expectException(\Exception::class);
        $job->handle($emailService);
    }

    /** @test */
    public function send_transactional_email_job_rethrows_exception()
    {
        Log::shouldReceive('error');

        $emailService = $this->mock(EmailService::class);
        $emailService->shouldReceive('sendInvoice')
            ->andThrow(new \RuntimeException('Service error'));

        $job = new SendTransactionalEmailJob('invoice', $this->invoice->id);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Service error');
        $job->handle($emailService);
    }

    /** @test */
    public function send_transactional_email_job_with_custom_recipient()
    {
        $emailService = $this->mock(EmailService::class);
        $emailService->shouldReceive('sendInvoice')
            ->once()
            ->with(\Mockery::type(Invoice::class), 'custom@email.com');

        $job = new SendTransactionalEmailJob('invoice', $this->invoice->id, [], 'custom@email.com');
        $job->handle($emailService);
    }

    /** @test */
    public function send_transactional_email_job_loads_relations()
    {
        $emailService = $this->mock(EmailService::class);
        $emailService->shouldReceive('sendInvoice')
            ->once()
            ->with(\Mockery::on(function ($invoice) {
                return $invoice->relationLoaded('client');
            }), null);

        $job = new SendTransactionalEmailJob('invoice', $this->invoice->id);
        $job->handle($emailService);
    }

    /** @test */
    public function multiple_jobs_can_be_dispatched()
    {
        Queue::fake();

        SendTransactionalEmailJob::dispatch('invoice', $this->invoice->id);
        SendTransactionalEmailJob::dispatch('quote', $this->quote->id);
        SendTransactionalEmailJob::dispatch('credit_note', $this->creditNote->id);

        Queue::assertPushed(SendTransactionalEmailJob::class, 3);
    }

    /** @test */
    public function job_serializes_and_unserializes_correctly()
    {
        $job = new SendTransactionalEmailJob('invoice', $this->invoice->id, ['test' => 'data']);

        $serialized = serialize($job);
        $unserialized = unserialize($serialized);

        $this->assertEquals($job->action, $unserialized->action);
        $this->assertEquals($job->entityId, $unserialized->entityId);
        $this->assertEquals($job->payload, $unserialized->payload);
    }
}
