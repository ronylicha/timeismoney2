<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->foreignId('client_id')->nullable()->constrained()->onDelete('set null');
            $table->string('name');
            $table->string('code')->unique();
            $table->text('description')->nullable();
            $table->string('color')->default('#3B82F6');
            $table->enum('status', ['active', 'completed', 'archived', 'on_hold', 'cancelled'])->default('active');
            $table->enum('visibility', ['private', 'team', 'organization'])->default('team');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->decimal('estimated_hours', 10, 2)->nullable();
            $table->decimal('budget', 12, 2)->nullable();
            $table->decimal('hourly_rate', 10, 2)->nullable();
            $table->boolean('is_billable')->default(true);
            $table->boolean('is_template')->default(false);
            $table->integer('progress')->default(0); // 0-100
            $table->json('settings')->nullable();
            $table->json('custom_fields')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'client_id']);
            $table->index('code');
            $table->index('is_template');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};