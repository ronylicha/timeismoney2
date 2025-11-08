<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->foreignId('project_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('client_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('type', ['hours', 'amount', 'both'])->default('amount');
            $table->enum('period', ['monthly', 'quarterly', 'yearly', 'project', 'custom'])->default('monthly');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->decimal('budget_amount', 12, 2)->nullable();
            $table->decimal('budget_hours', 10, 2)->nullable();
            $table->decimal('alert_threshold', 5, 2)->default(80); // Alert when 80% reached
            $table->boolean('is_active')->default(true);
            $table->boolean('include_expenses')->default(false);
            $table->boolean('is_recurring')->default(false);
            $table->json('categories')->nullable(); // Expense categories to include
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index(['tenant_id', 'is_active']);
            $table->index(['tenant_id', 'project_id']);
            $table->index(['tenant_id', 'client_id']);
            $table->index(['start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budgets');
    }
};