<?php

namespace Tests\Unit;

use App\Models\Client;
use App\Models\CreditNote;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\Project;
use App\Models\Quote;
use App\Models\QuoteItem;
use App\Models\Task;
use App\Models\Tenant;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModelTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;
    private Client $client;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::factory()->create();
        $this->user = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->client = Client::factory()->create(['tenant_id' => $this->tenant->id]);

        $this->actingAs($this->user);
    }

    /** @test */
    public function invoice_belongs_to_tenant()
    {
        $invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
        ]);

        $this->assertInstanceOf(Tenant::class, $invoice->tenant);
        $this->assertEquals($this->tenant->id, $invoice->tenant->id);
    }

    /** @test */
    public function invoice_belongs_to_client()
    {
        $invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
        ]);

        $this->assertInstanceOf(Client::class, $invoice->client);
        $this->assertEquals($this->client->id, $invoice->client->id);
    }

    /** @test */
    public function invoice_has_many_items()
    {
        $invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
        ]);

        InvoiceItem::factory()->count(3)->create(['invoice_id' => $invoice->id]);

        $this->assertCount(3, $invoice->items);
        $this->assertInstanceOf(InvoiceItem::class, $invoice->items->first());
    }

    /** @test */
    public function invoice_has_many_payments()
    {
        $invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
        ]);

        Payment::factory()->count(2)->create([
            'invoice_id' => $invoice->id,
            'tenant_id' => $this->tenant->id,
        ]);

        $this->assertCount(2, $invoice->payments);
        $this->assertInstanceOf(Payment::class, $invoice->payments->first());
    }

    /** @test */
    public function invoice_casts_dates_correctly()
    {
        $invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'date' => '2024-01-15',
            'due_date' => '2024-02-15',
        ]);

        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $invoice->date);
        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $invoice->due_date);
    }

    /** @test */
    public function invoice_casts_decimals_correctly()
    {
        $invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'subtotal' => 100.50,
            'tax_amount' => 20.10,
            'total' => 120.60,
        ]);

        $this->assertEquals('100.50', $invoice->subtotal);
        $this->assertEquals('20.10', $invoice->tax_amount);
        $this->assertEquals('120.60', $invoice->total);
    }

    /** @test */
    public function invoice_uses_soft_deletes()
    {
        $invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
        ]);

        $invoice->delete();

        $this->assertSoftDeleted('invoices', ['id' => $invoice->id]);
        $this->assertNotNull($invoice->fresh()->deleted_at);
    }

    /** @test */
    public function payment_belongs_to_invoice()
    {
        $invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
        ]);

        $payment = Payment::factory()->create([
            'invoice_id' => $invoice->id,
            'tenant_id' => $this->tenant->id,
        ]);

        $this->assertInstanceOf(Invoice::class, $payment->invoice);
        $this->assertEquals($invoice->id, $payment->invoice->id);
    }

    /** @test */
    public function payment_belongs_to_tenant()
    {
        $invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
        ]);

        $payment = Payment::factory()->create([
            'invoice_id' => $invoice->id,
            'tenant_id' => $this->tenant->id,
        ]);

        $this->assertInstanceOf(Tenant::class, $payment->tenant);
        $this->assertEquals($this->tenant->id, $payment->tenant->id);
    }

    /** @test */
    public function quote_belongs_to_tenant_and_client()
    {
        $quote = Quote::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
        ]);

        $this->assertInstanceOf(Tenant::class, $quote->tenant);
        $this->assertInstanceOf(Client::class, $quote->client);
    }

    /** @test */
    public function quote_has_many_items()
    {
        $quote = Quote::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
        ]);

        QuoteItem::factory()->count(2)->create(['quote_id' => $quote->id]);

        $this->assertCount(2, $quote->items);
        $this->assertInstanceOf(QuoteItem::class, $quote->items->first());
    }

    /** @test */
    public function quote_uses_soft_deletes()
    {
        $quote = Quote::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
        ]);

        $quote->delete();

        $this->assertSoftDeleted('quotes', ['id' => $quote->id]);
    }

    /** @test */
    public function project_belongs_to_tenant_and_client()
    {
        $project = Project::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
        ]);

        $this->assertInstanceOf(Tenant::class, $project->tenant);
        $this->assertInstanceOf(Client::class, $project->client);
    }

    /** @test */
    public function project_has_many_tasks()
    {
        $project = Project::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
        ]);

        Task::factory()->count(3)->create([
            'project_id' => $project->id,
            'tenant_id' => $this->tenant->id,
        ]);

        $this->assertCount(3, $project->tasks);
        $this->assertInstanceOf(Task::class, $project->tasks->first());
    }

    /** @test */
    public function task_belongs_to_project()
    {
        $project = Project::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
        ]);

        $task = Task::factory()->create([
            'project_id' => $project->id,
            'tenant_id' => $this->tenant->id,
        ]);

        $this->assertInstanceOf(Project::class, $task->project);
        $this->assertEquals($project->id, $task->project->id);
    }

    /** @test */
    public function task_belongs_to_tenant()
    {
        $task = Task::factory()->create([
            'tenant_id' => $this->tenant->id,
        ]);

        $this->assertInstanceOf(Tenant::class, $task->tenant);
        $this->assertEquals($this->tenant->id, $task->tenant->id);
    }

    /** @test */
    public function task_has_many_time_entries()
    {
        $task = Task::factory()->create([
            'tenant_id' => $this->tenant->id,
        ]);

        TimeEntry::factory()->count(2)->create([
            'task_id' => $task->id,
            'user_id' => $this->user->id,
            'tenant_id' => $this->tenant->id,
        ]);

        $this->assertCount(2, $task->timeEntries);
        $this->assertInstanceOf(TimeEntry::class, $task->timeEntries->first());
    }

    /** @test */
    public function client_belongs_to_tenant()
    {
        $this->assertInstanceOf(Tenant::class, $this->client->tenant);
        $this->assertEquals($this->tenant->id, $this->client->tenant->id);
    }

    /** @test */
    public function client_has_many_invoices()
    {
        Invoice::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
        ]);

        $this->assertCount(3, $this->client->invoices);
    }

    /** @test */
    public function client_has_many_quotes()
    {
        Quote::factory()->count(2)->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
        ]);

        $this->assertCount(2, $this->client->quotes);
    }

    /** @test */
    public function client_has_many_projects()
    {
        Project::factory()->count(2)->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
        ]);

        $this->assertCount(2, $this->client->projects);
    }

    /** @test */
    public function user_belongs_to_tenant()
    {
        $this->assertInstanceOf(Tenant::class, $this->user->tenant);
        $this->assertEquals($this->tenant->id, $this->user->tenant->id);
    }

    /** @test */
    public function user_has_many_time_entries()
    {
        TimeEntry::factory()->count(3)->create([
            'user_id' => $this->user->id,
            'tenant_id' => $this->tenant->id,
        ]);

        $this->assertCount(3, $this->user->timeEntries);
    }

    /** @test */
    public function credit_note_belongs_to_invoice()
    {
        $invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
        ]);

        $creditNote = CreditNote::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'invoice_id' => $invoice->id,
        ]);

        $this->assertInstanceOf(Invoice::class, $creditNote->invoice);
        $this->assertEquals($invoice->id, $creditNote->invoice->id);
    }

    /** @test */
    public function credit_note_belongs_to_tenant_and_client()
    {
        $creditNote = CreditNote::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
        ]);

        $this->assertInstanceOf(Tenant::class, $creditNote->tenant);
        $this->assertInstanceOf(Client::class, $creditNote->client);
    }

    /** @test */
    public function expense_belongs_to_tenant()
    {
        $expense = Expense::factory()->create([
            'tenant_id' => $this->tenant->id,
        ]);

        $this->assertInstanceOf(Tenant::class, $expense->tenant);
        $this->assertEquals($this->tenant->id, $expense->tenant->id);
    }

    /** @test */
    public function time_entry_belongs_to_user_and_tenant()
    {
        $timeEntry = TimeEntry::factory()->create([
            'user_id' => $this->user->id,
            'tenant_id' => $this->tenant->id,
        ]);

        $this->assertInstanceOf(User::class, $timeEntry->user);
        $this->assertInstanceOf(Tenant::class, $timeEntry->tenant);
    }

    /** @test */
    public function time_entry_belongs_to_task()
    {
        $task = Task::factory()->create([
            'tenant_id' => $this->tenant->id,
        ]);

        $timeEntry = TimeEntry::factory()->create([
            'task_id' => $task->id,
            'user_id' => $this->user->id,
            'tenant_id' => $this->tenant->id,
        ]);

        $this->assertInstanceOf(Task::class, $timeEntry->task);
        $this->assertEquals($task->id, $timeEntry->task->id);
    }

    /** @test */
    public function tenant_has_many_users()
    {
        User::factory()->count(3)->create(['tenant_id' => $this->tenant->id]);

        $this->assertGreaterThanOrEqual(4, $this->tenant->users->count()); // +1 from setUp
    }

    /** @test */
    public function tenant_has_many_clients()
    {
        Client::factory()->count(2)->create(['tenant_id' => $this->tenant->id]);

        $this->assertGreaterThanOrEqual(3, $this->tenant->clients->count()); // +1 from setUp
    }

    /** @test */
    public function tenant_has_many_invoices()
    {
        Invoice::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
        ]);

        $this->assertCount(3, $this->tenant->invoices);
    }

    /** @test */
    public function invoice_item_belongs_to_invoice()
    {
        $invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
        ]);

        $item = InvoiceItem::factory()->create(['invoice_id' => $invoice->id]);

        $this->assertInstanceOf(Invoice::class, $item->invoice);
        $this->assertEquals($invoice->id, $item->invoice->id);
    }

    /** @test */
    public function quote_item_belongs_to_quote()
    {
        $quote = Quote::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
        ]);

        $item = QuoteItem::factory()->create(['quote_id' => $quote->id]);

        $this->assertInstanceOf(Quote::class, $item->quote);
        $this->assertEquals($quote->id, $item->quote->id);
    }

    /** @test */
    public function invoice_calculates_balance_due()
    {
        $invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'total' => 1000,
        ]);

        Payment::factory()->create([
            'invoice_id' => $invoice->id,
            'tenant_id' => $this->tenant->id,
            'amount' => 400,
        ]);

        Payment::factory()->create([
            'invoice_id' => $invoice->id,
            'tenant_id' => $this->tenant->id,
            'amount' => 300,
        ]);

        $totalPaid = $invoice->payments->sum('amount');
        $this->assertEquals(700, $totalPaid);
    }

    /** @test */
    public function models_use_factories_correctly()
    {
        $invoice = Invoice::factory()->create();
        $quote = Quote::factory()->create();
        $payment = Payment::factory()->create();
        $project = Project::factory()->create();
        $task = Task::factory()->create();

        $this->assertNotNull($invoice->id);
        $this->assertNotNull($quote->id);
        $this->assertNotNull($payment->id);
        $this->assertNotNull($project->id);
        $this->assertNotNull($task->id);
    }
}
