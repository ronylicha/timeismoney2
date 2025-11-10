<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Create supplier invoices table for PDP reception
     * Table pour stocker les factures fournisseurs reçues via le PDP
     */
    public function up(): void
    {
        Schema::create('supplier_invoices', function (Blueprint $table) {
            $table->id();
            
            // Tenant relation
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            
            // Invoice identification
            $table->string('invoice_number')->unique();
            $table->string('pdp_reference')->nullable(); // Référence unique du PDP
            $table->uuid('uuid')->unique(); // UUID unique pour l'API
            
            // Supplier information
            $table->string('supplier_name');
            $table->string('supplier_siret')->nullable();
            $table->string('supplier_vat_number')->nullable();
            $table->text('supplier_address')->nullable();
            $table->string('supplier_email')->nullable();
            $table->string('supplier_phone')->nullable();
            
            // Invoice details
            $table->date('invoice_date');
            $table->date('due_date');
            $table->date('delivery_date')->nullable();
            
            // Amounts
            $table->decimal('total_ht', 12, 2);
            $table->decimal('total_tva', 12, 2);
            $table->decimal('total_ttc', 12, 2);
            $table->string('currency', 3)->default('EUR');
            
            // VAT details
            $table->json('vat_breakdown')->nullable(); // Détail TVA par taux
            
            // Status tracking
            $table->enum('status', [
                'pending',     // En attente de traitement
                'processing',  // En cours de traitement
                'validated',   // Validée, prête pour paiement
                'rejected',    // Rejetée
                'paid',        // Payée
                'cancelled',   // Annulée
            ])->default('pending');
            
            // Processing information
            $table->text('notes')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->unsignedBigInteger('validated_by')->nullable();
            $table->unsignedBigInteger('rejected_by')->nullable();
            
            // File information
            $table->string('file_path'); // Chemin du fichier PDF/Factur-X
            $table->string('file_name');
            $table->string('file_mime_type');
            $table->integer('file_size');
            $table->string('file_hash')->nullable(); // SHA256 pour vérification
            
            // PDP metadata
            $table->json('pdp_metadata')->nullable(); // Métadonnées supplémentaires du PDP
            $table->timestamp('pdp_received_at')->nullable(); // Date de réception via PDP
            
            // Timestamps
            $table->timestamp('processed_at')->nullable();
            $table->timestamp('validated_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            
            // Indexes
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'invoice_date']);
            $table->index(['tenant_id', 'due_date']);
            $table->index('pdp_reference');
            $table->index('supplier_name');
            $table->index('status');
            $table->index(['status', 'created_at']);
            
            // Foreign keys
            $table->foreign('validated_by')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');
                  
            $table->foreign('rejected_by')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('supplier_invoices');
    }
};