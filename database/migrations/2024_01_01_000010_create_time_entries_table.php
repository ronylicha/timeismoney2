<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('time_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('project_id')->constrained()->onDelete('cascade');
            $table->foreignId('task_id')->nullable()->constrained()->onDelete('set null');
            $table->text('description')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->integer('duration_seconds')->default(0);
            $table->boolean('is_manual')->default(false);
            $table->boolean('is_billable')->default(true);
            $table->decimal('hourly_rate', 10, 2)->nullable();
            $table->boolean('is_approved')->default(false);
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->timestamp('approved_at')->nullable();
            $table->unsignedBigInteger('invoice_id')->nullable()->index(); // Ajoutera la FK plus tard
            $table->boolean('is_locked')->default(false); // Verrouillé après facturation
            $table->json('tags')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'user_id', 'started_at']);
            $table->index(['tenant_id', 'project_id']);
            $table->index(['tenant_id', 'task_id']);
            // index('invoice_id') already created above with ->index()
            $table->index('is_billable');
            $table->index('is_approved');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('time_entries');
    }
};