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
     * Check if user is admin
     */
    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            if (auth()->user()->role !== 'admin') {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
            return $next($request);
        });
    }

    /**
     * Get system statistics
     */
    public function getStats(Request $request)
    {
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
                    'individual' => Tenant::where('plan', 'individual')->count(),
                    'team' => Tenant::where('plan', 'team')->count(),
                    'enterprise' => Tenant::where('plan', 'enterprise')->count(),
                ],
                'revenue' => $this->calculateMRR()
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
        $query = User::with('tenant');

        // Search
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Filter by role
        if ($request->has('role') && $request->get('role') !== 'all') {
            $query->where('role', $request->get('role'));
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
        $query->withCount(['timeEntries', 'invoices']);

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
        $query = User::with('tenant');

        // Apply same filters as getUsers
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->has('role') && $request->get('role') !== 'all') {
            $query->where('role', $request->get('role'));
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

        // Filter by plan
        if ($request->has('plan') && $request->get('plan') !== 'all') {
            $query->where('plan', $request->get('plan'));
        }

        // Filter by status
        if ($request->has('status') && $request->get('status') !== 'all') {
            $query->where('subscription_status', $request->get('status'));
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
            'active' => Tenant::where('subscription_status', 'active')->count(),
            'trial' => Tenant::where('subscription_status', 'trial')->count(),
            'enterprise' => Tenant::where('plan', 'enterprise')->count(),
            'mrr' => $this->calculateMRR()
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
        $tenant->update(['subscription_status' => 'suspended']);

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
        $tenant->update(['subscription_status' => 'active']);

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
     * Update tenant plan
     */
    public function updateTenantPlan(Request $request, $id)
    {
        $validated = $request->validate([
            'plan' => 'required|in:individual,team,enterprise'
        ]);

        $tenant = Tenant::findOrFail($id);
        $oldPlan = $tenant->plan;

        $tenant->update([
            'plan' => $validated['plan'],
            'max_users' => $this->getPlanLimit($validated['plan'], 'users'),
            'max_projects' => $this->getPlanLimit($validated['plan'], 'projects'),
            'max_storage_gb' => $this->getPlanLimit($validated['plan'], 'storage')
        ]);

        ActivityLog::create([
            'user_id' => auth()->id(),
            'type' => 'tenant_plan_changed',
            'description' => "Changed tenant {$tenant->name} plan from {$oldPlan} to {$validated['plan']}",
            'properties' => [
                'tenant_id' => $tenant->id,
                'old_plan' => $oldPlan,
                'new_plan' => $validated['plan']
            ]
        ]);

        return response()->json(['message' => 'Plan updated']);
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

    private function calculateMRR()
    {
        $plans = [
            'individual' => 29,
            'team' => 99,
            'enterprise' => 299
        ];

        $mrr = 0;
        foreach ($plans as $plan => $price) {
            $count = Tenant::where('plan', $plan)
                ->where('subscription_status', 'active')
                ->count();
            $mrr += $count * $price;
        }

        return $mrr;
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
        return [
            'cpu_percent' => sys_getloadavg()[0] * 10, // Simplified CPU usage
            'memory_percent' => round((memory_get_usage() / memory_get_peak_usage()) * 100, 2),
            'disk_percent' => round((disk_total_space('/') - disk_free_space('/')) / disk_total_space('/') * 100, 2),
            'uptime_days' => round((time() - filectime('/proc/1')) / 86400, 0)
        ];
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

    private function getPlanLimit($plan, $resource)
    {
        $limits = [
            'individual' => [
                'users' => 1,
                'projects' => 5,
                'storage' => 5
            ],
            'team' => [
                'users' => 10,
                'projects' => 50,
                'storage' => 50
            ],
            'enterprise' => [
                'users' => -1, // Unlimited
                'projects' => -1,
                'storage' => 500
            ]
        ];

        return $limits[$plan][$resource] ?? 0;
    }
}