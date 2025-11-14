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
        // Pour les avoirs existants avec statut 'applied', définir applied_date = updated_at
        DB::table('credit_notes')
            ->where('status', 'applied')
            ->whereNull('applied_date')
            ->update([
                'applied_date' => DB::raw('DATE(updated_at)')
            ]);

        // Pour les avoirs avec statut 'issued', on ne définit pas applied_date
        // car ils n'ont pas encore été appliqués
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // On ne peut pas vraiment revenir en arrière sur cette migration de données
        // car on ne sait pas quels applied_date étaient NULL avant
    }
};
