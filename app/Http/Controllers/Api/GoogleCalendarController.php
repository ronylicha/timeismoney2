<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GoogleCalendarService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class GoogleCalendarController extends Controller
{
    protected $googleCalendarService;

    public function __construct(GoogleCalendarService $googleCalendarService)
    {
        $this->googleCalendarService = $googleCalendarService;
    }

    /**
     * Initialize the service with the current user
     */
    protected function initService()
    {
        if (auth()->check()) {
            $this->googleCalendarService->setUser(auth()->user());
        }
    }

    /**
     * Get Google Calendar connection status
     */
    public function status()
    {
        $this->initService();
        $user = auth()->user();

        return response()->json([
            'connected' => $this->googleCalendarService->isConnected(),
            'enabled' => $user->google_calendar_enabled,
            'calendar_id' => $user->google_calendar_id,
            'token_expires_at' => $user->google_token_expires_at,
        ]);
    }

    /**
     * Initiate Google OAuth flow
     */
    public function connect()
    {
        $this->initService();
        try {
            $authUrl = $this->googleCalendarService->getAuthorizationUrl();

            return response()->json([
                'authorization_url' => $authUrl,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to initiate Google OAuth', [
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to initiate Google Calendar connection',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Handle Google OAuth callback
     */
    public function callback(Request $request)
    {
        $this->initService();
        $validated = $request->validate([
            'code' => 'required|string',
        ]);

        try {
            $user = auth()->user();

            // Exchange code for tokens
            $token = $this->googleCalendarService->handleCallback($validated['code']);
            $primaryCalendar = $this->googleCalendarService->getPrimaryCalendar();

            // Update user with Google credentials
            $user->update([
                'google_access_token' => $token['access_token'],
                'google_refresh_token' => $token['refresh_token'] ?? $user->google_refresh_token,
                'google_calendar_id' => $primaryCalendar,
                'google_calendar_enabled' => true,
                'google_token_expires_at' => now()->addSeconds($token['expires_in']),
            ]);

            Log::info('Google Calendar connected', [
                'user_id' => $user->id,
            ]);

            return response()->json([
                'message' => 'Google Calendar connected successfully',
                'data' => [
                    'connected' => true,
                    'calendar_id' => $primaryCalendar,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Google OAuth callback failed', [
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to complete Google Calendar connection',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Disconnect Google Calendar
     */
    public function disconnect()
    {
        $this->initService();
        try {
            $this->googleCalendarService->disconnect();

            return response()->json([
                'message' => 'Google Calendar disconnected successfully',
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to disconnect Google Calendar', [
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to disconnect Google Calendar',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get list of user's Google calendars
     */
    public function calendars()
    {
        $this->initService();
        if (!$this->googleCalendarService->isConnected()) {
            return response()->json([
                'message' => 'Google Calendar is not connected',
            ], 400);
        }

        try {
            $calendars = $this->googleCalendarService->getCalendars();

            return response()->json([
                'data' => $calendars,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to get Google calendars', [
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to get calendars',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update calendar settings
     */
    public function updateSettings(Request $request)
    {
        $this->initService();
        $validated = $request->validate([
            'calendar_id' => 'required|string',
            'enabled' => 'required|boolean',
        ]);

        try {
            $user = auth()->user();
            $user->update([
                'google_calendar_id' => $validated['calendar_id'],
                'google_calendar_enabled' => $validated['enabled'],
            ]);

            return response()->json([
                'message' => 'Calendar settings updated successfully',
                'data' => [
                    'calendar_id' => $user->google_calendar_id,
                    'enabled' => $user->google_calendar_enabled,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to update calendar settings', [
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to update calendar settings',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Enable/disable Google Calendar sync
     */
    public function toggleSync(Request $request)
    {
        $this->initService();
        $validated = $request->validate([
            'enabled' => 'required|boolean',
        ]);

        try {
            $user = auth()->user();

            if ($validated['enabled'] && !$this->googleCalendarService->isConnected()) {
                return response()->json([
                    'message' => 'Google Calendar is not connected. Please connect first.',
                ], 400);
            }

            $user->update([
                'google_calendar_enabled' => $validated['enabled'],
            ]);

            return response()->json([
                'message' => 'Calendar sync ' . ($validated['enabled'] ? 'enabled' : 'disabled'),
                'data' => [
                    'enabled' => $user->google_calendar_enabled,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to toggle calendar sync', [
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to toggle calendar sync',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
