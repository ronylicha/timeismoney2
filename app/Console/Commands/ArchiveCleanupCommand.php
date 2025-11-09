<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Tenant;
use App\Models\Archive;
use App\Services\ArchiveService;

class ArchiveCleanupCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'archive:cleanup 
                            {--tenant= : ID du tenant spécifique}
                            {--dry-run : Simulation sans suppression réelle}
                            {--force : Force le nettoyage sans confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Nettoie les archives expirées (soft delete uniquement)';

    private ArchiveService $archiveService;

    /**
     * Execute the console command.
     */
    public function handle(ArchiveService $archiveService)
    {
        $this->archiveService = $archiveService;
        
        $isDryRun = $this->option('dry-run');
        $tenantId = $this->option('tenant');
        
        $this->info('=================================================');
        $this->info('   Nettoyage Archives Expirées');
        $this->info('=================================================');
        $this->newLine();
        
        if ($isDryRun) {
            $this->warn('⚠ MODE SIMULATION - Aucune suppression réelle');
            $this->newLine();
        }
        
        // Sélectionner les tenants
        $tenants = $tenantId 
            ? Tenant::where('id', $tenantId)->get()
            : Tenant::all();
        
        if ($tenants->isEmpty()) {
            $this->error('Aucun tenant trouvé');
            return 1;
        }
        
        $this->info("Tenants à traiter : {$tenants->count()}");
        $this->newLine();
        
        $totalStats = [
            'total_expired' => 0,
            'deleted' => 0,
            'skipped' => 0,
            'errors' => 0,
        ];
        
        foreach ($tenants as $tenant) {
            $this->line("Traitement du tenant #{$tenant->id} - {$tenant->name}");
            
            // Récupérer les archives expirées
            $expiredCount = Archive::where('tenant_id', $tenant->id)
                ->where('retention_until', '<', now())
                ->where('retention_status', 'active')
                ->count();
            
            if ($expiredCount === 0) {
                $this->info('  ✓ Aucune archive expirée');
                continue;
            }
            
            $this->warn("  ⚠ {$expiredCount} archive(s) expirée(s) trouvée(s)");
            
            // Demander confirmation si pas en mode force
            if (!$isDryRun && !$this->option('force')) {
                if (!$this->confirm("  Continuer le nettoyage pour ce tenant?")) {
                    $this->info('  Ignoré par l\'utilisateur');
                    continue;
                }
            }
            
            // Nettoyer les archives
            $results = $this->archiveService->cleanupExpiredArchives($tenant->id, $isDryRun);
            
            $totalStats['total_expired'] += $results['total_expired'];
            $totalStats['deleted'] += $results['deleted'];
            $totalStats['skipped'] += $results['skipped'];
            $totalStats['errors'] += count($results['errors']);
            
            if ($results['deleted'] > 0) {
                $action = $isDryRun ? 'Seraient supprimées' : 'Supprimées';
                $this->info("  ✓ {$action}: {$results['deleted']}");
            }
            
            if ($results['skipped'] > 0) {
                $this->comment("  ⊘ Ignorées (verrouillées/obligatoires): {$results['skipped']}");
            }
            
            if (!empty($results['errors'])) {
                $this->error("  ✗ Erreurs: " . count($results['errors']));
                foreach ($results['errors'] as $error) {
                    $this->error("    Archive #{$error['archive_id']}: {$error['error']}");
                }
            }
            
            $this->newLine();
        }
        
        // Afficher le résumé
        $this->info('=================================================');
        $this->info('   Résumé du Nettoyage');
        $this->info('=================================================');
        $this->table(
            ['Métrique', 'Valeur'],
            [
                ['Total archives expirées', $totalStats['total_expired']],
                [($isDryRun ? 'Seraient supprimées' : 'Supprimées'), $totalStats['deleted']],
                ['Ignorées', $totalStats['skipped']],
                ['Erreurs', $totalStats['errors']],
            ]
        );
        
        if ($isDryRun && $totalStats['deleted'] > 0) {
            $this->newLine();
            $this->warn('⚠ MODE SIMULATION ACTIF');
            $this->info('Pour effectuer le nettoyage réel, relancez sans --dry-run');
        }
        
        if (!$isDryRun && $totalStats['deleted'] > 0) {
            $this->newLine();
            $this->info('✓ Nettoyage terminé avec succès');
        }
        
        return 0;
    }
}
