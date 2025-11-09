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
        // Ajouter les champs de tracking des avoirs dans la table invoices
        Schema::table('invoices', function (Blueprint $table) {
            $table->boolean('has_credit_notes')->default(false)->after('status');
            $table->decimal('total_credited', 10, 2)->default(0)->after('balance_due');
            
            // Index pour optimiser les requêtes
            $table->index(['tenant_id', 'has_credit_notes']);
        });

        // Ajouter le support FacturX pour les credit_notes
        Schema::table('credit_notes', function (Blueprint $table) {
            $table->string('facturx_path')->nullable()->after('notes');
            $table->enum('electronic_format', ['pdf', 'facturx'])->default('pdf')->after('facturx_path');
            $table->timestamp('facturx_generated_at')->nullable()->after('electronic_format');
            
            // Index pour les recherches
            $table->index(['tenant_id', 'electronic_format']);
            $table->index('facturx_generated_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'has_credit_notes']);
            $table->dropColumn(['has_credit_notes', 'total_credited']);
        });

        Schema::table('credit_notes', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'electronic_format']);
            $table->dropIndex(['facturx_generated_at']);
            $table->dropColumn(['facturx_path', 'electronic_format', 'facturx_generated_at']);
        });
    }
};
