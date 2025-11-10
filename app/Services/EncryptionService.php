<?php

namespace App\Services;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Contracts\Encryption\DecryptException;

class EncryptionService
{
    /**
     * Encrypt sensitive data
     */
    public static function encrypt(?string $value): ?string
    {
        if (empty($value)) {
            return null;
        }

        try {
            return Crypt::encrypt($value);
        } catch (\Exception $e) {
            \Log::error('Encryption failed', [
                'error' => $e->getMessage(),
                'value_preview' => substr($value, 0, 10) . '...'
            ]);
            throw new \RuntimeException('Failed to encrypt data');
        }
    }

    /**
     * Decrypt sensitive data
     */
    public static function decrypt(?string $encryptedValue): ?string
    {
        if (empty($encryptedValue)) {
            return null;
        }

        try {
            return Crypt::decrypt($encryptedValue);
        } catch (DecryptException $e) {
            \Log::error('Decryption failed', [
                'error' => $e->getMessage(),
                'encrypted_preview' => substr($encryptedValue, 0, 20) . '...'
            ]);
            return null;
        } catch (\Exception $e) {
            \Log::error('Unexpected decryption error', [
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Check if a value is encrypted
     */
    public static function isEncrypted(string $value): bool
    {
        try {
            Crypt::decrypt($value);
            return true;
        } catch (DecryptException $e) {
            return false;
        }
    }

    /**
     * Encrypt Stripe keys for storage
     */
    public static function encryptStripeKeys(array $keys): array
    {
        return [
            'stripe_publishable_key' => self::encrypt($keys['stripe_publishable_key'] ?? null),
            'stripe_secret_key' => self::encrypt($keys['stripe_secret_key'] ?? null),
            'stripe_webhook_secret' => self::encrypt($keys['stripe_webhook_secret'] ?? null),
        ];
    }

    /**
     * Decrypt Stripe keys for usage
     */
    public static function decryptStripeKeys(array $encryptedKeys): array
    {
        return [
            'stripe_publishable_key' => self::decrypt($encryptedKeys['stripe_publishable_key'] ?? null),
            'stripe_secret_key' => self::decrypt($encryptedKeys['stripe_secret_key'] ?? null),
            'stripe_webhook_secret' => self::decrypt($encryptedKeys['stripe_webhook_secret'] ?? null),
        ];
    }
}