<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TimeEntry;
use App\Models\Invoice;
use App\Models\Expense;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportController extends Controller
{
    /**
     * Get available reports list
     */
    public function index()
    {
        $reports = [
            [
                'id' => 'time_summary',
                'name' => 'Time Summary Report',
                'description' => 'Summary of time tracked by users, projects, and clients',
                'type' => 'time',
            ],
            [
                'id' => 'invoice_summary',
                'name' => 'Invoice Summary Report',
                'description' => 'Summary of invoices by status and period',
                'type' => 'financial',
            ],
            [
                'id' => 'expense_summary',
                'name' => 'Expense Summary Report',
                'description' => 'Summary of expenses by category and project',
                'type' => 'financial',
            ],
            [
                'id' => 'project_profitability',
                'name' => 'Project Profitability Report',
                'description' => 'Analysis of project revenue vs costs',
                'type' => 'analytics',
            ],
            [
                'id' => 'user_productivity',
                'name' => 'User Productivity Report',
                'description' => 'Time tracking and productivity metrics by user',
                'type' => 'productivity',
            ],
        ];

        return response()->json(['data' => $reports]);
    }

    /**
     * Generate a specific report
     */
    public function generate(Request $request)
    {
        $validated = $request->validate([
            'report_type' => 'required|in:time_summary,invoice_summary,expense_summary,project_profitability,user_productivity',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'project_id' => 'nullable|exists:projects,id',
            'user_id' => 'nullable|exists:users,id',
            'client_id' => 'nullable|exists:clients,id',
        ]);

        $tenantId = auth()->user()->tenant_id;

        switch ($validated['report_type']) {
            case 'time_summary':
                $data = $this->generateTimeSummary($validated, $tenantId);
                break;
            case 'invoice_summary':
                $data = $this->generateInvoiceSummary($validated, $tenantId);
                break;
            case 'expense_summary':
                $data = $this->generateExpenseSummary($validated, $tenantId);
                break;
            case 'project_profitability':
                $data = $this->generateProjectProfitability($validated, $tenantId);
                break;
            case 'user_productivity':
                $data = $this->generateUserProductivity($validated, $tenantId);
                break;
            default:
                return response()->json(['message' => 'Invalid report type'], 400);
        }

        return response()->json([
            'data' => $data,
            'metadata' => [
                'report_type' => $validated['report_type'],
                'period' => [
                    'start' => $validated['start_date'],
                    'end' => $validated['end_date'],
                ],
                'generated_at' => now(),
                'generated_by' => auth()->user()->name,
            ]
        ]);
    }

    /**
     * Download report as PDF or Excel
     */
    public function download(Request $request, $reportId)
    {
        // TODO: Implement PDF/Excel generation
        return response()->json(['message' => 'Report download will be available soon']);
    }

    /**
     * Export FEC (Fichier des Écritures Comptables) for French tax compliance
     */
    public function fecExport(Request $request)
    {
        $validated = $request->validate([
            'year' => 'required|integer|min:2000|max:' . date('Y'),
        ]);

        $tenantId = auth()->user()->tenant_id;
        $year = $validated['year'];

        // Get all financial transactions for the year
        $transactions = DB::table('invoices')
            ->where('tenant_id', $tenantId)
            ->whereYear('issue_date', $year)
            ->select([
                'invoice_number as JournalCode',
                'issue_date as EcritureDate',
                'invoice_number as EcritureNum',
                DB::raw("'Client' as CompteNum"),
                DB::raw("CONCAT('Facture ', invoice_number) as CompteLib"),
                'total_amount as Debit',
                DB::raw('0 as Credit'),
            ])
            ->get();

        // Format as FEC file (pipe-separated)
        $fecContent = $this->formatAsFEC($transactions);

        return response()->streamDownload(function () use ($fecContent) {
            echo $fecContent;
        }, "FEC_{$year}.txt", [
            'Content-Type' => 'text/plain',
            'Content-Disposition' => 'attachment',
        ]);
    }

    /**
     * Generate time summary report
     */
    private function generateTimeSummary($filters, $tenantId)
    {
        $query = TimeEntry::with(['user', 'project', 'task'])
            ->where('tenant_id', $tenantId)
            ->whereBetween('start_time', [$filters['start_date'], $filters['end_date']]);

        if (isset($filters['project_id'])) {
            $query->where('project_id', $filters['project_id']);
        }

        if (isset($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }

        $entries = $query->get();

        // Calculate totals
        $totalHours = $entries->sum('duration') / 3600; // Convert seconds to hours
        $billableHours = $entries->where('billable', true)->sum('duration') / 3600;

        // Group by user
        $byUser = $entries->groupBy('user_id')->map(function ($userEntries) {
            return [
                'user' => $userEntries->first()->user->name,
                'total_hours' => $userEntries->sum('duration') / 3600,
                'billable_hours' => $userEntries->where('billable', true)->sum('duration') / 3600,
            ];
        })->values();

        // Group by project
        $byProject = $entries->groupBy('project_id')->map(function ($projectEntries) {
            return [
                'project' => $projectEntries->first()->project->name ?? 'No Project',
                'total_hours' => $projectEntries->sum('duration') / 3600,
                'billable_hours' => $projectEntries->where('billable', true)->sum('duration') / 3600,
            ];
        })->values();

        return [
            'summary' => [
                'total_hours' => round($totalHours, 2),
                'billable_hours' => round($billableHours, 2),
                'non_billable_hours' => round($totalHours - $billableHours, 2),
                'billable_percentage' => $totalHours > 0 ? round(($billableHours / $totalHours) * 100, 2) : 0,
            ],
            'by_user' => $byUser,
            'by_project' => $byProject,
        ];
    }

    /**
     * Generate invoice summary report
     */
    private function generateInvoiceSummary($filters, $tenantId)
    {
        $query = Invoice::with('client')
            ->where('tenant_id', $tenantId)
            ->whereBetween('issue_date', [$filters['start_date'], $filters['end_date']]);

        if (isset($filters['client_id'])) {
            $query->where('client_id', $filters['client_id']);
        }

        $invoices = $query->get();

        // Calculate totals by status
        $byStatus = $invoices->groupBy('status')->map(function ($statusInvoices, $status) {
            return [
                'status' => $status,
                'count' => $statusInvoices->count(),
                'total_amount' => $statusInvoices->sum('total_amount'),
            ];
        })->values();

        return [
            'summary' => [
                'total_invoices' => $invoices->count(),
                'total_amount' => $invoices->sum('total_amount'),
                'paid_amount' => $invoices->where('status', 'paid')->sum('total_amount'),
                'pending_amount' => $invoices->whereIn('status', ['sent', 'overdue'])->sum('total_amount'),
            ],
            'by_status' => $byStatus,
        ];
    }

    /**
     * Generate expense summary report
     */
    private function generateExpenseSummary($filters, $tenantId)
    {
        $query = Expense::with(['user', 'project'])
            ->where('tenant_id', $tenantId)
            ->whereBetween('expense_date', [$filters['start_date'], $filters['end_date']]);

        if (isset($filters['project_id'])) {
            $query->where('project_id', $filters['project_id']);
        }

        $expenses = $query->get();

        // Group by category
        $byCategory = $expenses->groupBy('category')->map(function ($categoryExpenses, $category) {
            return [
                'category' => $category,
                'count' => $categoryExpenses->count(),
                'total_amount' => $categoryExpenses->sum('amount'),
            ];
        })->values();

        return [
            'summary' => [
                'total_expenses' => $expenses->count(),
                'total_amount' => $expenses->sum('amount'),
                'billable_amount' => $expenses->where('billable', true)->sum('amount'),
            ],
            'by_category' => $byCategory,
        ];
    }

    /**
     * Generate project profitability report
     */
    private function generateProjectProfitability($filters, $tenantId)
    {
        $query = Project::with(['timeEntries', 'expenses', 'invoices'])
            ->where('tenant_id', $tenantId);

        if (isset($filters['project_id'])) {
            $query->where('id', $filters['project_id']);
        }

        $projects = $query->get()->map(function ($project) use ($filters) {
            $timeEntries = $project->timeEntries()
                ->whereBetween('start_time', [$filters['start_date'], $filters['end_date']])
                ->get();

            $expenses = $project->expenses()
                ->whereBetween('expense_date', [$filters['start_date'], $filters['end_date']])
                ->get();

            $invoices = $project->invoices()
                ->whereBetween('issue_date', [$filters['start_date'], $filters['end_date']])
                ->where('status', 'paid')
                ->get();

            $revenue = $invoices->sum('total_amount');
            $costs = $expenses->sum('amount');
            $profit = $revenue - $costs;

            return [
                'project_name' => $project->name,
                'revenue' => $revenue,
                'costs' => $costs,
                'profit' => $profit,
                'profit_margin' => $revenue > 0 ? round(($profit / $revenue) * 100, 2) : 0,
                'hours_tracked' => $timeEntries->sum('duration') / 3600,
            ];
        });

        return [
            'projects' => $projects,
        ];
    }

    /**
     * Generate user productivity report
     */
    private function generateUserProductivity($filters, $tenantId)
    {
        $query = TimeEntry::with(['user', 'project', 'task'])
            ->where('tenant_id', $tenantId)
            ->whereBetween('start_time', [$filters['start_date'], $filters['end_date']]);

        if (isset($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }

        $entries = $query->get();

        $byUser = $entries->groupBy('user_id')->map(function ($userEntries) {
            $totalSeconds = $userEntries->sum('duration');
            $totalHours = $totalSeconds / 3600;
            $billableHours = $userEntries->where('billable', true)->sum('duration') / 3600;

            return [
                'user' => $userEntries->first()->user->name,
                'total_hours' => round($totalHours, 2),
                'billable_hours' => round($billableHours, 2),
                'billable_percentage' => $totalHours > 0 ? round(($billableHours / $totalHours) * 100, 2) : 0,
                'projects_count' => $userEntries->unique('project_id')->count(),
                'tasks_count' => $userEntries->unique('task_id')->count(),
            ];
        })->values();

        return [
            'users' => $byUser,
        ];
    }

    /**
     * Format transactions as FEC file
     */
    private function formatAsFEC($transactions)
    {
        $lines = [];

        // FEC Header
        $lines[] = "JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|CompteLib|CompAuxNum|CompAuxLib|PieceRef|PieceDate|EcritureLib|Debit|Credit|EcritureLet|DateLet|ValidDate|Montantdevise|Idevise";

        // FEC Data
        foreach ($transactions as $transaction) {
            $lines[] = implode('|', (array) $transaction);
        }

        return implode("\n", $lines);
    }
}

