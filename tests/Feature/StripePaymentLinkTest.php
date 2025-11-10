<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Tenant;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Services\StripePaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class StripePaymentLinkTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Tenant $tenant;
    private Client $client;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::factory()->create([
            'stripe_enabled' => true,
            'stripe_publishable_key' => 'pk_test_123456789',
            'stripe_secret_key' => encrypt('sk_test_123456789'),
            'stripe_webhook_secret' => encrypt('whsec_123456789'),
        ]);

        $this->user = User::factory()->create([
            'tenant_id' => $this->tenant->id,
        ]);

        $this->client = Client::factory()->create([
            'tenant_id' => $this->tenant->id,
        ]);
    }

    public function test_stripe_payment_link_created_on_invoice_send()
    {
        // Create invoice
        $invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'status' => 'draft',
        ]);

        \App\Models\InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'description' => 'Test Item',
            'quantity' => 1,
            'unit_price' => 100,
            'total' => 100,
            'tax_rate' => 20,
        ]);

        $invoice->update([
            'subtotal' => 100,
            'tax_amount' => 20,
            'total' => 120,
        ]);

        // Mock Stripe service to avoid real API calls
        $mockStripeService = $this->createMock(StripePaymentService::class);
        $mockSession = new \stdClass();
        $mockSession->url = 'https://checkout.stripe.com/pay/test_session_123';
        $mockSession->id = 'cs_test_123';
        $mockSession->payment_intent = 'pi_test_123';

        $mockStripeService->expects($this->once())
            ->method('setTenant')
            ->with($this->tenant);

        $mockStripeService->expects($this->once())
            ->method('createCheckoutSession')
            ->willReturn($mockSession);

        // Bind mock to service container
        $this->app->instance(StripePaymentService::class, $mockStripeService);

        // Send invoice
        $response = $this->actingAs($this->user)
            ->postJson("/api/invoices/{$invoice->id}/send");

        $response->assertStatus(200);

        // Verify payment link was created
        $invoice->refresh();
        $this->assertEquals('https://checkout.stripe.com/pay/test_session_123', $invoice->stripe_payment_link);
        $this->assertEquals('cs_test_123', $invoice->stripe_checkout_session_id);

        // Verify payment record was created
        $this->assertDatabaseHas('payments', [
            'invoice_id' => $invoice->id,
            'stripe_payment_intent_id' => 'pi_test_123',
            'amount' => 120,
            'status' => 'pending',
        ]);
    }

    public function test_stripe_payment_link_in_pdf()
    {
        // Create invoice with payment link
        $invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'status' => 'sent',
            'stripe_payment_link' => 'https://checkout.stripe.com/pay/test_session_123',
        ]);

        \App\Models\InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'description' => 'Test Item',
            'quantity' => 1,
            'unit_price' => 100,
            'total' => 100,
            'tax_rate' => 20,
        ]);

        $invoice->update([
            'subtotal' => 100,
            'tax_amount' => 20,
            'total' => 120,
        ]);

        // Generate PDF content
        $pdfContent = $this->actingAs($this->user)
            ->get("/api/invoices/{$invoice->id}/pdf")
            ->assertStatus(200)
            ->getContent();

        // Verify payment link is in PDF
        $this->assertStringContainsString('https://checkout.stripe.com/pay/test_session_123', $pdfContent);
        $this->assertStringContainsString('Payer cette facture en ligne', $pdfContent);
        $this->assertStringContainsString('Paiement sécurisé par carte bancaire', $pdfContent);
    }

    public function test_stripe_payment_link_not_shown_for_paid_invoice()
    {
        // Create paid invoice with payment link
        $invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'status' => 'paid',
            'stripe_payment_link' => 'https://checkout.stripe.com/pay/test_session_123',
        ]);

        \App\Models\InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'description' => 'Test Item',
            'quantity' => 1,
            'unit_price' => 100,
            'total' => 100,
            'tax_rate' => 20,
        ]);

        $invoice->update([
            'subtotal' => 100,
            'tax_amount' => 20,
            'total' => 120,
        ]);

        // Generate PDF content
        $pdfContent = $this->actingAs($this->user)
            ->get("/api/invoices/{$invoice->id}/pdf")
            ->assertStatus(200)
            ->getContent();

        // Verify payment link is NOT in PDF for paid invoice
        $this->assertStringNotContainsString('https://checkout.stripe.com/pay/test_session_123', $pdfContent);
        $this->assertStringNotContainsString('Payer cette facture en ligne', $pdfContent);
    }

    public function test_stripe_payment_link_not_created_when_stripe_disabled()
    {
        // Disable Stripe for tenant
        $this->tenant->update(['stripe_enabled' => false]);

        // Create invoice
        $invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'status' => 'draft',
        ]);

        \App\Models\InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'description' => 'Test Item',
            'quantity' => 1,
            'unit_price' => 100,
            'total' => 100,
            'tax_rate' => 20,
        ]);

        $invoice->update([
            'subtotal' => 100,
            'tax_amount' => 20,
            'total' => 120,
        ]);

        // Send invoice
        $response = $this->actingAs($this->user)
            ->postJson("/api/invoices/{$invoice->id}/send");

        $response->assertStatus(200);

        // Verify payment link was NOT created
        $invoice->refresh();
        $this->assertNull($invoice->stripe_payment_link);
        $this->assertNull($invoice->stripe_checkout_session_id);

        // Verify no payment record was created
        $this->assertDatabaseMissing('payments', [
            'invoice_id' => $invoice->id,
        ]);
    }

    public function test_stripe_error_does_not_prevent_invoice_send()
    {
        // Create invoice
        $invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'status' => 'draft',
        ]);

        \App\Models\InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'description' => 'Test Item',
            'quantity' => 1,
            'unit_price' => 100,
            'total' => 100,
            'tax_rate' => 20,
        ]);

        $invoice->update([
            'subtotal' => 100,
            'tax_amount' => 20,
            'total' => 120,
        ]);

        // Mock Stripe service to throw exception
        $mockStripeService = $this->createMock(StripePaymentService::class);
        $mockStripeService->expects($this->once())
            ->method('setTenant')
            ->willThrowException(new \Exception('Stripe API error'));

        $this->app->instance(StripePaymentService::class, $mockStripeService);

        // Send invoice - should still succeed despite Stripe error
        $response = $this->actingAs($this->user)
            ->postJson("/api/invoices/{$invoice->id}/send");

        $response->assertStatus(200);

        // Verify invoice status changed to sent
        $invoice->refresh();
        $this->assertEquals('sent', $invoice->status);

        // Verify payment link was NOT created due to error
        $this->assertNull($invoice->stripe_payment_link);
    }
}