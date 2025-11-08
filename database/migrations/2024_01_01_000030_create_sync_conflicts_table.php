<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sync_conflicts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('entity_type'); // time_entry, task, project, etc.
            $table->unsignedBigInteger('entity_id');
            $table->json('local_version'); // Client version
            $table->json('server_version'); // Server version
            $table->json('base_version')->nullable(); // Common ancestor
            $table->enum('resolution', ['pending', 'local_wins', 'server_wins', 'merged', 'manual'])->default('pending');
            $table->json('resolved_version')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users');
            $table->timestamp('resolved_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'user_id', 'resolution']);
            $table->index(['entity_type', 'entity_id']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_conflicts');
    }
};