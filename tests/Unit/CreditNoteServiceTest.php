<?php

namespace Tests\Unit;

use App\Models\Client;
use App\Models\CreditNote;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Tenant;
use App\Models\User;
use App\Services\CreditNoteService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CreditNoteServiceTest extends TestCase
{
    use RefreshDatabase;

    private CreditNoteService $service;
    private Tenant $tenant;
    private Client $client;
    private User $user;
    private Invoice $invoice;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->service = app(CreditNoteService::class);
        
        // Create test data
        $this->tenant = Tenant::factory()->create();
        $this->user = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->client = Client::factory()->create(['tenant_id' => $this->tenant->id]);
        
        $this->invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'invoice_number' => 'TEST-001',
            'date' => now(),
            'status' => 'sent',
            'subtotal' => 100,
            'tax_amount' => 20,
            'total' => 120,
        ]);

        // Add items
        InvoiceItem::factory()->create([
            'invoice_id' => $this->invoice->id,
            'description' => 'Service A',
            'quantity' => 2,
            'unit_price' => 50,
            'tax_rate' => 20,
        ]);

        $this->actingAs($this->user);
    }

    /** @test */
    public function it_can_create_full_credit_note_from_invoice()
    {
        $creditNote = $this->service->createFromInvoice(
            $this->invoice,
            [],
            fullCredit: true,
            reason: 'Test full credit'
        );

        $this->assertInstanceOf(CreditNote::class, $creditNote);
        $this->assertEquals($this->invoice->id, $creditNote->invoice_id);
        $this->assertEquals($this->invoice->total, $creditNote->total);
        $this->assertEquals('Test full credit', $creditNote->reason);
        $this->assertEquals('draft', $creditNote->status);
    }

    /** @test */
    public function it_can_cancel_invoice_with_credit_note()
    {
        $creditNote = $this->service->cancelInvoice(
            $this->invoice,
            'Invoice cancelled for testing'
        );

        $this->assertInstanceOf(CreditNote::class, $creditNote);
        $this->assertEquals('issued', $creditNote->status);
        
        $this->invoice->refresh();
        $this->assertEquals('cancelled', $this->invoice->status);
        $this->assertNotNull($this->invoice->cancelled_at);
    }

    /** @test */
    public function it_validates_credit_creation_on_draft_invoice()
    {
        $this->invoice->update(['status' => 'draft']);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('brouillon');

        $this->service->createFromInvoice($this->invoice, [], true, 'Test');
    }

    /** @test */
    public function it_validates_credit_amount_does_not_exceed_remaining()
    {
        // Create a first credit note
        $firstCredit = $this->service->createFromInvoice(
            $this->invoice,
            [],
            true,
            'First credit'
        );
        $firstCredit->markAsIssued();

        // Try to create another full credit
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('déjà entièrement créditée');

        $this->service->createFromInvoice($this->invoice, [], true, 'Second credit');
    }

    /** @test */
    public function it_creates_audit_log_when_creating_credit_note()
    {
        $creditNote = $this->service->createFromInvoice(
            $this->invoice,
            [],
            true,
            'Test audit'
        );

        $auditLogs = $this->invoice->auditLogs;
        
        $this->assertGreaterThan(0, $auditLogs->count());
        
        $lastLog = $auditLogs->last();
        $this->assertEquals('modified', $lastLog->action);
        $this->assertArrayHasKey('credit_note_id', $lastLog->changes);
        $this->assertEquals($creditNote->id, $lastLog->changes['credit_note_id']);
    }

    /** @test */
    public function it_copies_all_items_for_full_credit()
    {
        $creditNote = $this->service->createFromInvoice(
            $this->invoice,
            [],
            true,
            'Test items'
        );

        $this->assertEquals(
            $this->invoice->items->count(),
            $creditNote->items->count()
        );

        $invoiceItem = $this->invoice->items->first();
        $creditItem = $creditNote->items->first();

        $this->assertEquals($invoiceItem->description, $creditItem->description);
        $this->assertEquals($invoiceItem->quantity, $creditItem->quantity);
        $this->assertEquals($invoiceItem->unit_price, $creditItem->unit_price);
    }

    /** @test */
    public function it_cannot_cancel_already_cancelled_invoice()
    {
        $this->invoice->update([
            'status' => 'cancelled',
            'cancelled_at' => now()
        ]);

        $this->expectException(\Exception::class);

        $this->service->cancelInvoice($this->invoice, 'Test');
    }

    /** @test */
    public function it_generates_credit_note_number_sequentially()
    {
        $credit1 = $this->service->createFromInvoice($this->invoice, [], true, 'Test 1');
        
        // Create another invoice and credit
        $invoice2 = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'status' => 'sent',
            'total' => 50,
        ]);
        
        $credit2 = $this->service->createFromInvoice($invoice2, [], true, 'Test 2');

        $this->assertStringStartsWith('CN-', $credit1->credit_note_number);
        $this->assertStringStartsWith('CN-', $credit2->credit_note_number);
        
        // Extract numbers
        $num1 = (int) substr($credit1->credit_note_number, 3);
        $num2 = (int) substr($credit2->credit_note_number, 3);
        
        $this->assertEquals($num1 + 1, $num2);
    }
}
