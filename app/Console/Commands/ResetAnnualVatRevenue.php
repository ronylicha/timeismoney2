<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Tenant;

class ResetAnnualVatRevenue extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'vat:reset-annual';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Réinitialise le CA annuel au 1er janvier pour la gestion des seuils de TVA';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔄 Réinitialisation du CA annuel pour tous les tenants...');
        
        $tenants = Tenant::all();
        $count = 0;
        
        foreach ($tenants as $tenant) {
            $oldRevenue = $tenant->vat_threshold_year_total;
            
            $tenant->update([
                'vat_threshold_year_total' => 0,
                'vat_threshold_exceeded_at' => null,
            ]);
            
            $count++;
            
            $this->line(sprintf(
                '  ✓ %s: %s → 0€',
                $tenant->company_name,
                number_format($oldRevenue, 2, ',', ' ') . '€'
            ));
        }
        
        $this->newLine();
        $this->info("✅ CA annuel réinitialisé pour {$count} tenant(s)");
        $this->info('💡 Note: Le statut vat_subject n\'est PAS modifié. Les tenants assujettis restent assujettis.');
        
        return Command::SUCCESS;
    }
}
