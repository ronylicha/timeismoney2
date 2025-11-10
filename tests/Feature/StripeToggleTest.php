<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Tenant;
use App\Services\EncryptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;

class StripeToggleTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::factory()->create([
            'stripe_enabled' => false,
            'stripe_publishable_key' => null,
            'stripe_secret_key' => null,
            'stripe_webhook_secret' => null,
        ]);

        $this->user = User::factory()->create([
            'tenant_id' => $this->tenant->id,
        ]);

        // Create a role with manage_settings permission for testing
        $role = \Spatie\Permission\Models\Role::create(['name' => 'admin']);
        $permission = \Spatie\Permission\Models\Permission::create(['name' => 'manage_settings']);
        $role->givePermissionTo($permission);
        $this->user->assignRole($role);
    }

    public function test_cannot_enable_stripe_without_keys()
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/settings/stripe/toggle', [
                'stripe_enabled' => true
            ]);

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Cannot enable Stripe: keys not configured',
                'error' => 'stripe_not_configured'
            ]);

        $this->assertDatabaseHas('tenants', [
            'id' => $this->tenant->id,
            'stripe_enabled' => false
        ]);
    }

    public function test_can_enable_stripe_with_keys()
    {
        // Configure Stripe keys first
        $this->tenant->update([
            'stripe_publishable_key' => EncryptionService::encrypt('pk_test_123'),
            'stripe_secret_key' => EncryptionService::encrypt('sk_test_123'),
            'stripe_webhook_secret' => EncryptionService::encrypt('whsec_123'),
        ]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/settings/stripe/toggle', [
                'stripe_enabled' => true
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Stripe enabled successfully',
                'data' => [
                    'stripe_enabled' => true,
                    'stripe_configured' => true,
                    'stripe_active' => true,
                ]
            ]);

        $this->assertDatabaseHas('tenants', [
            'id' => $this->tenant->id,
            'stripe_enabled' => true
        ]);
    }

    public function test_can_disable_stripe()
    {
        // Start with enabled Stripe
        $this->tenant->update([
            'stripe_enabled' => true,
            'stripe_publishable_key' => EncryptionService::encrypt('pk_test_123'),
            'stripe_secret_key' => EncryptionService::encrypt('sk_test_123'),
            'stripe_webhook_secret' => EncryptionService::encrypt('whsec_123'),
        ]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/settings/stripe/toggle', [
                'stripe_enabled' => false
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Stripe disabled successfully',
                'data' => [
                    'stripe_enabled' => false,
                    'stripe_configured' => true,
                    'stripe_active' => false,
                ]
            ]);

        $this->assertDatabaseHas('tenants', [
            'id' => $this->tenant->id,
            'stripe_enabled' => false
        ]);
    }

    public function test_toggle_requires_permission()
    {
        $userWithoutPermission = User::factory()->create([
            'tenant_id' => $this->tenant->id,
        ]);
        // Don't assign any role to this user

        $response = $this->actingAs($userWithoutPermission)
            ->postJson('/api/settings/stripe/toggle', [
                'stripe_enabled' => true
            ]);

        $response->assertStatus(403);
    }

    public function test_toggle_validation()
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/settings/stripe/toggle', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['stripe_enabled']);
    }

    public function test_stripe_status_methods()
    {
        // Test with no keys
        $this->assertFalse($this->tenant->hasStripeConfigured());
        $this->assertFalse($this->tenant->isStripeActive());

        // Add keys but keep disabled
        $this->tenant->update([
            'stripe_publishable_key' => EncryptionService::encrypt('pk_test_123'),
            'stripe_secret_key' => EncryptionService::encrypt('sk_test_123'),
            'stripe_webhook_secret' => EncryptionService::encrypt('whsec_123'),
        ]);

        $this->assertTrue($this->tenant->hasStripeConfigured());
        $this->assertFalse($this->tenant->isStripeActive());

        // Enable Stripe
        $this->tenant->update(['stripe_enabled' => true]);

        $this->assertTrue($this->tenant->hasStripeConfigured());
        $this->assertTrue($this->tenant->isStripeActive());
    }
}