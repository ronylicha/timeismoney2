<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->onDelete('cascade');
            $table->foreignId('parent_task_id')->nullable()->constrained('tasks')->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('status', ['todo', 'in_progress', 'review', 'done', 'cancelled'])->default('todo');
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
            $table->decimal('estimated_hours', 8, 2)->nullable();
            $table->decimal('actual_hours', 8, 2)->default(0);
            $table->date('start_date')->nullable();
            $table->date('due_date')->nullable();
            $table->boolean('is_recurring')->default(false);
            $table->json('recurring_pattern')->nullable(); // {type: 'daily/weekly/monthly', interval: 1, days: [], end_date: ''}
            $table->integer('position')->default(0);
            $table->integer('progress')->default(0); // 0-100
            $table->boolean('is_billable')->default(true);
            $table->json('checklist')->nullable(); // [{id: '', text: '', completed: false}]
            $table->json('custom_fields')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
            $table->timestamp('completed_at')->nullable();

            $table->index(['project_id', 'status']);
            $table->index('parent_task_id');
            $table->index('due_date');
            $table->index('position');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};