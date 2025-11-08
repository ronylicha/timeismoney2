<?php

namespace App\Services;

use App\Models\User;
use App\Models\Invoice;
use App\Models\TimeEntry;
use App\Models\Task;
use App\Models\Payment;
use App\Models\NotificationPreference;
use App\Models\NotificationLog;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;
use Carbon\Carbon;

/**
 * Comprehensive notification service for email and push notifications
 */
class NotificationService
{
    protected $webPush = null;
    protected $emailService;

    public function __construct()
    {
        // WebPush will be initialized lazily when needed
    }

    /**
     * Get Web Push instance (lazy initialization)
     */
    protected function getWebPush(): ?WebPush
    {
        if ($this->webPush === null) {
            $publicKey = config('services.vapid.public_key');
            $privateKey = config('services.vapid.private_key');

            if ($publicKey && $privateKey) {
                $auth = [
                    'VAPID' => [
                        'subject' => config('app.url'),
                        'publicKey' => $publicKey,
                        'privateKey' => $privateKey,
                    ],
                ];

                $this->webPush = new WebPush($auth);
            }
        }

        return $this->webPush;
    }

    /**
     * Send invoice created notification
     */
    public function notifyInvoiceCreated(Invoice $invoice): void
    {
        $user = $invoice->tenant->owner;
        $client = $invoice->client;

        $data = [
            'title' => 'Nouvelle facture créée',
            'body' => "Facture {$invoice->invoice_number} créée pour {$client->name}",
            'icon' => '/icon-192x192.png',
            'badge' => '/badge-72x72.png',
            'url' => "/invoices/{$invoice->id}",
            'tag' => "invoice-{$invoice->id}",
            'data' => [
                'type' => 'invoice_created',
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'client_name' => $client->name,
                'total' => $invoice->total,
                'due_date' => $invoice->due_date->format('d/m/Y')
            ]
        ];

        // Check notification preferences
        if ($this->shouldSendPush($user, 'invoice_created')) {
            $this->sendPushNotification($user, $data);
        }

        if ($this->shouldSendEmail($user, 'invoice_created')) {
            $this->sendEmailNotification($user, 'invoice.created', $data);
        }

        // Send to client if enabled
        if ($invoice->send_to_client) {
            $this->sendInvoiceToClient($invoice);
        }

        $this->logNotification($user, 'invoice_created', $data);
    }

    /**
     * Send invoice to client
     */
    public function sendInvoiceToClient(Invoice $invoice): void
    {
        $client = $invoice->client;

        if (!$client->email) {
            Log::warning("Cannot send invoice to client: no email", ['client_id' => $client->id]);
            return;
        }

        try {
            Mail::send('emails.invoice.client', [
                'invoice' => $invoice,
                'client' => $client,
                'tenant' => $invoice->tenant,
                'viewUrl' => url("/client/invoices/{$invoice->uuid}"),
                'downloadUrl' => url("/client/invoices/{$invoice->uuid}/download")
            ], function ($message) use ($invoice, $client) {
                $message->to($client->email, $client->name)
                    ->subject("Facture {$invoice->invoice_number}")
                    ->attach($this->generateInvoicePdf($invoice), [
                        'as' => "facture_{$invoice->invoice_number}.pdf",
                        'mime' => 'application/pdf'
                    ]);
            });

            // Update invoice status
            $invoice->update([
                'sent_at' => Carbon::now(),
                'status' => 'sent'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to send invoice to client', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Notify payment received
     */
    public function notifyPaymentReceived(Payment $payment): void
    {
        $invoice = $payment->invoice;
        $user = $invoice->tenant->owner;

        $data = [
            'title' => 'Paiement reçu',
            'body' => "Paiement de {$payment->amount}€ reçu pour la facture {$invoice->invoice_number}",
            'icon' => '/icon-192x192.png',
            'badge' => '/badge-72x72.png',
            'url' => "/payments/{$payment->id}",
            'tag' => "payment-{$payment->id}",
            'data' => [
                'type' => 'payment_received',
                'payment_id' => $payment->id,
                'invoice_number' => $invoice->invoice_number,
                'amount' => $payment->amount,
                'payment_date' => $payment->payment_date->format('d/m/Y')
            ]
        ];

        if ($this->shouldSendPush($user, 'payment_received')) {
            $this->sendPushNotification($user, $data);
        }

        if ($this->shouldSendEmail($user, 'payment_received')) {
            $this->sendEmailNotification($user, 'payment.received', $data);
        }

        $this->logNotification($user, 'payment_received', $data);
    }

    /**
     * Notify invoice overdue
     */
    public function notifyInvoiceOverdue(Invoice $invoice): void
    {
        $user = $invoice->tenant->owner;
        $daysOverdue = Carbon::now()->diffInDays($invoice->due_date);

        $data = [
            'title' => 'Facture en retard',
            'body' => "La facture {$invoice->invoice_number} est en retard de {$daysOverdue} jours",
            'icon' => '/icon-192x192.png',
            'badge' => '/badge-72x72.png',
            'url' => "/invoices/{$invoice->id}",
            'tag' => "overdue-{$invoice->id}",
            'data' => [
                'type' => 'invoice_overdue',
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'days_overdue' => $daysOverdue,
                'total' => $invoice->total
            ]
        ];

        if ($this->shouldSendPush($user, 'invoice_overdue')) {
            $this->sendPushNotification($user, $data);
        }

        if ($this->shouldSendEmail($user, 'invoice_overdue')) {
            $this->sendEmailNotification($user, 'invoice.overdue', $data);
        }

        $this->logNotification($user, 'invoice_overdue', $data);
    }

    /**
     * Notify timer reminder
     */
    public function notifyTimerReminder(User $user, TimeEntry $entry = null): void
    {
        $message = $entry
            ? "Vous avez un timer en cours depuis " . $entry->started_at->diffForHumans()
            : "N'oubliez pas de démarrer votre timer!";

        $data = [
            'title' => 'Rappel Timer',
            'body' => $message,
            'icon' => '/icon-192x192.png',
            'badge' => '/badge-72x72.png',
            'url' => '/timer',
            'tag' => 'timer-reminder',
            'data' => [
                'type' => 'timer_reminder',
                'has_active_timer' => $entry !== null,
                'duration' => $entry ? $entry->started_at->diffInMinutes() : 0
            ]
        ];

        if ($this->shouldSendPush($user, 'timer_reminder')) {
            $this->sendPushNotification($user, $data);
        }

        $this->logNotification($user, 'timer_reminder', $data);
    }

    /**
     * Notify task assigned
     */
    public function notifyTaskAssigned(Task $task, User $assignee): void
    {
        $data = [
            'title' => 'Nouvelle tâche assignée',
            'body' => "La tâche '{$task->title}' vous a été assignée",
            'icon' => '/icon-192x192.png',
            'badge' => '/badge-72x72.png',
            'url' => "/tasks/{$task->id}",
            'tag' => "task-{$task->id}",
            'data' => [
                'type' => 'task_assigned',
                'task_id' => $task->id,
                'task_title' => $task->title,
                'project_name' => $task->project->name,
                'priority' => $task->priority,
                'due_date' => $task->due_date ? $task->due_date->format('d/m/Y') : null
            ]
        ];

        if ($this->shouldSendPush($assignee, 'task_assigned')) {
            $this->sendPushNotification($assignee, $data);
        }

        if ($this->shouldSendEmail($assignee, 'task_assigned')) {
            $this->sendEmailNotification($assignee, 'task.assigned', $data);
        }

        $this->logNotification($assignee, 'task_assigned', $data);
    }

    /**
     * Notify task due soon
     */
    public function notifyTaskDueSoon(Task $task): void
    {
        if (!$task->assignee) {
            return;
        }

        $hoursUntilDue = Carbon::now()->diffInHours($task->due_date);

        $data = [
            'title' => 'Tâche à échéance proche',
            'body' => "La tâche '{$task->title}' est due dans {$hoursUntilDue} heures",
            'icon' => '/icon-192x192.png',
            'badge' => '/badge-72x72.png',
            'url' => "/tasks/{$task->id}",
            'tag' => "task-due-{$task->id}",
            'data' => [
                'type' => 'task_due_soon',
                'task_id' => $task->id,
                'task_title' => $task->title,
                'hours_until_due' => $hoursUntilDue,
                'due_date' => $task->due_date->format('d/m/Y H:i')
            ]
        ];

        if ($this->shouldSendPush($task->assignee, 'task_due_soon')) {
            $this->sendPushNotification($task->assignee, $data);
        }

        if ($this->shouldSendEmail($task->assignee, 'task_due_soon')) {
            $this->sendEmailNotification($task->assignee, 'task.due_soon', $data);
        }

        $this->logNotification($task->assignee, 'task_due_soon', $data);
    }

    /**
     * Notify Chorus Pro status update
     */
    public function notifyChorusProStatus(Invoice $invoice, string $oldStatus, string $newStatus): void
    {
        $user = $invoice->tenant->owner;

        $statusLabels = [
            'deposited' => 'Déposée',
            'in_transit' => 'En cours d\'acheminement',
            'available' => 'Mise à disposition',
            'suspended' => 'Suspendue',
            'rejected' => 'Rejetée',
            'mandated' => 'Mandatée',
            'payment_processing' => 'Mise en paiement',
            'paid' => 'Payée',
            'cancelled' => 'Annulée'
        ];

        $statusLabel = isset($statusLabels[$newStatus]) ? $statusLabels[$newStatus] : $newStatus;

        $data = [
            'title' => 'Mise à jour Chorus Pro',
            'body' => "Facture {$invoice->invoice_number}: {$statusLabel}",
            'icon' => '/icon-192x192.png',
            'badge' => '/badge-72x72.png',
            'url' => "/invoices/{$invoice->id}",
            'tag' => "chorus-{$invoice->id}",
            'data' => [
                'type' => 'chorus_pro_update',
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'chorus_reference' => $invoice->chorus_reference
            ]
        ];

        if ($this->shouldSendPush($user, 'chorus_pro_update')) {
            $this->sendPushNotification($user, $data);
        }

        if ($this->shouldSendEmail($user, 'chorus_pro_update')) {
            $this->sendEmailNotification($user, 'chorus.status_update', $data);
        }

        $this->logNotification($user, 'chorus_pro_update', $data);
    }

    /**
     * Send daily summary
     */
    public function sendDailySummary(User $user): void
    {
        $today = Carbon::today();
        $yesterday = Carbon::yesterday();

        // Get yesterday's data
        $timeEntries = TimeEntry::where('user_id', $user->id)
            ->whereBetween('started_at', [$yesterday, $today])
            ->get();

        $totalHours = $timeEntries->sum('duration_seconds') / 3600;
        $billableHours = $timeEntries->where('is_billable', true)->sum('duration_seconds') / 3600;

        // Get pending tasks
        $pendingTasks = Task::where('assignee_id', $user->id)
            ->where('status', 'todo')
            ->count();

        // Get overdue invoices
        $overdueInvoices = Invoice::whereHas('tenant', function($q) use ($user) {
                $q->where('owner_id', $user->id);
            })
            ->where('status', 'sent')
            ->where('due_date', '<', $today)
            ->count();

        $data = [
            'title' => 'Résumé quotidien',
            'body' => "Hier: {$totalHours}h travaillées ({$billableHours}h facturables)",
            'icon' => '/icon-192x192.png',
            'badge' => '/badge-72x72.png',
            'url' => '/dashboard',
            'tag' => 'daily-summary',
            'data' => [
                'type' => 'daily_summary',
                'total_hours' => $totalHours,
                'billable_hours' => $billableHours,
                'pending_tasks' => $pendingTasks,
                'overdue_invoices' => $overdueInvoices,
                'date' => $yesterday->format('d/m/Y')
            ]
        ];

        if ($this->shouldSendEmail($user, 'daily_summary')) {
            $this->sendEmailNotification($user, 'summary.daily', $data);
        }

        $this->logNotification($user, 'daily_summary', $data);
    }

    /**
     * Send weekly report
     */
    public function sendWeeklyReport(User $user): void
    {
        $startOfWeek = Carbon::now()->startOfWeek();
        $endOfWeek = Carbon::now()->endOfWeek();

        // Get week's data
        $timeEntries = TimeEntry::where('user_id', $user->id)
            ->whereBetween('started_at', [$startOfWeek, $endOfWeek])
            ->get();

        $totalHours = $timeEntries->sum('duration_seconds') / 3600;
        $billableHours = $timeEntries->where('is_billable', true)->sum('duration_seconds') / 3600;
        $totalRevenue = $timeEntries->where('is_billable', true)->sum(function($entry) {
            return ($entry->duration_seconds / 3600) * $entry->hourly_rate;
        });

        // Tasks completed
        $tasksCompleted = Task::where('assignee_id', $user->id)
            ->where('status', 'done')
            ->whereBetween('updated_at', [$startOfWeek, $endOfWeek])
            ->count();

        // Invoices sent
        $invoicesSent = Invoice::whereHas('tenant', function($q) use ($user) {
                $q->where('owner_id', $user->id);
            })
            ->whereBetween('sent_at', [$startOfWeek, $endOfWeek])
            ->count();

        $data = [
            'title' => 'Rapport hebdomadaire',
            'body' => "Cette semaine: {$totalHours}h travaillées, {$totalRevenue}€ générés",
            'icon' => '/icon-192x192.png',
            'badge' => '/badge-72x72.png',
            'url' => '/reports/weekly',
            'tag' => 'weekly-report',
            'data' => [
                'type' => 'weekly_report',
                'total_hours' => $totalHours,
                'billable_hours' => $billableHours,
                'total_revenue' => $totalRevenue,
                'tasks_completed' => $tasksCompleted,
                'invoices_sent' => $invoicesSent,
                'week_start' => $startOfWeek->format('d/m/Y'),
                'week_end' => $endOfWeek->format('d/m/Y')
            ]
        ];

        if ($this->shouldSendEmail($user, 'weekly_report')) {
            $this->sendEmailNotification($user, 'summary.weekly', $data);
        }

        $this->logNotification($user, 'weekly_report', $data);
    }

    /**
     * Send push notification
     */
    protected function sendPushNotification(User $user, array $data): void
    {
        $webPush = $this->getWebPush();
        if (!$webPush) {
            Log::warning('WebPush not configured - missing VAPID keys');
            return;
        }

        $subscriptions = $user->pushSubscriptions;

        if ($subscriptions->isEmpty()) {
            return;
        }

        $payload = json_encode($data);

        foreach ($subscriptions as $subscription) {
            $sub = Subscription::create([
                'endpoint' => $subscription->endpoint,
                'publicKey' => $subscription->public_key,
                'authToken' => $subscription->auth_token
            ]);

            $report = $webPush->sendOneNotification($sub, $payload);

            if (!$report->isSuccess()) {
                Log::error('Push notification failed', [
                    'user_id' => $user->id,
                    'reason' => $report->getReason(),
                    'endpoint' => $subscription->endpoint
                ]);

                // Remove invalid subscription
                if ($report->isSubscriptionExpired()) {
                    $subscription->delete();
                }
            }
        }

        $webPush->flush();
    }

    /**
     * Send email notification
     */
    protected function sendEmailNotification(User $user, string $template, array $data): void
    {
        try {
            Mail::send("emails.notifications.{$template}", [
                'user' => $user,
                'notificationData' => $data
            ], function ($message) use ($user, $data) {
                $message->to($user->email, $user->name)
                    ->subject($data['title']);
            });
        } catch (\Exception $e) {
            Log::error('Email notification failed', [
                'user_id' => $user->id,
                'template' => $template,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Check if should send push notification
     */
    protected function shouldSendPush(User $user, string $type): bool
    {
        $preference = NotificationPreference::where('user_id', $user->id)
            ->where('notification_type', $type)
            ->first();

        return $preference ? $preference->push_enabled : true;
    }

    /**
     * Check if should send email notification
     */
    protected function shouldSendEmail(User $user, string $type): bool
    {
        $preference = NotificationPreference::where('user_id', $user->id)
            ->where('notification_type', $type)
            ->first();

        return $preference ? $preference->email_enabled : true;
    }

    /**
     * Log notification
     */
    protected function logNotification(User $user, string $type, array $data): void
    {
        NotificationLog::create([
            'user_id' => $user->id,
            'type' => $type,
            'data' => $data,
            'sent_at' => Carbon::now()
        ]);
    }

    /**
     * Generate invoice PDF
     */
    protected function generateInvoicePdf(Invoice $invoice): string
    {
        $pdf = \PDF::loadView('invoices.pdf', [
            'invoice' => $invoice->load(['client', 'items', 'tenant']),
            'tenant' => $invoice->tenant
        ]);

        return $pdf->output();
    }
}