<?php

namespace Tests\Unit;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TimestampSettingsValidationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create a user with tenant and permissions
        $this->user = User::factory()->create();
        $this->tenant = $this->user->tenant;
        
        // Give the user manage_settings permission
        $this->user->givePermissionTo('manage_settings');
        
        $this->token = $this->user->createToken('test')->plainTextToken;
    }

    /** @test */
    public function it_validates_simple_provider_successfully()
    {
        $data = [
            'timestamp_enabled' => true,
            'timestamp_provider' => 'simple'
        ];

        $response = $this->postJson('/api/settings/timestamp', $data, [
            'Authorization' => 'Bearer ' . $this->token
        ]);

        $response->assertStatus(200);
    }

    /** @test */
    public function it_validates_openapi_provider_without_secret()
    {
        $data = [
            'timestamp_enabled' => true,
            'timestamp_provider' => 'openapi',
            'timestamp_tsa_url' => 'https://api.openapi.com/tsa/v1',
            'timestamp_api_key' => 'test-key',
            'timestamp_api_secret' => '', // Empty string should be valid for openapi
            'timestamp_certificate_id' => 'cert-123',
            'timestamp_include_certificate' => true
        ];

        $response = $this->postJson('/api/settings/timestamp', $data, [
            'Authorization' => 'Bearer ' . $this->token
        ]);

        $response->assertStatus(200);
    }

    /** @test */
    public function it_requires_secret_for_universign_provider()
    {
        $data = [
            'timestamp_enabled' => true,
            'timestamp_provider' => 'universign',
            'timestamp_tsa_url' => 'https://ws.universign.eu/tsa',
            'timestamp_api_key' => 'test-key',
            'timestamp_api_secret' => '', // Should fail for universign
        ];

        $response = $this->postJson('/api/settings/timestamp', $data, [
            'Authorization' => 'Bearer ' . $this->token
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['timestamp_api_secret']);
    }

    /** @test */
    public function it_accepts_patch_method()
    {
        $data = [
            'timestamp_enabled' => true,
            'timestamp_provider' => 'simple'
        ];

        $response = $this->patchJson('/api/settings/timestamp', $data, [
            'Authorization' => 'Bearer ' . $this->token
        ]);

        $response->assertStatus(200);
    }
}