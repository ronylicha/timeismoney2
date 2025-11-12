<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            // Add type column for task categorization (task, bug, feature, etc.)
            $table->string('type')->default('task')->after('priority');
            
            // Add hourly_rate for billable tasks
            $table->decimal('hourly_rate', 10, 2)->nullable()->after('is_billable');
            
            // Add column_id for kanban board organization (no foreign key constraint as columns table doesn't exist yet)
            $table->unsignedBigInteger('column_id')->nullable()->after('position');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn(['type', 'hourly_rate', 'column_id']);
        });
    }
};
