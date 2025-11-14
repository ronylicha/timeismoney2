<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Services\VatRulesService;

class VatRulesServiceTest extends TestCase
{

    /**
     * Test getting rules for general activity
     */
    public function test_get_rules_for_general_activity(): void
    {
        $rules = VatRulesService::getRulesForActivity('general');

        $this->assertEquals('Activité générale', $rules['name']);
        $this->assertFalse($rules['exempt']);
        $this->assertEquals(20.0, $rules['default_rate']);
        $this->assertFalse($rules['requires_license']);
    }

    /**
     * Test getting rules for insurance activity
     */
    public function test_get_rules_for_insurance_activity(): void
    {
        $rules = VatRulesService::getRulesForActivity('insurance');

        $this->assertEquals('Assurances', $rules['name']);
        $this->assertTrue($rules['exempt']);
        $this->assertEquals('Article 261 C CGI', $rules['article_cgi']);
        $this->assertEquals(0.0, $rules['default_rate']);
        $this->assertTrue($rules['mixed_activity']);
    }

    /**
     * Test getting rules for training activity
     */
    public function test_get_rules_for_training_activity(): void
    {
        $rules = VatRulesService::getRulesForActivity('training');

        $this->assertEquals('Formation professionnelle', $rules['name']);
        $this->assertTrue($rules['exempt']);
        $this->assertEquals('Article 261-4-4° CGI', $rules['article_cgi']);
        $this->assertEquals(0.0, $rules['default_rate']);
        $this->assertTrue($rules['requires_license']);
        $this->assertTrue($rules['mixed_activity']);
    }

    /**
     * Test checking if activity is exempt
     */
    public function test_is_activity_exempt(): void
    {
        $this->assertFalse(VatRulesService::isActivityExempt('general'));
        $this->assertTrue(VatRulesService::isActivityExempt('insurance'));
        $this->assertTrue(VatRulesService::isActivityExempt('training'));
        $this->assertTrue(VatRulesService::isActivityExempt('medical'));
    }

    /**
     * Test checking if activity can have mixed VAT rates
     */
    public function test_can_have_mixed_activity(): void
    {
        $this->assertFalse(VatRulesService::canHaveMixedActivity('general'));
        $this->assertTrue(VatRulesService::canHaveMixedActivity('insurance'));
        $this->assertTrue(VatRulesService::canHaveMixedActivity('training'));
        $this->assertFalse(VatRulesService::canHaveMixedActivity('medical'));
    }

    /**
     * Test checking if activity requires license
     */
    public function test_requires_license(): void
    {
        $this->assertFalse(VatRulesService::requiresLicense('general'));
        $this->assertFalse(VatRulesService::requiresLicense('insurance'));
        $this->assertTrue(VatRulesService::requiresLicense('training'));
        $this->assertFalse(VatRulesService::requiresLicense('medical'));
    }

    /**
     * Test suggesting VAT regime for different legal forms
     */
    public function test_suggest_vat_regime(): void
    {
        $this->assertEquals('franchise_base', VatRulesService::suggestVatRegime('EI', 'general'));
        $this->assertEquals('franchise_base', VatRulesService::suggestVatRegime('EIRL', 'general'));
        $this->assertEquals('normal', VatRulesService::suggestVatRegime('SARL', 'general'));
        $this->assertEquals('normal', VatRulesService::suggestVatRegime('SAS', 'general'));
    }

    /**
     * Test getting all available activities
     */
    public function test_get_all_activities(): void
    {
        $activities = VatRulesService::getAllActivities();

        $this->assertIsArray($activities);
        $this->assertArrayHasKey('general', $activities);
        $this->assertArrayHasKey('insurance', $activities);
        $this->assertArrayHasKey('training', $activities);
        $this->assertArrayHasKey('medical', $activities);
        $this->assertCount(9, $activities);
    }

    /**
     * Test default rate returns general rules for unknown activity
     */
    public function test_get_rules_returns_general_for_unknown_activity(): void
    {
        $rules = VatRulesService::getRulesForActivity('unknown_activity');

        $this->assertEquals('Activité générale', $rules['name']);
        $this->assertEquals(20.0, $rules['default_rate']);
    }

    /**
     * Test getting rules for all documented activities
     */
    public function test_get_rules_for_all_activities(): void
    {
        $activities = ['general', 'insurance', 'training', 'medical', 'banking', 'real_estate_rental', 'education', 'sports', 'other_exempt'];

        foreach ($activities as $activity) {
            $rules = VatRulesService::getRulesForActivity($activity);
            $this->assertIsArray($rules);
            $this->assertArrayHasKey('name', $rules);
            $this->assertArrayHasKey('exempt', $rules);
            $this->assertArrayHasKey('default_rate', $rules);
        }
    }

    /**
     * Test suggests normal regime for exempt activities
     */
    public function test_suggest_vat_regime_for_exempt_activity(): void
    {
        $regime = VatRulesService::suggestVatRegime('SARL', 'medical');
        $this->assertEquals('normal', $regime);
    }

    /**
     * Test suggests normal regime for companies
     */
    public function test_suggest_vat_regime_for_companies(): void
    {
        $this->assertEquals('normal', VatRulesService::suggestVatRegime('SA', 'general'));
        $this->assertEquals('normal', VatRulesService::suggestVatRegime('EURL', 'general'));
    }

    /**
     * Test real estate rental activity rules
     */
    public function test_get_rules_for_real_estate_rental(): void
    {
        $rules = VatRulesService::getRulesForActivity('real_estate_rental');

        $this->assertEquals('Location immobilière nue', $rules['name']);
        $this->assertTrue($rules['exempt']);
        $this->assertEquals('Article 261 D CGI', $rules['article_cgi']);
        $this->assertArrayHasKey('note', $rules);
    }

    /**
     * Test education activity rules
     */
    public function test_get_rules_for_education_activity(): void
    {
        $rules = VatRulesService::getRulesForActivity('education');

        $this->assertEquals('Enseignement', $rules['name']);
        $this->assertTrue($rules['exempt']);
        $this->assertEquals('Article 261-4-4° bis CGI', $rules['article_cgi']);
    }

    /**
     * Test sports activity rules
     */
    public function test_get_rules_for_sports_activity(): void
    {
        $rules = VatRulesService::getRulesForActivity('sports');

        $this->assertEquals('Éducation sportive', $rules['name']);
        $this->assertTrue($rules['exempt']);
        $this->assertEquals('Article 261-6° CGI', $rules['article_cgi']);
    }

    /**
     * Test banking activity rules
     */
    public function test_get_rules_for_banking_activity(): void
    {
        $rules = VatRulesService::getRulesForActivity('banking');

        $this->assertEquals('Banques et finances', $rules['name']);
        $this->assertTrue($rules['exempt']);
        $this->assertTrue($rules['mixed_activity']);
    }

    /**
     * Test medical activity rules
     */
    public function test_get_rules_for_medical_activity(): void
    {
        $rules = VatRulesService::getRulesForActivity('medical');

        $this->assertEquals('Professions médicales', $rules['name']);
        $this->assertTrue($rules['exempt']);
        $this->assertFalse($rules['requires_license']);
    }

    /**
     * Test training activity has license label
     */
    public function test_training_activity_has_license_label(): void
    {
        $rules = VatRulesService::getRulesForActivity('training');

        $this->assertArrayHasKey('license_label', $rules);
        $this->assertEquals('Numéro d\'agrément formation (BPF)', $rules['license_label']);
    }

    /**
     * Test other exempt activity rules
     */
    public function test_get_rules_for_other_exempt_activity(): void
    {
        $rules = VatRulesService::getRulesForActivity('other_exempt');

        $this->assertEquals('Autre activité exonérée', $rules['name']);
        $this->assertTrue($rules['exempt']);
        $this->assertTrue($rules['mixed_activity']);
        $this->assertEquals('À préciser', $rules['article_cgi']);
    }
}
