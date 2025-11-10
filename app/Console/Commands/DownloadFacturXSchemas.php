<?php

namespace App\Console\Commands;

use App\Services\XsdValidationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class DownloadFacturXSchemas extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'facturx:download-schemas';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Download Factur-X XSD schemas for validation';

    /**
     * Execute the console command.
     */
    public function handle(XsdValidationService $xsdService): int
    {
        $this->info('Downloading Factur-X XSD schemas...');
        
        try {
            $success = $xsdService->downloadSchemas();
            
            if ($success) {
                $this->info('✅ XSD schemas downloaded successfully!');
                
                $profiles = $xsdService->getAvailableProfiles();
                $this->info('Available profiles: ' . implode(', ', $profiles));
                
                return Command::SUCCESS;
            } else {
                $this->error('❌ Failed to download XSD schemas');
                return Command::FAILURE;
            }
            
        } catch (\Exception $e) {
            $this->error('❌ Error: ' . $e->getMessage());
            Log::error('Factur-X schema download failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return Command::FAILURE;
        }
    }
}