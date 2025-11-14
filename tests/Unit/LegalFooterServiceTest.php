<?php

namespace Tests\Unit;

use App\Models\Tenant;
use App\Models\User;
use App\Services\LegalFooterService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LegalFooterServiceTest extends TestCase
{
    use RefreshDatabase;

    private LegalFooterService $service;
    private Tenant $tenant;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new LegalFooterService();

        $this->tenant = Tenant::factory()->create([
            'company_name' => 'Test Company SAS',
            'legal_form' => 'SAS',
            'address_line1' => '123 Rue de Test',
            'postal_code' => '75001',
            'city' => 'Paris',
            'country' => 'France',
            'siret' => '12345678901234',
            'rcs_number' => '123456789',
            'rcs_city' => 'Paris',
            'ape_code' => '6201Z',
            'capital' => 10000,
            'vat_subject' => true,
            'vat_number' => 'FR12345678901',
            'phone' => '0123456789',
            'email' => 'contact@test.com',
            'default_payment_terms' => 30,
        ]);

        $this->user = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->actingAs($this->user);
    }

    /** @test */
    public function it_generates_footer_for_invoice()
    {
        $footer = $this->service->generateFooter($this->tenant, 'invoice');

        $this->assertIsString($footer);
        $this->assertStringContainsString('Test Company SAS', $footer);
        $this->assertStringContainsString('SIRET', $footer);
    }

    /** @test */
    public function it_generates_footer_for_quote()
    {
        $footer = $this->service->generateFooter($this->tenant, 'quote');

        $this->assertIsString($footer);
        $this->assertStringContainsString('Devis gratuit', $footer);
        $this->assertStringContainsString('Valable 30 jours', $footer);
    }

    /** @test */
    public function it_includes_company_name_and_legal_form()
    {
        $footer = $this->service->generateFooter($this->tenant);

        $this->assertStringContainsString('Test Company SAS', $footer);
        $this->assertStringContainsString('SAS', $footer);
    }

    /** @test */
    public function it_includes_siret_number()
    {
        $footer = $this->service->generateFooter($this->tenant);

        $this->assertStringContainsString('SIRET: 12345678901234', $footer);
    }

    /** @test */
    public function it_includes_rcs_information()
    {
        $footer = $this->service->generateFooter($this->tenant);

        $this->assertStringContainsString('RCS Paris', $footer);
        $this->assertStringContainsString('123456789', $footer);
    }

    /** @test */
    public function it_includes_ape_code()
    {
        $footer = $this->service->generateFooter($this->tenant);

        $this->assertStringContainsString('APE: 6201Z', $footer);
    }

    /** @test */
    public function it_includes_capital_for_sas()
    {
        $footer = $this->service->generateFooter($this->tenant);

        $this->assertStringContainsString('Capital social', $footer);
        $this->assertStringContainsString('10 000,00 €', $footer);
    }

    /** @test */
    public function it_includes_vat_number_for_vat_subject()
    {
        $footer = $this->service->generateFooter($this->tenant);

        $this->assertStringContainsString('N° TVA: FR12345678901', $footer);
    }

    /** @test */
    public function it_includes_vat_exemption_for_non_vat_subject()
    {
        $this->tenant->update([
            'vat_subject' => false,
            'vat_exemption_reason' => 'Article 293 B du CGI',
        ]);

        $footer = $this->service->generateFooter($this->tenant);

        $this->assertStringContainsString('TVA non applicable', $footer);
        $this->assertStringContainsString('Article 293 B du CGI', $footer);
    }

    /** @test */
    public function it_includes_contact_information()
    {
        $footer = $this->service->generateFooter($this->tenant);

        $this->assertStringContainsString('Tél: 0123456789', $footer);
        $this->assertStringContainsString('Email: contact@test.com', $footer);
    }

    /** @test */
    public function it_includes_payment_conditions_for_invoice()
    {
        $footer = $this->service->generateFooter($this->tenant, 'invoice');

        $this->assertStringContainsString('CONDITIONS DE PAIEMENT', $footer);
        $this->assertStringContainsString('Paiement à 30 jours nets', $footer);
    }

    /** @test */
    public function it_includes_penalty_rate_for_invoice()
    {
        $footer = $this->service->generateFooter($this->tenant, 'invoice');

        $this->assertStringContainsString('19,59%', $footer);
        $this->assertStringContainsString('pénalités de retard', $footer);
    }

    /** @test */
    public function it_includes_recovery_indemnity_for_invoice()
    {
        $footer = $this->service->generateFooter($this->tenant, 'invoice');

        $this->assertStringContainsString('40 €', $footer);
        $this->assertStringContainsString('frais de recouvrement', $footer);
    }

    /** @test */
    public function it_does_not_include_payment_conditions_for_quote()
    {
        $footer = $this->service->generateFooter($this->tenant, 'quote');

        $this->assertStringNotContainsString('CONDITIONS DE PAIEMENT', $footer);
        $this->assertStringNotContainsString('pénalités de retard', $footer);
    }

    /** @test */
    public function it_formats_address_correctly()
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('formatAddress');
        $method->setAccessible(true);

        $address = $method->invoke($this->service, $this->tenant);

        $this->assertStringContainsString('123 Rue de Test', $address);
        $this->assertStringContainsString('75001 Paris', $address);
    }

    /** @test */
    public function it_handles_address_with_line2()
    {
        $this->tenant->update(['address_line2' => 'Bâtiment A']);

        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('formatAddress');
        $method->setAccessible(true);

        $address = $method->invoke($this->service, $this->tenant);

        $this->assertStringContainsString('Bâtiment A', $address);
    }

    /** @test */
    public function it_includes_country_for_non_france()
    {
        $this->tenant->update(['country' => 'Belgium']);

        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('formatAddress');
        $method->setAccessible(true);

        $address = $method->invoke($this->service, $this->tenant);

        $this->assertStringContainsString('Belgium', $address);
    }

    /** @test */
    public function it_does_not_include_country_for_france()
    {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('formatAddress');
        $method->setAccessible(true);

        $address = $method->invoke($this->service, $this->tenant);

        $this->assertStringNotContainsString('France', $address);
    }

    /** @test */
    public function it_generates_legal_mentions_for_invoice()
    {
        $mentions = $this->service->generateLegalMentions($this->tenant, 'invoice');

        $this->assertStringContainsString('MENTIONS LÉGALES', $mentions);
        $this->assertStringContainsString('Pénalités de retard', $mentions);
        $this->assertStringContainsString('Indemnité forfaitaire', $mentions);
    }

    /** @test */
    public function it_generates_legal_mentions_for_quote()
    {
        $mentions = $this->service->generateLegalMentions($this->tenant, 'quote');

        $this->assertStringContainsString('MENTIONS LÉGALES', $mentions);
        $this->assertStringContainsString('propriété', $mentions);
    }

    /** @test */
    public function it_includes_rgpd_mention()
    {
        $mentions = $this->service->generateLegalMentions($this->tenant);

        $this->assertStringContainsString('RGPD', $mentions);
    }

    /** @test */
    public function it_handles_micro_entreprise()
    {
        $this->tenant->update(['legal_form' => 'Micro-entreprise']);

        $footer = $this->service->generateFooter($this->tenant);

        $this->assertStringContainsString('Dispensé d\'immatriculation', $footer);
    }

    /** @test */
    public function it_includes_insurance_info_if_present()
    {
        $this->tenant->update([
            'insurance_company' => 'AXA',
            'insurance_policy_number' => 'POL123456',
        ]);

        $footer = $this->service->generateFooter($this->tenant);

        $this->assertStringContainsString('ASSURANCE: AXA', $footer);
        $this->assertStringContainsString('POL123456', $footer);
    }

    /** @test */
    public function it_includes_website_if_present()
    {
        $this->tenant->update(['website' => 'https://example.com']);

        $footer = $this->service->generateFooter($this->tenant);

        $this->assertStringContainsString('Site web: https://example.com', $footer);
    }

    /** @test */
    public function it_includes_professional_order_if_present()
    {
        $this->tenant->update(['professional_order' => 'Ordre des Experts-Comptables']);

        $footer = $this->service->generateFooter($this->tenant);

        $this->assertStringContainsString('Membre de l\'ordre', $footer);
        $this->assertStringContainsString('Experts-Comptables', $footer);
    }

    /** @test */
    public function it_handles_early_payment_discount()
    {
        $this->tenant->update(['early_payment_discount_rate' => 2.5]);

        $footer = $this->service->generateFooter($this->tenant, 'invoice');

        $this->assertStringContainsString('Escompte pour paiement anticipé: 2.5%', $footer);
    }

    /** @test */
    public function it_shows_no_discount_when_not_applicable()
    {
        $this->tenant->update(['early_payment_discount_rate' => null]);

        $footer = $this->service->generateFooter($this->tenant, 'invoice');

        $this->assertStringContainsString('Pas d\'escompte', $footer);
    }

    /** @test */
    public function it_handles_tenant_without_optional_fields()
    {
        $minimalTenant = Tenant::factory()->create([
            'company_name' => 'Minimal Company',
            'siret' => '98765432109876',
        ]);

        $footer = $this->service->generateFooter($minimalTenant);

        $this->assertIsString($footer);
        $this->assertNotEmpty($footer);
        $this->assertStringContainsString('Minimal Company', $footer);
    }

    /** @test */
    public function it_does_not_include_capital_for_ei()
    {
        $this->tenant->update([
            'legal_form' => 'EI',
            'capital' => 5000,
        ]);

        $footer = $this->service->generateFooter($this->tenant);

        $this->assertStringNotContainsString('Capital social', $footer);
    }

    /** @test */
    public function it_uses_immediate_payment_when_no_terms_specified()
    {
        $this->tenant->update(['default_payment_terms' => null]);

        $footer = $this->service->generateFooter($this->tenant, 'invoice');

        $this->assertStringContainsString('Paiement à réception de facture', $footer);
    }
}
