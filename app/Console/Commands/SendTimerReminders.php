<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\TimeEntry;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendTimerReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'notifications:send-timer-reminders {--hour=9 : Hour to send reminders (0-23)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send daily timer reminders to users who haven\'t started tracking time';

    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        parent::__construct();
        $this->notificationService = $notificationService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $hour = (int) $this->option('hour');
        $currentHour = Carbon::now()->hour;

        // Only send at the specified hour
        if ($currentHour != $hour) {
            $this->info("Current hour is {$currentHour}, reminders scheduled for hour {$hour}. Skipping.");
            return Command::SUCCESS;
        }

        $this->info('Sending timer reminders to users...');

        // Get all active users with timer reminders enabled
        $users = User::where('is_active', true)
            ->where('timer_reminders_enabled', true)
            ->get();

        $sentCount = 0;
        $skippedCount = 0;

        foreach ($users as $user) {
            // Check if user is in quiet hours
            if ($this->isInQuietHours($user)) {
                $skippedCount++;
                continue;
            }

            // Check if user has already tracked time today
            $hasTrackedToday = TimeEntry::where('user_id', $user->id)
                ->whereDate('started_at', Carbon::today())
                ->exists();

            if ($hasTrackedToday) {
                $this->info("User {$user->email} has already tracked time today. Skipping.");
                $skippedCount++;
                continue;
            }

            // Check if user has an active timer
            $hasActiveTimer = TimeEntry::where('user_id', $user->id)
                ->whereNull('ended_at')
                ->exists();

            if ($hasActiveTimer) {
                $this->info("User {$user->email} has an active timer. Skipping.");
                $skippedCount++;
                continue;
            }

            // Send reminder
            try {
                $this->sendTimerReminder($user);
                $sentCount++;
                $this->info("Sent timer reminder to {$user->email}");
            } catch (\Exception $e) {
                $this->error("Failed to send reminder to {$user->email}: " . $e->getMessage());
                Log::error('Timer reminder failed', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        $this->info("Process completed. Sent {$sentCount} reminders, skipped {$skippedCount} users.");

        return Command::SUCCESS;
    }

    /**
     * Check if user is in quiet hours
     */
    protected function isInQuietHours(User $user): bool
    {
        if (!$user->quiet_hours_enabled) {
            return false;
        }

        $now = Carbon::now()->setTimezone($user->timezone ?? 'Europe/Paris');
        $currentTime = $now->format('H:i');

        $quietStart = $user->quiet_hours_start;
        $quietEnd = $user->quiet_hours_end;

        // Handle overnight quiet hours (e.g., 22:00 to 08:00)
        if ($quietStart > $quietEnd) {
            return $currentTime >= $quietStart || $currentTime < $quietEnd;
        }

        // Handle same-day quiet hours (e.g., 08:00 to 17:00)
        return $currentTime >= $quietStart && $currentTime < $quietEnd;
    }

    /**
     * Send timer reminder to a user
     */
    protected function sendTimerReminder(User $user)
    {
        // Get user's total hours this week
        $weekHours = $user->timeEntries()
            ->whereBetween('started_at', [
                Carbon::now()->startOfWeek(),
                Carbon::now()->endOfWeek()
            ])
            ->sum('duration_seconds') / 3600;

        $message = $weekHours > 0
            ? "N'oubliez pas de démarrer votre timer ! Vous avez tracké " . round($weekHours, 1) . " heures cette semaine."
            : "N'oubliez pas de démarrer votre timer pour suivre votre temps de travail aujourd'hui !";

        // Send in-app notification
        $this->notificationService->notify($user, [
            'type' => 'timer_reminder',
            'title' => 'Rappel de timer',
            'message' => $message,
            'priority' => 'low',
            'data' => [
                'week_hours' => round($weekHours, 1)
            ]
        ]);

        // Send push notification if enabled
        if ($user->push_notifications_enabled) {
            $this->notificationService->sendPushNotification($user, [
                'title' => '⏰ Rappel de timer',
                'body' => $message,
                'icon' => '/images/icons/icon-192x192.png',
                'badge' => '/images/icons/badge-72x72.png',
                'actions' => [
                    [
                        'action' => 'start_timer',
                        'title' => 'Démarrer le timer'
                    ],
                    [
                        'action' => 'dismiss',
                        'title' => 'Ignorer'
                    ]
                ],
                'data' => [
                    'type' => 'timer_reminder',
                    'url' => '/time'
                ]
            ]);
        }
    }
}