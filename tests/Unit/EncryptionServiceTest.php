<?php

namespace Tests\Unit;

use App\Services\EncryptionService;
use Illuminate\Support\Facades\Crypt;
use Tests\TestCase;

class EncryptionServiceTest extends TestCase
{
    /** @test */
    public function it_encrypts_a_value()
    {
        $value = 'sensitive_data';

        $encrypted = EncryptionService::encrypt($value);

        $this->assertNotNull($encrypted);
        $this->assertNotEquals($value, $encrypted);
        $this->assertIsString($encrypted);
    }

    /** @test */
    public function it_decrypts_an_encrypted_value()
    {
        $value = 'my_secret_key';
        $encrypted = Crypt::encrypt($value);

        $decrypted = EncryptionService::decrypt($encrypted);

        $this->assertEquals($value, $decrypted);
    }

    /** @test */
    public function it_returns_null_for_empty_encryption_input()
    {
        $this->assertNull(EncryptionService::encrypt(null));
        $this->assertNull(EncryptionService::encrypt(''));
    }

    /** @test */
    public function it_returns_null_for_empty_decryption_input()
    {
        $this->assertNull(EncryptionService::decrypt(null));
        $this->assertNull(EncryptionService::decrypt(''));
    }

    /** @test */
    public function it_returns_null_for_invalid_encrypted_data()
    {
        $result = EncryptionService::decrypt('invalid_encrypted_string');

        $this->assertNull($result);
    }

    /** @test */
    public function it_checks_if_value_is_encrypted()
    {
        $value = 'test_value';
        $encrypted = Crypt::encrypt($value);

        $this->assertTrue(EncryptionService::isEncrypted($encrypted));
        $this->assertFalse(EncryptionService::isEncrypted('plain_text'));
    }

    /** @test */
    public function it_encrypts_stripe_keys()
    {
        $keys = [
            'stripe_publishable_key' => 'pk_test_123',
            'stripe_secret_key' => 'sk_test_456',
            'stripe_webhook_secret' => 'whsec_789',
        ];

        $encrypted = EncryptionService::encryptStripeKeys($keys);

        $this->assertArrayHasKey('stripe_publishable_key', $encrypted);
        $this->assertArrayHasKey('stripe_secret_key', $encrypted);
        $this->assertArrayHasKey('stripe_webhook_secret', $encrypted);

        $this->assertNotEquals($keys['stripe_publishable_key'], $encrypted['stripe_publishable_key']);
        $this->assertNotEquals($keys['stripe_secret_key'], $encrypted['stripe_secret_key']);
        $this->assertNotEquals($keys['stripe_webhook_secret'], $encrypted['stripe_webhook_secret']);
    }

    /** @test */
    public function it_decrypts_stripe_keys()
    {
        $keys = [
            'stripe_publishable_key' => 'pk_test_123',
            'stripe_secret_key' => 'sk_test_456',
            'stripe_webhook_secret' => 'whsec_789',
        ];

        $encrypted = EncryptionService::encryptStripeKeys($keys);
        $decrypted = EncryptionService::decryptStripeKeys($encrypted);

        $this->assertEquals($keys['stripe_publishable_key'], $decrypted['stripe_publishable_key']);
        $this->assertEquals($keys['stripe_secret_key'], $decrypted['stripe_secret_key']);
        $this->assertEquals($keys['stripe_webhook_secret'], $decrypted['stripe_webhook_secret']);
    }

    /** @test */
    public function it_handles_missing_stripe_keys()
    {
        $keys = [
            'stripe_publishable_key' => 'pk_test_123',
            // Missing other keys
        ];

        $encrypted = EncryptionService::encryptStripeKeys($keys);

        $this->assertNotNull($encrypted['stripe_publishable_key']);
        $this->assertNull($encrypted['stripe_secret_key']);
        $this->assertNull($encrypted['stripe_webhook_secret']);
    }

    /** @test */
    public function it_handles_empty_array_for_stripe_keys()
    {
        $encrypted = EncryptionService::encryptStripeKeys([]);

        $this->assertNull($encrypted['stripe_publishable_key']);
        $this->assertNull($encrypted['stripe_secret_key']);
        $this->assertNull($encrypted['stripe_webhook_secret']);
    }

    /** @test */
    public function encryption_and_decryption_are_reversible()
    {
        $originalValue = 'test_secret_123';

        $encrypted = EncryptionService::encrypt($originalValue);
        $decrypted = EncryptionService::decrypt($encrypted);

        $this->assertEquals($originalValue, $decrypted);
    }

    /** @test */
    public function it_handles_special_characters_in_encryption()
    {
        $value = 'special!@#$%^&*()_+-=[]{}|;:,.<>?/~`';

        $encrypted = EncryptionService::encrypt($value);
        $decrypted = EncryptionService::decrypt($encrypted);

        $this->assertEquals($value, $decrypted);
    }

    /** @test */
    public function it_handles_unicode_characters_in_encryption()
    {
        $value = '你好世界 Привет мир مرحبا بالعالم';

        $encrypted = EncryptionService::encrypt($value);
        $decrypted = EncryptionService::decrypt($encrypted);

        $this->assertEquals($value, $decrypted);
    }

    /** @test */
    public function it_handles_long_strings_in_encryption()
    {
        $value = str_repeat('A', 10000);

        $encrypted = EncryptionService::encrypt($value);
        $decrypted = EncryptionService::decrypt($encrypted);

        $this->assertEquals($value, $decrypted);
        $this->assertEquals(10000, strlen($decrypted));
    }

    /** @test */
    public function multiple_encryptions_produce_different_ciphertexts()
    {
        $value = 'same_value';

        $encrypted1 = EncryptionService::encrypt($value);
        $encrypted2 = EncryptionService::encrypt($value);

        // Different ciphertexts due to random initialization vector
        $this->assertNotEquals($encrypted1, $encrypted2);

        // But both decrypt to same value
        $this->assertEquals($value, EncryptionService::decrypt($encrypted1));
        $this->assertEquals($value, EncryptionService::decrypt($encrypted2));
    }
}
