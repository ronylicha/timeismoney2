<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\Project;
use App\Exports\TaskExport;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use Barryvdh\DomPDF\Facade\Pdf;

class TaskController extends Controller
{
    /**
     * Display a listing of tasks
     */
    public function index(Request $request)
    {
        $tenantId = auth()->user()->tenant_id;

        // Determine which relations to load
        $relations = ['project', 'users', 'parent'];

        // If include_full parameter is set, load all relations for offline use
        if ($request->boolean('include_full')) {
            $relations = [
                'project',
                'users',
                'parent',
                'children',
                'dependencies',
                'comments.user:id,name,email',
                'attachments.user:id,name,email',
                'timeEntries' => function ($q) {
                    $q->latest()->limit(10);
                }
            ];
        }

        $query = Task::with($relations)
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
            // Support multiple statuses separated by commas
            if (str_contains($request->status, ',')) {
                $statuses = explode(',', $request->status);
                $query->whereIn('status', $statuses);
            } else {
                $query->where('status', $request->status);
            }
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
            'status' => 'required|in:todo,in_progress,in_review,done,cancelled',
            'priority' => 'required|in:low,normal,medium,high,urgent',
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

        // Map parent_id to parent_task_id (frontend uses parent_id, but DB uses parent_task_id)
        if (isset($validated['parent_id'])) {
            $validated['parent_task_id'] = $validated['parent_id'];
            unset($validated['parent_id']);
        }

        // Generate task code
        $project = Project::find($validated['project_id']);
        $validated['code'] = $this->generateTaskCode($project);

        // Set position for Kanban
        $maxPosition = Task::where('project_id', $validated['project_id'])
            ->where('status', $validated['status'])
            ->max('position') ?? 0;
        $validated['position'] = $maxPosition + 1;

        // Extract assigned_users before creating task
        $assignedUsers = $validated['assigned_users'] ?? [];
        unset($validated['assigned_users']);

        // Create task
        $task = Task::create($validated);

        // Assign users
        if (!empty($assignedUsers)) {
            foreach ($assignedUsers as $userId) {
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
            'status' => 'in:todo,in_progress,in_review,done,cancelled',
            'priority' => 'in:low,normal,high,urgent,medium',
            'type' => 'nullable|in:task,bug,feature,improvement',
            'parent_id' => 'nullable|exists:tasks,id',
            'estimated_hours' => 'nullable|numeric|min:0',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
            'is_billable' => 'boolean',
            'hourly_rate' => 'nullable|numeric|min:0',
            'labels' => 'nullable|array',
            'assigned_users' => 'nullable|array',
            'assigned_users.*' => 'exists:users,id'
        ]);

        // Map parent_id to parent_task_id (frontend uses parent_id, but DB uses parent_task_id)
        if (isset($validated['parent_id'])) {
            $validated['parent_task_id'] = $validated['parent_id'];
            unset($validated['parent_id']);
        }

        // If status changed to done, set completed_at
        if (isset($validated['status']) && $validated['status'] === 'done' && $task->status !== 'done') {
            $validated['completed_at'] = now();
            $validated['actual_hours'] = $task->tracked_hours;
        }

        // Extract assigned_users before update
        $assignedUsers = $validated['assigned_users'] ?? null;
        unset($validated['assigned_users']);

        $task->update($validated);

        // Update assigned users if provided
        if ($assignedUsers !== null) {
            // Sync users with their role
            $syncData = [];
            foreach ($assignedUsers as $userId) {
                $syncData[$userId] = [
                    'role' => 'assignee',
                    'assigned_hours' => null
                ];
            }
            $task->users()->sync($syncData);
        }

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
            'status' => 'required|in:todo,in_progress,in_review,done,cancelled',
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
     * Get task comments
     */
    public function comments(Task $task)
    {
        $comments = $task->comments()
            ->with('user:id,name,email')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($comments);
    }

    /**
     * Store a new comment
     */
    public function storeComment(Request $request, Task $task)
    {
        $request->validate([
            'content' => 'required|string|max:2000'
        ]);

        $comment = $task->comments()->create([
            'content' => $request->content,
            'user_id' => auth()->id(),
            'commentable_type' => Task::class,
            'commentable_id' => $task->id,
        ]);

        $comment->load('user:id,name,email');

        return response()->json($comment, 201);
    }

    /**
     * Update a comment
     */
    public function updateComment(Request $request, Task $task, $commentId)
    {
        $comment = $task->comments()->findOrFail($commentId);

        // Check if user owns the comment
        if ($comment->user_id !== auth()->id()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $request->validate([
            'content' => 'required|string|max:2000'
        ]);

        $comment->update([
            'content' => $request->content
        ]);

        $comment->load('user:id,name,email');

        return response()->json($comment);
    }

    /**
     * Delete a comment
     */
    public function deleteComment(Task $task, $commentId)
    {
        $comment = $task->comments()->findOrFail($commentId);

        // Check if user owns the comment
        if ($comment->user_id !== auth()->id()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $comment->delete();

        return response()->json(['message' => 'Commentaire supprimé']);
    }

    /**
     * Get task attachments
     */
    public function attachments(Task $task)
    {
        $attachments = $task->attachments()
            ->with('user:id,name,email')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($attachments);
    }

    /**
     * Upload attachment
     */
    public function uploadAttachment(Request $request, Task $task)
    {
        $request->validate([
            'file' => 'required|file|max:10240' // 10MB max
        ]);

        $file = $request->file('file');
        $filename = time() . '_' . Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)) . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('attachments/tasks/' . $task->id, $filename, 'private');

        $attachment = $task->attachments()->create([
            'tenant_id' => auth()->user()->tenant_id,
            'filename' => $filename,
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'path' => $path,
            'user_id' => auth()->id(),
            'attachable_type' => Task::class,
            'attachable_id' => $task->id,
        ]);

        $attachment->load('user:id,name,email');
        $attachment->url = route('api.tasks.attachments.download', [$task->id, $attachment->id]);

        return response()->json($attachment, 201);
    }

    /**
     * Download attachment
     */
    public function downloadAttachment(Task $task, $attachmentId)
    {
        $attachment = $task->attachments()->findOrFail($attachmentId);

        $filePath = \Storage::disk('private')->path($attachment->path);

        if (!\Storage::disk('private')->exists($attachment->path)) {
            return response()->json(['message' => 'Fichier introuvable'], 404);
        }

        return response()->download($filePath, $attachment->original_filename);
    }

    /**
     * Delete attachment
     */
    public function deleteAttachment(Task $task, $attachmentId)
    {
        $attachment = $task->attachments()->findOrFail($attachmentId);

        // Check if user owns the attachment
        if ($attachment->user_id !== auth()->id()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        // Delete file from storage
        \Storage::disk('private')->delete($attachment->path);

        $attachment->delete();

        return response()->json(['message' => 'Pièce jointe supprimée']);
    }

    /**
     * Get task checklist
     */
    public function checklist(Task $task)
    {
        $checklist = $task->checklist ?? [];
        
        return response()->json($checklist);
    }

    /**
     * Add checklist item
     */
    public function addChecklistItem(Request $request, Task $task)
    {
        $request->validate([
            'text' => 'required|string|max:500'
        ]);

        $checklist = $task->checklist ?? [];
        
        $newItem = [
            'id' => \Str::uuid()->toString(),
            'text' => $request->text,
            'completed' => false,
            'position' => count($checklist),
            'created_at' => now()->toISOString(),
        ];

        $checklist[] = $newItem;

        $task->update(['checklist' => $checklist]);

        return response()->json($newItem, 201);
    }

    /**
     * Update checklist item
     */
    public function updateChecklistItem(Request $request, Task $task, $itemId)
    {
        $request->validate([
            'text' => 'sometimes|string|max:500',
            'completed' => 'sometimes|boolean',
        ]);

        $checklist = $task->checklist ?? [];
        
        $itemIndex = collect($checklist)->search(function ($item) use ($itemId) {
            return $item['id'] === $itemId;
        });

        if ($itemIndex === false) {
            return response()->json(['message' => 'Élément non trouvé'], 404);
        }

        if ($request->has('text')) {
            $checklist[$itemIndex]['text'] = $request->text;
        }

        if ($request->has('completed')) {
            $checklist[$itemIndex]['completed'] = $request->completed;
        }

        $checklist[$itemIndex]['updated_at'] = now()->toISOString();

        $task->update(['checklist' => $checklist]);

        return response()->json($checklist[$itemIndex]);
    }

    /**
     * Delete checklist item
     */
    public function deleteChecklistItem(Task $task, $itemId)
    {
        $checklist = $task->checklist ?? [];
        
        $checklist = collect($checklist)->reject(function ($item) use ($itemId) {
            return $item['id'] === $itemId;
        })->values()->toArray();

        $task->update(['checklist' => $checklist]);

        return response()->json(['message' => 'Élément supprimé']);
    }

    /**
     * Export tasks
     */
    public function export(Request $request)
    {
        $tenantId = auth()->user()->tenant_id;
        $format = $request->get('format', 'excel');

        // Build query with same filters as index
        $query = Task::with(['project', 'users', 'parent'])
            ->whereHas('project', function ($q) use ($tenantId) {
                $q->where('tenant_id', $tenantId);
            });

        // Apply filters
        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if ($request->project_id) {
            $query->where('project_id', $request->project_id);
        }

        if ($request->status) {
            // Support multiple statuses separated by commas
            if (str_contains($request->status, ',')) {
                $statuses = explode(',', $request->status);
                $query->whereIn('status', $statuses);
            } else {
                $query->where('status', $request->status);
            }
        }

        if ($request->priority) {
            $query->where('priority', $request->priority);
        }

        if ($request->assigned_to) {
            $query->whereHas('users', function ($q) use ($request) {
                $q->where('user_id', $request->assigned_to);
            });
        }

        if ($request->start_date) {
            $query->where('start_date', '>=', $request->start_date);
        }

        if ($request->end_date) {
            $query->where('due_date', '<=', $request->end_date);
        }

        if ($request->labels) {
            $labels = explode(',', $request->labels);
            $query->where(function ($q) use ($labels) {
                foreach ($labels as $label) {
                    $q->orWhereJsonContains('labels', trim($label));
                }
            });
        }

        $tasks = $query->orderBy('created_at', 'desc')->get();

        // Export based on format
        switch ($format) {
            case 'csv':
                return Excel::download(new TaskExport($tasks), 'tasks.csv', \Maatwebsite\Excel\Excel::CSV);
            
            case 'pdf':
                $pdf = Pdf::loadView('exports.tasks-pdf', ['tasks' => $tasks]);
                return $pdf->download('tasks.pdf');
            
            case 'excel':
            default:
                return Excel::download(new TaskExport($tasks), 'tasks.xlsx');
        }
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