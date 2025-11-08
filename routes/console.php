<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled Tasks
|--------------------------------------------------------------------------
|
| Here we define all scheduled tasks that should run periodically.
| These tasks handle notifications, cleanup, and other background jobs.
|
*/

// Timer reminders - Run every day at 9 AM local time
Schedule::command('notifications:send-timer-reminders --hour=9')
    ->dailyAt('09:00')
    ->name('timer-reminders')
    ->withoutOverlapping()
    ->runInBackground();

// Project deadline checks - Run twice daily at 8 AM and 2 PM
Schedule::command('notifications:check-project-deadlines --days=14')
    ->twiceDaily(8, 14)
    ->name('project-deadlines')
    ->withoutOverlapping()
    ->runInBackground();

// Check for overdue invoices - Run daily at 10 AM
Schedule::command('invoices:check-overdue')
    ->dailyAt('10:00')
    ->name('overdue-invoices')
    ->withoutOverlapping()
    ->runInBackground();

// Clean old notifications - Run weekly on Sunday at 3 AM
Schedule::command('notifications:clean-old --days=30')
    ->weekly()->sundays()->at('03:00')
    ->name('clean-notifications')
    ->withoutOverlapping()
    ->runInBackground();

// Sync with external services - Run every 30 minutes
Schedule::command('sync:google-calendar')
    ->everyThirtyMinutes()
    ->name('google-calendar-sync')
    ->withoutOverlapping()
    ->runInBackground();
