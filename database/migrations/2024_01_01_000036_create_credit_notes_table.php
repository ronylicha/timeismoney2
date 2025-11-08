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
            $table->string('sequential_number'); // For NF525
            $table->date('credit_note_date');
            $table->enum('status', ['draft', 'issued', 'applied', 'cancelled'])->default('draft');
            $table->enum('reason', ['error', 'return', 'discount', 'cancellation', 'other'])->default('other');
            $table->text('reason_text')->nullable();
            $table->json('items'); // Credit note line items
            $table->decimal('subtotal', 12, 2);
            $table->decimal('tax_amount', 10, 2)->default(0);
            $table->decimal('total', 12, 2);
            $table->string('currency', 3)->default('EUR');
            $table->decimal('remaining_credit', 12, 2);
            $table->text('notes')->nullable();
            $table->text('internal_notes')->nullable();

            // NF525 compliance
            $table->string('hash'); // Hash for immutability
            $table->string('previous_hash')->nullable(); // Chain integrity
            $table->timestamp('issued_at')->nullable();
            $table->string('signature')->nullable();

            $table->foreignId('created_by')->constrained('users');
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