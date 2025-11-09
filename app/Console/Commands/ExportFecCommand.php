<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Services\FecExportService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class ExportFecCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'compliance:export-fec 
                            {tenant_id : The ID of the tenant}
                            {start_date : Start date (Y-m-d)}
                            {end_date : End date (Y-m-d)}
                            {--format=txt : Output format (txt or csv)}
                            {--encoding=utf8 : Encoding (utf8 or cp1252)}
                            {--output= : Output file path (optional)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Export FEC (Fichier des Écritures Comptables) for fiscal compliance';

    /**
     * Execute the console command.
     */
    public function handle(FecExportService $fecService): int
    {
        $tenantId = $this->argument('tenant_id');
        $startDate = $this->argument('start_date');
        $endDate = $this->argument('end_date');
        $format = $this->option('format');
        $encoding = $this->option('encoding');
        $outputPath = $this->option('output');

        $this->info("Generating FEC export for tenant {$tenantId}...");
        $this->info("Period: {$startDate} to {$endDate}");

        try {
            // Validate tenant
            $tenant = Tenant::findOrFail($tenantId);

            // Generate FEC content
            $content = $fecService->exportFecForPeriod(
                $tenantId,
                $startDate,
                $endDate,
                $format,
                $encoding
            );

            // Generate filename
            $siret = $tenant->legal_mention_siret ?? 'XXXXXXXXXX';
            $startDateFormatted = str_replace('-', '', $startDate);
            $endDateFormatted = str_replace('-', '', $endDate);
            $filename = "FEC_{$siret}_{$startDateFormatted}_{$endDateFormatted}.{$format}";

            // Save to file
            if ($outputPath) {
                file_put_contents($outputPath, $content);
                $this->info("FEC exported to: {$outputPath}");
            } else {
                $storagePath = "exports/fec/{$filename}";
                Storage::put($storagePath, $content);
                $this->info("FEC exported to storage: {$storagePath}");
            }

            $this->info("Export completed successfully!");
            $this->newLine();
            $this->table(
                ['Metric', 'Value'],
                [
                    ['File size', $this->formatBytes(strlen($content))],
                    ['Lines', substr_count($content, "\n")],
                    ['Format', strtoupper($format)],
                    ['Encoding', strtoupper($encoding)],
                ]
            );

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("Failed to export FEC: {$e->getMessage()}");
            return Command::FAILURE;
        }
    }

    /**
     * Format bytes to human readable size
     */
    private function formatBytes(int $bytes): string
    {
        if ($bytes < 1024) {
            return $bytes . ' B';
        } elseif ($bytes < 1048576) {
            return round($bytes / 1024, 2) . ' KB';
        } else {
            return round($bytes / 1048576, 2) . ' MB';
        }
    }
}
