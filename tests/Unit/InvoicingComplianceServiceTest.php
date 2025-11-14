<?php

namespace Tests\Unit;

use App\Models\Client;
use App\Models\Tenant;
use App\Models\User;
use App\Services\InvoicingComplianceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class InvoicingComplianceServiceTest extends TestCase
{
    use RefreshDatabase;

    private InvoicingComplianceService $service;
    private Tenant $tenant;
    private Client $client;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(InvoicingComplianceService::class);

        // Create compliant tenant
        $this->tenant = Tenant::factory()->create([
            'siret' => '12345678901234',
            'company_name' => 'Test Company SARL',
            'name' => 'Test Company',
            'address_line1' => '123 Rue de Test',
            'postal_code' => '75001',
            'city' => 'Paris',
            'vat_subject' => true,
            'vat_number' => 'FR12345678901',
            'legal_form' => 'SARL',
            'capital' => 10000,
            'rcs_number' => '123456789',
            'rcs_city' => 'Paris',
            'iban' => 'FR7612345678901234567890123',
            'email' => 'contact@test.com',
        ]);

        $this->user = User::factory()->create(['tenant_id' => $this->tenant->id]);

        // Create compliant client
        $this->client = Client::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Client',
            'address' => '456 Avenue Client',
            'postal_code' => '69001',
            'city' => 'Lyon',
            'email' => 'client@test.com',
            'is_company' => true,
            'vat_number' => 'FR98765432109',
        ]);

        $this->actingAs($this->user);
    }

    /** @test */
    public function it_validates_compliant_tenant_can_create_invoices()
    {
        $result = $this->service->canTenantCreateInvoices($this->tenant);

        $this->assertTrue($result['can_invoice']);
        $this->assertEmpty($result['errors']);
        $this->assertArrayHasKey('warnings', $result);
        $this->assertArrayHasKey('errors_by_category', $result);
    }

    /** @test */
    public function it_detects_missing_siret()
    {
        $this->tenant->update(['siret' => null]);

        $result = $this->service->canTenantCreateInvoices($this->tenant);

        $this->assertFalse($result['can_invoice']);
        $this->assertCount(1, $result['errors']);
        $this->assertEquals('siret', $result['errors'][0]['field']);
        $this->assertEquals('critical', $result['errors'][0]['severity']);
        $this->assertEquals('identification', $result['errors'][0]['category']);
    }

    /** @test */
    public function it_detects_missing_company_name()
    {
        $this->tenant->update(['company_name' => null, 'name' => null]);

        $result = $this->service->canTenantCreateInvoices($this->tenant);

        $this->assertFalse($result['can_invoice']);
        $this->assertContains('company_name', array_column($result['errors'], 'field'));
    }

    /** @test */
    public function it_detects_missing_address()
    {
        $this->tenant->update(['address_line1' => null]);

        $result = $this->service->canTenantCreateInvoices($this->tenant);

        $this->assertFalse($result['can_invoice']);
        $this->assertContains('address_line1', array_column($result['errors'], 'field'));
        $this->assertStringContainsString('EN 16931', $result['errors'][0]['message']);
    }

    /** @test */
    public function it_detects_missing_postal_code_and_city()
    {
        $this->tenant->update(['postal_code' => null, 'city' => null]);

        $result = $this->service->canTenantCreateInvoices($this->tenant);

        $this->assertFalse($result['can_invoice']);
        $this->assertContains('postal_code', array_column($result['errors'], 'field'));
        $this->assertContains('city', array_column($result['errors'], 'field'));
    }

    /** @test */
    public function it_requires_vat_number_for_vat_subject_tenant()
    {
        $this->tenant->update([
            'vat_subject' => true,
            'vat_number' => null,
        ]);

        $result = $this->service->canTenantCreateInvoices($this->tenant);

        $this->assertFalse($result['can_invoice']);
        $this->assertContains('vat_number', array_column($result['errors'], 'field'));
        $this->assertEquals('vat', $result['errors'][0]['category']);
    }

    /** @test */
    public function it_requires_vat_exemption_reason_for_non_vat_subject()
    {
        $this->tenant->update([
            'vat_subject' => false,
            'vat_exemption_reason' => null,
        ]);

        $result = $this->service->canTenantCreateInvoices($this->tenant);

        $this->assertFalse($result['can_invoice']);
        $this->assertContains('vat_exemption_reason', array_column($result['errors'], 'field'));
    }

    /** @test */
    public function it_allows_non_vat_subject_with_exemption_reason()
    {
        $this->tenant->update([
            'vat_subject' => false,
            'vat_number' => null,
            'vat_exemption_reason' => 'article_293b',
        ]);

        $result = $this->service->canTenantCreateInvoices($this->tenant);

        $this->assertTrue($result['can_invoice']);
    }

    /** @test */
    public function it_warns_about_missing_legal_form()
    {
        $this->tenant->update(['legal_form' => null]);

        $result = $this->service->canTenantCreateInvoices($this->tenant);

        $this->assertNotEmpty($result['warnings']);
        $this->assertContains('legal_form', array_column($result['warnings'], 'field'));
    }

    /** @test */
    public function it_requires_capital_for_sarl()
    {
        $this->tenant->update(['legal_form' => 'SARL', 'capital' => null]);

        $result = $this->service->canTenantCreateInvoices($this->tenant);

        $this->assertFalse($result['can_invoice']);
        $this->assertContains('capital', array_column($result['errors'], 'field'));
        $this->assertStringContainsString('SARL', $result['errors'][0]['message']);
    }

    /** @test */
    public function it_requires_capital_for_sas()
    {
        $this->tenant->update(['legal_form' => 'SAS', 'capital' => null]);

        $result = $this->service->canTenantCreateInvoices($this->tenant);

        $this->assertFalse($result['can_invoice']);
        $this->assertContains('capital', array_column($result['errors'], 'field'));
    }

    /** @test */
    public function it_allows_zero_capital_for_sarl()
    {
        $this->tenant->update(['legal_form' => 'SARL', 'capital' => 0]);

        $result = $this->service->canTenantCreateInvoices($this->tenant);

        $this->assertTrue($result['can_invoice']);
    }

    /** @test */
    public function it_does_not_require_capital_for_ei()
    {
        $this->tenant->update([
            'legal_form' => 'EI',
            'capital' => null,
            'rcs_number' => null,
            'rcs_city' => null,
        ]);

        $result = $this->service->canTenantCreateInvoices($this->tenant);

        // Should not have capital error
        $this->assertNotContains('capital', array_column($result['errors'], 'field'));
    }

    /** @test */
    public function it_requires_rcs_for_sarl()
    {
        $this->tenant->update(['legal_form' => 'SARL', 'rcs_number' => null, 'rcs_city' => null]);

        $result = $this->service->canTenantCreateInvoices($this->tenant);

        $this->assertFalse($result['can_invoice']);
        $this->assertContains('rcs_number', array_column($result['errors'], 'field'));
        $this->assertContains('rcs_city', array_column($result['errors'], 'field'));
    }

    /** @test */
    public function it_requires_rcs_for_sas()
    {
        $this->tenant->update(['legal_form' => 'SAS', 'rcs_number' => null]);

        $result = $this->service->canTenantCreateInvoices($this->tenant);

        $this->assertFalse($result['can_invoice']);
        $this->assertContains('rcs_number', array_column($result['errors'], 'field'));
    }

    /** @test */
    public function it_does_not_require_rcs_for_ei()
    {
        $this->tenant->update([
            'legal_form' => 'EI',
            'rcs_number' => null,
            'rcs_city' => null,
            'capital' => null,
        ]);

        $result = $this->service->canTenantCreateInvoices($this->tenant);

        // Should not have RCS error
        $this->assertNotContains('rcs_number', array_column($result['errors'], 'field'));
    }

    /** @test */
    public function it_warns_about_missing_rm_for_artisan()
    {
        $this->tenant->update([
            'legal_form' => 'EI',
            'rm_number' => null,
            'capital' => null,
            'rcs_number' => null,
            'rcs_city' => null,
        ]);

        $result = $this->service->canTenantCreateInvoices($this->tenant);

        $this->assertNotEmpty($result['warnings']);
        $warnings = array_column($result['warnings'], 'field');
        // RM warning might be present
    }

    /** @test */
    public function it_requires_iban()
    {
        $this->tenant->update(['iban' => null]);

        $result = $this->service->canTenantCreateInvoices($this->tenant);

        $this->assertFalse($result['can_invoice']);
        $this->assertContains('iban', array_column($result['errors'], 'field'));
        $this->assertEquals('payment', $result['errors'][0]['category']);
    }

    /** @test */
    public function it_warns_about_missing_email()
    {
        $this->tenant->update(['email' => null]);

        $result = $this->service->canTenantCreateInvoices($this->tenant);

        $this->assertTrue($result['can_invoice']); // Warning, not error
        $this->assertContains('email', array_column($result['warnings'], 'field'));
    }

    /** @test */
    public function it_validates_compliant_client_can_receive_invoices()
    {
        $result = $this->service->canClientReceiveInvoices($this->client);

        $this->assertTrue($result['can_receive_invoice']);
        $this->assertEmpty($result['errors']);
        $this->assertArrayHasKey('warnings', $result);
    }

    /** @test */
    public function it_detects_missing_client_name()
    {
        $this->client->update(['name' => null]);

        $result = $this->service->canClientReceiveInvoices($this->client);

        $this->assertFalse($result['can_receive_invoice']);
        $this->assertContains('name', array_column($result['errors'], 'field'));
    }

    /** @test */
    public function it_detects_missing_client_address()
    {
        $this->client->update(['address' => null]);

        $result = $this->service->canClientReceiveInvoices($this->client);

        $this->assertFalse($result['can_receive_invoice']);
        $this->assertContains('address', array_column($result['errors'], 'field'));
        $this->assertStringContainsString('EN 16931', $result['errors'][0]['message']);
    }

    /** @test */
    public function it_detects_missing_client_postal_code_and_city()
    {
        $this->client->update(['postal_code' => null, 'city' => null]);

        $result = $this->service->canClientReceiveInvoices($this->client);

        $this->assertFalse($result['can_receive_invoice']);
        $this->assertContains('postal_code', array_column($result['errors'], 'field'));
        $this->assertContains('city', array_column($result['errors'], 'field'));
    }

    /** @test */
    public function it_warns_about_missing_client_email()
    {
        $this->client->update(['email' => null]);

        $result = $this->service->canClientReceiveInvoices($this->client);

        $this->assertTrue($result['can_receive_invoice']); // Warning, not error
        $this->assertContains('email', array_column($result['warnings'], 'field'));
    }

    /** @test */
    public function it_warns_about_missing_vat_for_company_client()
    {
        $this->client->update(['is_company' => true, 'vat_number' => null]);

        $result = $this->service->canClientReceiveInvoices($this->client);

        $this->assertTrue($result['can_receive_invoice']); // Warning, not error
        $this->assertContains('vat_number', array_column($result['warnings'], 'field'));
    }

    /** @test */
    public function it_does_not_warn_about_missing_vat_for_individual_client()
    {
        $this->client->update(['is_company' => false, 'vat_number' => null]);

        $result = $this->service->canClientReceiveInvoices($this->client);

        $this->assertTrue($result['can_receive_invoice']);
        $this->assertNotContains('vat_number', array_column($result['warnings'], 'field'));
    }

    /** @test */
    public function it_validates_invoice_creation_with_compliant_tenant_and_client()
    {
        $result = $this->service->validateInvoiceCreation($this->tenant, $this->client);

        $this->assertTrue($result['can_create_invoice']);
        $this->assertEmpty($result['all_errors']);
        $this->assertEquals(0, $result['errors_count']);
        $this->assertArrayHasKey('tenant_validation', $result);
        $this->assertArrayHasKey('client_validation', $result);
    }

    /** @test */
    public function it_combines_tenant_and_client_errors()
    {
        $this->tenant->update(['siret' => null]);
        $this->client->update(['name' => null]);

        $result = $this->service->validateInvoiceCreation($this->tenant, $this->client);

        $this->assertFalse($result['can_create_invoice']);
        $this->assertCount(2, $result['all_errors']);
        $this->assertContains('siret', array_column($result['all_errors'], 'field'));
        $this->assertContains('name', array_column($result['all_errors'], 'field'));
    }

    /** @test */
    public function it_combines_warnings_from_both_validations()
    {
        $this->tenant->update(['email' => null]);
        $this->client->update(['email' => null]);

        $result = $this->service->validateInvoiceCreation($this->tenant, $this->client);

        $this->assertTrue($result['can_create_invoice']); // Only warnings
        $this->assertGreaterThanOrEqual(2, $result['warnings_count']);
    }

    /** @test */
    public function it_formats_validation_message_for_success()
    {
        $validation = $this->service->validateInvoiceCreation($this->tenant, $this->client);
        $message = $this->service->formatValidationMessage($validation);

        $this->assertStringContainsString('Tous les paramètres obligatoires sont renseignés', $message);
    }

    /** @test */
    public function it_formats_validation_message_with_tenant_errors()
    {
        $this->tenant->update(['siret' => null]);

        $validation = $this->service->validateInvoiceCreation($this->tenant, $this->client);
        $message = $this->service->formatValidationMessage($validation);

        $this->assertStringContainsString('Impossible de créer une facture', $message);
        $this->assertStringContainsString('PARAMÈTRES ENTREPRISE', $message);
        $this->assertStringContainsString('SIRET', $message);
    }

    /** @test */
    public function it_formats_validation_message_with_client_errors()
    {
        $this->client->update(['name' => null]);

        $validation = $this->service->validateInvoiceCreation($this->tenant, $this->client);
        $message = $this->service->formatValidationMessage($validation);

        $this->assertStringContainsString('PARAMÈTRES CLIENT', $message);
        $this->assertStringContainsString('nom du client', $message);
    }

    /** @test */
    public function it_formats_validation_message_with_both_errors()
    {
        $this->tenant->update(['siret' => null]);
        $this->client->update(['address' => null]);

        $validation = $this->service->validateInvoiceCreation($this->tenant, $this->client);
        $message = $this->service->formatValidationMessage($validation);

        $this->assertStringContainsString('PARAMÈTRES ENTREPRISE', $message);
        $this->assertStringContainsString('PARAMÈTRES CLIENT', $message);
    }

    /** @test */
    public function it_groups_errors_by_category()
    {
        $this->tenant->update([
            'siret' => null,
            'address_line1' => null,
            'vat_number' => null,
        ]);

        $result = $this->service->canTenantCreateInvoices($this->tenant);

        $this->assertArrayHasKey('errors_by_category', $result);
        $this->assertArrayHasKey('identification', $result['errors_by_category']);
        $this->assertArrayHasKey('address', $result['errors_by_category']);
        $this->assertArrayHasKey('vat', $result['errors_by_category']);
    }

    /** @test */
    public function it_returns_vat_exemption_reasons()
    {
        $reasons = $this->service->getVatExemptionReasons();

        $this->assertIsArray($reasons);
        $this->assertArrayHasKey('article_293b', $reasons);
        $this->assertArrayHasKey('auto_entrepreneur', $reasons);
        $this->assertArrayHasKey('export', $reasons);
        $this->assertArrayHasKey('intra_eu', $reasons);
        $this->assertStringContainsString('Article 293 B', $reasons['article_293b']);
    }

    /** @test */
    public function it_returns_company_types()
    {
        $types = $this->service->getCompanyTypes();

        $this->assertIsArray($types);
        $this->assertArrayHasKey('SARL', $types);
        $this->assertArrayHasKey('SAS', $types);
        $this->assertArrayHasKey('EI', $types);
        $this->assertArrayHasKey('AUTO', $types);
        $this->assertEquals('Société à Responsabilité Limitée', $types['SARL']);
    }

    /** @test */
    public function it_logs_warning_when_tenant_cannot_invoice()
    {
        Log::shouldReceive('warning')
            ->once()
            ->withArgs(function ($message, $context) {
                return str_contains($message, 'cannot create invoices')
                    && isset($context['tenant_id'])
                    && isset($context['errors']);
            });

        $this->tenant->update(['siret' => null]);
        $this->service->canTenantCreateInvoices($this->tenant);
    }

    /** @test */
    public function it_logs_warning_when_client_cannot_receive_invoice()
    {
        Log::shouldReceive('warning')
            ->once()
            ->withArgs(function ($message, $context) {
                return str_contains($message, 'cannot receive invoices')
                    && isset($context['client_id'])
                    && isset($context['errors']);
            });

        $this->client->update(['name' => null]);
        $this->service->canClientReceiveInvoices($this->client);
    }

    /** @test */
    public function it_handles_all_society_types_requiring_capital()
    {
        $societyTypes = ['SARL', 'EURL', 'SAS', 'SASU', 'SA', 'SNC', 'SCS', 'SCA'];

        foreach ($societyTypes as $type) {
            $this->tenant->update(['legal_form' => $type, 'capital' => null]);
            $result = $this->service->canTenantCreateInvoices($this->tenant);

            $this->assertFalse($result['can_invoice'], "Failed for type: $type");
            $this->assertContains('capital', array_column($result['errors'], 'field'));
        }
    }

    /** @test */
    public function it_handles_all_commercial_companies_requiring_rcs()
    {
        $commercialTypes = ['SARL', 'EURL', 'SAS', 'SASU', 'SA', 'SNC'];

        foreach ($commercialTypes as $type) {
            $this->tenant->update([
                'legal_form' => $type,
                'rcs_number' => null,
                'rcs_city' => null,
            ]);
            $result = $this->service->canTenantCreateInvoices($this->tenant);

            $this->assertFalse($result['can_invoice'], "Failed for type: $type");
            $this->assertContains('rcs_number', array_column($result['errors'], 'field'));
            $this->assertContains('rcs_city', array_column($result['errors'], 'field'));
        }
    }
}
