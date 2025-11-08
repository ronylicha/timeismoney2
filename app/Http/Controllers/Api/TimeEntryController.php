<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TimeEntry;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TimeEntryController extends Controller
{
    /**
     * Display a listing of time entries
     */
    public function index(Request $request)
    {
        $query = TimeEntry::with(['project', 'task', 'user'])
            ->where('tenant_id', auth()->user()->tenant_id);

        // Filter by user
        if ($request->user_id) {
            $query->where('user_id', $request->user_id);
        } elseif (!auth()->user()->can('view_all_time_entries')) {
            $query->where('user_id', auth()->id());
        }

        // Filter by date range
        if ($request->start_date) {
            $query->where('started_at', '>=', Carbon::parse($request->start_date));
        }
        if ($request->end_date) {
            $query->where('started_at', '<=', Carbon::parse($request->end_date)->endOfDay());
        }

        // Filter by project
        if ($request->project_id) {
            $query->where('project_id', $request->project_id);
        }

        // Filter by status
        if ($request->has('is_billable')) {
            $query->where('is_billable', $request->boolean('is_billable'));
        }
        if ($request->has('is_approved')) {
            $query->where('is_approved', $request->boolean('is_approved'));
        }

        return $query->orderBy('started_at', 'desc')->paginate(20);
    }

    /**
     * Display a specific time entry
     */
    public function show(TimeEntry $timeEntry)
    {
        // Check permission
        if ($timeEntry->user_id !== auth()->id() && !auth()->user()->can('view_all_time_entries')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'time_entry' => $timeEntry->load(['project', 'task', 'user'])
        ]);
    }

    /**
     * Store a new time entry
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'task_id' => 'nullable|exists:tasks,id',
            'description' => 'required|string|max:1000',
            'started_at' => 'required|date',
            'ended_at' => 'nullable|date|after:started_at',
            'duration_seconds' => 'nullable|integer|min:0',
            'is_billable' => 'boolean',
            'hourly_rate' => 'nullable|numeric|min:0',
            'tags' => 'nullable|array'
        ]);

        // Check if user has running timer
        if (!$request->ended_at) {
            $runningTimer = auth()->user()->activeTimer;
            if ($runningTimer) {
                return response()->json([
                    'message' => 'You already have a running timer',
                    'timer' => $runningTimer
                ], 422);
            }
        }

        $validated['user_id'] = auth()->id();
        $validated['tenant_id'] = auth()->user()->tenant_id;
        $validated['is_manual'] = true;

        $timeEntry = TimeEntry::create($validated);

        return response()->json([
            'message' => 'Time entry created successfully',
            'time_entry' => $timeEntry->load(['project', 'task'])
        ], 201);
    }

    /**
     * Start timer
     */
    public function startTimer(Request $request)
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'task_id' => 'nullable|exists:tasks,id',
            'description' => 'nullable|string|max:1000',
            'is_billable' => 'boolean'
        ]);

        // Check if user has running timer
        $runningTimer = auth()->user()->activeTimer;
        if ($runningTimer) {
            return response()->json([
                'message' => 'You already have a running timer',
                'timer' => $runningTimer->load(['project', 'task'])
            ], 422);
        }

        // Get project hourly rate
        $project = Project::find($validated['project_id']);
        $hourlyRate = $project->hourly_rate ?? auth()->user()->teamMember?->hourly_rate;

        $timeEntry = TimeEntry::create([
            'tenant_id' => auth()->user()->tenant_id,
            'user_id' => auth()->id(),
            'project_id' => $validated['project_id'],
            'task_id' => $validated['task_id'] ?? null,
            'description' => $validated['description'] ?? '',
            'started_at' => now(),
            'is_billable' => $validated['is_billable'] ?? $project->is_billable,
            'hourly_rate' => $hourlyRate,
            'is_manual' => false
        ]);

        return response()->json([
            'message' => 'Timer started successfully',
            'timer' => $timeEntry->load(['project', 'task'])
        ], 201);
    }

    /**
     * Stop timer
     */
    public function stopTimer(Request $request)
    {
        $timer = auth()->user()->activeTimer;

        if (!$timer) {
            return response()->json([
                'message' => 'No active timer found'
            ], 404);
        }

        $request->validate([
            'description' => 'nullable|string|max:1000'
        ]);

        $timer->update([
            'ended_at' => now(),
            'description' => $request->description ?? $timer->description
        ]);

        return response()->json([
            'message' => 'Timer stopped successfully',
            'time_entry' => $timer->fresh()->load(['project', 'task'])
        ]);
    }

    /**
     * Get current timer
     */
    public function current()
    {
        $timer = auth()->user()->activeTimer;

        if (!$timer) {
            return response()->json([
                'message' => 'No active timer',
                'timer' => null
            ]);
        }

        return response()->json([
            'timer' => $timer->load(['project', 'task'])
        ]);
    }

    /**
     * Alias for current() to support legacy route
     */
    public function currentTimer()
    {
        return $this->current();
    }

    /**
     * Pause timer
     */
    public function pauseTimer(Request $request)
    {
        $timer = auth()->user()->activeTimer;

        if (!$timer) {
            return response()->json([
                'message' => 'No active timer found'
            ], 404);
        }

        // Store pause time in metadata
        $metadata = $timer->metadata ?? [];
        $metadata['paused_at'] = now()->toISOString();

        $timer->update([
            'metadata' => $metadata
        ]);

        return response()->json([
            'message' => 'Timer paused successfully',
            'timer' => $timer->fresh()->load(['project', 'task'])
        ]);
    }

    /**
     * Resume timer
     */
    public function resumeTimer(Request $request)
    {
        $timer = auth()->user()->activeTimer;

        if (!$timer) {
            return response()->json([
                'message' => 'No active timer found'
            ], 404);
        }

        $metadata = $timer->metadata ?? [];

        if (isset($metadata['paused_at'])) {
            unset($metadata['paused_at']);

            $timer->update([
                'metadata' => $metadata
            ]);
        }

        return response()->json([
            'message' => 'Timer resumed successfully',
            'timer' => $timer->fresh()->load(['project', 'task'])
        ]);
    }

    /**
     * Get timesheet
     */
    public function timesheet(Request $request)
    {
        // Default to weekly timesheet
        return $this->weeklyTimesheet($request);
    }

    /**
     * Export time entries
     */
    public function export(Request $request)
    {
        $query = TimeEntry::with(['project', 'task', 'user'])
            ->where('tenant_id', auth()->user()->tenant_id);

        // Apply filters
        if ($request->user_id) {
            $query->where('user_id', $request->user_id);
        } elseif (!auth()->user()->can('view_all_time_entries')) {
            $query->where('user_id', auth()->id());
        }

        if ($request->start_date) {
            $query->where('started_at', '>=', Carbon::parse($request->start_date));
        }
        if ($request->end_date) {
            $query->where('started_at', '<=', Carbon::parse($request->end_date)->endOfDay());
        }

        if ($request->project_id) {
            $query->where('project_id', $request->project_id);
        }

        $entries = $query->orderBy('started_at', 'desc')->get();

        // Format for export
        $exportData = $entries->map(function ($entry) {
            return [
                'date' => $entry->started_at->format('Y-m-d'),
                'start_time' => $entry->started_at->format('H:i'),
                'end_time' => $entry->ended_at?->format('H:i'),
                'duration' => round($entry->duration_seconds / 3600, 2),
                'project' => $entry->project->name,
                'task' => $entry->task?->name,
                'description' => $entry->description,
                'user' => $entry->user->name,
                'billable' => $entry->is_billable ? 'Yes' : 'No',
                'hourly_rate' => $entry->hourly_rate,
                'amount' => round(($entry->duration_seconds / 3600) * $entry->hourly_rate, 2)
            ];
        });

        return response()->json([
            'data' => $exportData,
            'total_hours' => round($entries->sum('duration_seconds') / 3600, 2),
            'total_amount' => $entries->sum(function ($entry) {
                return ($entry->duration_seconds / 3600) * $entry->hourly_rate;
            })
        ]);
    }

    /**
     * Update time entry
     */
    public function update(Request $request, TimeEntry $timeEntry)
    {
        // Check permission
        if ($timeEntry->user_id !== auth()->id() && !auth()->user()->can('edit_all_time_entries')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Check if locked
        if ($timeEntry->is_locked) {
            return response()->json(['message' => 'Time entry is locked and cannot be edited'], 422);
        }

        $validated = $request->validate([
            'description' => 'string|max:1000',
            'started_at' => 'date',
            'ended_at' => 'nullable|date|after:started_at',
            'is_billable' => 'boolean',
            'tags' => 'nullable|array'
        ]);

        $timeEntry->update($validated);

        return response()->json([
            'message' => 'Time entry updated successfully',
            'time_entry' => $timeEntry->fresh()->load(['project', 'task'])
        ]);
    }

    /**
     * Delete time entry
     */
    public function destroy(TimeEntry $timeEntry)
    {
        // Check permission
        if ($timeEntry->user_id !== auth()->id() && !auth()->user()->can('delete_all_time_entries')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Check if locked
        if ($timeEntry->is_locked) {
            return response()->json(['message' => 'Time entry is locked and cannot be deleted'], 422);
        }

        $timeEntry->delete();

        return response()->json([
            'message' => 'Time entry deleted successfully'
        ]);
    }

    /**
     * Approve time entry
     */
    public function approve(TimeEntry $timeEntry)
    {
        if (!auth()->user()->canApproveTime()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $timeEntry->update([
            'is_approved' => true,
            'approved_by' => auth()->id(),
            'approved_at' => now()
        ]);

        return response()->json([
            'message' => 'Time entry approved successfully',
            'time_entry' => $timeEntry->fresh()
        ]);
    }

    /**
     * Bulk approve time entries
     */
    public function bulkApprove(Request $request)
    {
        if (!auth()->user()->canApproveTime()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'time_entry_ids' => 'required|array',
            'time_entry_ids.*' => 'exists:time_entries,id'
        ]);

        $updated = TimeEntry::whereIn('id', $request->time_entry_ids)
            ->where('is_approved', false)
            ->update([
                'is_approved' => true,
                'approved_by' => auth()->id(),
                'approved_at' => now()
            ]);

        return response()->json([
            'message' => "{$updated} time entries approved successfully"
        ]);
    }

    /**
     * Get weekly timesheet
     */
    public function weeklyTimesheet(Request $request)
    {
        $weekStart = $request->week_start
            ? Carbon::parse($request->week_start)->startOfWeek()
            : now()->startOfWeek();

        $weekEnd = $weekStart->copy()->endOfWeek();

        $entries = TimeEntry::with(['project', 'task'])
            ->where('user_id', $request->user_id ?? auth()->id())
            ->whereBetween('started_at', [$weekStart, $weekEnd])
            ->get()
            ->groupBy(function ($entry) {
                return $entry->started_at->format('Y-m-d');
            });

        $totals = [
            'total_hours' => 0,
            'billable_hours' => 0,
            'non_billable_hours' => 0
        ];

        $dailyTotals = [];

        foreach ($entries as $date => $dayEntries) {
            $dayTotal = $dayEntries->sum('duration_seconds') / 3600;
            $dayBillable = $dayEntries->where('is_billable', true)->sum('duration_seconds') / 3600;

            $dailyTotals[$date] = [
                'total' => round($dayTotal, 2),
                'billable' => round($dayBillable, 2),
                'non_billable' => round($dayTotal - $dayBillable, 2),
                'entries' => $dayEntries
            ];

            $totals['total_hours'] += $dayTotal;
            $totals['billable_hours'] += $dayBillable;
        }

        $totals['non_billable_hours'] = $totals['total_hours'] - $totals['billable_hours'];

        return response()->json([
            'week_start' => $weekStart->format('Y-m-d'),
            'week_end' => $weekEnd->format('Y-m-d'),
            'daily_entries' => $dailyTotals,
            'totals' => [
                'total_hours' => round($totals['total_hours'], 2),
                'billable_hours' => round($totals['billable_hours'], 2),
                'non_billable_hours' => round($totals['non_billable_hours'], 2)
            ]
        ]);
    }

    /**
     * Get monthly timesheet
     */
    public function monthlyTimesheet(Request $request)
    {
        $month = $request->month
            ? Carbon::parse($request->month)
            : now();

        $monthStart = $month->copy()->startOfMonth();
        $monthEnd = $month->copy()->endOfMonth();

        $entries = TimeEntry::with(['project', 'task'])
            ->where('user_id', $request->user_id ?? auth()->id())
            ->whereBetween('started_at', [$monthStart, $monthEnd])
            ->get();

        $projectSummary = $entries->groupBy('project_id')->map(function ($projectEntries) {
            $project = $projectEntries->first()->project;
            $totalSeconds = $projectEntries->sum('duration_seconds');
            $billableSeconds = $projectEntries->where('is_billable', true)->sum('duration_seconds');

            return [
                'project' => $project,
                'total_hours' => round($totalSeconds / 3600, 2),
                'billable_hours' => round($billableSeconds / 3600, 2),
                'amount' => $projectEntries->where('is_billable', true)->sum(function ($entry) {
                    return ($entry->duration_seconds / 3600) * $entry->hourly_rate;
                })
            ];
        });

        return response()->json([
            'month' => $month->format('Y-m'),
            'total_hours' => round($entries->sum('duration_seconds') / 3600, 2),
            'billable_hours' => round($entries->where('is_billable', true)->sum('duration_seconds') / 3600, 2),
            'total_amount' => $entries->where('is_billable', true)->sum(function ($entry) {
                return ($entry->duration_seconds / 3600) * $entry->hourly_rate;
            }),
            'project_summary' => $projectSummary->values(),
            'entries_count' => $entries->count()
        ]);
    }

    /**
     * Submit timesheet for approval
     */
    public function submitTimesheet(Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'notes' => 'nullable|string|max:1000'
        ]);

        // Get all time entries in the period
        $entries = TimeEntry::where('user_id', auth()->id())
            ->whereBetween('started_at', [
                Carbon::parse($validated['start_date']),
                Carbon::parse($validated['end_date'])->endOfDay()
            ])
            ->get();

        if ($entries->isEmpty()) {
            return response()->json([
                'message' => 'No time entries found in this period'
            ], 422);
        }

        // Mark entries as submitted
        $entries->each(function ($entry) use ($validated) {
            $entry->update([
                'is_submitted' => true,
                'submitted_at' => now(),
                'submission_notes' => $validated['notes'] ?? null
            ]);
        });

        return response()->json([
            'message' => 'Timesheet submitted successfully',
            'entries_count' => $entries->count(),
            'total_hours' => round($entries->sum('duration_seconds') / 3600, 2)
        ]);
    }
}