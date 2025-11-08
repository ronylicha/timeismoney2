<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Table pour conformité NF525 - Log immuable
        Schema::create('invoice_audit_log', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->onDelete('restrict'); // Jamais supprimer
            $table->enum('action', ['created', 'sent', 'paid', 'cancelled', 'modified']);
            $table->string('signature'); // Hash pour intégrité
            $table->timestamp('timestamp');
            $table->foreignId('user_id')->constrained();
            $table->string('ip_address');
            $table->string('user_agent')->nullable();
            $table->json('changes')->nullable(); // Pour les modifications

            // Pas de timestamps Laravel pour garantir l'immutabilité

            $table->index('invoice_id');
            $table->index('timestamp');
        });
    }

    public function down(): void
    {
        // On ne devrait jamais supprimer cette table en production (NF525)
        if (app()->environment('local', 'testing')) {
            Schema::dropIfExists('invoice_audit_log');
        }
    }
};