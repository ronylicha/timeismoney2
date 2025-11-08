<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\TwoFactorAuthentication;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;

class TwoFactorController extends Controller
{
    private $google2fa;

    public function __construct()
    {
        $this->google2fa = new Google2FA();
    }

    /**
     * Enable 2FA for user
     */
    public function enable(Request $request)
    {
        $user = auth()->user();

        if ($user->twoFactorAuthentication && $user->twoFactorAuthentication->enabled) {
            return response()->json([
                'message' => '2FA is already enabled'
            ], 400);
        }

        // Generate secret
        $secret = $this->google2fa->generateSecretKey();

        // Generate recovery codes
        $recoveryCodes = collect(range(1, 8))->map(function () {
            return Str::random(10) . '-' . Str::random(10);
        })->toArray();

        // Store temporarily (not enabled yet)
        $twoFA = $user->twoFactorAuthentication()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'secret' => encrypt($secret),
                'recovery_codes' => encrypt(json_encode($recoveryCodes)),
                'enabled' => false
            ]
        );

        // Generate QR code
        $qrCodeUrl = $this->google2fa->getQRCodeUrl(
            config('app.name'),
            $user->email,
            $secret
        );

        $renderer = new ImageRenderer(
            new RendererStyle(200),
            new SvgImageBackEnd()
        );
        $writer = new Writer($renderer);
        $qrCode = $writer->writeString($qrCodeUrl);

        return response()->json([
            'secret' => $secret,
            'qr_code' => 'data:image/svg+xml;base64,' . base64_encode($qrCode),
            'recovery_codes' => $recoveryCodes,
            'message' => 'Please scan the QR code and verify with a code to enable 2FA'
        ]);
    }

    /**
     * Confirm and enable 2FA
     */
    public function confirm(Request $request)
    {
        $request->validate([
            'code' => 'required|string|size:6'
        ]);

        $user = auth()->user();
        $twoFA = $user->twoFactorAuthentication;

        if (!$twoFA) {
            return response()->json([
                'message' => 'Please generate 2FA setup first'
            ], 400);
        }

        if ($twoFA->enabled) {
            return response()->json([
                'message' => '2FA is already enabled'
            ], 400);
        }

        // Verify code
        if (!$this->google2fa->verifyKey(decrypt($twoFA->secret), $request->code)) {
            return response()->json([
                'message' => 'Invalid verification code'
            ], 422);
        }

        // Enable 2FA
        $twoFA->update([
            'enabled' => true,
            'confirmed_at' => now()
        ]);

        return response()->json([
            'message' => '2FA has been successfully enabled'
        ]);
    }

    /**
     * Disable 2FA
     */
    public function disable(Request $request)
    {
        $request->validate([
            'password' => 'required|current_password'
        ]);

        $user = auth()->user();
        $twoFA = $user->twoFactorAuthentication;

        if (!$twoFA || !$twoFA->enabled) {
            return response()->json([
                'message' => '2FA is not enabled'
            ], 400);
        }

        $twoFA->update(['enabled' => false]);

        return response()->json([
            'message' => '2FA has been disabled'
        ]);
    }

    /**
     * Regenerate recovery codes
     */
    public function regenerateRecoveryCodes(Request $request)
    {
        $request->validate([
            'password' => 'required|current_password'
        ]);

        $user = auth()->user();
        $twoFA = $user->twoFactorAuthentication;

        if (!$twoFA || !$twoFA->enabled) {
            return response()->json([
                'message' => '2FA is not enabled'
            ], 400);
        }

        // Generate new recovery codes
        $recoveryCodes = collect(range(1, 8))->map(function () {
            return Str::random(10) . '-' . Str::random(10);
        })->toArray();

        $twoFA->update([
            'recovery_codes' => encrypt(json_encode($recoveryCodes))
        ]);

        return response()->json([
            'recovery_codes' => $recoveryCodes,
            'message' => 'Recovery codes regenerated successfully'
        ]);
    }

    /**
     * Use recovery code for login
     */
    public function useRecoveryCode(Request $request)
    {
        $request->validate([
            'recovery_code' => 'required|string'
        ]);

        $user = auth()->user();

        // Check if user has 2FA pending permission
        if (!$user->tokenCan('2fa-pending')) {
            return response()->json([
                'message' => 'Invalid request'
            ], 403);
        }

        $twoFA = $user->twoFactorAuthentication;
        if (!$twoFA || !$twoFA->enabled) {
            return response()->json([
                'message' => '2FA is not enabled'
            ], 400);
        }

        $recoveryCodes = json_decode(decrypt($twoFA->recovery_codes), true);

        if (!in_array($request->recovery_code, $recoveryCodes)) {
            return response()->json([
                'message' => 'Invalid recovery code'
            ], 422);
        }

        // Remove used recovery code
        $recoveryCodes = array_values(array_diff($recoveryCodes, [$request->recovery_code]));
        $twoFA->update([
            'recovery_codes' => encrypt(json_encode($recoveryCodes))
        ]);

        // Delete the temporary token
        $user->currentAccessToken()->delete();

        // Create full access token
        $token = $user->createToken('auth-token', ['*'])->plainTextToken;

        return response()->json([
            'user' => $user->load('tenant', 'teamMember', 'roles'),
            'token' => $token,
            'message' => 'Login successful! Please regenerate your recovery codes.',
            'remaining_recovery_codes' => count($recoveryCodes)
        ]);
    }
}