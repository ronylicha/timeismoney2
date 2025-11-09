<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Table pour suivre les soumissions au Portail Public de Facturation (PDP)
     * Conformité avec les exigences de facturation électronique B2B France
     */
    public function up(): void
    {
        Schema::create('pdp_submissions', function (Blueprint $table) {
            $table->id();
            
            // Relation polymorphique (Invoice, CreditNote)
            $table->string('submittable_type');
            $table->unsignedBigInteger('submittable_id');
            $table->index(['submittable_type', 'submittable_id'], 'submittable_index');
            
            // Informations PDP
            $table->string('pdp_id')->nullable(); // ID unique retourné par le PDP
            $table->string('pdp_reference')->nullable(); // Référence PDP
            $table->string('submission_id')->unique(); // ID interne de soumission
            
            // Statut de la soumission
            $table->enum('status', [
                'draft',          // Brouillon
                'pending',        // En attente d'envoi
                'submitting',     // En cours d'envoi
                'submitted',      // Soumis au PDP
                'processing',     // En traitement par PDP
                'accepted',       // Accepté par PDP
                'rejected',       // Rejeté par PDP
                'error',          // Erreur technique
                'cancelled'       // Annulé
            ])->default('draft');
            
            // Données de soumission
            $table->json('submission_data')->nullable(); // Données envoyées au PDP
            $table->json('response_data')->nullable(); // Réponse complète du PDP
            $table->text('error_message')->nullable(); // Message d'erreur détaillé
            $table->string('error_code')->nullable(); // Code erreur PDP
            
            // Horodatage
            $table->timestamp('submitted_at')->nullable(); // Date d'envoi au PDP
            $table->timestamp('response_at')->nullable(); // Date de réponse PDP
            $table->timestamp('accepted_at')->nullable(); // Date d'acceptation
            $table->timestamp('rejected_at')->nullable(); // Date de rejet
            
            // Métadonnées
            $table->string('pdp_mode', 20)->default('simulation'); // simulation | production
            $table->string('facturx_path')->nullable(); // Chemin du fichier Factur-X
            $table->string('original_filename')->nullable(); // Nom fichier original
            $table->integer('file_size')->nullable(); // Taille fichier en octets
            $table->string('file_hash')->nullable(); // SHA256 du fichier
            
            // Retry et traitement
            $table->integer('retry_count')->default(0);
            $table->timestamp('next_retry_at')->nullable();
            $table->text('retry_history')->nullable(); // JSON des tentatives
            
            // Audit
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            
            $table->timestamps();
            
            // Index pour performances
            $table->index('status');
            $table->index('pdp_id');
            $table->index('submission_id');
            $table->index('submitted_at');
            $table->index('pdp_mode');
            $table->index(['status', 'next_retry_at']);
            
            // Contraintes étrangères
            $table->foreign('user_id')
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
        if (app()->environment('local', 'testing')) {
            Schema::dropIfExists('pdp_submissions');
        }
    }
};
