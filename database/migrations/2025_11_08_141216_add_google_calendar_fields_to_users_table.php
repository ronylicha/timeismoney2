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
        Schema::table('users', function (Blueprint $table) {
            // Google Calendar OAuth integration
            $table->string('google_id')->nullable();
            $table->text('google_access_token')->nullable(); // Encrypted
            $table->text('google_refresh_token')->nullable(); // Encrypted
            $table->string('google_calendar_id')->nullable(); // Primary calendar ID
            $table->boolean('google_calendar_enabled')->default(false);
            $table->timestamp('google_token_expires_at')->nullable();

            // Indexes
            $table->index('google_id');
            $table->index('google_calendar_enabled');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['google_id']);
            $table->dropIndex(['google_calendar_enabled']);

            $table->dropColumn([
                'google_id',
                'google_access_token',
                'google_refresh_token',
                'google_calendar_id',
                'google_calendar_enabled',
                'google_token_expires_at',
            ]);
        });
    }
};
