<?php

namespace App\Services\HSM;

use Illuminate\Support\Facades\Log;
use Exception;

/**
 * HSM Manager - Factory for HSM implementations
 *
 * This class manages the selection and instantiation of the appropriate
 * HSM implementation based on the configuration.
 */
class HSMManager
{
    protected static ?HSMInterface $instance = null;

    /**
     * Get the HSM instance based on configuration
     *
     * @return HSMInterface
     * @throws Exception
     */
    public static function getInstance(): HSMInterface
    {
        if (self::$instance === null) {
            self::$instance = self::createInstance();
        }

        return self::$instance;
    }

    /**
     * Create a new HSM instance based on configuration
     *
     * @return HSMInterface
     * @throws Exception
     */
    protected static function createInstance(): HSMInterface
    {
        $mode = config('services.hsm.mode', 'simulator');

        Log::info('Initializing HSM', ['mode' => $mode]);

        return match($mode) {
            'simulator' => new HSMSimulator(),
            'hardware' => self::createHardwareHSM(),
            'cloud' => self::createCloudHSM(),
            default => throw new Exception("Unknown HSM mode: {$mode}")
        };
    }

    /**
     * Create hardware HSM instance
     *
     * @return HSMInterface
     * @throws Exception
     */
    protected static function createHardwareHSM(): HSMInterface
    {
        $provider = config('services.hsm.provider');

        if (!$provider) {
            throw new Exception('HSM provider not configured');
        }

        return match($provider) {
            'universign' => new CloudHSM\UniversignHSM(),
            'thales' => throw new Exception('Thales HSM not yet implemented'),
            'safenet' => throw new Exception('SafeNet HSM not yet implemented'),
            'utimaco' => throw new Exception('Utimaco HSM not yet implemented'),
            default => throw new Exception("Unknown HSM provider: {$provider}")
        };
    }

    /**
     * Create cloud HSM instance
     *
     * @return HSMInterface
     * @throws Exception
     */
    protected static function createCloudHSM(): HSMInterface
    {
        $provider = config('services.hsm.cloud_provider');

        if (!$provider) {
            throw new Exception('Cloud HSM provider not configured');
        }

        return match($provider) {
            'aws' => new CloudHSM\AWSCloudHSM(),
            'universign' => new CloudHSM\UniversignHSM(),
            'azure' => throw new Exception('Azure Key Vault not yet implemented'),
            'gcp' => throw new Exception('Google Cloud HSM not yet implemented'),
            default => throw new Exception("Unknown cloud HSM provider: {$provider}")
        };
    }

    /**
     * Reset the singleton instance (useful for testing)
     */
    public static function reset(): void
    {
        self::$instance = null;
    }

    /**
     * Set a custom instance (useful for testing)
     *
     * @param HSMInterface $instance
     */
    public static function setInstance(HSMInterface $instance): void
    {
        self::$instance = $instance;
    }
}