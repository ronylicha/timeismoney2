<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('webhooks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('url');
            $table->string('secret')->nullable();
            $table->json('events'); // ['invoice.created', 'invoice.paid', 'time_entry.created', etc.]
            $table->json('headers')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('retry_count')->default(3);
            $table->integer('timeout')->default(30); // seconds
            $table->timestamp('last_triggered_at')->nullable();
            $table->enum('last_status', ['success', 'failed', 'pending'])->nullable();
            $table->text('last_error')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index(['tenant_id', 'is_active']);
            $table->index('events'); // JSON index
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhooks');
    }
};