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
            // Numéro RM (Répertoire des Métiers) pour les artisans
            $table->string('rm_number')->nullable()->after('rcs_city')
                ->comment('Numéro RM (pour artisans inscrits au Répertoire des Métiers)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('rm_number');
        });
    }
};
