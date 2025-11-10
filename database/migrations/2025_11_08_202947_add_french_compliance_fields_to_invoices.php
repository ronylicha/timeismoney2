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
        Schema::table('invoices', function (Blueprint $table) {
            // Pourcentage d'acompte (pour factures d'acompte)
            $table->decimal('advance_percentage', 5, 2)->nullable()->after('type');

            // Mentions légales obligatoires (Article 441-3 Code de commerce)
            $table->text('legal_mentions')->nullable()->after('notes');
            $table->string('payment_conditions', 500)->nullable()->after('legal_mentions');

            // Pénalités de retard (3× taux légal = 19.59% pour 2025)
            $table->decimal('late_payment_penalty_rate', 5, 2)->default(19.59)->after('payment_conditions');

            // Indemnité forfaitaire de recouvrement (40€ obligatoire)
            $table->decimal('recovery_indemnity', 10, 2)->default(40.00)->after('late_payment_penalty_rate');

            // Escompte pour paiement anticipé (optionnel)
            $table->decimal('early_payment_discount', 5, 2)->nullable()->after('recovery_indemnity');

            // Index pour améliorer les performances des requêtes par type
            if (DB::getDriverName() !== 'sqlite') {
                $table->index('type', 'invoices_type_index');
            }
        });

        // Modifier l'enum type pour ajouter 'final' (facture de solde)
        // Syntaxe adaptée selon le SGBD
        if (DB::getDriverName() === 'sqlite') {
            // SQLite: recréer la table
            if (!Schema::hasColumn('invoices', 'type_new')) {
                DB::statement("ALTER TABLE invoices ADD COLUMN type_new VARCHAR(20) NOT NULL DEFAULT 'invoice'");
                DB::statement("UPDATE invoices SET type_new = type");
                DB::statement("ALTER TABLE invoices DROP COLUMN type");
                DB::statement("ALTER TABLE invoices RENAME COLUMN type_new TO type");
            }
        } else {
            // MySQL/MariaDB
            DB::statement("ALTER TABLE invoices MODIFY COLUMN type ENUM('invoice', 'quote', 'credit_note', 'advance', 'final', 'recurring') NOT NULL DEFAULT 'invoice'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Restaurer l'enum original (sans 'final')
        if (DB::getDriverName() === 'sqlite') {
            // SQLite: recréer la table
            DB::statement("ALTER TABLE invoices ADD COLUMN type_new VARCHAR(20) NOT NULL DEFAULT 'invoice'");
            DB::statement("UPDATE invoices SET type_new = CASE type WHEN 'final' THEN 'invoice' ELSE type END");
            DB::statement("ALTER TABLE invoices DROP COLUMN type");
            DB::statement("ALTER TABLE invoices RENAME COLUMN type_new TO type");
        } else {
            // MySQL/MariaDB
            DB::statement("ALTER TABLE invoices MODIFY COLUMN type ENUM('invoice', 'quote', 'credit_note', 'advance', 'recurring') NOT NULL DEFAULT 'invoice'");
        }

        Schema::table('invoices', function (Blueprint $table) {
            if (Schema::hasIndex('invoices', 'invoices_type_index')) {
                $table->dropIndex(['type']);
            }
            $table->dropColumn([
                'advance_percentage',
                'legal_mentions',
                'payment_conditions',
                'late_payment_penalty_rate',
                'recovery_indemnity',
                'early_payment_discount',
            ]);
        });
    }
};
