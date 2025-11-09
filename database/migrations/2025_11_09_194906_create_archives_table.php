<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Archives légales pour documents fiscaux (obligation 10 ans France)
     * Conforme à : LPF Art. L102 B, BOI-CF-IOR-60-40
     */
    public function up(): void
    {
        Schema::create('archives', function (Blueprint $table) {
            $table->id();
            
            // Tenant isolation
            $table->foreignId('tenant_id')
                  ->constrained()
                  ->onDelete('cascade');
            
            // Document source (polymorphic)
            $table->string('archivable_type'); // Invoice, CreditNote, Quote, Payment
            $table->unsignedBigInteger('archivable_id');
            $table->index(['archivable_type', 'archivable_id'], 'archivable_index');
            
            // Type de document
            $table->enum('document_type', [
                'invoice',          // Facture
                'credit_note',      // Avoir
                'quote',            // Devis
                'payment_receipt',  // Reçu de paiement
                'fec_export',       // Export FEC
                'other'             // Autre document
            ]);
            
            // Format du document
            $table->enum('format', [
                'facturx',          // FacturX (PDF/A-3 avec XML)
                'pdf',              // PDF classique
                'xml',              // XML uniquement
                'csv',              // CSV (FEC)
                'zip'               // Archive ZIP
            ])->default('facturx');
            
            // Référence document original
            $table->string('document_number', 100)->nullable(); // FA-2025-00001, etc.
            $table->date('document_date')->nullable();
            $table->string('client_name', 255)->nullable(); // Pour recherche
            $table->decimal('document_amount', 15, 2)->nullable();
            
            // Stockage fichier
            $table->string('storage_path', 500); // Chemin relatif dans storage/
            $table->string('storage_disk', 50)->default('local'); // local, s3, etc.
            $table->bigInteger('file_size')->unsigned(); // En octets
            $table->string('mime_type', 100)->default('application/pdf');
            $table->string('original_filename', 255);
            
            // Intégrité et sécurité
            $table->string('hash_algorithm', 50)->default('sha256');
            $table->string('hash_value', 128); // Hash du fichier
            $table->boolean('is_encrypted')->default(false);
            $table->string('encryption_method', 50)->nullable(); // AES-256, etc.
            
            // Conformité légale
            $table->timestamp('archived_at'); // Date d'archivage
            $table->timestamp('retention_until'); // Date de conservation obligatoire (10 ans)
            $table->boolean('is_legal_requirement')->default(true); // Archivage obligatoire
            $table->enum('retention_status', [
                'active',           // En cours de conservation
                'expired',          // Délai expiré (peut être supprimé)
                'locked',           // Verrouillé (audit, litige)
                'deleted'           // Marqué pour suppression
            ])->default('active');
            
            // Horodatage qualifié (optionnel mais recommandé)
            $table->foreignId('qualified_timestamp_id')
                  ->nullable()
                  ->constrained('qualified_timestamps')
                  ->onDelete('set null');
            
            // Métadonnées additionnelles
            $table->json('metadata')->nullable(); // Données supplémentaires
            $table->text('notes')->nullable(); // Notes internes
            
            // Audit
            $table->foreignId('archived_by')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');
            $table->string('archive_source', 100)->default('automatic'); // automatic, manual, migration
            $table->timestamp('last_accessed_at')->nullable(); // Dernier accès
            $table->integer('access_count')->default(0); // Nombre d'accès
            
            // Backup et réplication
            $table->boolean('is_backed_up')->default(false);
            $table->timestamp('last_backup_at')->nullable();
            $table->string('backup_location', 500)->nullable();
            
            $table->timestamps();
            $table->softDeletes(); // Soft delete pour sécurité (ne jamais supprimer réellement)
            
            // Index pour performance
            $table->index('tenant_id');
            $table->index('document_type');
            $table->index('document_number');
            $table->index('document_date');
            $table->index('archived_at');
            $table->index('retention_until');
            $table->index('retention_status');
            $table->index('hash_value');
            
            // Index composite pour recherches fréquentes
            $table->index(['tenant_id', 'document_type', 'archived_at'], 'tenant_doc_arch_idx');
            $table->index(['tenant_id', 'retention_status'], 'tenant_retention_idx');
        });
    }

    /**
     * Reverse the migrations.
     * 
     * ATTENTION: En production, cette table ne devrait JAMAIS être supprimée
     * C'est une obligation légale de conserver ces archives 10 ans
     */
    public function down(): void
    {
        // Ne supprimer que en environnement de développement/test
        if (app()->environment('local', 'testing')) {
            Schema::dropIfExists('archives');
        }
    }
};
