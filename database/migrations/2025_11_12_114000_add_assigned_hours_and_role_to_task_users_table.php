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
        Schema::table('task_users', function (Blueprint $table) {
            // Add assigned_hours to track how many hours are allocated to this user for this task
            $table->decimal('assigned_hours', 8, 2)->nullable()->after('user_id');
            
            // Add role to define the user's role on this task (assignee, reviewer, etc.)
            $table->string('role')->default('assignee')->after('assigned_hours');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('task_users', function (Blueprint $table) {
            $table->dropColumn(['assigned_hours', 'role']);
        });
    }
};
