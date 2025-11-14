<?php

namespace Tests\Unit;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TraitsTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::factory()->create();
        $this->user = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->actingAs($this->user);
    }

    /** @test */
    public function belongs_to_tenant_trait_auto_assigns_tenant_id_from_session()
    {
        session(['tenant_id' => $this->tenant->id]);

        $client = Client::create([
            'name' => 'Test Client',
            'email' => 'test@example.com',
        ]);

        $this->assertEquals($this->tenant->id, $client->tenant_id);
    }

    /** @test */
    public function belongs_to_tenant_trait_auto_assigns_tenant_id_from_auth_user()
    {
        session()->forget('tenant_id');

        $client = Client::create([
            'name' => 'Test Client',
            'email' => 'test@example.com',
        ]);

        $this->assertEquals($this->user->tenant_id, $client->tenant_id);
    }

    /** @test */
    public function belongs_to_tenant_trait_provides_tenant_relationship()
    {
        $client = Client::factory()->create(['tenant_id' => $this->tenant->id]);

        $this->assertInstanceOf(Tenant::class, $client->tenant);
        $this->assertEquals($this->tenant->id, $client->tenant->id);
    }

    /** @test */
    public function belongs_to_tenant_trait_provides_for_tenant_scope()
    {
        $otherTenant = Tenant::factory()->create();

        Client::factory()->count(3)->create(['tenant_id' => $this->tenant->id]);
        Client::factory()->count(2)->create(['tenant_id' => $otherTenant->id]);

        $clients = Client::forTenant($this->tenant->id)->get();

        $this->assertCount(3, $clients);
        $this->assertTrue($clients->every(fn($c) => $c->tenant_id === $this->tenant->id));
    }

    /** @test */
    public function belongs_to_tenant_trait_for_tenant_scope_uses_session_tenant()
    {
        session(['tenant_id' => $this->tenant->id]);

        $otherTenant = Tenant::factory()->create();

        Client::factory()->count(2)->create(['tenant_id' => $this->tenant->id]);
        Client::factory()->count(1)->create(['tenant_id' => $otherTenant->id]);

        $clients = Client::forTenant()->get();

        $this->assertCount(2, $clients);
    }

    /** @test */
    public function belongs_to_tenant_trait_belongs_to_current_tenant_returns_true_for_current_tenant()
    {
        session(['tenant_id' => $this->tenant->id]);

        $client = Client::factory()->create(['tenant_id' => $this->tenant->id]);

        $this->assertTrue($client->belongsToCurrentTenant());
    }

    /** @test */
    public function belongs_to_tenant_trait_belongs_to_current_tenant_returns_false_for_different_tenant()
    {
        session(['tenant_id' => $this->tenant->id]);

        $otherTenant = Tenant::factory()->create();
        $client = Client::factory()->create(['tenant_id' => $otherTenant->id]);

        $this->assertFalse($client->belongsToCurrentTenant());
    }

    /** @test */
    public function belongs_to_tenant_trait_belongs_to_current_tenant_checks_auth_user_tenant()
    {
        session()->forget('tenant_id');

        $client = Client::factory()->create(['tenant_id' => $this->user->tenant_id]);

        $this->assertTrue($client->belongsToCurrentTenant());
    }

    /** @test */
    public function belongs_to_tenant_trait_applies_global_scope()
    {
        $otherTenant = Tenant::factory()->create();

        // Create clients for both tenants
        Client::factory()->count(3)->create(['tenant_id' => $this->tenant->id]);
        Client::factory()->count(2)->create(['tenant_id' => $otherTenant->id]);

        // Set current tenant
        session(['tenant_id' => $this->tenant->id]);

        // Query should only return current tenant's clients due to global scope
        $clients = Client::all();

        $this->assertCount(3, $clients);
        $this->assertTrue($clients->every(fn($c) => $c->tenant_id === $this->tenant->id));
    }

    /** @test */
    public function belongs_to_tenant_trait_global_scope_can_be_disabled()
    {
        $otherTenant = Tenant::factory()->create();

        Client::factory()->count(2)->create(['tenant_id' => $this->tenant->id]);
        Client::factory()->count(3)->create(['tenant_id' => $otherTenant->id]);

        session(['tenant_id' => $this->tenant->id]);

        // Without global scope, should get all clients
        $allClients = Client::withoutGlobalScope(\App\Scopes\TenantScope::class)->get();

        $this->assertCount(5, $allClients);
    }

    /** @test */
    public function belongs_to_tenant_trait_works_with_multiple_models()
    {
        $client = Client::factory()->create(['tenant_id' => $this->tenant->id]);
        $invoice = Invoice::factory()->create([
            'tenant_id' => $this->tenant->id,
            'client_id' => $client->id,
        ]);

        $this->assertEquals($this->tenant->id, $client->tenant_id);
        $this->assertEquals($this->tenant->id, $invoice->tenant_id);
        $this->assertTrue($client->belongsToCurrentTenant());
        $this->assertTrue($invoice->belongsToCurrentTenant());
    }

    /** @test */
    public function belongs_to_tenant_trait_handles_missing_session_and_auth()
    {
        session()->forget('tenant_id');
        auth()->logout();

        $client = Client::factory()->create(['tenant_id' => 999]);

        $this->assertEquals(999, $client->tenant_id);
    }

    /** @test */
    public function belongs_to_tenant_trait_respects_explicitly_set_tenant_id()
    {
        session(['tenant_id' => $this->tenant->id]);

        $otherTenant = Tenant::factory()->create();
        $client = Client::create([
            'name' => 'Test Client',
            'email' => 'test@example.com',
            'tenant_id' => $otherTenant->id, // Explicitly set
        ]);

        // Should NOT override explicitly set tenant_id
        $this->assertEquals($otherTenant->id, $client->tenant_id);
    }

    /** @test */
    public function belongs_to_tenant_trait_for_tenant_scope_handles_null_tenant_id()
    {
        Client::factory()->count(3)->create(['tenant_id' => $this->tenant->id]);

        $clients = Client::forTenant(null)->get();

        // Should return all clients when no tenant specified and no session
        $this->assertGreaterThanOrEqual(3, $clients->count());
    }
}
