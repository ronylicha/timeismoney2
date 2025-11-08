<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NotificationPreference;
use App\Models\PushSubscription;
use App\Models\NotificationLog;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Get user's notification preferences
     */
    public function getPreferences(Request $request)
    {
        $user = Auth::user();
        $preferences = NotificationPreference::where('user_id', $user->id)->get();

        // If no preferences exist, create defaults
        if ($preferences->isEmpty()) {
            NotificationPreference::createDefaultsForUser($user);
            $preferences = NotificationPreference::where('user_id', $user->id)->get();
        }

        return response()->json([
            'preferences' => $preferences,
            'types' => NotificationPreference::TYPES,
        ]);
    }

    /**
     * Update notification preferences
     */
    public function updatePreferences(Request $request)
    {
        $validated = $request->validate([
            'preferences' => 'required|array',
            'preferences.*.notification_type' => 'required|string',
            'preferences.*.email_enabled' => 'required|boolean',
            'preferences.*.push_enabled' => 'required|boolean',
            'preferences.*.in_app_enabled' => 'required|boolean',
        ]);

        $user = Auth::user();

        foreach ($validated['preferences'] as $pref) {
            NotificationPreference::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'notification_type' => $pref['notification_type'],
                ],
                [
                    'email_enabled' => $pref['email_enabled'],
                    'push_enabled' => $pref['push_enabled'],
                    'in_app_enabled' => $pref['in_app_enabled'],
                ]
            );
        }

        return response()->json([
            'message' => 'Préférences mises à jour avec succès'
        ]);
    }

    /**
     * Subscribe to push notifications
     */
    public function subscribe(Request $request)
    {
        $validated = $request->validate([
            'subscription' => 'required|array',
            'subscription.endpoint' => 'required|url',
            'subscription.keys' => 'required|array',
            'subscription.keys.p256dh' => 'required|string',
            'subscription.keys.auth' => 'required|string',
        ]);

        $user = Auth::user();
        $userAgent = $request->header('User-Agent');

        $subscription = PushSubscription::updateOrCreateSubscription(
            $user,
            $validated['subscription'],
            $userAgent
        );

        return response()->json([
            'message' => 'Inscription aux notifications push réussie',
            'subscription_id' => $subscription->id,
        ]);
    }

    /**
     * Unsubscribe from push notifications
     */
    public function unsubscribe(Request $request)
    {
        $validated = $request->validate([
            'endpoint' => 'required|url',
        ]);

        $user = Auth::user();

        PushSubscription::where('user_id', $user->id)
            ->where('endpoint', $validated['endpoint'])
            ->delete();

        return response()->json([
            'message' => 'Désinscription réussie'
        ]);
    }

    /**
     * Get push notification subscriptions
     */
    public function getSubscriptions(Request $request)
    {
        $user = Auth::user();
        $subscriptions = PushSubscription::where('user_id', $user->id)
            ->select('id', 'device_name', 'created_at', 'updated_at')
            ->get();

        return response()->json([
            'subscriptions' => $subscriptions
        ]);
    }

    /**
     * Delete a subscription
     */
    public function deleteSubscription(Request $request, $id)
    {
        $user = Auth::user();

        PushSubscription::where('user_id', $user->id)
            ->where('id', $id)
            ->delete();

        return response()->json([
            'message' => 'Appareil supprimé'
        ]);
    }

    /**
     * Get notification history
     */
    public function getHistory(Request $request)
    {
        $user = Auth::user();

        $query = NotificationLog::where('user_id', $user->id);

        // Filter by read status
        if ($request->has('unread_only')) {
            $query->unread();
        }

        // Filter by type
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        // Filter by date range
        if ($request->has('days')) {
            $query->recent($request->days);
        }

        $notifications = $query->orderBy('sent_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($notifications);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(Request $request, $id)
    {
        $user = Auth::user();

        $notification = NotificationLog::where('user_id', $user->id)
            ->where('id', $id)
            ->firstOrFail();

        $notification->markAsRead();

        return response()->json([
            'message' => 'Notification marquée comme lue'
        ]);
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(Request $request)
    {
        $user = Auth::user();

        NotificationLog::where('user_id', $user->id)
            ->where('read', false)
            ->update([
                'read' => true,
                'read_at' => now(),
            ]);

        return response()->json([
            'message' => 'Toutes les notifications ont été marquées comme lues'
        ]);
    }

    /**
     * Get unread count
     */
    public function getUnreadCount(Request $request)
    {
        $user = Auth::user();

        $count = NotificationLog::where('user_id', $user->id)
            ->unread()
            ->count();

        return response()->json([
            'unread_count' => $count
        ]);
    }

    /**
     * Test notification
     */
    public function testNotification(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:push,email',
        ]);

        $user = Auth::user();

        $testData = [
            'title' => 'Test de notification',
            'body' => 'Ceci est une notification de test',
            'icon' => '/icon-192x192.png',
            'badge' => '/badge-72x72.png',
            'url' => '/settings/notifications',
            'tag' => 'test-notification',
            'data' => [
                'type' => 'test',
                'timestamp' => now()->toIso8601String(),
            ]
        ];

        if ($validated['type'] === 'push') {
            // Send test push notification
            $subscriptions = $user->pushSubscriptions;

            if ($subscriptions->isEmpty()) {
                return response()->json([
                    'error' => 'Aucun appareil inscrit aux notifications push'
                ], 400);
            }

            // Use first subscription for test
            $subscription = $subscriptions->first();
            $this->notificationService->sendPushNotification($user, $testData);

            return response()->json([
                'message' => 'Notification push de test envoyée'
            ]);
        } else {
            // Send test email
            $this->notificationService->sendEmailNotification($user, 'test', $testData);

            return response()->json([
                'message' => 'Email de test envoyé à ' . $user->email
            ]);
        }
    }

    /**
     * Get VAPID public key
     */
    public function getVapidPublicKey()
    {
        return response()->json([
            'public_key' => config('services.vapid.public_key')
        ]);
    }
}