<?php

namespace Tests\Unit;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PdpSubmission;
use App\Models\SupplierInvoice;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\PaymentReceived;
use App\Notifications\PdpSubmissionAccepted;
use App\Notifications\PdpSubmissionRejected;
use App\Notifications\SupplierInvoiceReceived;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationsTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;
    private Client $client;
    private Invoice $invoice;
    private Payment $payment;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::factory()->create();
        $this->user = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'user@test.com',
            'language' => 'fr',
        ]);
        $this->client = Client::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'invoice_number' => 'INV-2024-001',
            'total' => 1200,
        ]);
        $this->payment = Payment::factory()->create([
            'invoice_id' => $this->invoice->id,
            'tenant_id' => $this->tenant->id,
            'amount' => 1200,
            'currency' => 'EUR',
            'payment_method' => 'bank_transfer',
        ]);

        $this->actingAs($this->user);
    }

    /** @test */
    public function payment_received_notification_has_correct_channels()
    {
        $notification = new PaymentReceived($this->payment, $this->invoice);

        $channels = $notification->via($this->user);

        $this->assertIsArray($channels);
        $this->assertContains('mail', $channels);
        $this->assertContains('database', $channels);
        $this->assertContains('push', $channels);
    }

    /** @test */
    public function payment_received_notification_creates_mail()
    {
        $notification = new PaymentReceived($this->payment, $this->invoice);

        $mail = $notification->toMail($this->user);

        $this->assertNotNull($mail);
    }

    /** @test */
    public function payment_received_notification_creates_database_entry()
    {
        $notification = new PaymentReceived($this->payment, $this->invoice);

        $data = $notification->toDatabase($this->user);

        $this->assertIsArray($data);
        $this->assertArrayHasKey('title', $data);
        $this->assertArrayHasKey('message', $data);
        $this->assertArrayHasKey('type', $data);
        $this->assertEquals('payment_received', $data['type']);
        $this->assertEquals('credit-card', $data['icon']);
        $this->assertEquals('green', $data['color']);
    }

    /** @test */
    public function payment_received_notification_includes_payment_data()
    {
        $notification = new PaymentReceived($this->payment, $this->invoice);

        $data = $notification->toDatabase($this->user);

        $this->assertArrayHasKey('data', $data);
        $this->assertEquals($this->payment->id, $data['data']['payment_id']);
        $this->assertEquals($this->invoice->id, $data['data']['invoice_id']);
        $this->assertEquals($this->invoice->invoice_number, $data['data']['invoice_number']);
        $this->assertEquals($this->payment->amount, $data['data']['amount']);
        $this->assertEquals($this->payment->currency, $data['data']['currency']);
    }

    /** @test */
    public function payment_received_notification_creates_push_notification()
    {
        $notification = new PaymentReceived($this->payment, $this->invoice);

        $push = $notification->toPush($this->user);

        $this->assertIsArray($push);
        $this->assertArrayHasKey('title', $push);
        $this->assertArrayHasKey('body', $push);
        $this->assertArrayHasKey('data', $push);
        $this->assertEquals('payment_received', $push['data']['type']);
    }

    /** @test */
    public function payment_received_notification_supports_french()
    {
        $this->user->update(['language' => 'fr']);
        $notification = new PaymentReceived($this->payment, $this->invoice);

        $data = $notification->toDatabase($this->user);

        $this->assertStringContainsString('Paiement reçu', $data['title']);
        $this->assertStringContainsString('paiement', strtolower($data['message']));
    }

    /** @test */
    public function payment_received_notification_supports_english()
    {
        $this->user->update(['language' => 'en']);
        $notification = new PaymentReceived($this->payment, $this->invoice);

        $data = $notification->toDatabase($this->user);

        $this->assertStringContainsString('Payment Received', $data['title']);
        $this->assertStringContainsString('payment', strtolower($data['message']));
    }

    /** @test */
    public function payment_received_notification_supports_spanish()
    {
        $this->user->update(['language' => 'es']);
        $notification = new PaymentReceived($this->payment, $this->invoice);

        $data = $notification->toDatabase($this->user);

        $this->assertStringContainsString('Pago recibido', $data['title']);
        $this->assertStringContainsString('pago', strtolower($data['message']));
    }

    /** @test */
    public function payment_received_notification_defaults_to_french()
    {
        $this->user->update(['language' => null]);
        $notification = new PaymentReceived($this->payment, $this->invoice);

        $data = $notification->toDatabase($this->user);

        $this->assertNotEmpty($data['title']);
    }

    /** @test */
    public function payment_received_notification_includes_action_url()
    {
        $notification = new PaymentReceived($this->payment, $this->invoice);

        $data = $notification->toDatabase($this->user);

        $this->assertArrayHasKey('action_url', $data);
        $this->assertEquals("/invoices/{$this->invoice->id}", $data['action_url']);
    }

    /** @test */
    public function pdp_submission_accepted_notification_has_correct_type()
    {
        $submission = PdpSubmission::factory()->create([
            'tenant_id' => $this->tenant->id,
            'invoice_id' => $this->invoice->id,
            'status' => 'accepted',
        ]);

        $notification = new PdpSubmissionAccepted($submission);

        $data = $notification->toDatabase($this->user);

        $this->assertEquals('pdp_accepted', $data['type']);
        $this->assertEquals('check-circle', $data['icon']);
        $this->assertEquals('green', $data['color']);
    }

    /** @test */
    public function pdp_submission_rejected_notification_has_correct_type()
    {
        $submission = PdpSubmission::factory()->create([
            'tenant_id' => $this->tenant->id,
            'invoice_id' => $this->invoice->id,
            'status' => 'rejected',
            'rejection_reason' => 'Invalid data',
        ]);

        $notification = new PdpSubmissionRejected($submission);

        $data = $notification->toDatabase($this->user);

        $this->assertEquals('pdp_rejected', $data['type']);
        $this->assertEquals('x-circle', $data['icon']);
        $this->assertEquals('red', $data['color']);
    }

    /** @test */
    public function supplier_invoice_received_notification_has_correct_type()
    {
        $supplierInvoice = SupplierInvoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'supplier_name' => 'Supplier ABC',
            'invoice_number' => 'SUPP-001',
            'total' => 500,
        ]);

        $notification = new SupplierInvoiceReceived($supplierInvoice);

        $data = $notification->toDatabase($this->user);

        $this->assertEquals('supplier_invoice', $data['type']);
        $this->assertEquals('file-text', $data['icon']);
        $this->assertEquals('blue', $data['color']);
    }

    /** @test */
    public function notifications_implement_should_queue()
    {
        $notification = new PaymentReceived($this->payment, $this->invoice);

        $this->assertInstanceOf(\Illuminate\Contracts\Queue\ShouldQueue::class, $notification);
    }

    /** @test */
    public function notifications_use_queueable_trait()
    {
        $notification = new PaymentReceived($this->payment, $this->invoice);

        $reflection = new \ReflectionClass($notification);
        $traits = $reflection->getTraitNames();

        $this->assertContains('Illuminate\Bus\Queueable', $traits);
    }

    /** @test */
    public function payment_notification_formats_amount_correctly()
    {
        $this->payment->update(['amount' => 1234.56]);
        $notification = new PaymentReceived($this->payment, $this->invoice);

        $data = $notification->toDatabase($this->user);

        $this->assertStringContainsString('1234.56', $data['message']);
    }

    /** @test */
    public function payment_notification_includes_invoice_number()
    {
        $notification = new PaymentReceived($this->payment, $this->invoice);

        $data = $notification->toDatabase($this->user);

        $this->assertStringContainsString($this->invoice->invoice_number, $data['message']);
    }

    /** @test */
    public function push_notification_has_compact_message()
    {
        $notification = new PaymentReceived($this->payment, $this->invoice);

        $push = $notification->toPush($this->user);

        $this->assertLessThan(100, strlen($push['body']));
        $this->assertStringContainsString((string)$this->payment->amount, $push['body']);
    }

    /** @test */
    public function notification_handles_missing_language()
    {
        $userWithoutLanguage = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'language' => null,
        ]);

        $notification = new PaymentReceived($this->payment, $this->invoice);

        $data = $notification->toDatabase($userWithoutLanguage);

        $this->assertNotEmpty($data['title']);
        $this->assertNotEmpty($data['message']);
    }
}
