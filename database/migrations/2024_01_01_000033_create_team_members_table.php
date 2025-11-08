<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('employee_id')->nullable();
            $table->string('department')->nullable();
            $table->string('position')->nullable();
            $table->decimal('hourly_rate', 10, 2)->nullable();
            $table->decimal('daily_rate', 10, 2)->nullable();
            $table->decimal('cost_rate', 10, 2)->nullable(); // Internal cost
            $table->integer('weekly_hours')->default(40);
            $table->json('working_days')->nullable(); // ['monday', 'tuesday', ...]
            $table->time('work_start_time')->default('09:00:00');
            $table->time('work_end_time')->default('18:00:00');
            $table->integer('vacation_days')->default(25);
            $table->integer('sick_days')->default(10);
            $table->date('hire_date')->nullable();
            $table->date('end_date')->nullable();
            $table->boolean('is_billable')->default(true);
            $table->boolean('can_approve_time')->default(false);
            $table->boolean('can_approve_expenses')->default(false);
            $table->json('skills')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'user_id']);
            $table->unique(['tenant_id', 'employee_id']);
            $table->index('is_billable');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_members');
    }
};