<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Table pour stocker les horodatages qualifiés NF525
     * conformes au protocole RFC 3161 (Time-Stamp Protocol)
     */
    public function up(): void
    {
        Schema::create('qualified_timestamps', function (Blueprint $table) {
            $table->id();
            
            // Relation polymorphique (Invoice, Payment, CreditNote, etc.)
            $table->string('timestampable_type');
            $table->unsignedBigInteger('timestampable_id');
            $table->index(['timestampable_type', 'timestampable_id'], 'timestampable_index');
            
            // Action horodatée
            $table->enum('action', [
                'invoice_validated',    // Facture validée (draft → sent)
                'invoice_paid',         // Paiement reçu
                'invoice_cancelled',    // Annulation
                'credit_note_created',  // Avoir créé
                'quote_accepted',       // Devis accepté
                'payment_received'      // Paiement encaissé
            ]);
            
            // Hash de l'objet horodaté
            $table->string('hash_algorithm', 50)->default('sha256'); // sha256, sha512
            $table->string('hash_value', 128); // Hash calculé localement
            
            // Token de timestamp qualifié (RFC 3161)
            $table->text('timestamp_token')->nullable(); // Token TSA en base64
            $table->string('tsa_provider', 100)->nullable(); // ChamberSign, Universign, etc.
            $table->string('tsa_url', 255)->nullable(); // URL TSA utilisée
            $table->text('tsa_certificate')->nullable(); // Certificat TSA
            
            // Horodatage certifié
            $table->timestamp('timestamp_datetime'); // Date/heure du TSA
            $table->timestamp('server_datetime'); // Date/heure serveur (backup)
            
            // Métadonnées
            $table->string('status')->default('pending'); // pending, success, failed
            $table->text('error_message')->nullable(); // En cas d'échec TSA
            $table->integer('retry_count')->default(0); // Nombre de tentatives
            
            // Audit
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('ip_address', 45)->nullable();
            
            $table->timestamps();
            
            // Index pour recherches
            $table->index('action');
            $table->index('status');
            $table->index('timestamp_datetime');
            $table->index('created_at');
            
            // Contrainte étrangère
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
        // En production NF525, cette table ne devrait JAMAIS être supprimée
        // C'est une preuve légale
        if (app()->environment('local', 'testing')) {
            Schema::dropIfExists('qualified_timestamps');
        }
    }
};
