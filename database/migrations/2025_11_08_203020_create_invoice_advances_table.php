<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Cette table pivot permet de lier plusieurs factures d'acompte à une facture de solde.
     *
     * Cas d'usage:
     * - Projet à 10 000€
     * - Acompte 1: 30% = 3 000€
     * - Acompte 2: 20% = 2 000€
     * - Acompte 3: 15% = 1 500€
     * - Solde: 35% = 3 500€ (lié aux 3 acomptes)
     */
    public function up(): void
    {
        Schema::create('invoice_advances', function (Blueprint $table) {
            $table->id();

            // Facture de SOLDE (final invoice)
            $table->foreignId('final_invoice_id')
                ->constrained('invoices')
                ->onDelete('cascade')
                ->comment('Facture de solde qui reçoit les acomptes');

            // Facture d\'ACOMPTE (advance invoice)
            $table->foreignId('advance_invoice_id')
                ->constrained('invoices')
                ->onDelete('restrict')  // Ne pas supprimer un acompte s'il est lié
                ->comment('Facture d\'acompte liée au solde');

            // Montant TTC de l'acompte (pour historique/cache)
            $table->decimal('advance_amount', 15, 2)
                ->comment('Montant TTC de l\'acompte au moment de la liaison');

            $table->timestamps();

            // Contraintes importantes
            // 1. Une facture d'acompte ne peut être liée qu'à UNE SEULE facture de solde
            $table->unique('advance_invoice_id', 'unique_advance_per_final');

            // 2. Index composé pour performances
            $table->index(['final_invoice_id', 'advance_invoice_id'], 'idx_final_advance');

            // 3. Index sur montant pour agrégations rapides
            $table->index('advance_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoice_advances');
    }
};
