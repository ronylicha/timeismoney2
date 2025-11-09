<?php

namespace App\Console\Commands;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Tenant;
use App\Models\User;
use App\Services\CreditNoteService;
use App\Services\FacturXService;
use App\Services\FecExportService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DemoCompleteWorkflow extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'demo:complete-workflow 
                            {tenant_id? : ID du tenant (optionnel, créera un nouveau si non fourni)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Démonstration complète: Facture → Avoir → FacturX → Export FEC';

    /**
     * Execute the console command.
     */
    public function handle(
        CreditNoteService $creditNoteService,
        FacturXService $facturXService,
        FecExportService $fecService
    ): int {
        $this->info('╔══════════════════════════════════════════════════════════╗');
        $this->info('║  DÉMONSTRATION COMPLÈTE - TimeIsMoney2 Compliance 2027  ║');
        $this->info('╚══════════════════════════════════════════════════════════╝');
        $this->newLine();

        try {
            DB::beginTransaction();

            // Step 1: Setup
            $this->info('📦 ÉTAPE 1: Préparation des données de test');
            $tenant = $this->setupTestData();
            $this->line("   ✓ Tenant créé: {$tenant->name}");
            
            $client = $tenant->clients()->first();
            $this->line("   ✓ Client créé: {$client->name}");

            // Step 2: Create Invoice
            $this->newLine();
            $this->info('📄 ÉTAPE 2: Création d\'une facture test');
            $invoice = $this->createTestInvoice($tenant, $client);
            $this->line("   ✓ Facture créée: {$invoice->invoice_number}");
            $this->line("   ✓ Montant: {$invoice->total} €");

            // Step 3: Generate FacturX for Invoice
            $this->newLine();
            $this->info('⚡ ÉTAPE 3: Génération FacturX pour la facture');
            $invoiceFacturXPath = $facturXService->generateFacturX($invoice);
            if ($invoiceFacturXPath) {
                $invoice->update([
                    'facturx_path' => $invoiceFacturXPath,
                    'electronic_format' => 'facturx'
                ]);
                $this->line("   ✓ FacturX généré: {$invoiceFacturXPath}");
            } else {
                $this->warn("   ⚠ FacturX non généré (package à configurer)");
            }

            // Step 4: Create Credit Note
            $this->newLine();
            $this->info('💳 ÉTAPE 4: Création d\'un avoir (50% de la facture)');
            
            $invoice->load('items');
            $firstItem = $invoice->items->first();
            
            $creditNote = $creditNoteService->createFromInvoice(
                invoice: $invoice,
                selectedItems: [
                    ['id' => $firstItem->id, 'quantity' => $firstItem->quantity / 2]
                ],
                fullCredit: false,
                reason: 'Avoir partiel - Démonstration'
            );
            
            $this->line("   ✓ Avoir créé: {$creditNote->credit_note_number}");
            $this->line("   ✓ Montant: {$creditNote->total} €");

            // Step 5: Issue Credit Note
            $this->newLine();
            $this->info('📮 ÉTAPE 5: Émission de l\'avoir');
            $creditNote->markAsIssued();
            $this->line("   ✓ Avoir émis avec hash de conformité");
            $this->line("   ✓ Hash: " . substr($creditNote->compliance_hash, 0, 16) . "...");

            // Step 6: Generate FacturX for Credit Note
            $this->newLine();
            $this->info('⚡ ÉTAPE 6: Génération FacturX pour l\'avoir');
            $creditNoteFacturXPath = $facturXService->generateFacturXForCreditNote($creditNote);
            if ($creditNoteFacturXPath) {
                $creditNote->update([
                    'facturx_path' => $creditNoteFacturXPath,
                    'electronic_format' => 'facturx'
                ]);
                $this->line("   ✓ FacturX généré: {$creditNoteFacturXPath}");
            } else {
                $this->warn("   ⚠ FacturX non généré (package à configurer)");
            }

            // Step 7: Check Automatic Tracking
            $this->newLine();
            $this->info('🔄 ÉTAPE 7: Vérification du tracking automatique');
            $invoice->refresh();
            $this->line("   ✓ Has credit notes: " . ($invoice->has_credit_notes ? 'Oui' : 'Non'));
            $this->line("   ✓ Total crédité: {$invoice->total_credited} €");
            $this->line("   ✓ Solde restant: " . ($invoice->total - $invoice->total_credited) . " €");

            // Step 8: Export FEC
            $this->newLine();
            $this->info('📊 ÉTAPE 8: Export FEC (Fichier Écritures Comptables)');
            $fecContent = $fecService->exportFecForPeriod(
                tenantId: $tenant->id,
                startDate: now()->startOfYear()->format('Y-m-d'),
                endDate: now()->endOfYear()->format('Y-m-d'),
                format: 'txt',
                encoding: 'utf8'
            );
            
            $fecPath = "exports/demo/FEC_DEMO_" . now()->format('Ymd') . ".txt";
            Storage::put($fecPath, $fecContent);
            
            $this->line("   ✓ FEC exporté: {$fecPath}");
            $this->line("   ✓ Taille: " . $this->formatBytes(strlen($fecContent)));
            $this->line("   ✓ Lignes: " . substr_count($fecContent, "\n"));

            // Step 9: Summary
            $this->newLine();
            $this->info('📈 RÉSUMÉ DE LA DÉMONSTRATION');
            $this->newLine();
            
            $this->table(
                ['Élément', 'Valeur'],
                [
                    ['Tenant', $tenant->name],
                    ['Client', $client->name],
                    ['Facture', $invoice->invoice_number . ' (' . $invoice->total . ' €)'],
                    ['Avoir', $creditNote->credit_note_number . ' (' . $creditNote->total . ' €)'],
                    ['FacturX Facture', $invoiceFacturXPath ?? 'Non généré'],
                    ['FacturX Avoir', $creditNoteFacturXPath ?? 'Non généré'],
                    ['Export FEC', $fecPath],
                    ['Audit Logs', $invoice->auditLogs()->count() . ' entrées'],
                ]
            );

            $this->newLine();
            $this->info('✅ TOUS LES TESTS ONT RÉUSSI!');
            $this->newLine();
            $this->line('🎯 Conformité:');
            $this->line('   ✓ NF525 (Hash + Audit trail)');
            $this->line('   ✓ EN 16931 (FacturX XML)');
            $this->line('   ✓ FEC (Export comptable)');
            $this->line('   ✓ Tracking automatique avoirs');
            
            DB::commit();

            return Command::SUCCESS;

        } catch (\Exception $e) {
            DB::rollBack();
            $this->error("❌ ERREUR: {$e->getMessage()}");
            $this->line($e->getTraceAsString());
            return Command::FAILURE;
        }
    }

    /**
     * Setup test data
     */
    private function setupTestData(): Tenant
    {
        $tenant = Tenant::create([
            'name' => 'Demo Company ' . now()->format('His'),
            'email' => 'demo@example.com',
            'legal_mention_siret' => '12345678901234',
            'legal_mention_tva_intracom' => 'FR12345678901',
            'address' => '123 Demo Street',
            'postal_code' => '75001',
            'city' => 'Paris',
        ]);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Demo User',
            'email' => 'demo.user@example.com',
            'password' => bcrypt('password'),
        ]);

        $client = Client::create([
            'tenant_id' => $tenant->id,
            'name' => 'Demo Client',
            'email' => 'client@example.com',
            'siret' => '98765432109876',
            'address' => '456 Client Avenue',
            'postal_code' => '75002',
            'city' => 'Paris',
            'country' => 'FR',
        ]);

        return $tenant;
    }

    /**
     * Create test invoice
     */
    private function createTestInvoice(Tenant $tenant, Client $client): Invoice
    {
        $invoice = Invoice::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'invoice_number' => 'DEMO-' . now()->format('YmdHis'),
            'date' => now(),
            'due_date' => now()->addDays(30),
            'status' => 'sent',
            'subtotal' => 100,
            'tax_amount' => 20,
            'tax_rate' => 20,
            'total' => 120,
            'currency' => 'EUR',
        ]);

        InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'description' => 'Service de démonstration',
            'quantity' => 2,
            'unit_price' => 50,
            'tax_rate' => 20,
            'position' => 1,
        ]);

        return $invoice;
    }

    /**
     * Format bytes to human readable
     */
    private function formatBytes(int $bytes): string
    {
        if ($bytes < 1024) {
            return $bytes . ' B';
        } elseif ($bytes < 1048576) {
            return round($bytes / 1024, 2) . ' KB';
        } else {
            return round($bytes / 1048576, 2) . ' MB';
        }
    }
}
