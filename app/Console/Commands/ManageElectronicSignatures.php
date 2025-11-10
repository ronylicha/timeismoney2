<?php

namespace App\Console\Commands;

use App\Services\ElectronicSignatureService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ManageElectronicSignatures extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'signature:manage {action} {--file=} {--signer=} {--role=}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Manage electronic signatures for Factur-X documents';

    /**
     * Execute the console command.
     */
    public function handle(ElectronicSignatureService $signatureService): int
    {
        $action = $this->argument('action');
        
        switch ($action) {
            case 'status':
                return $this->showStatus($signatureService);
                
            case 'sign':
                return $this->signDocument($signatureService);
                
            case 'verify':
                return $this->verifyDocument($signatureService);
                
            case 'validate':
                return $this->validateDocument($signatureService);
                
            default:
                $this->error("Action '{$action}' not recognized");
                $this->info('Available actions: status, sign, verify, validate');
                return Command::FAILURE;
        }
    }

    /**
     * Affiche le statut du service de signature
     */
    private function showStatus(ElectronicSignatureService $signatureService): int
    {
        $this->info('🔐 Electronic Signature Service Status');
        $this->newLine();

        $config = $signatureService->getConfiguration();
        
        $this->table(
            ['Setting', 'Value'],
            [
                ['Enabled', $config['enabled'] ? '✅ Yes' : '❌ No'],
                ['Timestamp Enabled', $config['timestamp_enabled'] ? '✅ Yes' : '❌ No'],
                ['Signature Level', $config['signature_level']],
                ['Max File Size', $this->formatBytes($config['max_file_size'])],
                ['Certificate', $config['certificate_info']],
            ]
        );

        if (!$signatureService->isConfigured()) {
            $this->newLine();
            $this->warn('⚠️  Electronic signature service is not properly configured');
            $this->info('Please check your .env file and electronic_signature.php configuration');
        }

        return Command::SUCCESS;
    }

    /**
     * Signe un document
     */
    private function signDocument(ElectronicSignatureService $signatureService): int
    {
        $filePath = $this->option('file');
        
        if (!$filePath) {
            $this->error('❌ --file option is required for signing');
            return Command::FAILURE;
        }

        if (!file_exists($filePath)) {
            $this->error("❌ File not found: {$filePath}");
            return Command::FAILURE;
        }

        $signerName = $this->option('signer') ?? $this->ask('Signer name');
        $signerRole = $this->option('role') ?? $this->ask('Signer role', 'Signataire');
        $signerEmail = $this->ask('Signer email (optional)');

        $this->info("📝 Signing document: {$filePath}");
        $this->info("👤 Signer: {$signerName} ({$signerRole})");
        
        if ($signerEmail) {
            $this->info("📧 Email: {$signerEmail}");
        }

        $this->newLine();

        try {
            $result = $signatureService->signFacturXDocument($filePath, [
                'name' => $signerName,
                'email' => $signerEmail,
                'role' => $signerRole,
                'location' => 'France',
                'reason' => 'Signature de document Factur-X',
                'level' => 'QES',
            ]);

            if ($result['success']) {
                $this->info('✅ Document signed successfully!');
                $this->newLine();
                
                $this->table(
                    ['Property', 'Value'],
                    [
                        ['Signed File', $result['signed_path']],
                        ['Signature ID', $result['signature_info']['id']],
                        ['Processing Time', $result['processing_time'] . 'ms'],
                        ['Valid', $result['validation_result']['valid'] ? '✅ Yes' : '❌ No'],
                    ]
                );

                if ($result['timestamp_info']) {
                    $this->newLine();
                    $this->info('🕐 Timestamp Information:');
                    $this->table(
                        ['Property', 'Value'],
                        [
                            ['Timestamp URL', $result['timestamp_info']['timestamp_url']],
                            ['Timestamp Time', $result['timestamp_info']['timestamp_time']],
                            ['Token Hash', substr($result['timestamp_info']['token_hash'], 0, 16) . '...'],
                        ]
                    );
                }

                return Command::SUCCESS;
            } else {
                $this->error('❌ Failed to sign document');
                $this->error('Error: ' . $result['error']);
                
                if (isset($result['validation_errors'])) {
                    $this->newLine();
                    $this->warn('Validation errors:');
                    foreach ($result['validation_errors'] as $error) {
                        $this->line("  • {$error}");
                    }
                }

                return Command::FAILURE;
            }

        } catch (\Exception $e) {
            $this->error('❌ Exception during signing: ' . $e->getMessage());
            Log::error('Console signing failed', [
                'file' => $filePath,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return Command::FAILURE;
        }
    }

    /**
     * Vérifie un document signé
     */
    private function verifyDocument(ElectronicSignatureService $signatureService): int
    {
        $filePath = $this->option('file');
        
        if (!$filePath) {
            $this->error('❌ --file option is required for verification');
            return Command::FAILURE;
        }

        if (!file_exists($filePath)) {
            $this->error("❌ File not found: {$filePath}");
            return Command::FAILURE;
        }

        $this->info("🔍 Verifying signatures in: {$filePath}");
        $this->newLine();

        try {
            $result = $signatureService->verifySignature($filePath);

            if ($result['valid']) {
                $this->info('✅ All signatures are valid!');
                
                foreach ($result['signatures'] as $signature) {
                    $this->newLine();
                    $this->info('📝 Signature Details:');
                    $this->table(
                        ['Property', 'Value'],
                        [
                            ['Signature ID', $signature['signature_id']],
                            ['Signer', $signature['signer']],
                            ['Signature Time', $signature['signature_time']],
                            ['Certificate Valid', $signature['certificate_valid'] ? '✅ Yes' : '❌ No'],
                            ['Trust Chain Valid', $signature['trust_chain_valid'] ? '✅ Yes' : '❌ No'],
                        ]
                    );
                }

                return Command::SUCCESS;
            } else {
                $this->error('❌ Signature verification failed');
                $this->error('Error: ' . $result['error']);
                
                if (isset($result['signatures'])) {
                    foreach ($result['signatures'] as $signature) {
                        if (!$signature['valid']) {
                            $this->warn("Invalid signature: {$signature['signature_id']}");
                        }
                    }
                }

                return Command::FAILURE;
            }

        } catch (\Exception $e) {
            $this->error('❌ Exception during verification: ' . $e->getMessage());
            Log::error('Console verification failed', [
                'file' => $filePath,
                'error' => $e->getMessage(),
            ]);
            
            return Command::FAILURE;
        }
    }

    /**
     * Valide un document signé
     */
    private function validateDocument(ElectronicSignatureService $signatureService): int
    {
        $filePath = $this->option('file');
        
        if (!$filePath) {
            $this->error('❌ --file option is required for validation');
            return Command::FAILURE;
        }

        if (!file_exists($filePath)) {
            $this->error("❌ File not found: {$filePath}");
            return Command::FAILURE;
        }

        $this->info("🔬 Validating signed document: {$filePath}");
        $this->newLine();

        try {
            $result = $signatureService->validateSignedDocument($filePath);

            $this->table(
                ['Property', 'Value'],
                [
                    ['Overall Valid', $result['valid'] ? '✅ Yes' : '❌ No'],
                    ['Validation Time', $result['validation_time'] . 'ms'],
                    ['Signatures Count', count($result['signatures'])],
                    ['Timestamps Count', count($result['timestamps'])],
                    ['Integrity Valid', $result['integrity']['valid'] ? '✅ Yes' : '❌ No'],
                ]
            );

            if (!empty($result['errors'])) {
                $this->newLine();
                $this->error('❌ Validation Errors:');
                foreach ($result['errors'] as $error) {
                    $this->line("  • {$error}");
                }
            }

            if (!empty($result['warnings'])) {
                $this->newLine();
                $this->warn('⚠️  Validation Warnings:');
                foreach ($result['warnings'] as $warning) {
                    $this->line("  • {$warning}");
                }
            }

            if (!empty($result['signatures'])) {
                $this->newLine();
                $this->info('📝 Signatures:');
                foreach ($result['signatures'] as $signature) {
                    $status = $signature['valid'] ? '✅' : '❌';
                    $this->line("  {$status} {$signature['signature_id']} - {$signature['signer']}");
                }
            }

            if (!empty($result['timestamps'])) {
                $this->newLine();
                $this->info('🕐 Timestamps:');
                foreach ($result['timestamps'] as $timestamp) {
                    $status = $timestamp['valid'] ? '✅' : '❌';
                    $time = $timestamp['timestamp_time'] ?? 'Unknown';
                    $this->line("  {$status} {$time}");
                }
            }

            return $result['valid'] ? Command::SUCCESS : Command::FAILURE;

        } catch (\Exception $e) {
            $this->error('❌ Exception during validation: ' . $e->getMessage());
            Log::error('Console validation failed', [
                'file' => $filePath,
                'error' => $e->getMessage(),
            ]);
            
            return Command::FAILURE;
        }
    }

    /**
     * Formate les octets en format lisible
     */
    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $unitIndex = 0;
        
        while ($bytes >= 1024 && $unitIndex < count($units) - 1) {
            $bytes /= 1024;
            $unitIndex++;
        }
        
        return round($bytes, 2) . ' ' . $units[$unitIndex];
    }
}