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
            // Méthode comptable : 'cash' (encaissement) ou 'accrual' (engagement)
            // cash = TVA sur encaissement (prestations de services par défaut)
            // accrual = TVA sur débit (ventes de biens, option pour services)
            $table->enum('accounting_method', ['cash', 'accrual'])
                ->default('cash')
                ->after('vat_regime')
                ->comment('Méthode comptable: cash (encaissement) ou accrual (engagement)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('accounting_method');
        });
    }
};
