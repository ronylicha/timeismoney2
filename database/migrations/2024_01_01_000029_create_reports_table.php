<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('type', [
                'time_summary',
                'project_profitability',
                'client_summary',
                'expense_report',
                'invoice_report',
                'team_performance',
                'budget_vs_actual',
                'custom'
            ])->default('time_summary');
            $table->json('filters'); // Date range, projects, clients, users, etc.
            $table->json('columns'); // Columns to display
            $table->json('grouping')->nullable(); // Group by project, client, user, etc.
            $table->json('sorting')->nullable();
            $table->enum('format', ['pdf', 'excel', 'csv'])->default('pdf');
            $table->boolean('is_scheduled')->default(false);
            $table->string('schedule_frequency')->nullable(); // daily, weekly, monthly
            $table->json('schedule_recipients')->nullable(); // Email addresses
            $table->timestamp('last_generated_at')->nullable();
            $table->string('last_generated_path')->nullable();
            $table->boolean('is_public')->default(false);
            $table->string('public_token')->nullable()->unique();
            $table->timestamps();

            $table->index(['tenant_id', 'user_id']);
            $table->index(['tenant_id', 'type']);
            $table->index('is_scheduled');
            $table->index('public_token');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};