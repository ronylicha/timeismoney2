<?php

namespace Tests\Unit;

use App\Models\Invoice;
use App\Models\CreditNote;
use App\Models\PdpSubmission;
use App\Models\User;
use App\Models\Client;
use App\Models\Tenant;
use App\Services\PdpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PdpServiceTest extends TestCase
{
    use RefreshDatabase;

    private PdpService $pdpService;
    private User $user;
    private Tenant $tenant;
    private Client $client;

    protected function setUp(): void
    {
        parent::setUp();

        // Configurer le mode simulation avant de créer les données
        config(['pdp.mode' => 'simulation']);
        config(['pdp.enabled' => true]);
        
        Storage::fake('local');
        
        // Create tenant first
        $this->tenant = Tenant::factory()->create([
            'name' => 'Test Company',
            'siret' => '12345678901234',
            'vat_number' => 'FR12345678901',
            'pdp_enabled' => true,
            'pdp_mode' => 'simulation',
            'pdp_base_url' => 'https://simulation-pdp.example.com',
            'pdp_client_id' => 'test_client_id',
            'pdp_client_secret' => 'test_client_secret',
        ]);
        
        $this->pdpService = new PdpService($this->tenant);
        
        // Create a user for created_by
        $this->user = User::factory()->create([
            'tenant_id' => $this->tenant->id,
        ]);
        
        // Create a client for tests
        $this->client = Client::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Client',
            'siret' => '98765432109876',
            'vat_number' => 'FR98765432109',
            'created_by' => $this->user->id,
        ]);
    }

    /**
     * Test de soumission d'une facture en mode simulation
     */
    public function test_submit_invoice_simulation_mode(): void
    {
        // Créer les données nécessaires
        $client = Client::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Client',
            'siret' => '98765432109876',
            'vat_number' => 'FR98765432109',
            'created_by' => $this->user->id,
        ]);

        // Créer une facture
        $invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $client->id,
            'invoice_number' => 'INV-2024-001',
            'status' => 'sent',
            'total' => 1200,
            'currency' => 'EUR',
        ]);

        // Créer une soumission
        $submission = PdpSubmission::create([
            'submittable_type' => Invoice::class,
            'submittable_id' => $invoice->id,
            'submission_id' => PdpSubmission::generateSubmissionId(),
            'status' => 'pending',
            'pdp_mode' => 'simulation',
        ]);

        // Créer un fichier Factur-X simulé
        $facturXPath = 'invoices/facturx/test.pdf';
        Storage::put($facturXPath, 'fake facturx content');

        // Soumettre au PDP
        $result = $this->pdpService->submitDocument($invoice, $facturXPath, $submission);

        // Vérifier le succès
        $this->assertTrue($result['success']);
        $this->assertArrayHasKey('pdp_id', $result);
        $this->assertArrayHasKey('response_data', $result);
        $this->assertStringStartsWith('SIM-', $result['pdp_id']);
    }

    /**
     * Test de vérification de statut en mode simulation
     */
    public function test_check_status_simulation_mode(): void
    {
        // Créer une soumission
        $submission = PdpSubmission::create([
            'submittable_type' => Invoice::class,
            'submittable_id' => 1,
            'submission_id' => PdpSubmission::generateSubmissionId(),
            'status' => 'submitted',
            'pdp_id' => 'SIM-TEST123',
            'pdp_mode' => 'simulation',
            'submitted_at' => now()->subMinutes(1),
        ]);

        // Vérifier le statut
        $result = $this->pdpService->checkStatus($submission);

        // Vérifier le succès
        $this->assertTrue($result['success']);
        $this->assertArrayHasKey('status', $result);
        $this->assertArrayHasKey('response_data', $result);
    }

    /**
     * Test de validation de document pour la simulation
     */
    public function test_validate_document_for_simulation(): void
    {
        // Créer une facture valide
        $invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
        ]);

        // Créer un fichier Factur-X valide
        $facturXPath = 'invoices/facturx/valid.pdf';
        Storage::put($facturXPath, str_repeat('x', 1000)); // 1KB

        $submission = PdpSubmission::create([
            'submittable_type' => Invoice::class,
            'submittable_id' => $invoice->id,
            'submission_id' => PdpSubmission::generateSubmissionId(),
            'status' => 'pending',
            'pdp_mode' => 'simulation',
        ]);

        // Soumettre - devrait réussir
        $result = $this->pdpService->submitDocument($invoice, $facturXPath, $submission);
        $this->assertTrue($result['success']);
    }

    /**
     * Test d'échec si fichier trop grand
     */
    public function test_submit_fails_if_file_too_large(): void
    {
        // Créer une facture
        $invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
        ]);

        // Créer un fichier trop grand
        $facturXPath = 'invoices/facturx/large.pdf';
        $largeContent = str_repeat('x', 15 * 1024 * 1024); // 15MB
        Storage::put($facturXPath, $largeContent);

        $submission = PdpSubmission::create([
            'submittable_type' => Invoice::class,
            'submittable_id' => $invoice->id,
            'submission_id' => PdpSubmission::generateSubmissionId(),
            'status' => 'pending',
            'pdp_mode' => 'simulation',
        ]);

        // Soumettre - devrait échouer
        $result = $this->pdpService->submitDocument($invoice, $facturXPath, $submission);
        $this->assertFalse($result['success']);
    }

    /**
     * Test de soumission d'un avoir
     */
    public function test_submit_credit_note_simulation_mode(): void
    {
        // Créer un avoir
        $creditNote = CreditNote::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $this->client->id,
            'credit_note_number' => 'CN-2024-001',
            'status' => 'issued',
            'total' => 200,
            'currency' => 'EUR',
        ]);

        // Créer une soumission
        $submission = PdpSubmission::create([
            'submittable_type' => CreditNote::class,
            'submittable_id' => $creditNote->id,
            'submission_id' => PdpSubmission::generateSubmissionId(),
            'status' => 'pending',
            'pdp_mode' => 'simulation',
        ]);

        // Créer un fichier Factur-X simulé
        $facturXPath = 'credit-notes/facturx/test.pdf';
        Storage::put($facturXPath, 'fake facturx content');

        // Soumettre au PDP
        $result = $this->pdpService->submitDocument($creditNote, $facturXPath, $submission);

        // Vérifier le succès
        $this->assertTrue($result['success']);
        $this->assertArrayHasKey('pdp_id', $result);
    }

    /**
     * Test de génération d'ID de soumission unique
     */
    public function test_generate_submission_id(): void
    {
        $id1 = PdpSubmission::generateSubmissionId();
        $id2 = PdpSubmission::generateSubmissionId();

        // Vérifier que les IDs sont uniques
        $this->assertNotEquals($id1, $id2);
        
        // Vérifier le format
        $this->assertStringStartsWith('PDP-', $id1);
        $this->assertStringStartsWith('PDP-', $id2);
        $this->assertMatchesRegularExpression('/^PDP-\d{4}-[A-Z0-9]+$/', $id1);
    }

    /**
     * Test des scopes du modèle PdpSubmission
     */
    public function test_pdp_submission_scopes(): void
    {
        // Créer plusieurs soumissions
        PdpSubmission::factory()->create(['status' => 'pending']);
        PdpSubmission::factory()->create(['status' => 'accepted']);
        PdpSubmission::factory()->create(['status' => 'rejected']);
        PdpSubmission::factory()->create(['status' => 'error', 'retry_count' => 1, 'next_retry_at' => now()->subMinutes(1)]);
        PdpSubmission::factory()->create(['status' => 'error', 'retry_count' => 3]);

        // Tester les scopes
        $this->assertEquals(1, PdpSubmission::pending()->count());
        $this->assertEquals(1, PdpSubmission::successful()->count());
        $this->assertEquals(3, PdpSubmission::failed()->count()); // rejected (1) + error (2) = 3
        $this->assertEquals(1, PdpSubmission::retryable()->count());
    }

    /**
     * Test des méthodes de statut du modèle PdpSubmission
     */
    public function test_pdp_submission_status_methods(): void
    {
        $submission = PdpSubmission::factory()->create([
            'status' => 'accepted',
            'retry_count' => 0,
        ]);

        // Tester les méthodes
        $this->assertTrue($submission->isCompleted());
        $this->assertFalse($submission->canRetry());

        // Passer en erreur
        $submission->update(['status' => 'error', 'retry_count' => 1]);
        $this->assertFalse($submission->isCompleted());
        $this->assertTrue($submission->canRetry());

        // Marquer comme accepté
        $submission->markAsAccepted(['test' => 'data']);
        $this->assertEquals('accepted', $submission->status);
        $this->assertNotNull($submission->accepted_at);

        // Marquer comme rejeté
        $submission->markAsRejected('Test error', 'TEST_ERROR');
        $this->assertEquals('rejected', $submission->status);
        $this->assertNotNull($submission->rejected_at);
        $this->assertEquals('Test error', $submission->error_message);
    }
}
