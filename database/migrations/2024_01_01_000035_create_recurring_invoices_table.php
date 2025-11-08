<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recurring_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->foreignId('client_id')->constrained()->onDelete('cascade');
            $table->foreignId('project_id')->nullable()->constrained()->onDelete('set null');
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('frequency', ['weekly', 'biweekly', 'monthly', 'quarterly', 'semi-annually', 'annually'])->default('monthly');
            $table->integer('interval')->default(1); // Every X frequency
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->date('next_date');
            $table->json('items'); // Invoice line items template
            $table->decimal('subtotal', 12, 2);
            $table->decimal('tax_amount', 10, 2)->default(0);
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->enum('discount_type', ['fixed', 'percentage'])->default('fixed');
            $table->decimal('total', 12, 2);
            $table->string('currency', 3)->default('EUR');
            $table->integer('payment_terms')->default(30);
            $table->text('terms_conditions')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('auto_send')->default(false);
            $table->json('send_to_emails')->nullable();
            $table->integer('invoices_generated')->default(0);
            $table->timestamp('last_generated_at')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index(['tenant_id', 'is_active']);
            $table->index(['tenant_id', 'client_id']);
            $table->index('next_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recurring_invoices');
    }
};