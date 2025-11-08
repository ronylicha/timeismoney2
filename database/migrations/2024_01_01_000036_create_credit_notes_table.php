<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('credit_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->foreignId('client_id')->constrained()->onDelete('cascade');
            $table->foreignId('invoice_id')->nullable()->constrained()->onDelete('set null');
            $table->string('credit_note_number')->unique();
            $table->date('credit_note_date');
            $table->enum('status', ['draft', 'issued', 'applied', 'cancelled'])->default('draft');
            $table->string('reason')->nullable(); // Reason for credit note
            $table->text('description')->nullable(); // Detailed description
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('tax', 10, 2)->default(0);
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->string('currency', 3)->default('EUR');
            $table->string('payment_method')->nullable(); // Method for refund
            $table->text('notes')->nullable();

            // NF525 compliance
            $table->string('compliance_hash')->nullable(); // Hash for immutability
            $table->timestamp('compliance_date')->nullable(); // Timestamp for compliance

            $table->softDeletes();
            $table->timestamps();

            $table->index(['tenant_id', 'client_id']);
            $table->index(['tenant_id', 'status']);
            $table->index('credit_note_date');
            $table->index('invoice_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credit_notes');
    }
};