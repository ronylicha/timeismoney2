<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Retire la contrainte UNIQUE sur quote_number pour permettre
     * la réutilisation des numéros après soft delete
     */
    public function up(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            // Supprimer la contrainte unique sur quote_number
            $table->dropUnique(['quote_number']);

            // Ajouter un index normal (non-unique) pour les performances
            $table->index('quote_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            // Restaurer la contrainte unique
            $table->dropIndex(['quote_number']);
            $table->unique('quote_number');
        });
    }
};
