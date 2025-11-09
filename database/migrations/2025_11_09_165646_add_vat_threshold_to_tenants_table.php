<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            // Seuils de franchise en base de TVA (France 2024)
            // Services: 36 800€, Ventes: 91 900€
            $table->decimal('vat_threshold_services', 10, 2)->nullable()->after('vat_exemption_reason')
                ->comment('Seuil de franchise TVA pour prestations de services (36 800€ en 2024)');
            $table->decimal('vat_threshold_goods', 10, 2)->nullable()->after('vat_threshold_services')
                ->comment('Seuil de franchise TVA pour ventes de marchandises (91 900€ en 2024)');
            $table->date('vat_threshold_exceeded_at')->nullable()->after('vat_threshold_goods')
                ->comment('Date de dépassement du seuil de TVA');
            $table->decimal('vat_threshold_year_total', 10, 2)->default(0)->after('vat_threshold_exceeded_at')
                ->comment('Chiffre d\'affaires HT de l\'année en cours');
            $table->boolean('auto_apply_vat_on_threshold')->default(true)->after('vat_threshold_year_total')
                ->comment('Appliquer automatiquement la TVA si seuil dépassé');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'vat_threshold_services',
                'vat_threshold_goods',
                'vat_threshold_exceeded_at',
                'vat_threshold_year_total',
                'auto_apply_vat_on_threshold'
            ]);
        });
    }
};
