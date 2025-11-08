<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\User;
use App\Models\Timer;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\Task;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class NotificationController extends Controller
{
    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Get all notifications for the authenticated user
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        $query = $user->notifications();

        // Apply filters
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('unread')) {
            $query->whereNull('read_at');
        }

        // Add pagination
        $notifications = $query->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($notifications);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(Request $request, $id)
    {
        $notification = Auth::user()->notifications()->findOrFail($id);
        $notification->markAsRead();

        return response()->json(['message' => 'Notification marked as read']);
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(Request $request)
    {
        Auth::user()->unreadNotifications->markAsRead();

        return response()->json(['message' => 'All notifications marked as read']);
    }

    /**
     * Delete a notification
     */
    public function destroy($id)
    {
        $notification = Auth::user()->notifications()->findOrFail($id);
        $notification->delete();

        return response()->json(['message' => 'Notification deleted']);
    }

    /**
     * Get unread notification count
     */
    public function unreadCount()
    {
        $count = Auth::user()->unreadNotifications()->count();

        return response()->json(['count' => $count]);
    }

    /**
     * Timer started notification
     */
    public function timerStarted(Request $request)
    {
        $request->validate([
            'timer_id' => 'required|exists:timers,id',
            'project_name' => 'required|string',
            'task_name' => 'nullable|string'
        ]);

        $user = Auth::user();

        // Create in-app notification
        $message = $request->task_name
            ? "Timer démarré pour la tâche '{$request->task_name}' sur le projet '{$request->project_name}'"
            : "Timer démarré pour le projet '{$request->project_name}'";

        $this->notificationService->notify($user, [
            'type' => 'timer_started',
            'title' => 'Timer démarré',
            'message' => $message,
            'data' => [
                'timer_id' => $request->timer_id,
                'project_name' => $request->project_name,
                'task_name' => $request->task_name
            ]
        ]);

        // Send push notification if enabled
        if ($user->push_notifications_enabled) {
            $this->notificationService->sendPushNotification($user, [
                'title' => 'Timer démarré',
                'body' => $message,
                'icon' => '/images/icons/icon-192x192.png',
                'badge' => '/images/icons/badge-72x72.png',
                'data' => [
                    'type' => 'timer_started',
                    'timer_id' => $request->timer_id
                ]
            ]);
        }

        return response()->json(['message' => 'Notification sent']);
    }

    /**
     * Timer stopped notification
     */
    public function timerStopped(Request $request)
    {
        $request->validate([
            'timer_id' => 'required|exists:timers,id',
            'project_name' => 'required|string',
            'duration' => 'required|string'
        ]);

        $user = Auth::user();

        // Create in-app notification
        $message = "Timer arrêté pour le projet '{$request->project_name}' - Durée: {$request->duration}";

        $this->notificationService->notify($user, [
            'type' => 'timer_stopped',
            'title' => 'Timer arrêté',
            'message' => $message,
            'data' => [
                'timer_id' => $request->timer_id,
                'project_name' => $request->project_name,
                'duration' => $request->duration
            ]
        ]);

        // Send push notification if enabled
        if ($user->push_notifications_enabled) {
            $this->notificationService->sendPushNotification($user, [
                'title' => 'Timer arrêté',
                'body' => $message,
                'icon' => '/images/icons/icon-192x192.png',
                'badge' => '/images/icons/badge-72x72.png',
                'data' => [
                    'type' => 'timer_stopped',
                    'timer_id' => $request->timer_id
                ]
            ]);
        }

        return response()->json(['message' => 'Notification sent']);
    }

    /**
     * Long-running timer notification
     */
    public function timerLongRunning(Request $request)
    {
        $request->validate([
            'timer_id' => 'required|exists:timers,id',
            'project_name' => 'required|string',
            'duration_hours' => 'required|integer'
        ]);

        $user = Auth::user();

        // Create in-app notification
        $message = "Attention: Le timer pour '{$request->project_name}' est actif depuis {$request->duration_hours} heures!";

        $this->notificationService->notify($user, [
            'type' => 'timer_long_running',
            'title' => 'Timer longue durée',
            'message' => $message,
            'priority' => 'high',
            'data' => [
                'timer_id' => $request->timer_id,
                'project_name' => $request->project_name,
                'duration_hours' => $request->duration_hours
            ]
        ]);

        // Always send push notification for long-running timers
        $this->notificationService->sendPushNotification($user, [
            'title' => '⚠️ Timer longue durée',
            'body' => $message,
            'icon' => '/images/icons/icon-192x192.png',
            'badge' => '/images/icons/badge-72x72.png',
            'requireInteraction' => true,
            'data' => [
                'type' => 'timer_long_running',
                'timer_id' => $request->timer_id
            ]
        ]);

        return response()->json(['message' => 'Notification sent']);
    }

    /**
     * Invoice created notification
     */
    public function invoiceCreated(Request $request)
    {
        $request->validate([
            'invoice_id' => 'required|exists:invoices,id',
            'client_name' => 'required|string',
            'invoice_number' => 'required|string',
            'amount' => 'required|numeric'
        ]);

        $user = Auth::user();
        $formattedAmount = number_format($request->amount, 2, ',', ' ') . ' €';

        // Create in-app notification
        $message = "Nouvelle facture {$request->invoice_number} créée pour {$request->client_name} - Montant: {$formattedAmount}";

        $this->notificationService->notify($user, [
            'type' => 'invoice_created',
            'title' => 'Facture créée',
            'message' => $message,
            'data' => [
                'invoice_id' => $request->invoice_id,
                'client_name' => $request->client_name,
                'invoice_number' => $request->invoice_number,
                'amount' => $request->amount
            ]
        ]);

        return response()->json(['message' => 'Notification sent']);
    }

    /**
     * Payment received notification
     */
    public function paymentReceived(Request $request)
    {
        $request->validate([
            'invoice_id' => 'required|exists:invoices,id',
            'client_name' => 'required|string',
            'invoice_number' => 'required|string',
            'amount' => 'required|numeric'
        ]);

        $user = Auth::user();
        $formattedAmount = number_format($request->amount, 2, ',', ' ') . ' €';

        // Create in-app notification
        $message = "Paiement reçu pour la facture {$request->invoice_number} de {$request->client_name} - Montant: {$formattedAmount}";

        $this->notificationService->notify($user, [
            'type' => 'payment_received',
            'title' => 'Paiement reçu',
            'message' => $message,
            'priority' => 'high',
            'data' => [
                'invoice_id' => $request->invoice_id,
                'client_name' => $request->client_name,
                'invoice_number' => $request->invoice_number,
                'amount' => $request->amount
            ]
        ]);

        // Send push notification
        if ($user->push_notifications_enabled) {
            $this->notificationService->sendPushNotification($user, [
                'title' => '💰 Paiement reçu',
                'body' => $message,
                'icon' => '/images/icons/icon-192x192.png',
                'badge' => '/images/icons/badge-72x72.png',
                'data' => [
                    'type' => 'payment_received',
                    'invoice_id' => $request->invoice_id
                ]
            ]);
        }

        // Send email notification
        $this->notificationService->sendEmailNotification($user, 'payment_received', [
            'client_name' => $request->client_name,
            'invoice_number' => $request->invoice_number,
            'amount' => $formattedAmount
        ]);

        return response()->json(['message' => 'Notification sent']);
    }

    /**
     * Project deadline approaching notification
     */
    public function projectDeadlineApproaching(Request $request)
    {
        $request->validate([
            'project_id' => 'required|exists:projects,id',
            'project_name' => 'required|string',
            'deadline' => 'required|date',
            'days_remaining' => 'required|integer'
        ]);

        $user = Auth::user();

        // Create in-app notification
        $message = "Le projet '{$request->project_name}' arrive à échéance dans {$request->days_remaining} jour(s)";

        $this->notificationService->notify($user, [
            'type' => 'project_deadline',
            'title' => 'Échéance proche',
            'message' => $message,
            'priority' => $request->days_remaining <= 3 ? 'high' : 'medium',
            'data' => [
                'project_id' => $request->project_id,
                'project_name' => $request->project_name,
                'deadline' => $request->deadline,
                'days_remaining' => $request->days_remaining
            ]
        ]);

        // Send push notification for urgent deadlines
        if ($user->push_notifications_enabled && $request->days_remaining <= 3) {
            $this->notificationService->sendPushNotification($user, [
                'title' => '📅 Échéance proche',
                'body' => $message,
                'icon' => '/images/icons/icon-192x192.png',
                'badge' => '/images/icons/badge-72x72.png',
                'requireInteraction' => true,
                'data' => [
                    'type' => 'project_deadline',
                    'project_id' => $request->project_id
                ]
            ]);
        }

        return response()->json(['message' => 'Notification sent']);
    }

    /**
     * Task assigned notification
     */
    public function taskAssigned(Request $request)
    {
        $request->validate([
            'task_id' => 'required|exists:tasks,id',
            'task_title' => 'required|string',
            'project_name' => 'required|string',
            'assigned_by' => 'required|string',
            'priority' => 'nullable|string|in:low,medium,high'
        ]);

        $user = Auth::user();

        // Create in-app notification
        $message = "{$request->assigned_by} vous a assigné la tâche '{$request->task_title}' sur le projet '{$request->project_name}'";

        $this->notificationService->notify($user, [
            'type' => 'task_assigned',
            'title' => 'Nouvelle tâche assignée',
            'message' => $message,
            'priority' => $request->priority ?? 'medium',
            'data' => [
                'task_id' => $request->task_id,
                'task_title' => $request->task_title,
                'project_name' => $request->project_name,
                'assigned_by' => $request->assigned_by,
                'priority' => $request->priority
            ]
        ]);

        // Send push notification
        if ($user->push_notifications_enabled) {
            $this->notificationService->sendPushNotification($user, [
                'title' => 'Nouvelle tâche assignée',
                'body' => $message,
                'icon' => '/images/icons/icon-192x192.png',
                'badge' => '/images/icons/badge-72x72.png',
                'data' => [
                    'type' => 'task_assigned',
                    'task_id' => $request->task_id
                ]
            ]);
        }

        // Send email notification for high priority tasks
        if ($request->priority === 'high') {
            $this->notificationService->sendEmailNotification($user, 'task_assigned', [
                'task_title' => $request->task_title,
                'project_name' => $request->project_name,
                'assigned_by' => $request->assigned_by,
                'priority' => 'haute'
            ]);
        }

        return response()->json(['message' => 'Notification sent']);
    }

    /**
     * Get notification preferences
     */
    public function getPreferences()
    {
        $user = Auth::user();

        return response()->json([
            'push_enabled' => $user->push_notifications_enabled ?? true,
            'email_enabled' => $user->email_notifications_enabled ?? true,
            'timer_reminders' => $user->timer_reminders_enabled ?? true,
            'invoice_notifications' => $user->invoice_notifications_enabled ?? true,
            'project_notifications' => $user->project_notifications_enabled ?? true,
            'task_notifications' => $user->task_notifications_enabled ?? true,
            'quiet_hours_enabled' => $user->quiet_hours_enabled ?? false,
            'quiet_hours_start' => $user->quiet_hours_start ?? '22:00',
            'quiet_hours_end' => $user->quiet_hours_end ?? '08:00'
        ]);
    }

    /**
     * Update notification preferences
     */
    public function updatePreferences(Request $request)
    {
        $request->validate([
            'push_enabled' => 'nullable|boolean',
            'email_enabled' => 'nullable|boolean',
            'timer_reminders' => 'nullable|boolean',
            'invoice_notifications' => 'nullable|boolean',
            'project_notifications' => 'nullable|boolean',
            'task_notifications' => 'nullable|boolean',
            'quiet_hours_enabled' => 'nullable|boolean',
            'quiet_hours_start' => 'nullable|string',
            'quiet_hours_end' => 'nullable|string'
        ]);

        $user = Auth::user();

        if ($request->has('push_enabled')) {
            $user->push_notifications_enabled = $request->push_enabled;
        }
        if ($request->has('email_enabled')) {
            $user->email_notifications_enabled = $request->email_enabled;
        }
        if ($request->has('timer_reminders')) {
            $user->timer_reminders_enabled = $request->timer_reminders;
        }
        if ($request->has('invoice_notifications')) {
            $user->invoice_notifications_enabled = $request->invoice_notifications;
        }
        if ($request->has('project_notifications')) {
            $user->project_notifications_enabled = $request->project_notifications;
        }
        if ($request->has('task_notifications')) {
            $user->task_notifications_enabled = $request->task_notifications;
        }
        if ($request->has('quiet_hours_enabled')) {
            $user->quiet_hours_enabled = $request->quiet_hours_enabled;
        }
        if ($request->has('quiet_hours_start')) {
            $user->quiet_hours_start = $request->quiet_hours_start;
        }
        if ($request->has('quiet_hours_end')) {
            $user->quiet_hours_end = $request->quiet_hours_end;
        }

        $user->save();

        return response()->json(['message' => 'Preferences updated successfully']);
    }
}