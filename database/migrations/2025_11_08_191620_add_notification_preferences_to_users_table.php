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
            $table->boolean('push_notifications_enabled')->default(true)->after('remember_token');
            $table->boolean('email_notifications_enabled')->default(true)->after('push_notifications_enabled');
            $table->boolean('timer_reminders_enabled')->default(true)->after('email_notifications_enabled');
            $table->boolean('invoice_notifications_enabled')->default(true)->after('timer_reminders_enabled');
            $table->boolean('project_notifications_enabled')->default(true)->after('invoice_notifications_enabled');
            $table->boolean('task_notifications_enabled')->default(true)->after('project_notifications_enabled');
            $table->boolean('quiet_hours_enabled')->default(false)->after('task_notifications_enabled');
            $table->time('quiet_hours_start')->default('22:00')->after('quiet_hours_enabled');
            $table->time('quiet_hours_end')->default('08:00')->after('quiet_hours_start');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'push_notifications_enabled',
                'email_notifications_enabled',
                'timer_reminders_enabled',
                'invoice_notifications_enabled',
                'project_notifications_enabled',
                'task_notifications_enabled',
                'quiet_hours_enabled',
                'quiet_hours_start',
                'quiet_hours_end'
            ]);
        });
    }
};
