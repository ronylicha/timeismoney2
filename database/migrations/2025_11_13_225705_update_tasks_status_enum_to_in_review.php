<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, update any existing 'review' status to 'in_review'
        DB::table('tasks')
            ->where('status', 'review')
            ->update(['status' => 'in_review']);

        // Then modify the ENUM to replace 'review' with 'in_review'
        DB::statement("ALTER TABLE tasks MODIFY COLUMN status ENUM('todo', 'in_progress', 'in_review', 'done', 'cancelled') NOT NULL DEFAULT 'todo'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert 'in_review' back to 'review'
        DB::table('tasks')
            ->where('status', 'in_review')
            ->update(['status' => 'review']);

        // Restore the original ENUM
        DB::statement("ALTER TABLE tasks MODIFY COLUMN status ENUM('todo', 'in_progress', 'review', 'done', 'cancelled') NOT NULL DEFAULT 'todo'");
    }
};
