<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class LoginController extends Controller
{
    /**
     * Login user
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'remember' => 'boolean'
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (!$user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Your account has been deactivated.'],
            ]);
        }

        if ($user->tenant && !$user->tenant->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Your organization account is not active.'],
            ]);
        }

        // Update last login info
        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip()
        ]);

        // Check if 2FA is enabled
        if ($user->twoFactorAuthentication && $user->twoFactorAuthentication->enabled) {
            // Generate a temporary token for 2FA verification
            $tempToken = $user->createToken('2fa-temp', ['2fa-pending'])->plainTextToken;

            return response()->json([
                'requires_2fa' => true,
                'temp_token' => $tempToken,
                'message' => 'Please provide your 2FA code'
            ]);
        }

        // Create token
        $token = $user->createToken(
            'auth-token',
            ['*'],
            $request->remember ? now()->addDays(30) : now()->addDay()
        )->plainTextToken;

        return response()->json([
            'user' => $user->load('tenant', 'teamMember', 'roles'),
            'token' => $token,
            'message' => 'Login successful!'
        ]);
    }

    /**
     * Verify 2FA code
     */
    public function verify2FA(Request $request)
    {
        $request->validate([
            'code' => 'required|string|size:6',
            'remember' => 'boolean'
        ]);

        $user = auth()->user();

        // Check if user has 2FA pending permission
        if (!$user->tokenCan('2fa-pending')) {
            return response()->json([
                'message' => 'Invalid request'
            ], 403);
        }

        // Verify the 2FA code
        $twoFA = $user->twoFactorAuthentication;
        if (!$twoFA || !$this->verify2FACode($twoFA->secret, $request->code)) {
            return response()->json([
                'message' => 'Invalid 2FA code'
            ], 422);
        }

        // Delete the temporary token
        $user->currentAccessToken()->delete();

        // Create full access token
        $token = $user->createToken(
            'auth-token',
            ['*'],
            $request->remember ? now()->addDays(30) : now()->addDay()
        )->plainTextToken;

        return response()->json([
            'user' => $user->load('tenant', 'teamMember', 'roles'),
            'token' => $token,
            'message' => 'Login successful!'
        ]);
    }

    /**
     * Logout user
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }

    /**
     * Logout from all devices
     */
    public function logoutAll(Request $request)
    {
        $request->user()->tokens()->delete();

        return response()->json([
            'message' => 'Logged out from all devices successfully'
        ]);
    }

    /**
     * Verify 2FA code using TOTP
     */
    private function verify2FACode($secret, $code)
    {
        $google2fa = new \PragmaRX\Google2FA\Google2FA();
        return $google2fa->verifyKey($secret, $code);
    }
}