<?php

namespace Tests\Unit;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Tenant;
use App\Models\User;
use App\Services\FrenchComplianceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class FrenchComplianceServiceTest extends TestCase
{
    use RefreshDatabase;

    private FrenchComplianceService $service;
    private Tenant $tenant;
    private Client $client;
    private Invoice $invoice;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(FrenchComplianceService::class);

        // Create test tenant with French compliance data
        $this->tenant = Tenant::factory()->create([
            'legal_mention_siret' => '12345678901234',
            'legal_mention_ape' => '6201Z',
            'legal_mention_tva_intracom' => 'FR12345678901',
            'legal_form' => 'SARL',
            'capital' => 10000,
            'rcs_number' => '123456789',
            'rcs_city' => 'Paris',
            'iban' => 'FR76 1234 5678 9012 3456 7890 123',
            'bic' => 'BNPAFRPPXXX',
            'company_name' => 'Test Company SAS',
            'name' => 'Test Company',
            'is_auto_entrepreneur' => false,
        ]);

        $this->user = User::factory()->create(['tenant_id' => $this->tenant->id]);

        $this->client = Client::factory()->create([
            'tenant_id' => $this->tenant->id,
            'country' => 'FR',
            'is_public_entity' => false,
        ]);

        $this->invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'invoice_number' => 'FA-2024-001',
            'sequence_number' => 1,
            'date' => now(),
            'due_date' => now()->addDays(30),
            'status' => 'sent',
            'subtotal' => 100,
            'tax_rate' => 20,
            'tax_amount' => 20,
            'total' => 120,
            'payment_conditions' => 'Paiement à 30 jours',
            'late_payment_penalty_rate' => 12,
            'recovery_indemnity' => 40,
            'hash' => 'test_hash_123',
            'signature' => 'test_signature_123',
            'previous_hash' => null,
            'electronic_format' => 'facturx',
        ]);

        $this->actingAs($this->user);
    }

    /** @test */
    public function it_generates_legal_mentions_for_standard_company()
    {
        $mentions = $this->service->generateLegalMentions($this->invoice);

        $this->assertIsArray($mentions);
        $this->assertContains("Facture n°{$this->invoice->invoice_number}", $mentions);
        $this->assertContains("SIRET : {$this->tenant->legal_mention_siret}", $mentions);
        $this->assertContains("Code APE : {$this->tenant->legal_mention_ape}", $mentions);
        $this->assertContains("TVA Intracommunautaire : {$this->tenant->legal_mention_tva_intracom}", $mentions);
        $this->assertContains("TVA : {$this->invoice->tax_rate}%", $mentions);
        $this->assertContains("En cas de retard de paiement, une indemnité forfaitaire de 40 € sera due", $mentions);
    }

    /** @test */
    public function it_generates_legal_mentions_for_auto_entrepreneur()
    {
        $this->tenant->update([
            'is_auto_entrepreneur' => true,
            'legal_mention_tva_intracom' => null,
        ]);

        $this->invoice->update(['tax_rate' => 0, 'tax_amount' => 0]);

        $mentions = $this->service->generateLegalMentions($this->invoice);

        $this->assertContains("Auto-entrepreneur - TVA non applicable, art. 293 B du CGI", $mentions);
        $this->assertNotContains("TVA Intracommunautaire", implode(' ', $mentions));
    }

    /** @test */
    public function it_validates_compliant_invoice_successfully()
    {
        $result = $this->service->validateInvoiceCompliance($this->invoice);

        $this->assertTrue($result['is_compliant']);
        $this->assertEmpty($result['errors']);
        $this->assertEquals(0, $result['critical_issues']);
        $this->assertArrayHasKey('compliance_score', $result);
        $this->assertArrayHasKey('warnings', $result);
        $this->assertArrayHasKey('info', $result);
    }

    /** @test */
    public function it_detects_missing_invoice_number()
    {
        $this->invoice->update(['invoice_number' => null]);

        $result = $this->service->validateInvoiceCompliance($this->invoice);

        $this->assertFalse($result['is_compliant']);
        $this->assertContains("Numéro de facture manquant (Art. L441-3 Code Commerce)", $result['errors']);
        $this->assertGreaterThan(0, $result['critical_issues']);
    }

    /** @test */
    public function it_detects_missing_dates()
    {
        $this->invoice->update(['date' => null, 'due_date' => null]);

        $result = $this->service->validateInvoiceCompliance($this->invoice);

        $this->assertFalse($result['is_compliant']);
        $this->assertContains("Date de facture manquante (Art. L441-3 Code Commerce)", $result['errors']);
        $this->assertContains("Date d'échéance manquante (Art. L441-3 Code Commerce)", $result['errors']);
    }

    /** @test */
    public function it_detects_missing_siret_for_standard_company()
    {
        $this->tenant->update(['legal_mention_siret' => null, 'is_auto_entrepreneur' => false]);

        $result = $this->service->validateInvoiceCompliance($this->invoice);

        $this->assertFalse($result['is_compliant']);
        $this->assertContains("SIRET obligatoire (Art. L441-3 Code Commerce)", $result['errors']);
    }

    /** @test */
    public function it_allows_missing_siret_for_auto_entrepreneur()
    {
        $this->tenant->update([
            'legal_mention_siret' => null,
            'is_auto_entrepreneur' => true,
        ]);

        $this->invoice->update(['tax_rate' => 0, 'tax_amount' => 0]);

        $result = $this->service->validateInvoiceCompliance($this->invoice);

        $this->assertNotContains("SIRET obligatoire", implode(' ', $result['errors'] ?? []));
    }

    /** @test */
    public function it_detects_vat_charge_on_auto_entrepreneur()
    {
        $this->tenant->update(['is_auto_entrepreneur' => true]);
        $this->invoice->update(['tax_rate' => 20, 'tax_amount' => 20]);

        $result = $this->service->validateInvoiceCompliance($this->invoice);

        $this->assertFalse($result['is_compliant']);
        $this->assertContains("Un auto-entrepreneur ne peut pas facturer de TVA", $result['errors']);
    }

    /** @test */
    public function it_detects_missing_payment_conditions()
    {
        $this->invoice->update(['payment_conditions' => null]);

        $result = $this->service->validateInvoiceCompliance($this->invoice);

        $this->assertFalse($result['is_compliant']);
        $this->assertContains("Conditions de règlement manquantes (Art. L441-3 Code Commerce)", $result['errors']);
    }

    /** @test */
    public function it_detects_invalid_late_payment_penalty()
    {
        $this->invoice->update(['late_payment_penalty_rate' => 0]);

        $result = $this->service->validateInvoiceCompliance($this->invoice);

        $this->assertFalse($result['is_compliant']);
        $this->assertContains("Taux de pénalités de retard manquant (minimum 3x taux légal)", $result['errors']);
    }

    /** @test */
    public function it_detects_invalid_recovery_indemnity()
    {
        $this->invoice->update(['recovery_indemnity' => 30]);

        $result = $this->service->validateInvoiceCompliance($this->invoice);

        $this->assertFalse($result['is_compliant']);
        $this->assertContains("Indemnité forfaitaire de recouvrement doit être de 40€ minimum", $result['errors']);
    }

    /** @test */
    public function it_detects_missing_nf525_fields()
    {
        $this->invoice->update([
            'sequence_number' => null,
            'hash' => null,
            'signature' => null,
        ]);

        $result = $this->service->validateInvoiceCompliance($this->invoice);

        $this->assertFalse($result['is_compliant']);
        $this->assertContains("Numéro séquentiel manquant (conformité NF525)", $result['errors']);
        $this->assertContains("Hash de sécurité manquant (conformité NF525)", $result['errors']);
        $this->assertContains("Signature cryptographique manquante (conformité NF525)", $result['errors']);
    }

    /** @test */
    public function it_warns_about_missing_rcs_for_sarl()
    {
        $this->tenant->update(['rcs_number' => null, 'legal_form' => 'SARL']);

        $result = $this->service->validateInvoiceCompliance($this->invoice);

        $this->assertContains("Numéro RCS manquant (obligatoire pour sociétés)", $result['warnings']);
    }

    /** @test */
    public function it_warns_about_missing_capital_for_sarl()
    {
        $this->tenant->update(['capital' => null, 'legal_form' => 'SARL']);

        $result = $this->service->validateInvoiceCompliance($this->invoice);

        $this->assertContains("Capital social manquant (obligatoire pour SARL/SAS/SA)", $result['warnings']);
    }

    /** @test */
    public function it_provides_info_about_pdf_format()
    {
        $this->invoice->update(['electronic_format' => 'pdf']);

        $result = $this->service->validateInvoiceCompliance($this->invoice);

        $this->assertContains("Format PDF simple - Migration vers Factur-X recommandée avant 2026", $result['info']);
    }

    /** @test */
    public function it_validates_sequential_numbering_without_gaps()
    {
        // Create sequential invoices
        Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'sequence_number' => 2,
        ]);
        Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'sequence_number' => 3,
        ]);

        $result = $this->service->validateSequentialNumbering($this->tenant->id);

        $this->assertTrue($result['valid']);
        $this->assertEmpty($result['gaps']);
        $this->assertEquals('Numérotation séquentielle valide', $result['message']);
        $this->assertEquals(3, $result['total_invoices']);
    }

    /** @test */
    public function it_detects_gaps_in_sequential_numbering()
    {
        // Create invoices with gap
        Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'sequence_number' => 5, // Gap from 1 to 5
        ]);

        $result = $this->service->validateSequentialNumbering($this->tenant->id);

        $this->assertFalse($result['valid']);
        $this->assertNotEmpty($result['gaps']);
        $this->assertEquals(1, $result['gaps_count']);
        $this->assertStringContainsString('trou(s) détecté(s)', $result['message']);

        // Check gap details
        $gap = $result['gaps'][0];
        $this->assertEquals(1, $gap['from_sequence']);
        $this->assertEquals(5, $gap['to_sequence']);
        $this->assertEquals(3, $gap['missing_count']);
        $this->assertEquals([2, 3, 4], $gap['missing_numbers']);
    }

    /** @test */
    public function it_handles_empty_invoice_list_for_sequential_validation()
    {
        $newTenant = Tenant::factory()->create();

        $result = $this->service->validateSequentialNumbering($newTenant->id);

        $this->assertTrue($result['valid']);
        $this->assertEmpty($result['gaps']);
        $this->assertEquals('Aucune facture à vérifier', $result['message']);
    }

    /** @test */
    public function it_generates_integrity_report_for_year()
    {
        // Create more invoices for the year
        $invoice2 = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'sequence_number' => 2,
            'hash' => 'hash_2',
            'previous_hash' => $this->invoice->hash,
            'date' => now(),
        ]);

        $report = $this->service->generateIntegrityReport($this->tenant->id, now()->year);

        $this->assertEquals(now()->year, $report['year']);
        $this->assertEquals($this->tenant->id, $report['tenant_id']);
        $this->assertEquals(2, $report['total_invoices']);
        $this->assertNotNull($report['first_invoice']);
        $this->assertNotNull($report['last_invoice']);
        $this->assertTrue($report['hash_chain_valid']);
        $this->assertEmpty($report['integrity_issues']);
    }

    /** @test */
    public function it_detects_broken_hash_chain_in_integrity_report()
    {
        // Create invoice with broken hash chain
        Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'sequence_number' => 2,
            'hash' => 'hash_2',
            'previous_hash' => 'wrong_hash', // Broken chain
            'date' => now(),
        ]);

        $report = $this->service->generateIntegrityReport($this->tenant->id, now()->year);

        $this->assertFalse($report['hash_chain_valid']);
        $this->assertNotEmpty($report['integrity_issues']);
        $this->assertStringContainsString('Chaîne de hash interrompue', $report['integrity_issues'][0]['issue']);
    }

    /** @test */
    public function it_generates_integrity_report_for_empty_year()
    {
        $report = $this->service->generateIntegrityReport($this->tenant->id, 2020);

        $this->assertEquals(0, $report['total_invoices']);
        $this->assertNull($report['first_invoice']);
        $this->assertNull($report['last_invoice']);
    }

    /** @test */
    public function it_archives_invoice_legally()
    {
        Log::shouldReceive('info')->once();

        $result = $this->service->archiveInvoiceLegally($this->invoice);

        $this->assertTrue($result);
        $this->invoice->refresh();
        $this->assertTrue($this->invoice->is_archived_legally);
        $this->assertNotNull($this->invoice->legally_archived_at);
    }

    /** @test */
    public function it_generates_electronic_invoice_hash()
    {
        $hash = $this->service->generateElectronicInvoiceHash($this->invoice);

        $this->assertIsString($hash);
        $this->assertEquals(64, strlen($hash)); // SHA256 produces 64 character hex string

        // Hash should be deterministic
        $hash2 = $this->service->generateElectronicInvoiceHash($this->invoice);
        $this->assertEquals($hash, $hash2);
    }

    /** @test */
    public function it_validates_invoice_can_be_sent_to_chorus_pro()
    {
        $this->client->update([
            'is_public_entity' => true,
            'country' => 'FR',
        ]);

        $result = $this->service->canSendToChorusPro($this->invoice);

        $this->assertTrue($result['can_send']);
        $this->assertEmpty($result['errors']);
    }

    /** @test */
    public function it_rejects_draft_invoice_for_chorus_pro()
    {
        $this->invoice->update(['status' => 'draft']);
        $this->client->update(['is_public_entity' => true, 'country' => 'FR']);

        $result = $this->service->canSendToChorusPro($this->invoice);

        $this->assertFalse($result['can_send']);
        $this->assertContains("La facture ne peut pas être envoyée en brouillon", $result['errors']);
    }

    /** @test */
    public function it_rejects_non_public_entity_for_chorus_pro()
    {
        $this->client->update(['is_public_entity' => false]);

        $result = $this->service->canSendToChorusPro($this->invoice);

        $this->assertFalse($result['can_send']);
        $this->assertContains("Le client doit être une entité publique française", $result['errors']);
    }

    /** @test */
    public function it_rejects_invoice_without_siret_for_chorus_pro()
    {
        $this->tenant->update(['legal_mention_siret' => null]);
        $this->client->update(['is_public_entity' => true, 'country' => 'FR']);

        $result = $this->service->canSendToChorusPro($this->invoice);

        $this->assertFalse($result['can_send']);
        $this->assertContains("Le SIRET est obligatoire pour Chorus Pro", $result['errors']);
    }

    /** @test */
    public function it_generates_sepa_qr_code_with_valid_iban()
    {
        $qrCode = $this->service->generateSepaQrCode($this->invoice);

        $this->assertNotNull($qrCode);
        $this->assertIsString($qrCode);
        $this->assertStringContainsString('svg', strtolower($qrCode));
    }

    /** @test */
    public function it_returns_null_for_sepa_qr_code_without_iban()
    {
        Log::shouldReceive('warning')->once();

        $this->tenant->update(['iban' => null]);

        $qrCode = $this->service->generateSepaQrCode($this->invoice);

        $this->assertNull($qrCode);
    }

    /** @test */
    public function it_generates_and_saves_sepa_qr_code()
    {
        Log::shouldReceive('info')->once();

        $result = $this->service->generateAndSaveSepaQrCode($this->invoice);

        $this->assertTrue($result);
        $this->invoice->refresh();
        $this->assertNotNull($this->invoice->qr_code_sepa);
        $this->assertStringContainsString('svg', strtolower($this->invoice->qr_code_sepa));
    }

    /** @test */
    public function it_fails_to_save_sepa_qr_code_without_iban()
    {
        Log::shouldReceive('warning')->once();

        $this->tenant->update(['iban' => null]);

        $result = $this->service->generateAndSaveSepaQrCode($this->invoice);

        $this->assertFalse($result);
    }

    /** @test */
    public function it_formats_iban_correctly()
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('formatIban');
        $method->setAccessible(true);

        $result = $method->invoke($this->service, 'FR76 1234 5678 9012 3456 7890 123');

        $this->assertEquals('FR7612345678901234567890123', $result);
        $this->assertStringNotContainsString(' ', $result);
    }

    /** @test */
    public function it_sanitizes_sepa_fields_correctly()
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('sanitizeSepaField');
        $method->setAccessible(true);

        // Test special character removal
        $result = $method->invoke($this->service, 'Test@#$%Company', 50);
        $this->assertEquals('TestCompany', $result);

        // Test length limit
        $longString = str_repeat('A', 100);
        $result = $method->invoke($this->service, $longString, 35);
        $this->assertEquals(35, strlen($result));

        // Test allowed characters
        $result = $method->invoke($this->service, 'Test-Company (Ltd.) 123', 50);
        $this->assertEquals('Test-Company (Ltd.) 123', $result);
    }

    /** @test */
    public function it_calculates_compliance_score_correctly()
    {
        // Create invoice with some issues
        $this->invoice->update([
            'payment_conditions' => null,
            'qr_code_sepa' => null,
        ]);

        $result = $this->service->validateInvoiceCompliance($this->invoice);

        $this->assertArrayHasKey('compliance_score', $result);
        $this->assertIsNumeric($result['compliance_score']);
        $this->assertGreaterThanOrEqual(0, $result['compliance_score']);
        $this->assertLessThanOrEqual(100, $result['compliance_score']);
    }
}
