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
    public function index(Request $request)
    {
        $currentUser = $request->user();

        // Super-admins can see all users across all tenants
        if ($currentUser->hasRole('super-admin')) {
            $users = User::with(['tenant', 'roles', 'teamMember'])->paginate(20);
        } else {
            // Regular users only see users from their tenant
            $users = User::where('tenant_id', $currentUser->tenant_id)
                ->with(['tenant', 'roles', 'teamMember'])
                ->paginate(20);
        }

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
            'locale' => 'sometimes|string|in:en,fr,es,pt',
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

    /**
     * Update password for a specific user (admin/manager only)
     */
    public function updateUserPassword(Request $request, User $user)
    {
        // Check if the current user has permission to change passwords
        $currentUser = $request->user();

        // Only admin and manager roles can change other users' passwords
        if (!in_array($currentUser->role, ['admin', 'manager', 'super-admin'])) {
            return response()->json([
                'message' => 'Unauthorized. Only admins and managers can change user passwords.'
            ], 403);
        }

        $validated = $request->validate([
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user->update([
            'password' => Hash::make($validated['password'])
        ]);

        return response()->json([
            'message' => 'Password updated successfully'
        ]);
    }

    /**
     * Update user information by admin/manager
     */
    public function updateUser(Request $request, User $user)
    {
        $currentUser = $request->user();

        // Check permissions
        if (!in_array($currentUser->role, ['admin', 'manager', 'super-admin'])) {
            return response()->json([
                'message' => 'Unauthorized. Only admins and managers can update user information.'
            ], 403);
        }

        // Non-super-admins can only update users from their own tenant
        if (!$currentUser->hasRole('super-admin') && $user->tenant_id !== $currentUser->tenant_id) {
            return response()->json([
                'message' => 'You can only update users from your own organization.'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,' . $user->id,
            'role' => 'sometimes|required|string|in:admin,manager,employee',
            'position' => 'nullable|string|max:255',
            'hourly_rate' => 'nullable|numeric|min:0'
        ]);

        // Update user basic information
        if (isset($validated['name']) || isset($validated['email']) || isset($validated['role'])) {
            $userUpdate = [];
            if (isset($validated['name'])) $userUpdate['name'] = $validated['name'];
            if (isset($validated['email'])) $userUpdate['email'] = $validated['email'];

            $user->update($userUpdate);

            // Update role if changed
            if (isset($validated['role']) && $validated['role'] !== $user->role) {
                $user->syncRoles([$validated['role']]);
            }
        }

        // Update team member information if exists
        if ($user->teamMember && (isset($validated['position']) || isset($validated['hourly_rate']))) {
            $teamMemberUpdate = [];
            if (isset($validated['position'])) $teamMemberUpdate['position'] = $validated['position'];
            if (isset($validated['hourly_rate'])) $teamMemberUpdate['hourly_rate'] = $validated['hourly_rate'];

            $user->teamMember->update($teamMemberUpdate);
        }

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user->load(['teamMember', 'roles'])
        ]);
    }
}
