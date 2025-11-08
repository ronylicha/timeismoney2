<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\NotificationService;
use App\Models\User;
use App\Models\Invoice;
use App\Models\Task;
use App\Models\TimeEntry;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class SendScheduledNotifications extends Command
{
    protected $signature = 'notifications:send-scheduled';
    protected $description = 'Send scheduled notifications (reminders, summaries, overdue alerts)';

    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        parent::__construct();
        $this->notificationService = $notificationService;
    }

    public function handle()
    {
        $this->info('Sending scheduled notifications...');

        // Send timer reminders
        $this->sendTimerReminders();

        // Send task due soon notifications
        $this->sendTaskDueSoonNotifications();

        // Send invoice overdue notifications
        $this->sendInvoiceOverdueNotifications();

        // Send daily summaries (at 9 AM)
        if (Carbon::now()->hour === 9) {
            $this->sendDailySummaries();
        }

        // Send weekly reports (Monday at 9 AM)
        if (Carbon::now()->dayOfWeek === Carbon::MONDAY && Carbon::now()->hour === 9) {
            $this->sendWeeklyReports();
        }

        $this->info('Scheduled notifications sent successfully');
    }

    /**
     * Send timer reminders
     */
    protected function sendTimerReminders()
    {
        $this->info('Checking for timer reminders...');

        // Find users with active timers running for more than 3 hours
        $activeTimers = TimeEntry::whereNull('ended_at')
            ->where('started_at', '<', Carbon::now()->subHours(3))
            ->with('user')
            ->get();

        foreach ($activeTimers as $timer) {
            try {
                $this->notificationService->notifyTimerReminder($timer->user, $timer);
                $this->info("Timer reminder sent to user {$timer->user->id}");
            } catch (\Exception $e) {
                $this->error("Failed to send timer reminder: {$e->getMessage()}");
                Log::error('Timer reminder failed', [
                    'user_id' => $timer->user->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        // Find users who haven't started any timer today (at 10 AM and 2 PM)
        if (in_array(Carbon::now()->hour, [10, 14])) {
            $usersWithoutTimer = User::whereDoesntHave('timeEntries', function ($query) {
                $query->whereDate('started_at', Carbon::today());
            })->get();

            foreach ($usersWithoutTimer as $user) {
                try {
                    $this->notificationService->notifyTimerReminder($user);
                    $this->info("Timer reminder sent to user {$user->id} (no timer today)");
                } catch (\Exception $e) {
                    $this->error("Failed to send timer reminder: {$e->getMessage()}");
                }
            }
        }
    }

    /**
     * Send task due soon notifications
     */
    protected function sendTaskDueSoonNotifications()
    {
        $this->info('Checking for tasks due soon...');

        // Tasks due in the next 24 hours
        $tasksDueSoon = Task::where('status', '!=', 'done')
            ->whereBetween('due_date', [Carbon::now(), Carbon::now()->addHours(24)])
            ->whereNotNull('assignee_id')
            ->with('assignee')
            ->get();

        foreach ($tasksDueSoon as $task) {
            try {
                $this->notificationService->notifyTaskDueSoon($task);
                $this->info("Task due soon notification sent for task {$task->id}");
            } catch (\Exception $e) {
                $this->error("Failed to send task notification: {$e->getMessage()}");
                Log::error('Task notification failed', [
                    'task_id' => $task->id,
                    'error' => $e->getMessage()
                ]);
            }
        }
    }

    /**
     * Send invoice overdue notifications
     */
    protected function sendInvoiceOverdueNotifications()
    {
        $this->info('Checking for overdue invoices...');

        // Invoices that became overdue today
        $overdueInvoices = Invoice::where('status', 'sent')
            ->whereDate('due_date', '<', Carbon::today())
            ->whereDoesntHave('notificationLogs', function ($query) {
                $query->where('type', 'invoice_overdue')
                    ->whereDate('sent_at', Carbon::today());
            })
            ->with('tenant.owner')
            ->get();

        foreach ($overdueInvoices as $invoice) {
            try {
                $this->notificationService->notifyInvoiceOverdue($invoice);
                $this->info("Overdue notification sent for invoice {$invoice->id}");
            } catch (\Exception $e) {
                $this->error("Failed to send overdue notification: {$e->getMessage()}");
                Log::error('Overdue notification failed', [
                    'invoice_id' => $invoice->id,
                    'error' => $e->getMessage()
                ]);
            }
        }
    }

    /**
     * Send daily summaries
     */
    protected function sendDailySummaries()
    {
        $this->info('Sending daily summaries...');

        $users = User::whereHas('notificationPreferences', function ($query) {
            $query->where('notification_type', 'daily_summary')
                ->where('email_enabled', true);
        })->get();

        foreach ($users as $user) {
            try {
                $this->notificationService->sendDailySummary($user);
                $this->info("Daily summary sent to user {$user->id}");
            } catch (\Exception $e) {
                $this->error("Failed to send daily summary: {$e->getMessage()}");
                Log::error('Daily summary failed', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage()
                ]);
            }
        }
    }

    /**
     * Send weekly reports
     */
    protected function sendWeeklyReports()
    {
        $this->info('Sending weekly reports...');

        $users = User::whereHas('notificationPreferences', function ($query) {
            $query->where('notification_type', 'weekly_report')
                ->where('email_enabled', true);
        })->get();

        foreach ($users as $user) {
            try {
                $this->notificationService->sendWeeklyReport($user);
                $this->info("Weekly report sent to user {$user->id}");
            } catch (\Exception $e) {
                $this->error("Failed to send weekly report: {$e->getMessage()}");
                Log::error('Weekly report failed', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage()
                ]);
            }
        }
    }
}