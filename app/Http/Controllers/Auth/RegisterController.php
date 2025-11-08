<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;

class RegisterController extends Controller
{
    /**
     * Register a new tenant and user
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'tenant_name' => 'required|string|max:255',
            'tenant_slug' => 'required|string|max:100|unique:tenants,slug|regex:/^[a-z0-9-]+$/',
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => ['required', 'confirmed', Password::defaults()],
            'locale' => 'nullable|string|in:fr,en',
            'timezone' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            // Create tenant
            $tenant = Tenant::create([
                'name' => $validated['tenant_name'],
                'slug' => $validated['tenant_slug'],
                'is_active' => true,
            ]);

            // Create user
            $user = User::create([
                'tenant_id' => $tenant->id,
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'locale' => $validated['locale'] ?? 'fr',
                'timezone' => $validated['timezone'] ?? 'Europe/Paris',
                'date_format' => 'd/m/Y',
                'time_format' => 'H:i'
            ]);

            // Assign admin role
            $user->assignRole('admin');

            // Create team member profile
            $user->teamMember()->create([
                'tenant_id' => $tenant->id,
                'position' => 'Administrator',
                'is_billable' => true,
                'can_approve_time' => true,
                'can_approve_expenses' => true,
                'weekly_hours' => 40,
                'working_days' => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
            ]);

            DB::commit();

            // Create token
            $token = $user->createToken('auth-token')->plainTextToken;

            return response()->json([
                'user' => $user->load('tenant', 'teamMember'),
                'token' => $token,
                'message' => 'Registration successful!'
            ], 201);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'message' => 'Registration failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Register a new user for existing tenant
     */
    public function registerUser(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => ['required', 'confirmed', Password::defaults()],
            'role' => 'required|string|in:admin,manager,employee',
            'position' => 'nullable|string|max:255',
            'hourly_rate' => 'nullable|numeric|min:0',
        ]);

        $user = User::create([
            'tenant_id' => auth()->user()->tenant_id,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'locale' => auth()->user()->locale,
            'timezone' => auth()->user()->timezone,
            'date_format' => auth()->user()->date_format,
            'time_format' => auth()->user()->time_format
        ]);

        // Assign role
        $user->assignRole($validated['role']);

        // Create team member profile
        $user->teamMember()->create([
            'tenant_id' => auth()->user()->tenant_id,
            'position' => $validated['position'] ?? $validated['role'],
            'hourly_rate' => $validated['hourly_rate'],
            'is_billable' => true,
            'can_approve_time' => in_array($validated['role'], ['admin', 'manager']),
            'can_approve_expenses' => in_array($validated['role'], ['admin', 'manager']),
            'weekly_hours' => 40,
            'working_days' => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        ]);

        return response()->json([
            'user' => $user->load('teamMember'),
            'message' => 'User created successfully!'
        ], 201);
    }
}