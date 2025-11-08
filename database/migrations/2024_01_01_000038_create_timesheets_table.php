<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('timesheets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->date('week_start');
            $table->date('week_end');
            $table->decimal('total_hours', 10, 2)->default(0);
            $table->decimal('billable_hours', 10, 2)->default(0);
            $table->decimal('non_billable_hours', 10, 2)->default(0);
            $table->decimal('overtime_hours', 10, 2)->default(0);
            $table->enum('status', ['draft', 'submitted', 'approved', 'rejected', 'locked'])->default('draft');
            $table->foreignId('submitted_to')->nullable()->constrained('users');
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->timestamp('approved_at')->nullable();
            $table->text('approval_notes')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->boolean('is_locked')->default(false);
            $table->timestamps();

            $table->index(['tenant_id', 'user_id', 'week_start']);
            $table->index(['tenant_id', 'status']);
            $table->unique(['tenant_id', 'user_id', 'week_start']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('timesheets');
    }
};