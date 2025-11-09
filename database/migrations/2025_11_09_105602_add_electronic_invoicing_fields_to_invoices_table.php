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
        Schema::table('invoices', function (Blueprint $table) {
            // Format de facturation électronique (obligation 2026)
            $table->enum('electronic_format', ['pdf', 'facturx', 'ubl', 'cii'])
                ->default('pdf');
            
            // Chemins vers les différents formats
            $table->string('facturx_path')->nullable();
            $table->string('ubl_path')->nullable();
            $table->string('cii_path')->nullable();
            
            // Portail Public de Facturation (PDP) - remplace Chorus Pro
            $table->string('pdp_reference', 100)->nullable();
            $table->enum('pdp_status', ['pending', 'sent', 'validated', 'rejected', 'error'])
                ->nullable();
            $table->timestamp('pdp_sent_at')->nullable();
            $table->json('pdp_response')->nullable();
            
            // QR Code SEPA pour faciliter le paiement
            $table->text('qr_code_sepa')->nullable();
            
            // Horodatage qualifié (optionnel mais recommandé)
            $table->text('qualified_timestamp')->nullable();
            $table->string('timestamp_authority', 100)->nullable();
            
            // Référence bon de commande (mention obligatoire si existe)
            $table->string('purchase_order_number', 100)->nullable();
            
            // Référence contrat (mention obligatoire si existe)
            $table->string('contract_reference', 100)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn([
                'electronic_format',
                'facturx_path',
                'ubl_path',
                'cii_path',
                'pdp_reference',
                'pdp_status',
                'pdp_sent_at',
                'pdp_response',
                'qr_code_sepa',
                'qualified_timestamp',
                'timestamp_authority',
                'purchase_order_number',
                'contract_reference'
            ]);
        });
    }
};
