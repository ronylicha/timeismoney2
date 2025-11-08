<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Models\User;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CheckProjectDeadlines extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'notifications:check-project-deadlines {--days=7 : Days ahead to check for deadlines}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for approaching project deadlines and send notifications';

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
        $daysAhead = (int) $this->option('days');
        $checkDate = Carbon::now()->addDays($daysAhead);

        $this->info('Checking for project deadlines within ' . $daysAhead . ' days...');

        // Find projects with approaching deadlines
        $projects = Project::where('status', 'active')
            ->whereNotNull('deadline')
            ->where('deadline', '<=', $checkDate)
            ->where('deadline', '>', Carbon::now())
            ->with(['users', 'client'])
            ->get();

        $notificationCount = 0;

        foreach ($projects as $project) {
            $daysRemaining = Carbon::now()->diffInDays($project->deadline, false);

            // Skip if deadline has passed
            if ($daysRemaining < 0) {
                continue;
            }

            // Send notifications for different thresholds
            $shouldNotify = false;

            if ($daysRemaining <= 1) {
                // Critical - 1 day or less
                $shouldNotify = true;
            } elseif ($daysRemaining <= 3 && $daysRemaining % 1 == 0) {
                // High priority - 3 days or less
                $shouldNotify = true;
            } elseif ($daysRemaining <= 7 && $daysRemaining % 2 == 0) {
                // Medium priority - 7 days or less, every 2 days
                $shouldNotify = true;
            } elseif ($daysRemaining <= 14 && $daysRemaining % 7 == 0) {
                // Low priority - 14 days or less, weekly
                $shouldNotify = true;
            }

            if ($shouldNotify) {
                // Send notification to all project users
                foreach ($project->users as $user) {
                    if (!$user->project_notifications_enabled) {
                        continue;
                    }

                    try {
                        $this->sendDeadlineNotification($project, $user, $daysRemaining);
                        $notificationCount++;

                        $this->info("Sent deadline notification for project '{$project->name}' to {$user->email}");
                    } catch (\Exception $e) {
                        $this->error("Failed to send notification to {$user->email}: " . $e->getMessage());
                        Log::error('Project deadline notification failed', [
                            'project_id' => $project->id,
                            'user_id' => $user->id,
                            'error' => $e->getMessage()
                        ]);
                    }
                }
            }
        }

        $this->info("Process completed. Sent {$notificationCount} notifications for {$projects->count()} projects.");

        return Command::SUCCESS;
    }

    /**
     * Send deadline notification to a user
     */
    protected function sendDeadlineNotification(Project $project, User $user, int $daysRemaining)
    {
        // Create notification data
        $notificationData = [
            'project_id' => $project->id,
            'project_name' => $project->name,
            'deadline' => $project->deadline->format('Y-m-d'),
            'days_remaining' => $daysRemaining
        ];

        // Send via NotificationService
        $this->notificationService->notify($user, [
            'type' => 'project_deadline',
            'title' => 'Échéance de projet proche',
            'message' => "Le projet '{$project->name}' arrive à échéance dans {$daysRemaining} jour(s)",
            'priority' => $daysRemaining <= 3 ? 'high' : 'medium',
            'data' => $notificationData
        ]);

        // Send push notification if enabled
        if ($user->push_notifications_enabled && $daysRemaining <= 3) {
            $this->notificationService->sendPushNotification($user, [
                'title' => '📅 Échéance proche',
                'body' => "Le projet '{$project->name}' arrive à échéance dans {$daysRemaining} jour(s)",
                'icon' => '/images/icons/icon-192x192.png',
                'badge' => '/images/icons/badge-72x72.png',
                'requireInteraction' => $daysRemaining <= 1,
                'data' => [
                    'type' => 'project_deadline',
                    'project_id' => $project->id
                ]
            ]);
        }

        // Send email for critical deadlines (1 day or less)
        if ($user->email_notifications_enabled && $daysRemaining <= 1) {
            $this->notificationService->sendEmailNotification($user, 'project_deadline_critical', [
                'project_name' => $project->name,
                'client_name' => $project->client->name ?? 'N/A',
                'deadline' => $project->deadline->format('d/m/Y'),
                'days_remaining' => $daysRemaining
            ]);
        }
    }
}
