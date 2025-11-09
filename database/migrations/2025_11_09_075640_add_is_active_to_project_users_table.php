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
        Schema::table('project_users', function (Blueprint $table) {
            $table->boolean('is_active')->default(true)->after('hourly_rate');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('project_users', function (Blueprint $table) {
            $table->dropColumn('is_active');
        });
    }
};
