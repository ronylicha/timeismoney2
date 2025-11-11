<?php

namespace App\Services;

use App\Services\HSM\HSMManager;
use App\Services\HSM\HSMInterface;
use App\Models\Invoice;
use App\Models\ElectronicSignature;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Exception;

/**
 * Electronic Signature Service with HSM Integration
 *
 * This service provides electronic signature capabilities using HSM
 * for secure key storage and cryptographic operations.
 */
class ElectronicSignatureServiceWithHSM
{
    protected HSMInterface $hsm;
    protected string $defaultKeyId = 'main-signing-key';

    public function __construct()
    {
        $this->hsm = HSMManager::getInstance();
        $this->initializeSigningKey();
    }

    /**
     * Initialize the main signing key if it doesn't exist
     */
    protected function initializeSigningKey(): void
    {
        if (!$this->hsm->keyExists($this->defaultKeyId)) {
            Log::info('Initializing main signing key in HSM');

            $keyData = $this->hsm->generateKeyPair($this->defaultKeyId, [
                'algorithm' => 'RSA',
                'key_size' => 2048
            ]);

            Log::info('Main signing key initialized', [
                'key_id' => $keyData['key_id'],
                'algorithm' => $keyData['algorithm']
            ]);
        }
    }

    /**
     * Sign an invoice electronically using HSM
     *
     * @param Invoice $invoice
     * @param array $options
     * @return ElectronicSignature
     * @throws Exception
     */
    public function signInvoice(Invoice $invoice, array $options = []): ElectronicSignature
    {
        // Validate invoice can be signed
        if ($invoice->status !== 'finalized') {
            throw new Exception('Only finalized invoices can be signed');
        }

        if ($invoice->electronic_signature_id) {
            throw new Exception('Invoice is already signed');
        }

        // Prepare data to sign
        $dataToSign = $this->prepareInvoiceData($invoice);

        // Get timestamp
        $timestamp = now();

        // Add timestamp to data
        $dataToSign['timestamp'] = $timestamp->toIso8601String();

        // Create canonical representation
        $canonicalData = $this->canonicalize($dataToSign);

        // Hash the data
        $hash = hash('sha256', $canonicalData);

        // Sign using HSM
        $keyId = $options['key_id'] ?? $this->defaultKeyId;
        $algorithm = $options['algorithm'] ?? 'RS256';

        try {
            // Sign the hash
            $signature = $this->hsm->sign($hash, $keyId, $algorithm);

            // Get public key for verification
            $publicKey = $this->hsm->getPublicKey($keyId);

            // Get certificate if available
            $certificate = $this->hsm->getCertificate($keyId);

            // Create signature record
            $electronicSignature = ElectronicSignature::create([
                'invoice_id' => $invoice->id,
                'signature' => $signature,
                'signature_hash' => $hash,
                'signature_algorithm' => $algorithm,
                'public_key' => $publicKey,
                'certificate' => $certificate,
                'signer_name' => auth()->user()->name ?? 'System',
                'signer_email' => auth()->user()->email ?? 'system@timeismoney.com',
                'signed_at' => $timestamp,
                'signature_level' => $this->determineSignatureLevel($certificate),
                'hsm_mode' => config('services.hsm.mode'),
                'hsm_key_id' => $keyId,
                'metadata' => [
                    'ip_address' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                    'invoice_data' => $dataToSign
                ]
            ]);

            // Update invoice
            $invoice->electronic_signature_id = $electronicSignature->id;
            $invoice->save();

            Log::info('Invoice signed electronically', [
                'invoice_id' => $invoice->id,
                'signature_id' => $electronicSignature->id,
                'hsm_key_id' => $keyId
            ]);

            return $electronicSignature;

        } catch (Exception $e) {
            Log::error('Failed to sign invoice', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage()
            ]);

            throw new Exception('Failed to sign invoice: ' . $e->getMessage());
        }
    }

    /**
     * Verify an electronic signature using HSM
     *
     * @param ElectronicSignature $signature
     * @return bool
     */
    public function verifySignature(ElectronicSignature $signature): bool
    {
        try {
            // Reconstruct the data that was signed
            $invoice = $signature->invoice;
            $dataToSign = $this->prepareInvoiceData($invoice);
            $dataToSign['timestamp'] = Carbon::parse($signature->signed_at)->toIso8601String();

            // Create canonical representation
            $canonicalData = $this->canonicalize($dataToSign);

            // Hash the data
            $hash = hash('sha256', $canonicalData);

            // Verify the hash matches
            if ($hash !== $signature->signature_hash) {
                Log::warning('Signature hash mismatch', [
                    'signature_id' => $signature->id,
                    'expected_hash' => $signature->signature_hash,
                    'calculated_hash' => $hash
                ]);
                return false;
            }

            // Verify signature using HSM
            $isValid = $this->hsm->verify(
                $hash,
                $signature->signature,
                $signature->hsm_key_id ?? $this->defaultKeyId,
                $signature->signature_algorithm
            );

            Log::info('Signature verification completed', [
                'signature_id' => $signature->id,
                'valid' => $isValid
            ]);

            return $isValid;

        } catch (Exception $e) {
            Log::error('Failed to verify signature', [
                'signature_id' => $signature->id,
                'error' => $e->getMessage()
            ]);

            return false;
        }
    }

    /**
     * Get HSM status and information
     *
     * @return array
     */
    public function getHSMStatus(): array
    {
        return $this->hsm->getStatus();
    }

    /**
     * List all signing keys
     *
     * @return array
     */
    public function listSigningKeys(): array
    {
        return $this->hsm->listKeys();
    }

    /**
     * Generate a new signing key
     *
     * @param string $keyId
     * @param array $options
     * @return array
     */
    public function generateSigningKey(string $keyId, array $options = []): array
    {
        return $this->hsm->generateKeyPair($keyId, $options);
    }

    /**
     * Store a certificate for a key
     *
     * @param string $keyId
     * @param string $certificate
     * @return bool
     */
    public function storeCertificate(string $keyId, string $certificate): bool
    {
        return $this->hsm->storeCertificate($keyId, $certificate);
    }

    /**
     * Prepare invoice data for signing
     *
     * @param Invoice $invoice
     * @return array
     */
    protected function prepareInvoiceData(Invoice $invoice): array
    {
        return [
            'invoice_id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'issue_date' => $invoice->issue_date,
            'due_date' => $invoice->due_date,
            'client_id' => $invoice->client_id,
            'client_name' => $invoice->client->name,
            'total_ht' => $invoice->total_ht,
            'total_tva' => $invoice->total_tva,
            'total_ttc' => $invoice->total_ttc,
            'items' => $invoice->items->map(function ($item) {
                return [
                    'description' => $item->description,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'total' => $item->total
                ];
            })->toArray()
        ];
    }

    /**
     * Create canonical representation of data
     *
     * @param array $data
     * @return string
     */
    protected function canonicalize(array $data): string
    {
        // Sort keys recursively
        ksort($data);
        foreach ($data as &$value) {
            if (is_array($value)) {
                ksort($value);
            }
        }

        // Create JSON representation
        return json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    /**
     * Determine signature level based on certificate
     *
     * @param string|null $certificate
     * @return string
     */
    protected function determineSignatureLevel(?string $certificate): string
    {
        if (!$certificate) {
            return 'SES'; // Simple Electronic Signature
        }

        // In a real implementation, parse the certificate to determine
        // if it's qualified (QES) or advanced (AES)
        // For now, return AES if certificate exists
        return 'AES'; // Advanced Electronic Signature
    }
}