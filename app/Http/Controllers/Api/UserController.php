<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index()
    {
        $users = User::with(['tenant', 'roles'])->paginate(20);
        return response()->json($users);
    }

    public function show(User $user)
    {
        return response()->json($user->load(['tenant', 'roles', 'teamMember']));
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'password' => 'sometimes|string|min:8',
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user->fresh()
        ]);
    }

    public function destroy(User $user)
    {
        $user->delete();
        return response()->json(['message' => 'User deleted successfully']);
    }

    /**
     * Get current authenticated user's profile
     */
    public function profile(Request $request)
    {
        $user = $request->user()->load(['tenant', 'roles', 'teamMember']);
        return response()->json($user);
    }

    /**
     * Update current authenticated user's profile
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'phone' => 'nullable|string|max:20',
            'job_title' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:255',
            'bio' => 'nullable|string|max:1000',
            'hourly_rate' => 'nullable|numeric|min:0',
        ]);

        $user->update($validated);

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user->fresh()
        ]);
    }

    /**
     * Upload avatar for current user
     */
    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $user = $request->user();

        // Delete old avatar if exists
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }

        // Store new avatar
        $path = $request->file('avatar')->store('avatars', 'public');

        $user->update(['avatar' => $path]);

        return response()->json([
            'message' => 'Avatar uploaded successfully',
            'avatar_url' => Storage::url($path)
        ]);
    }

    /**
     * Update password for current user
     */
    public function updatePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        // Verify current password
        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Current password is incorrect',
                'errors' => ['current_password' => ['The current password is incorrect.']]
            ], 422);
        }

        $user->update([
            'password' => Hash::make($validated['password'])
        ]);

        return response()->json([
            'message' => 'Password updated successfully'
        ]);
    }

    /**
     * Update user preferences (locale, timezone, etc.)
     */
    public function updatePreferences(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'locale' => 'sometimes|string|in:en,fr,es',
            'timezone' => 'sometimes|string|timezone',
            'date_format' => 'sometimes|string|max:20',
            'time_format' => 'sometimes|string|max:20',
            'theme' => 'sometimes|in:light,dark,auto',
            'preferences' => 'sometimes|array',
        ]);

        $user->update($validated);

        return response()->json([
            'message' => 'Preferences updated successfully',
            'user' => $user->fresh()
        ]);
    }
}
