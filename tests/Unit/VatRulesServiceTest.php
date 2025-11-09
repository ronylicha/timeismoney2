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
}
