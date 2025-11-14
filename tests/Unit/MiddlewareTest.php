<?php

namespace Tests\Unit;

use App\Http\Middleware\CheckSuperAdmin;
use App\Http\Middleware\SetTenant;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Tests\TestCase;

class MiddlewareTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;
    private User $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::factory()->create(['name' => 'Test Tenant']);
        $this->user = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'role' => 'user',
        ]);

        $this->superAdmin = User::factory()->create([
            'tenant_id' => null,
            'role' => 'super-admin',
        ]);
    }

    /** @test */
    public function set_tenant_middleware_sets_tenant_for_regular_user()
    {
        $this->actingAs($this->user);

        $request = Request::create('/test', 'GET');
        $middleware = new SetTenant();

        $response = $middleware->handle($request, function ($req) {
            return new Response('OK');
        });

        $this->assertEquals($this->tenant->id, session('tenant_id'));
        $this->assertFalse(session('is_super_admin'));
        $this->assertEquals($this->tenant->id, config('tenant.id'));
        $this->assertEquals(200, $response->getStatusCode());
    }

    /** @test */
    public function set_tenant_middleware_loads_tenant_object_in_session()
    {
        $this->actingAs($this->user);

        $request = Request::create('/test', 'GET');
        $middleware = new SetTenant();

        $middleware->handle($request, function ($req) {
            return new Response('OK');
        });

        $this->assertNotNull(session('tenant'));
        $this->assertEquals($this->tenant->id, session('tenant')->id);
        $this->assertNotNull(config('tenant.current'));
    }

    /** @test */
    public function set_tenant_middleware_clears_tenant_for_super_admin()
    {
        // Mock the hasRole method for super admin
        $this->actingAs($this->superAdmin);

        // Assuming hasRole is a method on the user model
        // We need to create the role first
        \Spatie\Permission\Models\Role::create(['name' => 'super-admin']);
        $this->superAdmin->assignRole('super-admin');

        $request = Request::create('/test', 'GET');
        $middleware = new SetTenant();

        $response = $middleware->handle($request, function ($req) {
            return new Response('OK');
        });

        $this->assertNull(session('tenant_id'));
        $this->assertTrue(session('is_super_admin'));
        $this->assertNull(config('tenant.id'));
        $this->assertNull(config('tenant.current'));
        $this->assertEquals(200, $response->getStatusCode());
    }

    /** @test */
    public function set_tenant_middleware_does_nothing_for_guest()
    {
        // No authenticated user
        $request = Request::create('/test', 'GET');
        $middleware = new SetTenant();

        $response = $middleware->handle($request, function ($req) {
            return new Response('OK');
        });

        $this->assertNull(session('tenant_id'));
        $this->assertEquals(200, $response->getStatusCode());
    }

    /** @test */
    public function check_super_admin_middleware_allows_super_admin()
    {
        $this->actingAs($this->superAdmin);

        $request = Request::create('/admin/test', 'GET');
        $middleware = new CheckSuperAdmin();

        $response = $middleware->handle($request, function ($req) {
            return new Response('OK', 200);
        });

        $this->assertEquals(200, $response->getStatusCode());
    }

    /** @test */
    public function check_super_admin_middleware_blocks_regular_user()
    {
        $this->actingAs($this->user);

        $request = Request::create('/admin/test', 'GET');
        $middleware = new CheckSuperAdmin();

        $response = $middleware->handle($request, function ($req) {
            return new Response('OK', 200);
        });

        $this->assertEquals(403, $response->getStatusCode());
        $content = json_decode($response->getContent(), true);
        $this->assertArrayHasKey('message', $content);
        $this->assertStringContainsString('Unauthorized', $content['message']);
    }

    /** @test */
    public function check_super_admin_middleware_blocks_guest()
    {
        // No authenticated user
        $request = Request::create('/admin/test', 'GET');
        $middleware = new CheckSuperAdmin();

        $response = $middleware->handle($request, function ($req) {
            return new Response('OK', 200);
        });

        $this->assertEquals(403, $response->getStatusCode());
        $content = json_decode($response->getContent(), true);
        $this->assertEquals('Unauthorized. Super admin access required.', $content['message']);
    }

    /** @test */
    public function check_super_admin_middleware_checks_exact_role_value()
    {
        // Create user with different role
        $admin = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'role' => 'admin', // Not super-admin
        ]);

        $this->actingAs($admin);

        $request = Request::create('/admin/test', 'GET');
        $middleware = new CheckSuperAdmin();

        $response = $middleware->handle($request, function ($req) {
            return new Response('OK', 200);
        });

        $this->assertEquals(403, $response->getStatusCode());
    }

    /** @test */
    public function set_tenant_middleware_handles_user_without_tenant()
    {
        $userWithoutTenant = User::factory()->create([
            'tenant_id' => null,
            'role' => 'user',
        ]);

        $this->actingAs($userWithoutTenant);

        $request = Request::create('/test', 'GET');
        $middleware = new SetTenant();

        $response = $middleware->handle($request, function ($req) {
            return new Response('OK');
        });

        $this->assertNull(session('tenant_id'));
        $this->assertEquals(200, $response->getStatusCode());
    }

    /** @test */
    public function set_tenant_middleware_preserves_request_attributes()
    {
        $this->actingAs($this->user);

        $request = Request::create('/test', 'GET');
        $request->merge(['key' => 'value']);

        $middleware = new SetTenant();

        $response = $middleware->handle($request, function ($req) {
            $this->assertEquals('value', $req->input('key'));
            return new Response('OK');
        });

        $this->assertEquals(200, $response->getStatusCode());
    }

    /** @test */
    public function middleware_chain_works_correctly()
    {
        $this->actingAs($this->user);

        $request = Request::create('/test', 'GET');

        $setTenantMiddleware = new SetTenant();

        $response = $setTenantMiddleware->handle($request, function ($req) {
            // After SetTenant middleware
            $this->assertEquals($this->tenant->id, session('tenant_id'));
            return new Response('OK');
        });

        $this->assertEquals(200, $response->getStatusCode());
    }
}
