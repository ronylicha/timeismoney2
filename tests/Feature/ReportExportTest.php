<?php

namespace Tests\Feature;

use App\Exports\ReportExport;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Maatwebsite\Excel\Facades\Excel;
use Tests\TestCase;

class ReportExportTest extends TestCase
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
    }

    public function test_invoice_report_can_be_downloaded_as_excel(): void
    {
        Excel::fake();
        $this->createInvoice(['date' => '2024-05-10']);

        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/reports/invoice_summary/download?format=excel&start_date=2024-01-01&end_date=2024-12-31');

        $response->assertOk();

        Excel::assertDownloaded('invoice_summary_2024-01-01-2024-12-31.xlsx', function ($export) {
            $this->assertInstanceOf(ReportExport::class, $export);
            $this->assertGreaterThan(0, $export->collection()->count());
            return true;
        });
    }

    public function test_fec_export_generates_double_entry_lines(): void
    {
        $invoice = $this->createInvoice([
            'date' => '2024-06-15',
            'invoice_number' => 'INV-TEST-001',
            'total' => 150,
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/reports/fec?year=2024');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/plain');

        $content = $response->streamedContent();
        $this->assertStringContainsString('JournalCode|JournalLib|EcritureNum', $content);
        $this->assertStringContainsString($invoice->invoice_number, $content);
        $this->assertStringContainsString('706000', $content);
    }

    private function createInvoice(array $overrides = []): Invoice
    {
        return Invoice::factory()->create(array_merge([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'status' => 'sent',
            'subtotal' => 100,
            'tax_amount' => 20,
            'total' => 120,
            'balance_due' => 0,
            'created_by' => $this->user->id,
        ], $overrides));
    }
}
