<?php

namespace App\Services;

use App\Models\User;
use App\Models\TimeEntry;
use Google\Client as GoogleClient;
use Google\Service\Calendar;
use Google\Service\Calendar\Event;
use Google\Service\Calendar\EventDateTime;
use Illuminate\Support\Facades\Log;
use Exception;

class GoogleCalendarService
{
    protected $client;
    protected $user;

    public function __construct(?User $user = null)
    {
        $this->user = $user;
        $this->initializeClient();
    }

    /**
     * Initialize Google Client
     */
    protected function initializeClient(): void
    {
        $this->client = new GoogleClient();
        $this->client->setApplicationName(config('app.name'));
        $this->client->setClientId(config('services.google.client_id'));
        $this->client->setClientSecret(config('services.google.client_secret'));
        $this->client->setRedirectUri(config('services.google.redirect'));
        $this->client->setScopes([
            Calendar::CALENDAR_EVENTS,
            Calendar::CALENDAR,
        ]);
        $this->client->setAccessType('offline');
        $this->client->setPrompt('consent');

        // Set access token if user is provided and has one
        if ($this->user && $this->user->google_access_token) {
            $this->setAccessToken($this->user);
        }
    }

    /**
     * Set user for this service instance
     */
    public function setUser(User $user): self
    {
        $this->user = $user;
        if ($user->google_access_token) {
            $this->setAccessToken($user);
        }
        return $this;
    }

    /**
     * Get authorization URL for OAuth flow
     */
    public function getAuthorizationUrl(): string
    {
        return $this->client->createAuthUrl();
    }

    /**
     * Handle OAuth callback and exchange code for tokens
     */
    public function handleCallback(string $code): array
    {
        try {
            $token = $this->client->fetchAccessTokenWithAuthCode($code);

            if (isset($token['error'])) {
                throw new Exception('Error fetching access token: ' . $token['error']);
            }

            return $token;
        } catch (Exception $e) {
            Log::error('Google Calendar OAuth error', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Set access token from user
     */
    protected function setAccessToken(User $user): void
    {
        $token = [
            'access_token' => $user->google_access_token,
            'refresh_token' => $user->google_refresh_token,
            'expires_in' => $user->google_token_expires_at ?
                $user->google_token_expires_at->diffInSeconds(now()) : 3600,
        ];

        $this->client->setAccessToken($token);

        // Refresh token if expired
        if ($this->client->isAccessTokenExpired()) {
            $this->refreshAccessToken();
        }
    }

    /**
     * Refresh access token
     */
    protected function refreshAccessToken(): void
    {
        try {
            $newToken = $this->client->fetchAccessTokenWithRefreshToken($this->user->google_refresh_token);

            if (isset($newToken['error'])) {
                throw new Exception('Error refreshing token: ' . $newToken['error']);
            }

            // Update user's tokens
            $this->user->update([
                'google_access_token' => $newToken['access_token'],
                'google_token_expires_at' => now()->addSeconds($newToken['expires_in']),
            ]);

        } catch (Exception $e) {
            Log::error('Failed to refresh Google token', [
                'user_id' => $this->user->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Get Calendar service instance
     */
    protected function getCalendarService(): Calendar
    {
        return new Calendar($this->client);
    }

    /**
     * Get user's primary calendar
     */
    public function getPrimaryCalendar(): ?string
    {
        try {
            $service = $this->getCalendarService();
            $calendar = $service->calendars->get('primary');

            return $calendar->getId();
        } catch (Exception $e) {
            Log::error('Failed to get primary calendar', [
                'user_id' => $this->user->id,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Get list of user's calendars
     */
    public function getCalendars(): array
    {
        try {
            $service = $this->getCalendarService();
            $calendarList = $service->calendarList->listCalendarList();

            return array_map(function($calendar) {
                return [
                    'id' => $calendar->getId(),
                    'summary' => $calendar->getSummary(),
                    'primary' => $calendar->getPrimary() ?? false,
                    'access_role' => $calendar->getAccessRole(),
                ];
            }, $calendarList->getItems());

        } catch (Exception $e) {
            Log::error('Failed to get calendars', [
                'user_id' => $this->user->id,
                'error' => $e->getMessage(),
            ]);
            return [];
        }
    }

    /**
     * Create calendar event from time entry
     */
    public function createEventFromTimeEntry(TimeEntry $timeEntry): ?string
    {
        try {
            if (!$this->user->google_calendar_enabled) {
                return null;
            }

            $service = $this->getCalendarService();
            $calendarId = $this->user->google_calendar_id ?? 'primary';

            $event = new Event([
                'summary' => $this->getEventSummary($timeEntry),
                'description' => $this->getEventDescription($timeEntry),
                'start' => new EventDateTime([
                    'dateTime' => $timeEntry->start_time->toRfc3339String(),
                    'timeZone' => $this->user->timezone ?? 'UTC',
                ]),
                'end' => new EventDateTime([
                    'dateTime' => $timeEntry->end_time->toRfc3339String(),
                    'timeZone' => $this->user->timezone ?? 'UTC',
                ]),
                'colorId' => $this->getEventColor($timeEntry),
            ]);

            $createdEvent = $service->events->insert($calendarId, $event);

            Log::info('Calendar event created', [
                'user_id' => $this->user->id,
                'time_entry_id' => $timeEntry->id,
                'event_id' => $createdEvent->getId(),
            ]);

            return $createdEvent->getId();

        } catch (Exception $e) {
            Log::error('Failed to create calendar event', [
                'user_id' => $this->user->id,
                'time_entry_id' => $timeEntry->id,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Update calendar event from time entry
     */
    public function updateEventFromTimeEntry(TimeEntry $timeEntry, string $eventId): bool
    {
        try {
            if (!$this->user->google_calendar_enabled) {
                return false;
            }

            $service = $this->getCalendarService();
            $calendarId = $this->user->google_calendar_id ?? 'primary';

            $event = $service->events->get($calendarId, $eventId);
            $event->setSummary($this->getEventSummary($timeEntry));
            $event->setDescription($this->getEventDescription($timeEntry));
            $event->setStart(new EventDateTime([
                'dateTime' => $timeEntry->start_time->toRfc3339String(),
                'timeZone' => $this->user->timezone ?? 'UTC',
            ]));
            $event->setEnd(new EventDateTime([
                'dateTime' => $timeEntry->end_time->toRfc3339String(),
                'timeZone' => $this->user->timezone ?? 'UTC',
            ]));

            $service->events->update($calendarId, $eventId, $event);

            Log::info('Calendar event updated', [
                'user_id' => $this->user->id,
                'time_entry_id' => $timeEntry->id,
                'event_id' => $eventId,
            ]);

            return true;

        } catch (Exception $e) {
            Log::error('Failed to update calendar event', [
                'user_id' => $this->user->id,
                'time_entry_id' => $timeEntry->id,
                'event_id' => $eventId,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Delete calendar event
     */
    public function deleteEvent(string $eventId): bool
    {
        try {
            if (!$this->user->google_calendar_enabled) {
                return false;
            }

            $service = $this->getCalendarService();
            $calendarId = $this->user->google_calendar_id ?? 'primary';

            $service->events->delete($calendarId, $eventId);

            Log::info('Calendar event deleted', [
                'user_id' => $this->user->id,
                'event_id' => $eventId,
            ]);

            return true;

        } catch (Exception $e) {
            Log::error('Failed to delete calendar event', [
                'user_id' => $this->user->id,
                'event_id' => $eventId,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Get event summary from time entry
     */
    protected function getEventSummary(TimeEntry $timeEntry): string
    {
        $summary = '';

        if ($timeEntry->task) {
            $summary = $timeEntry->task->title;
        } elseif ($timeEntry->project) {
            $summary = $timeEntry->project->name;
        } else {
            $summary = 'Time Entry';
        }

        if ($timeEntry->is_billable) {
            $summary .= ' 💰';
        }

        return $summary;
    }

    /**
     * Get event description from time entry
     */
    protected function getEventDescription(TimeEntry $timeEntry): string
    {
        $description = [];

        if ($timeEntry->project) {
            $description[] = 'Project: ' . $timeEntry->project->name;
        }

        if ($timeEntry->task) {
            $description[] = 'Task: ' . $timeEntry->task->title;
        }

        if ($timeEntry->description) {
            $description[] = '';
            $description[] = $timeEntry->description;
        }

        $duration = round($timeEntry->duration_seconds / 3600, 2);
        $description[] = '';
        $description[] = "Duration: {$duration} hours";
        $description[] = "Billable: " . ($timeEntry->is_billable ? 'Yes' : 'No');

        if ($timeEntry->hourly_rate) {
            $description[] = "Rate: €{$timeEntry->hourly_rate}/hour";
        }

        return implode("\n", $description);
    }

    /**
     * Get event color based on time entry
     */
    protected function getEventColor(TimeEntry $timeEntry): string
    {
        // Google Calendar color IDs:
        // 1: Lavender, 2: Sage, 3: Grape, 4: Flamingo, 5: Banana,
        // 6: Tangerine, 7: Peacock, 8: Graphite, 9: Blueberry, 10: Basil, 11: Tomato

        if ($timeEntry->is_billable) {
            return '10'; // Basil (Green) for billable
        }

        return '8'; // Graphite (Gray) for non-billable
    }

    /**
     * Disconnect Google Calendar for user
     */
    public function disconnect(): bool
    {
        try {
            // Revoke token
            if ($this->user->google_access_token) {
                $this->client->revokeToken($this->user->google_access_token);
            }

            // Clear user's Google data
            $this->user->update([
                'google_id' => null,
                'google_access_token' => null,
                'google_refresh_token' => null,
                'google_calendar_id' => null,
                'google_calendar_enabled' => false,
                'google_token_expires_at' => null,
            ]);

            Log::info('Google Calendar disconnected', [
                'user_id' => $this->user->id,
            ]);

            return true;

        } catch (Exception $e) {
            Log::error('Failed to disconnect Google Calendar', [
                'user_id' => $this->user->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Check if user has Google Calendar connected
     */
    public function isConnected(): bool
    {
        return $this->user &&
               $this->user->google_calendar_enabled &&
               !empty($this->user->google_access_token) &&
               !empty($this->user->google_refresh_token);
    }
}
