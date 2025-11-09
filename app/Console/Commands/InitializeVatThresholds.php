<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Tenant;

class InitializeVatThresholds extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'vat:init-thresholds';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Initialiser les seuils de franchise en base TVA pour tous les tenants (France 2024)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Initialisation des seuils de TVA...');

        // Seuils 2024 en France
        $servicesThreshold = 36800; // Prestations de services
        $goodsThreshold = 91900;    // Ventes de marchandises

        $updated = Tenant::whereNull('vat_threshold_services')
            ->orWhereNull('vat_threshold_goods')
            ->update([
                'vat_threshold_services' => $servicesThreshold,
                'vat_threshold_goods' => $goodsThreshold,
                'auto_apply_vat_on_threshold' => true,
            ]);

        $this->info("✓ {$updated} tenant(s) mis à jour avec les seuils:");
        $this->line("  - Prestations de services: {$servicesThreshold}€");
        $this->line("  - Ventes de marchandises: {$goodsThreshold}€");

        // Calculer le CA de l'année pour chaque tenant
        $this->info("\nCalcul du CA annuel...");
        $tenants = Tenant::all();
        
        foreach ($tenants as $tenant) {
            $yearlyRevenue = $tenant->calculateYearlyRevenue();
            $tenant->update(['vat_threshold_year_total' => $yearlyRevenue]);
            
            $status = $tenant->vat_subject ? '(Assujetti TVA)' : '(Franchise en base)';
            $this->line("  - {$tenant->name}: " . number_format($yearlyRevenue, 2, ',', ' ') . "€ {$status}");
            
            if ($tenant->isApproachingVatThreshold()) {
                $this->warn("    ⚠ Attention: proche du seuil de franchise!");
            }
        }

        $this->info("\n✓ Initialisation terminée!");
        
        return Command::SUCCESS;
    }
}
