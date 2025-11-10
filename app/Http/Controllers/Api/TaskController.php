<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TaskController extends Controller
{
    /**
     * Display a listing of tasks
     */
    public function index(Request $request)
    {
        $tenantId = auth()->user()->tenant_id;
        $query = Task::with(['project', 'users', 'parent'])
            ->whereHas('project', function ($q) use ($tenantId) {
                $q->where('tenant_id', $tenantId);
            });

        // Filter by user's tasks if not admin
        if (!auth()->user()->can('view_all_tasks')) {
            $query->whereHas('users', function ($q) {
                $q->where('user_id', auth()->id());
            });
        }

        // Search
        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        // Filter by project
        if ($request->project_id) {
            $query->where('project_id', $request->project_id);
        }

        // Filter by status
        if ($request->status) {
            $query->where('status', $request->status);
        }

        // Filter by priority
        if ($request->priority) {
            $query->where('priority', $request->priority);
        }

        // Filter by assigned user
        if ($request->assigned_to) {
            $query->whereHas('users', function ($q) use ($request) {
                $q->where('user_id', $request->assigned_to);
            });
        }

        // Sort
        $sortBy = $request->sort_by ?? 'created_at';
        $sortOrder = $request->sort_order ?? 'desc';
        $query->orderBy($sortBy, $sortOrder);

        return $query->paginate(20);
    }

    /**
     * Get tasks in Kanban board format
     */
    public function kanban(Request $request)
    {
        $tenantId = auth()->user()->tenant_id;
        $query = Task::with(['project', 'users', 'parent', 'children'])
            ->whereHas('project', function ($q) use ($tenantId) {
                $q->where('tenant_id', $tenantId);
            });

        // Filter by project
        if ($request->project_id) {
            $query->where('project_id', $request->project_id);
        }

        // Filter by user's tasks if not admin
        if (!auth()->user()->can('view_all_tasks')) {
            $query->whereHas('users', function ($q) {
                $q->where('user_id', auth()->id());
            });
        }

        // Get tasks grouped by status
        $tasks = $query->get();

        $columns = [
            'todo' => [
                'id' => 'todo',
                'title' => 'À faire',
                'color' => '#94a3b8',
                'tasks' => []
            ],
            'in_progress' => [
                'id' => 'in_progress',
                'title' => 'En cours',
                'color' => '#3b82f6',
                'tasks' => []
            ],
            'review' => [
                'id' => 'review',
                'title' => 'Révision',
                'color' => '#f59e0b',
                'tasks' => []
            ],
            'completed' => [
                'id' => 'completed',
                'title' => 'Terminé',
                'color' => '#10b981',
                'tasks' => []
            ]
        ];

        // Group tasks by status
        foreach ($tasks as $task) {
            if (isset($columns[$task->status])) {
                $columns[$task->status]['tasks'][] = $task;
            }
        }

        // Sort tasks within each column by position
        foreach ($columns as &$column) {
            usort($column['tasks'], function ($a, $b) {
                return $a->position <=> $b->position;
            });
        }

        return response()->json([
            'columns' => array_values($columns),
            'total_tasks' => $tasks->count()
        ]);
    }

    /**
     * Store a new task
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'parent_id' => 'nullable|exists:tasks,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:todo,in_progress,review,done,cancelled',
            'priority' => 'required|in:low,normal,high,urgent',
            'type' => 'nullable|in:task,bug,feature,improvement',
            'estimated_hours' => 'nullable|numeric|min:0',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
            'is_billable' => 'boolean',
            'hourly_rate' => 'nullable|numeric|min:0',
            'labels' => 'nullable|array',
            'assigned_users' => 'nullable|array',
            'assigned_users.*' => 'exists:users,id'
        ]);

        // Generate task code
        $project = Project::find($validated['project_id']);
        $validated['code'] = $this->generateTaskCode($project);

        // Set position for Kanban
        $maxPosition = Task::where('project_id', $validated['project_id'])
            ->where('status', $validated['status'])
            ->max('position') ?? 0;
        $validated['position'] = $maxPosition + 1;

        // Create task
        $task = Task::create($validated);

        // Assign users
        if (!empty($validated['assigned_users'])) {
            foreach ($validated['assigned_users'] as $userId) {
                $task->users()->attach($userId, [
                    'role' => 'assignee',
                    'assigned_hours' => null
                ]);
            }
        }

        return response()->json([
            'message' => 'Tâche créée avec succès',
            'task' => $task->load(['project', 'users'])
        ], 201);
    }

    /**
     * Display the specified task
     */
    public function show(Task $task)
    {
        // Check if user has access to this task
        if (!auth()->user()->can('view_all_tasks')) {
            $hasAccess = $task->users()->where('user_id', auth()->id())->exists() ||
                        $task->project->users()->where('user_id', auth()->id())->exists();
            if (!$hasAccess) {
                return response()->json(['message' => 'Non autorisé'], 403);
            }
        }

        $task->load([
            'project',
            'users',
            'parent',
            'children',
            'dependencies',
            'timeEntries' => function ($q) {
                $q->latest()->limit(10);
            }
        ]);

        return response()->json($task);
    }

    /**
     * Update the specified task
     */
    public function update(Request $request, Task $task)
    {
        // Check permission
        if (!auth()->user()->can('edit_all_tasks')) {
            $hasAccess = $task->users()->where('user_id', auth()->id())->exists();
            if (!$hasAccess) {
                return response()->json(['message' => 'Non autorisé'], 403);
            }
        }

        $validated = $request->validate([
            'title' => 'string|max:255',
            'description' => 'nullable|string',
            'status' => 'in:todo,in_progress,review,done,cancelled',
            'priority' => 'in:low,normal,high,urgent',
            'type' => 'nullable|in:task,bug,feature,improvement',
            'estimated_hours' => 'nullable|numeric|min:0',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
            'is_billable' => 'boolean',
            'labels' => 'nullable|array'
        ]);

        // If status changed and it's done, set completed_at
        if (isset($validated['status']) && $validated['status'] === 'done' && $task->status !== 'done') {
            $validated['completed_at'] = now();
            $validated['actual_hours'] = $task->tracked_hours;
        }

        $task->update($validated);

        return response()->json([
            'message' => 'Tâche mise à jour avec succès',
            'task' => $task->fresh()->load(['project', 'users'])
        ]);
    }

    /**
     * Update task status (for Kanban drag & drop)
     */
    public function updateStatus(Request $request, Task $task)
    {
        $validated = $request->validate([
            'status' => 'required|in:todo,in_progress,review,done,cancelled',
            'position' => 'nullable|integer|min:0',
            'column_id' => 'nullable|string' // For custom columns
        ]);

        // Update status
        $task->status = $validated['status'];

        // Update position if provided
        if (isset($validated['position'])) {
            // Reorder tasks in the column
            $tasksInColumn = Task::where('project_id', $task->project_id)
                ->where('status', $validated['status'])
                ->where('id', '!=', $task->id)
                ->orderBy('position')
                ->get();

            $position = 0;
            $inserted = false;

            foreach ($tasksInColumn as $columnTask) {
                if (!$inserted && $position == $validated['position']) {
                    $task->position = $position;
                    $position++;
                    $inserted = true;
                }

                $columnTask->position = $position;
                $columnTask->save();
                $position++;
            }

            if (!$inserted) {
                $task->position = $position;
            }
        }

        // If status is done, update completed_at
        if ($validated['status'] === 'done' && !$task->completed_at) {
            $task->completed_at = now();
            $task->actual_hours = $task->tracked_hours;
        }

        $task->save();

        return response()->json([
            'message' => 'Statut de la tâche mis à jour avec succès',
            'task' => $task->fresh()->load(['project', 'users'])
        ]);
    }

    /**
     * Assign users to task
     */
    public function assignUsers(Request $request, Task $task)
    {
        $validated = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id'
        ]);

        // Sync users
        $task->users()->sync($validated['user_ids']);

        return response()->json([
            'message' => 'Utilisateurs assignés avec succès',
            'task' => $task->fresh()->load('users')
        ]);
    }

    /**
     * Remove the specified task
     */
    public function destroy(Task $task)
    {
        // Check permission
        if (!auth()->user()->can('delete_all_tasks')) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        // Check if task has time entries
        if ($task->timeEntries()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer une tâche avec des entrées de temps'
            ], 422);
        }

        $task->delete();

        return response()->json([
            'message' => 'Tâche supprimée avec succès'
        ]);
    }

    /**
     * Generate unique task code
     */
    private function generateTaskCode(Project $project)
    {
        $taskCount = Task::where('project_id', $project->id)->count() + 1;
        return $project->code . '-' . str_pad($taskCount, 3, '0', STR_PAD_LEFT);
    }
}