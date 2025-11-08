<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProjectController extends Controller
{
    /**
     * Display a listing of projects
     */
    public function index(Request $request)
    {
        $query = Project::with(['client', 'users'])
            ->where('tenant_id', auth()->user()->tenant_id);

        // Filter by user's projects if not admin
        if (!auth()->user()->can('view_all_projects')) {
            $query->whereHas('users', function ($q) {
                $q->where('user_id', auth()->id());
            });
        }

        // Search
        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Filter by client
        if ($request->client_id) {
            $query->where('client_id', $request->client_id);
        }

        // Filter by status
        if ($request->status) {
            $query->where('status', $request->status);
        }

        // Filter by billable
        if ($request->has('is_billable')) {
            $query->where('is_billable', $request->boolean('is_billable'));
        }

        // Sort
        $sortBy = $request->sort_by ?? 'created_at';
        $sortOrder = $request->sort_order ?? 'desc';
        $query->orderBy($sortBy, $sortOrder);

        return $query->paginate(20);
    }

    /**
     * Store a new project
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:planning,active,on_hold,completed,cancelled',
            'type' => 'nullable|in:fixed,hourly,retainer,maintenance',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'deadline' => 'nullable|date',
            'budget_type' => 'nullable|in:hours,amount,both',
            'budget_hours' => 'nullable|numeric|min:0',
            'budget_amount' => 'nullable|numeric|min:0',
            'hourly_rate' => 'nullable|numeric|min:0',
            'estimated_hours' => 'nullable|numeric|min:0',
            'color' => 'nullable|string|size:7',
            'is_billable' => 'boolean',
            'user_ids' => 'nullable|array',
            'user_ids.*' => 'exists:users,id'
        ]);

        // Generate project code
        $validated['code'] = $this->generateProjectCode($validated['name']);
        $validated['tenant_id'] = auth()->user()->tenant_id;

        // Create project
        $project = Project::create($validated);

        // Assign users
        if (!empty($validated['user_ids'])) {
            foreach ($validated['user_ids'] as $userId) {
                $user = User::find($userId);
                $project->users()->attach($userId, [
                    'role' => $userId === auth()->id() ? 'manager' : 'member',
                    'hourly_rate' => $user->teamMember?->hourly_rate,
                    'is_active' => true
                ]);
            }
        } else {
            // Assign current user as project manager
            $project->users()->attach(auth()->id(), [
                'role' => 'manager',
                'hourly_rate' => auth()->user()->teamMember?->hourly_rate,
                'is_active' => true
            ]);
        }

        return response()->json([
            'message' => 'Project created successfully',
            'project' => $project->load(['client', 'users'])
        ], 201);
    }

    /**
     * Display the specified project
     */
    public function show(Project $project)
    {
        // Check if user has access to this project
        if (!auth()->user()->can('view_all_projects')) {
            $hasAccess = $project->users()->where('user_id', auth()->id())->exists();
            if (!$hasAccess) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        return $project->load([
            'client',
            'users',
            'tasks' => function ($q) {
                $q->withCount('timeEntries');
            },
            'timeEntries' => function ($q) {
                $q->latest()->limit(10);
            }
        ]);
    }

    /**
     * Update the specified project
     */
    public function update(Request $request, Project $project)
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'description' => 'nullable|string',
            'status' => 'in:planning,active,on_hold,completed,cancelled',
            'type' => 'nullable|in:fixed,hourly,retainer,maintenance',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'deadline' => 'nullable|date',
            'budget_type' => 'nullable|in:hours,amount,both',
            'budget_hours' => 'nullable|numeric|min:0',
            'budget_amount' => 'nullable|numeric|min:0',
            'hourly_rate' => 'nullable|numeric|min:0',
            'estimated_hours' => 'nullable|numeric|min:0',
            'color' => 'nullable|string|size:7',
            'is_billable' => 'boolean'
        ]);

        $project->update($validated);

        return response()->json([
            'message' => 'Project updated successfully',
            'project' => $project->fresh()->load(['client', 'users'])
        ]);
    }

    /**
     * Remove the specified project
     */
    public function destroy(Project $project)
    {
        // Check if project has time entries
        if ($project->timeEntries()->exists()) {
            return response()->json([
                'message' => 'Cannot delete project with time entries'
            ], 422);
        }

        $project->delete();

        return response()->json([
            'message' => 'Project deleted successfully'
        ]);
    }

    /**
     * Get project tasks
     */
    public function tasks(Project $project)
    {
        return $project->tasks()
            ->with(['users'])
            ->withCount('timeEntries')
            ->get();
    }

    /**
     * Get project time entries
     */
    public function timeEntries(Project $project)
    {
        $query = $project->timeEntries()
            ->with(['user', 'task']);

        if (!auth()->user()->can('view_all_time_entries')) {
            $query->where('user_id', auth()->id());
        }

        return $query->latest()->paginate(20);
    }

    /**
     * Assign users to project
     */
    public function assignUsers(Request $request, Project $project)
    {
        $validated = $request->validate([
            'users' => 'required|array',
            'users.*.user_id' => 'required|exists:users,id',
            'users.*.role' => 'required|in:manager,member,viewer',
            'users.*.hourly_rate' => 'nullable|numeric|min:0'
        ]);

        foreach ($validated['users'] as $userData) {
            $user = User::find($userData['user_id']);

            $project->users()->syncWithoutDetaching([
                $userData['user_id'] => [
                    'role' => $userData['role'],
                    'hourly_rate' => $userData['hourly_rate'] ?? $user->teamMember?->hourly_rate,
                    'is_active' => true
                ]
            ]);
        }

        return response()->json([
            'message' => 'Users assigned successfully',
            'project' => $project->fresh()->load('users')
        ]);
    }

    /**
     * Generate unique project code
     */
    private function generateProjectCode($name)
    {
        $prefix = strtoupper(substr(Str::slug($name), 0, 3));
        $year = now()->year;
        $count = Project::where('tenant_id', auth()->user()->tenant_id)
            ->whereYear('created_at', $year)
            ->count();

        return $prefix . '-' . $year . '-' . str_pad($count + 1, 3, '0', STR_PAD_LEFT);
    }
}