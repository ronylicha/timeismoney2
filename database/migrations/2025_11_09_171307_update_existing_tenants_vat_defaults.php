<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update existing tenants to have default VAT threshold values if null
        DB::table('tenants')
            ->whereNull('vat_threshold_services')
            ->update(['vat_threshold_services' => 36800]);

        DB::table('tenants')
            ->whereNull('vat_threshold_goods')
            ->update(['vat_threshold_goods' => 91900]);

        DB::table('tenants')
            ->whereNull('vat_threshold_year_total')
            ->update(['vat_threshold_year_total' => 0]);

        DB::table('tenants')
            ->whereNull('business_type')
            ->update(['business_type' => 'services']);

        DB::table('tenants')
            ->whereNull('auto_apply_vat_on_threshold')
            ->update(['auto_apply_vat_on_threshold' => true]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No need to reverse - these are just default values
    }
};
