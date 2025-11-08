<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PushSubscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'endpoint',
        'public_key',
        'auth_token',
        'content_encoding',
        'user_agent',
        'device_name',
    ];

    /**
     * Get the user that owns the subscription
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Create or update subscription
     */
    public static function updateOrCreateSubscription(User $user, array $subscription, string $userAgent = null): self
    {
        return self::updateOrCreate(
            [
                'user_id' => $user->id,
                'endpoint' => $subscription['endpoint'],
            ],
            [
                'public_key' => $subscription['keys']['p256dh'] ?? null,
                'auth_token' => $subscription['keys']['auth'] ?? null,
                'content_encoding' => $subscription['contentEncoding'] ?? 'aes128gcm',
                'user_agent' => $userAgent,
                'device_name' => self::detectDeviceName($userAgent),
            ]
        );
    }

    /**
     * Detect device name from user agent
     */
    protected static function detectDeviceName(?string $userAgent): ?string
    {
        if (!$userAgent) {
            return null;
        }

        // Detect mobile devices
        if (preg_match('/(iPhone|iPad|iPod)/i', $userAgent, $matches)) {
            return $matches[1];
        }
        if (preg_match('/Android/i', $userAgent)) {
            return 'Android Device';
        }

        // Detect browsers
        if (preg_match('/(Chrome|Firefox|Safari|Edge|Opera)/i', $userAgent, $matches)) {
            $browser = $matches[1];

            // Detect OS
            if (preg_match('/Windows/i', $userAgent)) {
                return "$browser on Windows";
            }
            if (preg_match('/Mac OS/i', $userAgent)) {
                return "$browser on Mac";
            }
            if (preg_match('/Linux/i', $userAgent)) {
                return "$browser on Linux";
            }

            return $browser;
        }

        return 'Unknown Device';
    }
}