<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->foreignId('client_id')->constrained()->onDelete('cascade');
            $table->string('invoice_number')->unique();
            $table->integer('sequence_number'); // Pour NF525
            $table->enum('type', ['invoice', 'quote', 'credit_note', 'advance', 'recurring'])->default('invoice');
            $table->enum('status', ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'])->default('draft');
            $table->date('date');
            $table->date('due_date');
            $table->date('payment_date')->nullable();
            $table->string('currency', 3)->default('EUR');
            $table->decimal('subtotal', 12, 2);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('discount_percent', 5, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('total', 12, 2);
            $table->decimal('amount_paid', 12, 2)->default(0);
            $table->decimal('balance_due', 12, 2);
            $table->integer('payment_terms')->default(30);
            $table->enum('payment_method', ['bank_transfer', 'check', 'cash', 'card', 'other'])->nullable();
            $table->text('notes')->nullable();
            $table->text('terms_conditions')->nullable();
            $table->text('footer_text')->nullable();

            // Facturation récurrente
            $table->boolean('is_recurring')->default(false);
            $table->json('recurring_pattern')->nullable();
            $table->date('next_invoice_date')->nullable();

            // Conformité NF525
            $table->string('signature')->nullable(); // Hash pour inaltérabilité
            $table->timestamp('signature_timestamp')->nullable();
            $table->string('previous_hash')->nullable(); // Chaînage des factures
            $table->boolean('is_locked')->default(false);

            // Chorus Pro
            $table->boolean('chorus_pro_sent')->default(false);
            $table->string('chorus_pro_id')->nullable();
            $table->enum('chorus_pro_status', ['pending', 'sent', 'accepted', 'rejected', 'error'])->nullable();

            // Fichiers
            $table->string('pdf_path')->nullable();
            $table->timestamp('sent_at')->nullable();

            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index(['tenant_id', 'invoice_number']);
            $table->index(['tenant_id', 'client_id']);
            $table->index(['tenant_id', 'status']);
            $table->index('date');
            $table->index('due_date');
            $table->index('sequence_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};