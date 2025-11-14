<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TimeEntry;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\Task;
use App\Models\Payment;
use App\Models\CreditNote;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Get dashboard overview (combines stats, activity, and charts)
     */
    public function index(Request $request)
    {
        return response()->json([
            'stats' => $this->stats($request)->getData(),
            'recent_activity' => $this->activity($request)->getData(),
            'charts' => $this->charts($request)->getData()
        ]);
    }

    /**
     * Get dashboard statistics
     */
    public function stats(Request $request)
    {
        $user = auth()->user();
        $tenantId = $user->tenant_id;

        $now = Carbon::now();
        $startOfToday = $now->copy()->startOfDay();
        $endOfToday = $now->copy()->endOfDay();
        $startOfWeek = $now->copy()->startOfWeek();
        $endOfWeek = $now->copy()->endOfWeek();
        $startOfMonth = $now->copy()->startOfMonth();
        $endOfMonth = $now->copy()->endOfMonth();
        $startOfLastWeek = $now->copy()->subWeek()->startOfWeek();
        $endOfLastWeek = $now->copy()->subWeek()->endOfWeek();
        $startOfLastMonth = $now->copy()->subMonth()->startOfMonth();
        $endOfLastMonth = $now->copy()->subMonth()->endOfMonth();

        // Today's stats
        $todayEntries = TimeEntry::where('tenant_id', $tenantId)
            ->whereBetween('started_at', [$startOfToday, $endOfToday])
            ->get();

        $todayStats = [
            'hours' => $todayEntries->sum('duration_seconds') / 3600,
            'earnings' => $todayEntries->where('is_billable', true)->sum(function ($entry) {
                return ($entry->duration_seconds / 3600) * $entry->hourly_rate;
            }),
            'entries' => $todayEntries->count(),
        ];

        // This week's stats
        $weekEntries = TimeEntry::where('tenant_id', $tenantId)
            ->whereBetween('started_at', [$startOfWeek, $endOfWeek])
            ->get();

        $lastWeekEntries = TimeEntry::where('tenant_id', $tenantId)
            ->whereBetween('started_at', [$startOfLastWeek, $endOfLastWeek])
            ->get();

        $weekHours = $weekEntries->sum('duration_seconds') / 3600;
        $lastWeekHours = $lastWeekEntries->sum('duration_seconds') / 3600;

        $weekStats = [
            'hours' => $weekHours,
            'earnings' => $weekEntries->where('is_billable', true)->sum(function ($entry) {
                return ($entry->duration_seconds / 3600) * $entry->hourly_rate;
            }),
            'entries' => $weekEntries->count(),
            'trend' => $lastWeekHours > 0 ? (($weekHours - $lastWeekHours) / $lastWeekHours) * 100 : 0,
        ];

        // This month's stats
        $monthEntries = TimeEntry::where('tenant_id', $tenantId)
            ->whereBetween('started_at', [$startOfMonth, $endOfMonth])
            ->get();

        $lastMonthEntries = TimeEntry::where('tenant_id', $tenantId)
            ->whereBetween('started_at', [$startOfLastMonth, $endOfLastMonth])
            ->get();

        $monthHours = $monthEntries->sum('duration_seconds') / 3600;
        $lastMonthHours = $lastMonthEntries->sum('duration_seconds') / 3600;

        $monthStats = [
            'hours' => $monthHours,
            'earnings' => $monthEntries->where('is_billable', true)->sum(function ($entry) {
                return ($entry->duration_seconds / 3600) * $entry->hourly_rate;
            }),
            'entries' => $monthEntries->count(),
            'trend' => $lastMonthHours > 0 ? (($monthHours - $lastMonthHours) / $lastMonthHours) * 100 : 0,
        ];

        // Project stats
        $projectStats = [
            'active' => Project::where('tenant_id', $tenantId)
                ->where('status', 'active')
                ->count(),
            'completed' => Project::where('tenant_id', $tenantId)
                ->where('status', 'completed')
                ->count(),
            'on_hold' => Project::where('tenant_id', $tenantId)
                ->where('status', 'on_hold')
                ->count(),
        ];

        // Invoice stats
        $pendingInvoices = Invoice::where('tenant_id', $tenantId)
            ->whereIn('status', ['pending', 'sent'])
            ->get();

        $overdueInvoices = Invoice::where('tenant_id', $tenantId)
            ->where('status', 'overdue')
            ->orWhere(function ($query) {
                $query->whereIn('status', ['pending', 'sent'])
                    ->where('due_date', '<', Carbon::now());
            })
            ->get();

        $paidThisMonth = Invoice::where('tenant_id', $tenantId)
            ->where('status', 'paid')
            ->whereBetween('payment_date', [$startOfMonth, $endOfMonth])
            ->get();

        $invoiceStats = [
            'pending' => $pendingInvoices->count(),
            'pending_amount' => $pendingInvoices->sum('total'),
            'overdue' => $overdueInvoices->count(),
            'overdue_amount' => $overdueInvoices->sum('total'),
            'paid_this_month' => $paidThisMonth->count(),
            'paid_amount' => $paidThisMonth->sum('total'),
        ];

        // Task stats
        $taskStats = [
            'todo' => Task::whereHas('project', function ($query) use ($tenantId) {
                    $query->where('tenant_id', $tenantId);
                })
                ->where('status', 'todo')
                ->count(),
            'in_progress' => Task::whereHas('project', function ($query) use ($tenantId) {
                    $query->where('tenant_id', $tenantId);
                })
                ->where('status', 'in_progress')
                ->count(),
            'completed' => Task::whereHas('project', function ($query) use ($tenantId) {
                    $query->where('tenant_id', $tenantId);
                })
                ->where('status', 'done')
                ->whereBetween('completed_at', [$startOfMonth, $endOfMonth])
                ->count(),
            'overdue' => Task::whereHas('project', function ($query) use ($tenantId) {
                    $query->where('tenant_id', $tenantId);
                })
                ->whereIn('status', ['todo', 'in_progress'])
                ->where('due_date', '<', Carbon::now())
                ->count(),
        ];

        return response()->json([
            'today' => $todayStats,
            'week' => $weekStats,
            'month' => $monthStats,
            'projects' => $projectStats,
            'invoices' => $invoiceStats,
            'tasks' => $taskStats,
        ]);
    }

    /**
     * Get recent activity
     */
    public function activity(Request $request)
    {
        $user = auth()->user();
        $tenantId = $user->tenant_id;
        $limit = $request->get('limit', 20);

        $activities = [];

        // Recent time entries
        $recentTimeEntries = TimeEntry::where('tenant_id', $tenantId)
            ->with(['project', 'task'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        foreach ($recentTimeEntries as $entry) {
            $activities[] = [
                'id' => 'time_' . $entry->id,
                'type' => 'time_entry',
                'description' => sprintf(
                    'Time entry added for %s%s',
                    $entry->project->name,
                    $entry->task ? ' - ' . $entry->task->title : ''
                ),
                'created_at' => $entry->created_at->toIso8601String(),
                'metadata' => [
                    'duration' => $entry->duration_seconds,
                    'project_id' => $entry->project_id,
                ],
            ];
        }

        // Recent invoices
        $recentInvoices = Invoice::where('tenant_id', $tenantId)
            ->with('client')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        foreach ($recentInvoices as $invoice) {
            $activities[] = [
                'id' => 'invoice_' . $invoice->id,
                'type' => 'invoice',
                'description' => sprintf(
                    'Invoice %s created for %s',
                    $invoice->invoice_number,
                    $invoice->client->name
                ),
                'created_at' => $invoice->created_at->toIso8601String(),
                'metadata' => [
                    'amount' => $invoice->total,
                    'client_id' => $invoice->client_id,
                ],
            ];
        }

        // Recent projects
        $recentProjects = Project::where('tenant_id', $tenantId)
            ->with('client')
            ->orderBy('created_at', 'desc')
            ->limit(3)
            ->get();

        foreach ($recentProjects as $project) {
            $activities[] = [
                'id' => 'project_' . $project->id,
                'type' => 'project',
                'description' => sprintf(
                    'Project "%s" created for %s',
                    $project->name,
                    $project->client->name
                ),
                'created_at' => $project->created_at->toIso8601String(),
                'metadata' => [
                    'status' => $project->status,
                    'client_id' => $project->client_id,
                ],
            ];
        }

        // Recent payments
        $recentPayments = Payment::whereHas('invoice', function ($query) use ($tenantId) {
            $query->where('tenant_id', $tenantId);
        })
            ->with(['invoice', 'client'])
            ->orderBy('created_at', 'desc')
            ->limit(3)
            ->get();

        foreach ($recentPayments as $payment) {
            $activities[] = [
                'id' => 'payment_' . $payment->id,
                'type' => 'payment',
                'description' => sprintf(
                    'Payment received for invoice %s from %s',
                    $payment->invoice->invoice_number,
                    $payment->client->name
                ),
                'created_at' => $payment->created_at->toIso8601String(),
                'metadata' => [
                    'amount' => $payment->amount,
                    'invoice_id' => $payment->invoice_id,
                ],
            ];
        }

        // Sort by created_at and limit
        usort($activities, function ($a, $b) {
            return strcmp($b['created_at'], $a['created_at']);
        });

        return response()->json(array_slice($activities, 0, $limit));
    }

    /**
     * Get chart data for dashboard
     */
    public function charts(Request $request)
    {
        $user = auth()->user();
        $tenantId = $user->tenant_id;
        $range = $request->get('range', 'week');

        $now = Carbon::now();

        if ($range === 'week') {
            $startDate = $now->copy()->subDays(6)->startOfDay();
            $endDate = $now->copy()->endOfDay();
            $days = 7;
        } else {
            $startDate = $now->copy()->subDays(29)->startOfDay();
            $endDate = $now->copy()->endOfDay();
            $days = 30;
        }

        // Daily hours chart
        $dailyHours = [];
        for ($i = 0; $i < $days; $i++) {
            $date = $startDate->copy()->addDays($i);
            $dayStart = $date->copy()->startOfDay();
            $dayEnd = $date->copy()->endOfDay();

            $entries = TimeEntry::where('tenant_id', $tenantId)
                ->whereBetween('started_at', [$dayStart, $dayEnd])
                ->get();

            $hours = $entries->sum('duration_seconds') / 3600;
            $amount = $entries->where('is_billable', true)->sum(function ($entry) {
                return ($entry->duration_seconds / 3600) * $entry->hourly_rate;
            });

            $dailyHours[] = [
                'date' => $date->format('Y-m-d'),
                'hours' => round($hours, 2),
                'amount' => round($amount, 2),
            ];
        }

        // Project distribution
        $projects = DB::table('time_entries')
            ->select(
                'projects.name',
                DB::raw('SUM(time_entries.duration_seconds) as total_seconds'),
                DB::raw('SUM((time_entries.duration_seconds / 3600.0) * time_entries.hourly_rate) as total_amount')
            )
            ->join('projects', 'time_entries.project_id', '=', 'projects.id')
            ->where('time_entries.tenant_id', $tenantId)
            ->whereBetween('time_entries.started_at', [$startDate, $endDate])
            ->groupBy('projects.id', 'projects.name')
            ->orderByDesc('total_amount')
            ->limit(5)
            ->get();

        $projectDistribution = $projects->map(function ($project) {
            return [
                'name' => $project->name,
                'value' => round($project->total_amount, 2),
                'hours' => round($project->total_seconds / 3600, 2),
            ];
        })->toArray();

        // Monthly revenue (last 6 months)
        // Récupérer la méthode comptable du tenant
        $tenant = \App\Models\Tenant::find($tenantId);
        $accountingMethod = $tenant->accounting_method ?? 'cash';

        $monthlyRevenue = [];
        for ($i = 5; $i >= 0; $i--) {
            $monthStart = $now->copy()->subMonths($i)->startOfMonth();
            $monthEnd = $now->copy()->subMonths($i)->endOfMonth();

            if ($accountingMethod === 'accrual') {
                // Comptabilité d'engagement : factures émises (envoyées)
                $invoiced = Invoice::where('tenant_id', $tenantId)
                    ->whereIn('status', ['sent', 'viewed', 'overdue', 'paid'])
                    ->whereBetween('date', [$monthStart, $monthEnd])
                    ->sum('total');

                // Soustraire tous les avoirs émis ou appliqués
                $invoicedCreditNotes = CreditNote::where('tenant_id', $tenantId)
                    ->whereIn('status', ['issued', 'applied'])
                    ->whereBetween('credit_note_date', [$monthStart, $monthEnd])
                    ->sum('total');

                $paid = Invoice::where('tenant_id', $tenantId)
                    ->where('status', 'paid')
                    ->whereBetween('payment_date', [$monthStart, $monthEnd])
                    ->sum('total');

                // Avoirs sur factures payées
                $paidCreditNotes = CreditNote::where('tenant_id', $tenantId)
                    ->whereIn('status', ['issued', 'applied'])
                    ->whereBetween('credit_note_date', [$monthStart, $monthEnd])
                    ->whereHas('invoice', function ($query) use ($tenantId) {
                        $query->where('tenant_id', $tenantId)
                            ->where('status', 'paid');
                    })
                    ->sum('total');

                $monthlyRevenue[] = [
                    'month' => $monthStart->format('M Y'),
                    'invoiced' => round(max(0, $invoiced - $invoicedCreditNotes), 2),
                    'paid' => round(max(0, $paid - $paidCreditNotes), 2),
                ];
            } else {
                // Comptabilité de caisse : UNIQUEMENT les encaissements effectifs
                // En mode caisse, on ne reconnaît le CA qu'à l'encaissement

                // Factures effectivement payées dans le mois
                $paid = Invoice::where('tenant_id', $tenantId)
                    ->where('status', 'paid')
                    ->whereBetween('payment_date', [$monthStart, $monthEnd])
                    ->sum('total');

                // Soustraire UNIQUEMENT les avoirs appliqués/remboursés dans le mois
                // sur des factures effectivement payées
                $paidCreditNotes = CreditNote::where('tenant_id', $tenantId)
                    ->where('status', 'applied')
                    ->whereNotNull('applied_date')
                    ->whereBetween('applied_date', [$monthStart, $monthEnd])
                    ->whereHas('invoice', function ($query) use ($tenantId) {
                        $query->where('tenant_id', $tenantId)
                            ->where('status', 'paid');
                    })
                    ->sum('total');

                // En mode caisse : "invoiced" = encaissements bruts (avant avoirs)
                // "paid" = encaissements nets (après avoirs)
                $monthlyRevenue[] = [
                    'month' => $monthStart->format('M Y'),
                    'invoiced' => round($paid, 2), // Encaissements bruts
                    'paid' => round(max(0, $paid - $paidCreditNotes), 2), // Encaissements nets
                ];
            }
        }

        return response()->json([
            'daily_hours' => $dailyHours,
            'project_distribution' => $projectDistribution,
            'monthly_revenue' => $monthlyRevenue,
        ]);
    }

    /**
     * Get user's dashboard widgets configuration
     */
    public function widgets(Request $request)
    {
        $user = auth()->user();

        // Get user preferences for dashboard widgets
        $preferences = $user->preferences ?? [];
        $widgets = $preferences['dashboard_widgets'] ?? [
            'stats' => true,
            'recent_activity' => true,
            'time_tracker' => true,
            'upcoming_invoices' => true,
            'project_overview' => true,
            'revenue_chart' => true
        ];

        return response()->json([
            'widgets' => $widgets,
            'layout' => $preferences['dashboard_layout'] ?? 'grid'
        ]);
    }

    /**
     * Save user's dashboard widget configuration
     */
    public function saveWidget(Request $request)
    {
        $validated = $request->validate([
            'widgets' => 'required|array',
            'widgets.*' => 'boolean',
            'layout' => 'nullable|in:grid,list,compact'
        ]);

        $user = auth()->user();
        $preferences = $user->preferences ?? [];

        $preferences['dashboard_widgets'] = $validated['widgets'];
        if (isset($validated['layout'])) {
            $preferences['dashboard_layout'] = $validated['layout'];
        }

        $user->update(['preferences' => $preferences]);

        return response()->json([
            'message' => 'Dashboard widgets updated successfully',
            'widgets' => $preferences['dashboard_widgets'],
            'layout' => $preferences['dashboard_layout'] ?? 'grid'
        ]);
    }
}