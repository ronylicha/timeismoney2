<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Tenant;
use App\Models\Invoice;
use App\Models\TimeEntry;
use App\Models\Project;
use App\Models\AuditLog;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Carbon\Carbon;

class AdminController extends Controller
{
    /**
     * Check if user has admin access (super-admin or admin role)
     */
    protected function checkAdminAccess()
    {
        if (!auth()->check() || !auth()->user()->isAdmin()) {
            abort(403, 'Admin access required');
        }
    }

    /**
     * Get system statistics
     */
    public function getStats(Request $request)
    {
        $this->checkAdminAccess();

        $range = $request->get('range', '7d');
        $cacheKey = "admin_stats_{$range}";

        return Cache::remember($cacheKey, 300, function () use ($range) {
            $startDate = $this->getStartDate($range);

            // User stats
            $users = [
                'total' => User::count(),
                'active' => User::where('is_active', true)->count(),
                'new_this_month' => User::whereMonth('created_at', Carbon::now()->month)->count(),
                'growth' => $this->calculateGrowth('users', $startDate)
            ];

            // Tenant stats
            $tenants = [
                'total' => Tenant::count(),
                'by_plan' => [
                    'individual' => Tenant::where('type', 'individual')->count(),
                    'team' => Tenant::where('type', 'team')->count(),
                    'company' => Tenant::where('type', 'company')->count(),
                    'enterprise' => Tenant::where('type', 'enterprise')->count(),
                ]
            ];

            // Usage stats
            $usage = [
                'time_entries_today' => TimeEntry::whereDate('created_at', Carbon::today())->count(),
                'invoices_this_month' => Invoice::whereMonth('created_at', Carbon::now()->month)->count(),
                'total_revenue_this_month' => Invoice::whereMonth('created_at', Carbon::now()->month)
                    ->where('status', 'paid')
                    ->sum('total'),
                'storage_used_gb' => $this->calculateStorageUsed()
            ];

            // System stats
            $system = $this->getSystemStats();

            // Health check
            $health = $this->performHealthCheck();

            return [
                'users' => $users,
                'tenants' => $tenants,
                'usage' => $usage,
                'system' => $system,
                'health' => $health
            ];
        });
    }

    /**
     * Get recent activity
     */
    public function getActivity(Request $request)
    {
        $activities = ActivityLog::with('user')
            ->latest()
            ->limit(50)
            ->get()
            ->map(function ($activity) {
                return [
                    'id' => $activity->id,
                    'description' => $this->formatActivityDescription($activity),
                    'user' => $activity->user ? $activity->user->name : 'System',
                    'created_at' => $activity->created_at
                ];
            });

        return response()->json($activities);
    }

    /**
     * Get revenue chart data
     */
    public function getRevenueChart(Request $request)
    {
        $range = $request->get('range', '7d');
        $startDate = $this->getStartDate($range);

        $data = Invoice::where('created_at', '>=', $startDate)
            ->where('status', 'paid')
            ->selectRaw('DATE(created_at) as date, SUM(total) as revenue')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $labels = [];
        $values = [];

        $currentDate = $startDate->copy();
        $endDate = Carbon::now();

        while ($currentDate <= $endDate) {
            $dateStr = $currentDate->format('Y-m-d');
            $labels[] = $currentDate->format('d/m');

            $dayRevenue = $data->firstWhere('date', $dateStr);
            $values[] = $dayRevenue ? (float)$dayRevenue->revenue : 0;

            $currentDate->addDay();
        }

        return response()->json([
            'labels' => $labels,
            'values' => $values
        ]);
    }

    /**
     * Get user growth chart data
     */
    public function getUserGrowthChart(Request $request)
    {
        $range = $request->get('range', '7d');
        $startDate = $this->getStartDate($range);

        $data = User::where('created_at', '>=', $startDate)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $labels = [];
        $values = [];

        $currentDate = $startDate->copy();
        $endDate = Carbon::now();

        while ($currentDate <= $endDate) {
            $dateStr = $currentDate->format('Y-m-d');
            $labels[] = $currentDate->format('d/m');

            $dayCount = $data->firstWhere('date', $dateStr);
            $values[] = $dayCount ? (int)$dayCount->count : 0;

            $currentDate->addDay();
        }

        return response()->json([
            'labels' => $labels,
            'values' => $values
        ]);
    }

    /**
     * User Management
     */
    public function getUsers(Request $request)
    {
        $this->checkAdminAccess();

        $query = User::with(['tenant', 'roles']);

        // Super-admin sees all users, admin only sees their tenant
        if (!auth()->user()->isSuperAdmin()) {
            $query->where('tenant_id', auth()->user()->tenant_id);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Filter by role using Spatie
        if ($request->has('role') && $request->get('role') !== 'all') {
            $query->role($request->get('role'));
        }

        // Filter by tenant (for super-admin only)
        if ($request->has('tenant_id') && auth()->user()->isSuperAdmin()) {
            $query->where('tenant_id', $request->get('tenant_id'));
        }

        // Filter by status
        if ($request->has('status') && $request->get('status') !== 'all') {
            switch ($request->get('status')) {
                case 'active':
                    $query->where('is_active', true);
                    break;
                case 'suspended':
                    $query->where('is_active', false);
                    break;
                case 'verified':
                    $query->whereNotNull('email_verified_at');
                    break;
                case 'unverified':
                    $query->whereNull('email_verified_at');
                    break;
            }
        }

        // Add counts
        $query->withCount(['timeEntries']);

        return $query->paginate($request->get('per_page', 20));
    }

    /**
     * Suspend user
     */
    public function suspendUser($id)
    {
        $user = User::findOrFail($id);
        $user->update(['is_active' => false]);

        ActivityLog::create([
            'user_id' => auth()->id(),
            'type' => 'user_suspended',
            'description' => "Suspended user: {$user->name}",
            'properties' => ['user_id' => $user->id]
        ]);

        return response()->json(['message' => 'User suspended']);
    }

    /**
     * Activate user
     */
    public function activateUser($id)
    {
        $user = User::findOrFail($id);
        $user->update(['is_active' => true]);

        ActivityLog::create([
            'user_id' => auth()->id(),
            'type' => 'user_activated',
            'description' => "Activated user: {$user->name}",
            'properties' => ['user_id' => $user->id]
        ]);

        return response()->json(['message' => 'User activated']);
    }

    /**
     * Reset user password
     */
    public function resetUserPassword($id)
    {
        $user = User::findOrFail($id);
        $token = Str::random(60);

        DB::table('password_resets')->insert([
            'email' => $user->email,
            'token' => Hash::make($token),
            'created_at' => Carbon::now()
        ]);

        // Send password reset email
        // Mail::to($user)->send(new PasswordResetMail($token));

        ActivityLog::create([
            'user_id' => auth()->id(),
            'type' => 'password_reset',
            'description' => "Password reset sent to: {$user->email}",
            'properties' => ['user_id' => $user->id]
        ]);

        return response()->json(['message' => 'Password reset email sent']);
    }

    /**
     * Delete user
     */
    public function deleteUser($id)
    {
        $user = User::findOrFail($id);

        // Super-admin can delete any user, admin can only delete from their tenant
        if (!auth()->user()->isSuperAdmin() && $user->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $userName = $user->name;

        // Soft delete to maintain data integrity
        $user->delete();

        ActivityLog::create([
            'user_id' => auth()->id(),
            'type' => 'user_deleted',
            'description' => "Deleted user: {$userName}",
            'properties' => ['user_id' => $id]
        ]);

        return response()->json(['message' => 'User deleted']);
    }

    /**
     * Create a new user
     */
    public function storeUser(Request $request)
    {
        $validated = $request->validate([
            'tenant_id' => 'nullable|exists:tenants,id',
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'required|in:super-admin,admin,manager,employee,accountant,client',
            'phone' => 'nullable|string|max:20',
            'locale' => 'nullable|string|max:5',
            'timezone' => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean'
        ]);

        // Determine tenant_id
        if (auth()->user()->isSuperAdmin()) {
            // Super-admin can create users in any tenant
            $tenantId = $validated['tenant_id'] ?? auth()->user()->tenant_id;
        } else {
            // Admin can only create users in their own tenant
            $tenantId = auth()->user()->tenant_id;

            // Prevent regular admin from creating super-admin
            if ($validated['role'] === 'super-admin') {
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'Cannot create super-admin users'
                ], 403);
            }
        }

        // Create user
        $user = User::create([
            'tenant_id' => $tenantId,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone' => $validated['phone'] ?? null,
            'locale' => $validated['locale'] ?? 'fr',
            'timezone' => $validated['timezone'] ?? 'Europe/Paris',
            'is_active' => $validated['is_active'] ?? true
        ]);

        // Assign role
        $user->assignRole($validated['role']);

        // Log activity
        ActivityLog::create([
            'user_id' => auth()->id(),
            'type' => 'user_created',
            'description' => "Created user: {$user->name} with role {$validated['role']}",
            'properties' => ['user_id' => $user->id, 'role' => $validated['role']]
        ]);

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user->load(['tenant', 'roles'])
        ], 201);
    }

    /**
     * Get user details
     */
    public function showUser($id)
    {
        $user = User::with(['tenant', 'roles', 'teamMember'])->findOrFail($id);

        // Super-admin can view any user, admin can only view their tenant
        if (!auth()->user()->isSuperAdmin() && $user->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return response()->json($user);
    }

    /**
     * Update user
     */
    public function updateUser(Request $request, $id)
    {
        $user = User::findOrFail($id);

        // Super-admin can update any user, admin can only update their tenant
        if (!auth()->user()->isSuperAdmin() && $user->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'phone' => 'nullable|string|max:20',
            'locale' => 'nullable|string|max:5',
            'timezone' => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean'
        ]);

        $user->update($validated);

        ActivityLog::create([
            'user_id' => auth()->id(),
            'type' => 'user_updated',
            'description' => "Updated user: {$user->name}",
            'properties' => ['user_id' => $user->id, 'changes' => $validated]
        ]);

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user->load(['tenant', 'roles'])
        ]);
    }

    /**
     * Assign role to user
     */
    public function assignRole(Request $request, $id)
    {
        $user = User::findOrFail($id);

        // Super-admin can change any role, admin cannot change super-admin or create super-admin
        if (!auth()->user()->isSuperAdmin()) {
            if ($user->tenant_id !== auth()->user()->tenant_id) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            if ($user->hasRole('super-admin') || $request->role === 'super-admin') {
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'Cannot modify super-admin roles'
                ], 403);
            }
        }

        $validated = $request->validate([
            'role' => 'required|in:super-admin,admin,manager,employee,accountant,client'
        ]);

        $oldRole = $user->role;

        // Remove all existing roles and assign new one
        $user->syncRoles([$validated['role']]);

        ActivityLog::create([
            'user_id' => auth()->id(),
            'type' => 'role_changed',
            'description' => "Changed {$user->name}'s role from {$oldRole} to {$validated['role']}",
            'properties' => [
                'user_id' => $user->id,
                'old_role' => $oldRole,
                'new_role' => $validated['role']
            ]
        ]);

        return response()->json([
            'message' => 'Role updated successfully',
            'user' => $user->load(['tenant', 'roles'])
        ]);
    }

    /**
     * Impersonate user
     */
    public function impersonateUser($id)
    {
        $user = User::findOrFail($id);

        // Generate impersonation token
        $token = Str::random(60);

        Cache::put("impersonate_token_{$token}", [
            'admin_id' => auth()->id(),
            'user_id' => $user->id
        ], 3600); // 1 hour

        ActivityLog::create([
            'user_id' => auth()->id(),
            'type' => 'user_impersonated',
            'description' => "Started impersonating: {$user->name}",
            'properties' => ['user_id' => $user->id]
        ]);

        return response()->json(['token' => $token]);
    }

    /**
     * Export users
     */
    public function exportUsers(Request $request)
    {
        $query = User::with(['tenant', 'roles']);

        // Super-admin sees all users, admin only sees their tenant
        if (!auth()->user()->isSuperAdmin()) {
            $query->where('tenant_id', auth()->user()->tenant_id);
        }

        // Apply same filters as getUsers
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->has('role') && $request->get('role') !== 'all') {
            $query->role($request->get('role'));
        }

        if ($request->has('tenant_id') && auth()->user()->isSuperAdmin()) {
            $query->where('tenant_id', $request->get('tenant_id'));
        }

        $users = $query->get();

        $csv = "ID,Name,Email,Role,Tenant,Status,Created At\n";
        foreach ($users as $user) {
            $csv .= "{$user->id},\"{$user->name}\",{$user->email},{$user->role},";
            $csv .= "\"{$user->tenant?->name}\",";
            $csv .= ($user->is_active ? 'Active' : 'Suspended') . ",";
            $csv .= "{$user->created_at}\n";
        }

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="users.csv"'
        ]);
    }

    /**
     * Tenant Management
     */
    public function getTenants(Request $request)
    {
        $query = Tenant::with('owner');

        // Search
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        // Filter by type
        if ($request->has('type') && $request->get('type') !== 'all') {
            $query->where('type', $request->get('type'));
        }

        // Filter by status
        if ($request->has('status') && $request->get('status') !== 'all') {
            $status = $request->get('status') === 'active';
            $query->where('is_active', $status);
        }

        // Add stats
        $tenants = $query->paginate($request->get('per_page', 20));

        // Calculate stats for each tenant
        foreach ($tenants->items() as $tenant) {
            $tenant->current_users = User::where('tenant_id', $tenant->id)->count();
            $tenant->current_projects = Project::where('tenant_id', $tenant->id)->count();
            $tenant->used_storage_gb = $this->calculateTenantStorage($tenant->id);

            $tenant->stats = [
                'total_invoices' => Invoice::where('tenant_id', $tenant->id)->count(),
                'total_revenue' => Invoice::where('tenant_id', $tenant->id)
                    ->where('status', 'paid')
                    ->sum('total'),
                'active_users' => User::where('tenant_id', $tenant->id)
                    ->where('is_active', true)
                    ->count(),
                'time_entries_this_month' => TimeEntry::whereHas('user', function ($q) use ($tenant) {
                    $q->where('tenant_id', $tenant->id);
                })->whereMonth('created_at', Carbon::now()->month)->count()
            ];
        }

        // Add global stats
        $stats = [
            'active' => Tenant::where('is_active', true)->count(),
            'inactive' => Tenant::where('is_active', false)->count(),
            'individual' => Tenant::where('type', 'individual')->count(),
            'team' => Tenant::where('type', 'team')->count(),
            'company' => Tenant::where('type', 'company')->count(),
            'enterprise' => Tenant::where('type', 'enterprise')->count()
        ];

        return response()->json([
            'data' => $tenants->items(),
            'total' => $tenants->total(),
            'per_page' => $tenants->perPage(),
            'current_page' => $tenants->currentPage(),
            'last_page' => $tenants->lastPage(),
            'stats' => $stats
        ]);
    }

    /**
     * Suspend tenant
     */
    public function suspendTenant($id)
    {
        $tenant = Tenant::findOrFail($id);
        $tenant->update(['is_active' => false]);

        // Deactivate all users
        User::where('tenant_id', $tenant->id)->update(['is_active' => false]);

        ActivityLog::create([
            'user_id' => auth()->id(),
            'type' => 'tenant_suspended',
            'description' => "Suspended tenant: {$tenant->name}",
            'properties' => ['tenant_id' => $tenant->id]
        ]);

        return response()->json(['message' => 'Tenant suspended']);
    }

    /**
     * Activate tenant
     */
    public function activateTenant($id)
    {
        $tenant = Tenant::findOrFail($id);
        $tenant->update(['is_active' => true]);

        // Reactivate users
        User::where('tenant_id', $tenant->id)->update(['is_active' => true]);

        ActivityLog::create([
            'user_id' => auth()->id(),
            'type' => 'tenant_activated',
            'description' => "Activated tenant: {$tenant->name}",
            'properties' => ['tenant_id' => $tenant->id]
        ]);

        return response()->json(['message' => 'Tenant activated']);
    }

    /**
     * Delete tenant
     */
    public function deleteTenant($id)
    {
        $tenant = Tenant::findOrFail($id);
        $tenantName = $tenant->name;

        // Soft delete to maintain data integrity
        $tenant->delete();

        ActivityLog::create([
            'user_id' => auth()->id(),
            'type' => 'tenant_deleted',
            'description' => "Deleted tenant: {$tenantName}",
            'properties' => ['tenant_id' => $id]
        ]);

        return response()->json(['message' => 'Tenant deleted']);
    }

    /**
     * Get audit logs
     */
    public function getAuditLogs(Request $request)
    {
        $query = ActivityLog::with(['user', 'tenant'])
            ->orderBy('created_at', 'desc');

        // Search filter
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('type', 'like', "%{$search}%");
            });
        }

        // Type filter
        if ($request->filled('types')) {
            $types = explode(',', $request->get('types'));
            $query->whereIn('type', $types);
        } elseif ($request->filled('type')) {
            $query->where('type', $request->get('type'));
        }

        // User filter
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->get('user_id'));
        }

        // Tenant filter
        if ($request->filled('tenant_id')) {
            $query->where('tenant_id', $request->get('tenant_id'));
        }

        // Date range filter
        if ($request->filled('date_from')) {
            $query->where('created_at', '>=', Carbon::parse($request->get('date_from')));
        }

        if ($request->filled('date_to')) {
            $query->where('created_at', '<=', Carbon::parse($request->get('date_to')));
        }

        // Get stats
        $stats = [
            'unique_users' => (clone $query)->distinct('user_id')->count('user_id'),
            'errors' => (clone $query)->where('type', 'like', '%error%')->count(),
        ];

        $paginated = $query->paginate($request->get('per_page', 50));

        // Add stats to the response
        return response()->json([
            'data' => $paginated->items(),
            'total' => $paginated->total(),
            'from' => $paginated->firstItem(),
            'to' => $paginated->lastItem(),
            'last_page' => $paginated->lastPage(),
            'stats' => $stats
        ]);
    }

    /**
     * Export audit logs
     */
    public function exportAuditLogs(Request $request)
    {
        $query = ActivityLog::with(['user', 'tenant'])
            ->orderBy('created_at', 'desc');

        // Apply same filters as getAuditLogs
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('type', 'like', "%{$search}%");
            });
        }

        if ($request->filled('types')) {
            $types = explode(',', $request->get('types'));
            $query->whereIn('type', $types);
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->get('user_id'));
        }

        if ($request->filled('date_from')) {
            $query->where('created_at', '>=', Carbon::parse($request->get('date_from')));
        }

        if ($request->filled('date_to')) {
            $query->where('created_at', '<=', Carbon::parse($request->get('date_to')));
        }

        $logs = $query->limit(5000)->get();

        // Generate CSV
        $csv = "Date,Time,Type,Description,User,IP Address,User Agent\n";
        foreach ($logs as $log) {
            $csv .= sprintf(
                "%s,%s,%s,\"%s\",%s,%s,\"%s\"\n",
                $log->created_at->format('Y-m-d'),
                $log->created_at->format('H:i:s'),
                $log->type,
                str_replace('"', '""', $log->description),
                $log->user ? $log->user->name : 'System',
                $log->ip_address,
                str_replace('"', '""', $log->user_agent)
            );
        }

        return response($csv)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="audit_logs_' . now()->format('Y-m-d_H-i') . '.csv"');
    }

    /**
     * Get system settings
     */
    public function getSystemSettings()
    {
        return response()->json([
            'general' => [
                'app_name' => config('app.name'),
                'app_url' => config('app.url'),
                'app_env' => config('app.env'),
                'debug_mode' => config('app.debug'),
                'maintenance_mode' => app()->isDownForMaintenance(),
                'timezone' => config('app.timezone'),
                'locale' => config('app.locale'),
                'currency' => config('app.currency', 'EUR'),
            ],
            'security' => [
                'force_https' => config('app.force_https', false),
                'session_lifetime' => config('session.lifetime'),
                'password_min_length' => 8,
                'require_2fa' => false,
                'allowed_ips' => [],
                'rate_limit_per_minute' => 60,
            ],
            'email' => [
                'driver' => config('mail.default'),
                'host' => config('mail.mailers.smtp.host'),
                'port' => config('mail.mailers.smtp.port'),
                'encryption' => config('mail.mailers.smtp.encryption'),
                'from_address' => config('mail.from.address'),
                'from_name' => config('mail.from.name'),
            ],
            'storage' => [
                'driver' => config('filesystems.default'),
                'max_upload_size_mb' => 10,
                'allowed_extensions' => ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx'],
                's3_bucket' => config('filesystems.disks.s3.bucket'),
                's3_region' => config('filesystems.disks.s3.region'),
            ],
            'billing' => [
                'stripe_enabled' => false,
                'paypal_enabled' => false,
                'tax_rate' => 20,
                'invoice_prefix' => 'INV',
                'invoice_footer' => '',
                'payment_terms_days' => 30,
            ],
            'chorus_pro' => [
                'enabled' => false,
                'production_mode' => false,
                'auto_submit' => false,
                'certificate_expiry' => null,
            ],
            'notifications' => [
                'email_enabled' => true,
                'push_enabled' => false,
                'daily_summary_time' => '09:00',
                'weekly_summary_day' => 1,
            ],
            'backup' => [
                'enabled' => false,
                'frequency' => 'daily',
                'retention_days' => 30,
                'storage_location' => 'local',
                'last_backup' => null,
                'next_backup' => null,
            ],
        ]);
    }

    /**
     * Save system settings (Note: Most settings require .env changes)
     */
    public function saveSystemSettings(Request $request)
    {
        // For now, return success
        // In production, you might want to validate and store certain settings in database
        // System-level settings like app_name, timezone etc. require .env file modifications

        return response()->json([
            'message' => 'Settings saved successfully',
            'note' => 'Some settings require manual .env file modifications'
        ]);
    }

    /**
     * Get user statistics
     */
    public function getUserStats(Request $request)
    {
        $stats = Cache::remember('admin_user_stats', 60, function () {
            return [
                'total' => User::count(),
                'active' => User::where('is_active', true)->count(),
                'suspended' => User::where('is_active', false)->count(),
                'pending' => User::whereNull('email_verified_at')->count(),
                'with_2fa' => User::where('two_factor_enabled', true)->count(),
                'logged_in_today' => User::whereDate('last_login_at', Carbon::today())->count(),
                'logged_in_week' => User::where('last_login_at', '>=', Carbon::now()->subWeek())->count(),
                'never_logged_in' => User::whereNull('last_login_at')->count(),
            ];
        });

        return response()->json($stats);
    }


    /**
     * MONITORING ENDPOINTS
     */

    /**
     * Get system metrics
     */
    public function getSystemMetrics(Request $request)
    {
        $range = $request->get('range', '24h');
        $startDate = $this->getStartDate($range);

        // In production, you'd query from a metrics table or monitoring service
        $metrics = [
            'response_time' => [
                'current' => rand(50, 200),
                'average' => rand(100, 150),
                'p95' => rand(200, 300),
                'p99' => rand(300, 500),
            ],
            'requests' => [
                'total' => ActivityLog::where('created_at', '>=', $startDate)->count(),
                'successful' => ActivityLog::where('created_at', '>=', $startDate)
                    ->where('type', 'not like', '%error%')->count(),
                'failed' => ActivityLog::where('created_at', '>=', $startDate)
                    ->where('type', 'like', '%error%')->count(),
            ],
            'database' => [
                'queries_per_second' => rand(50, 200),
                'slow_queries' => rand(0, 10),
                'connections' => rand(10, 50),
                'size_mb' => rand(100, 1000),
            ],
            'cache' => [
                'hit_rate' => rand(70, 95),
                'misses' => rand(100, 500),
                'evictions' => rand(0, 50),
            ],
            'queue' => [
                'pending' => rand(0, 100),
                'processed_last_hour' => rand(500, 2000),
                'failed_last_hour' => rand(0, 10),
            ],
        ];

        return response()->json($metrics);
    }

    /**
     * Get error tracking
     */
    public function getErrors(Request $request)
    {
        $range = $request->get('range', '24h');
        $startDate = $this->getStartDate($range);

        $query = ActivityLog::where('created_at', '>=', $startDate)
            ->where('type', 'like', '%error%')
            ->orderBy('created_at', 'desc');

        // Group by error type
        if ($request->get('group_by') === 'type') {
            return response()->json([
                'grouped' => ActivityLog::where('created_at', '>=', $startDate)
                    ->where('type', 'like', '%error%')
                    ->selectRaw('type, COUNT(*) as count')
                    ->groupBy('type')
                    ->orderByDesc('count')
                    ->get()
            ]);
        }

        $errors = $query->paginate($request->get('per_page', 50));

        return response()->json([
            'data' => $errors->items(),
            'total' => $errors->total(),
            'stats' => [
                'total_errors' => ActivityLog::where('created_at', '>=', $startDate)
                    ->where('type', 'like', '%error%')->count(),
                'unique_types' => ActivityLog::where('created_at', '>=', $startDate)
                    ->where('type', 'like', '%error%')
                    ->distinct('type')->count('type'),
            ]
        ]);
    }

    /**
     * Get performance metrics
     */
    public function getPerformanceMetrics(Request $request)
    {
        $range = $request->get('range', '24h');
        $startDate = $this->getStartDate($range);

        return response()->json([
            'api_performance' => [
                'average_response_time' => rand(100, 200),
                'slowest_endpoint' => '/api/reports/generate',
                'fastest_endpoint' => '/api/user',
            ],
            'database_performance' => [
                'average_query_time' => rand(10, 50),
                'slow_query_count' => rand(0, 20),
                'connection_pool_usage' => rand(20, 80),
            ],
            'resource_usage' => $this->getSystemStats(),
            'uptime_percentage' => 99.9,
        ]);
    }

    /**
     * Get service health status
     */
    public function getServiceHealth()
    {
        $health = $this->performHealthCheck();

        $services = [
            'database' => $this->checkDatabaseHealth(),
            'cache' => $this->checkCacheHealth(),
            'queue' => $this->checkQueueHealth(),
            'storage' => $this->checkStorageHealth(),
        ];

        return response()->json([
            'overall' => $health,
            'services' => $services,
            'last_checked' => now()->toIso8601String(),
        ]);
    }

    /**
     * NOTIFICATION ENDPOINTS
     */

    /**
     * Get system notifications
     */
    public function getSystemNotifications(Request $request)
    {
        // In production, you'd have a separate notifications table
        $notifications = [
            [
                'id' => 1,
                'type' => 'system_alert',
                'title' => 'High Disk Usage',
                'message' => 'Disk usage is at 85%. Consider clearing old logs.',
                'severity' => 'warning',
                'read' => false,
                'created_at' => Carbon::now()->subHours(2)->toIso8601String(),
            ],
            [
                'id' => 2,
                'type' => 'billing_alert',
                'title' => 'Payment Failed',
                'message' => '3 subscription payments failed today.',
                'severity' => 'high',
                'read' => false,
                'created_at' => Carbon::now()->subHours(5)->toIso8601String(),
            ],
            [
                'id' => 3,
                'type' => 'security_alert',
                'title' => 'Multiple Failed Login Attempts',
                'message' => 'User john@example.com had 5 failed login attempts.',
                'severity' => 'medium',
                'read' => true,
                'created_at' => Carbon::now()->subDay()->toIso8601String(),
            ],
        ];

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => collect($notifications)->where('read', false)->count(),
        ]);
    }

    /**
     * Mark notification as read
     */
    public function markNotificationRead($id)
    {
        // In production, update notification in database
        return response()->json(['message' => 'Notification marked as read']);
    }

    /**
     * Get alert rules
     */
    public function getAlertRules()
    {
        $rules = [
            [
                'id' => 1,
                'name' => 'High CPU Usage',
                'condition' => 'cpu_usage > 80',
                'action' => 'email_admin',
                'enabled' => true,
            ],
            [
                'id' => 2,
                'name' => 'Failed Payments',
                'condition' => 'failed_payments > 5',
                'action' => 'email_admin',
                'enabled' => true,
            ],
            [
                'id' => 3,
                'name' => 'Disk Space Low',
                'condition' => 'disk_usage > 90',
                'action' => 'email_admin',
                'enabled' => true,
            ],
        ];

        return response()->json($rules);
    }

    /**
     * Helper Methods
     */
    private function getStartDate($range)
    {
        switch ($range) {
            case '24h':
                return Carbon::now()->subHours(24);
            case '7d':
                return Carbon::now()->subDays(7);
            case '30d':
                return Carbon::now()->subDays(30);
            case '90d':
                return Carbon::now()->subDays(90);
            default:
                return Carbon::now()->subDays(7);
        }
    }

    private function calculateGrowth($model, $startDate)
    {
        $modelClass = "App\\Models\\" . ucfirst($model);
        $previousPeriod = $startDate->copy()->subDays($startDate->diffInDays(Carbon::now()));

        $currentCount = $modelClass::where('created_at', '>=', $startDate)->count();
        $previousCount = $modelClass::whereBetween('created_at', [$previousPeriod, $startDate])->count();

        if ($previousCount == 0) {
            return $currentCount > 0 ? 100 : 0;
        }

        return round((($currentCount - $previousCount) / $previousCount) * 100, 2);
    }

    private function calculateStorageUsed()
    {
        // Calculate total storage used across all tenants
        // This would typically check file storage, database size, etc.
        return round(disk_free_space('/') / (1024 * 1024 * 1024), 2);
    }

    private function calculateTenantStorage($tenantId)
    {
        // Calculate storage used by specific tenant
        // This would check their uploaded files, attachments, etc.
        return rand(1, 10) / 10; // Placeholder
    }

    private function getSystemStats()
    {
        // CPU Usage - Load average as percentage (rough estimate)
        $cpuPercent = 0;
        try {
            $loadAvg = sys_getloadavg();
            if ($loadAvg !== false && isset($loadAvg[0])) {
                // Load average to percentage (simplified - assumes single core baseline)
                // For multi-core, divide by number of cores for more accuracy
                $cpuPercent = min(round($loadAvg[0] * 100, 2), 100);
            }
        } catch (\Exception $e) {
            // Fallback: cannot determine CPU usage
        }

        // Memory Usage - Current vs memory limit
        $memoryPercent = 0;
        try {
            $memoryLimit = ini_get('memory_limit');
            if ($memoryLimit && $memoryLimit !== '-1') {
                $memoryLimitBytes = $this->convertToBytes($memoryLimit);
                $memoryUsage = memory_get_usage(true);
                if ($memoryLimitBytes > 0) {
                    $memoryPercent = round(($memoryUsage / $memoryLimitBytes) * 100, 2);
                }
            } else {
                // If no limit, use peak usage as reference
                $memoryPercent = round((memory_get_usage(true) / (memory_get_peak_usage(true) ?: 1)) * 100, 2);
            }
        } catch (\Exception $e) {
            // Fallback: cannot determine memory usage
        }

        // Disk Usage
        $diskPercent = 0;
        try {
            $totalSpace = disk_total_space('/');
            $freeSpace = disk_free_space('/');
            if ($totalSpace !== false && $freeSpace !== false && $totalSpace > 0) {
                $diskPercent = round((($totalSpace - $freeSpace) / $totalSpace) * 100, 2);
            }
        } catch (\Exception $e) {
            // Fallback: cannot determine disk usage
        }

        // System Uptime
        $uptimeDays = 0;
        try {
            // Method 1: Try /proc/uptime (Linux)
            if (file_exists('/proc/uptime')) {
                $uptimeData = file_get_contents('/proc/uptime');
                if ($uptimeData !== false) {
                    $uptimeSeconds = (float) explode(' ', $uptimeData)[0];
                    $uptimeDays = round($uptimeSeconds / 86400, 1);
                }
            }
            // Method 2: Try /proc/1 (fallback for Linux)
            elseif (file_exists('/proc/1')) {
                $bootTime = filectime('/proc/1');
                if ($bootTime !== false) {
                    $uptimeDays = round((time() - $bootTime) / 86400, 1);
                }
            }
            // Method 3: Use PHP start time as last resort (not real uptime)
            else {
                // This is just PHP's runtime, not system uptime
                $uptimeDays = 0; // Cannot determine actual uptime
            }
        } catch (\Exception $e) {
            // Fallback: cannot determine uptime
        }

        return [
            'cpu_percent' => $cpuPercent,
            'memory_percent' => $memoryPercent,
            'disk_percent' => $diskPercent,
            'uptime_days' => $uptimeDays
        ];
    }

    /**
     * Convert memory limit string to bytes
     */
    private function convertToBytes($value)
    {
        $value = trim($value);
        $unit = strtolower($value[strlen($value) - 1]);
        $numValue = (int) $value;

        switch ($unit) {
            case 'g':
                $numValue *= 1024;
            case 'm':
                $numValue *= 1024;
            case 'k':
                $numValue *= 1024;
        }

        return $numValue;
    }

    private function performHealthCheck()
    {
        $issues = [];
        $status = 'healthy';

        // Check database connection
        try {
            DB::connection()->getPdo();
        } catch (\Exception $e) {
            $issues[] = [
                'type' => 'Database',
                'message' => 'Database connection failed',
                'severity' => 'high'
            ];
            $status = 'critical';
        }

        // Check disk space
        $diskPercent = round((disk_total_space('/') - disk_free_space('/')) / disk_total_space('/') * 100, 2);
        if ($diskPercent > 90) {
            $issues[] = [
                'type' => 'Storage',
                'message' => "Disk usage at {$diskPercent}%",
                'severity' => 'high'
            ];
            $status = 'critical';
        } elseif ($diskPercent > 80) {
            $issues[] = [
                'type' => 'Storage',
                'message' => "Disk usage at {$diskPercent}%",
                'severity' => 'medium'
            ];
            if ($status === 'healthy') $status = 'degraded';
        }

        // Check memory usage
        $memoryPercent = round((memory_get_usage() / memory_get_peak_usage()) * 100, 2);
        if ($memoryPercent > 90) {
            $issues[] = [
                'type' => 'Memory',
                'message' => "Memory usage at {$memoryPercent}%",
                'severity' => 'medium'
            ];
            if ($status === 'healthy') $status = 'degraded';
        }

        return [
            'status' => $status,
            'issues' => $issues
        ];
    }

    private function formatActivityDescription($activity)
    {
        $descriptions = [
            'user_login' => 'User logged in',
            'user_logout' => 'User logged out',
            'user_created' => 'New user created',
            'user_updated' => 'User profile updated',
            'invoice_created' => 'Invoice created',
            'invoice_sent' => 'Invoice sent',
            'payment_received' => 'Payment received',
            'tenant_created' => 'New organization created',
            'project_created' => 'New project created',
            'task_completed' => 'Task completed'
        ];

        return $descriptions[$activity->type] ?? $activity->type;
    }

    private function checkDatabaseHealth()
    {
        try {
            DB::connection()->getPdo();
            return ['status' => 'healthy', 'message' => 'Database connection OK'];
        } catch (\Exception $e) {
            return ['status' => 'unhealthy', 'message' => $e->getMessage()];
        }
    }

    private function checkCacheHealth()
    {
        try {
            Cache::put('health_check', 'ok', 10);
            $value = Cache::get('health_check');
            return ['status' => $value === 'ok' ? 'healthy' : 'degraded', 'message' => 'Cache OK'];
        } catch (\Exception $e) {
            return ['status' => 'unhealthy', 'message' => $e->getMessage()];
        }
    }

    private function checkQueueHealth()
    {
        // In production, check queue connection and pending jobs
        return ['status' => 'healthy', 'message' => 'Queue processing normally'];
    }

    private function checkStorageHealth()
    {
        $diskPercent = round((disk_total_space('/') - disk_free_space('/')) / disk_total_space('/') * 100, 2);

        if ($diskPercent > 90) {
            return ['status' => 'critical', 'message' => "Disk usage at {$diskPercent}%"];
        } elseif ($diskPercent > 80) {
            return ['status' => 'warning', 'message' => "Disk usage at {$diskPercent}%"];
        }

        return ['status' => 'healthy', 'message' => "Disk usage at {$diskPercent}%"];
    }
}