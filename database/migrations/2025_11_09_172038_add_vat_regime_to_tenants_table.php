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
            // Régime de TVA : détermine si les seuils s'appliquent
            $table->enum('vat_regime', [
                'franchise_base',      // Franchise en base (micro-entreprise) - SEUILS APPLICABLES
                'normal',              // Régime normal (société) - PAS DE SEUILS
                'intracommunity',      // Intracommunautaire - PAS DE SEUILS
                'export',              // Export hors UE - PAS DE SEUILS
                'exempt_article_261',  // Exonéré article 261 CGI (médical, enseignement...) - PAS DE SEUILS
                'other'                // Autre régime spécifique - PAS DE SEUILS
            ])->default('normal')->after('vat_subject');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('vat_regime');
        });
    }
};
