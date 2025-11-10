<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Models\Tenant;
use App\Models\User;
use App\Services\EncryptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;

class StripeEncryptionTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->tenant = Tenant::factory()->create([
            'stripe_enabled' => true,
        ]);
        
        $this->user = User::factory()->create([
            'tenant_id' => $this->tenant->id,
        ]);
    }

    public function test_stripe_keys_encryption()
    {
        $keys = [
            'stripe_publishable_key' => 'pk_test_1234567890',
            'stripe_secret_key' => 'sk_test_1234567890',
            'stripe_webhook_secret' => 'whsec_1234567890',
        ];

        $encrypted = EncryptionService::encryptStripeKeys($keys);
        $decrypted = EncryptionService::decryptStripeKeys($encrypted);

        $this->assertEquals($keys['stripe_publishable_key'], $decrypted['stripe_publishable_key']);
        $this->assertEquals($keys['stripe_secret_key'], $decrypted['stripe_secret_key']);
        $this->assertEquals($keys['stripe_webhook_secret'], $decrypted['stripe_webhook_secret']);
    }

    public function test_tenant_stripe_key_encryption()
    {
        $this->actingAs($this->user);

        $keys = [
            'stripe_publishable_key' => 'pk_test_1234567890',
            'stripe_secret_key' => 'sk_test_1234567890',
            'stripe_webhook_secret' => 'whsec_1234567890',
            'stripe_enabled' => true,
        ];

        $this->tenant->setStripeKeys($keys);

        // Verify keys are encrypted in database
        $this->assertNotEquals($keys['stripe_secret_key'], $this->tenant->stripe_secret_key);
        $this->assertTrue(EncryptionService::isEncrypted($this->tenant->stripe_secret_key));

        // Verify decrypted keys match original
        $this->assertEquals($keys['stripe_publishable_key'], $this->tenant->getStripePublishableKey());
        $this->assertEquals($keys['stripe_secret_key'], $this->tenant->getStripeSecretKey());
        $this->assertEquals($keys['stripe_webhook_secret'], $this->tenant->getStripeWebhookSecret());
    }

    public function test_stripe_key_display_masking()
    {
        $this->actingAs($this->user);

        $keys = [
            'stripe_publishable_key' => 'pk_test_1234567890abcdef',
            'stripe_secret_key' => 'sk_test_1234567890abcdef',
            'stripe_webhook_secret' => 'whsec_1234567890abcdef',
            'stripe_enabled' => true,
        ];

        $this->tenant->setStripeKeys($keys);

        $displayKey = $this->tenant->getStripePublishableKeyForDisplay();
        $displayWebhook = $this->tenant->getStripeWebhookSecretForDisplay();

        $this->assertStringStartsWith('pk_test_', $displayKey);
        $this->assertStringEndsWith('cdef', $displayKey);
        $this->assertStringContainsString('...', $displayKey);

        $this->assertStringStartsWith('whsec_', $displayWebhook);
        $this->assertStringEndsWith('cdef', $displayWebhook);
        $this->assertStringContainsString('...', $displayWebhook);
    }

    public function test_stripe_connection_test()
    {
        $this->actingAs($this->user);

        // Test with invalid keys
        $keys = [
            'stripe_publishable_key' => 'pk_test_invalid',
            'stripe_secret_key' => 'sk_test_invalid',
            'stripe_enabled' => true,
        ];

        $this->tenant->setStripeKeys($keys);
        $result = $this->tenant->testStripeConnection();

        $this->assertFalse($result['success']);
        $this->assertArrayHasKey('error', $result);
    }

    public function test_empty_keys_handling()
    {
        $this->actingAs($this->user);

        $this->tenant->setStripeKeys([
            'stripe_publishable_key' => null,
            'stripe_secret_key' => null,
            'stripe_webhook_secret' => null,
            'stripe_enabled' => false,
        ]);

        $this->assertNull($this->tenant->getStripePublishableKey());
        $this->assertNull($this->tenant->getStripeSecretKey());
        $this->assertNull($this->tenant->getStripeWebhookSecret());
        $this->assertFalse($this->tenant->hasStripeConfigured());
    }
}