<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Exports\ReportExport;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\CreditNote;
use App\Models\Project;
use App\Models\TimeEntry;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    private const REPORT_TYPES = [
        'time_summary',
        'invoice_summary',
        'expense_summary',
        'project_profitability',
        'user_productivity',
    ];

    private const FEC_HEADERS = [
        'JournalCode',
        'JournalLib',
        'EcritureNum',
        'EcritureDate',
        'CompteNum',
        'CompteLib',
        'CompAuxNum',
        'CompAuxLib',
        'PieceRef',
        'PieceDate',
        'EcritureLib',
        'Debit',
        'Credit',
        'EcritureLet',
        'DateLet',
        'ValidDate',
        'Montantdevise',
        'Idevise',
    ];

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
            'report_type' => ['required', Rule::in(self::REPORT_TYPES)],
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'project_id' => 'nullable|exists:projects,id',
            'user_id' => 'nullable|exists:users,id',
            'client_id' => 'nullable|exists:clients,id',
        ]);

        $tenantId = auth()->user()->tenant_id;

        $data = $this->resolveReportData($validated['report_type'], $validated, $tenantId);

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

    private function resolveReportData(string $reportType, array $filters, int $tenantId): array
    {
        return match ($reportType) {
            'time_summary' => $this->generateTimeSummary($filters, $tenantId),
            'invoice_summary' => $this->generateInvoiceSummary($filters, $tenantId),
            'expense_summary' => $this->generateExpenseSummary($filters, $tenantId),
            'project_profitability' => $this->generateProjectProfitability($filters, $tenantId),
            'user_productivity' => $this->generateUserProductivity($filters, $tenantId),
            default => throw new \InvalidArgumentException('Invalid report type provided'),
        };
    }

    /**
     * Download report as PDF or Excel
     */
    public function download(Request $request, $reportId)
    {
        if (!in_array($reportId, self::REPORT_TYPES, true)) {
            return response()->json([
                'message' => 'Unknown report type'
            ], 404);
        }

        $validated = $request->validate([
            'format' => ['required', Rule::in(['pdf', 'excel'])],
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'project_id' => 'nullable|exists:projects,id',
            'user_id' => 'nullable|exists:users,id',
            'client_id' => 'nullable|exists:clients,id',
        ]);

        $tenantId = auth()->user()->tenant_id;

        $filters = array_merge($validated, [
            'report_type' => $reportId,
        ]);

        $data = $this->resolveReportData($reportId, $filters, $tenantId);

        $metadata = [
            'report_type' => $reportId,
            'period' => [
                'start' => $validated['start_date'],
                'end' => $validated['end_date'],
            ],
            'generated_at' => now()->toIso8601String(),
            'generated_by' => auth()->user()->name,
        ];

        $rows = $this->formatReportForExport($reportId, $data, $metadata);

        if ($validated['format'] === 'pdf') {
            $pdf = Pdf::loadView('reports.export', [
                'reportType' => Str::headline(str_replace('_', ' ', $reportId)),
                'data' => $data,
                'rows' => $rows,
                'metadata' => $metadata,
            ])->setPaper('a4');

            return $pdf->download($this->buildReportFilename($reportId, 'pdf', $metadata));
        }

        return Excel::download(
            new ReportExport($rows, Str::headline(str_replace('_', ' ', $reportId))),
            $this->buildReportFilename($reportId, 'xlsx', $metadata)
        );
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

        $invoices = Invoice::with('client')
            ->where('tenant_id', $tenantId)
            ->whereYear('date', $year)
            ->get();

        $entries = [];

        foreach ($invoices as $invoice) {
            $amount = (float) ($invoice->total ?? $invoice->subtotal + $invoice->tax_amount);
            $issueDate = $invoice->date ?? $invoice->created_at ?? Carbon::now();
            $formattedDate = Carbon::parse($issueDate)->format('Ymd');
            $reference = $invoice->invoice_number;
            $client = $invoice->client;

            $clientAccount = '411' . str_pad((string) $invoice->client_id, 4, '0', STR_PAD_LEFT);
            $clientAux = $client?->siret ?? ('CLIENT-' . $invoice->client_id);
            $clientName = $client?->name ?? 'Client ' . $invoice->client_id;

            $entries[] = [
                'JournalCode' => 'VT',
                'JournalLib' => 'VENTES',
                'EcritureNum' => $reference . '-D',
                'EcritureDate' => $formattedDate,
                'CompteNum' => $clientAccount,
                'CompteLib' => $clientName,
                'CompAuxNum' => $clientAux,
                'CompAuxLib' => $clientName,
                'PieceRef' => $reference,
                'PieceDate' => $formattedDate,
                'EcritureLib' => 'Facture ' . $reference,
                'Debit' => number_format($amount, 2, '.', ''),
                'Credit' => '0.00',
                'EcritureLet' => '',
                'DateLet' => '',
                'ValidDate' => $formattedDate,
                'Montantdevise' => number_format($amount, 2, '.', ''),
                'Idevise' => $invoice->currency ?? 'EUR',
            ];

            $entries[] = [
                'JournalCode' => 'VT',
                'JournalLib' => 'VENTES',
                'EcritureNum' => $reference . '-C',
                'EcritureDate' => $formattedDate,
                'CompteNum' => '706000',
                'CompteLib' => 'VENTES DE SERVICES',
                'CompAuxNum' => '',
                'CompAuxLib' => '',
                'PieceRef' => $reference,
                'PieceDate' => $formattedDate,
                'EcritureLib' => 'Facture ' . $reference,
                'Debit' => '0.00',
                'Credit' => number_format($amount, 2, '.', ''),
                'EcritureLet' => '',
                'DateLet' => '',
                'ValidDate' => $formattedDate,
                'Montantdevise' => number_format($amount, 2, '.', ''),
                'Idevise' => $invoice->currency ?? 'EUR',
            ];
        }

        // Ajouter les avoirs (credit notes) au FEC
        $creditNotes = CreditNote::with(['client', 'invoice'])
            ->where('tenant_id', $tenantId)
            ->whereYear('credit_note_date', $year)
            ->whereIn('status', ['issued', 'applied'])
            ->get();

        foreach ($creditNotes as $creditNote) {
            $amount = (float) ($creditNote->total ?? 0);
            $issueDate = $creditNote->credit_note_date ?? $creditNote->created_at ?? Carbon::now();
            $formattedDate = Carbon::parse($issueDate)->format('Ymd');
            $reference = $creditNote->credit_note_number;
            $client = $creditNote->client;

            $clientAccount = '411' . str_pad((string) $creditNote->client_id, 4, '0', STR_PAD_LEFT);
            $clientAux = $client?->siret ?? ('CLIENT-' . $creditNote->client_id);
            $clientName = $client?->name ?? 'Client ' . $creditNote->client_id;

            // Pour un avoir, on inverse Débit/Crédit par rapport à une facture
            $entries[] = [
                'JournalCode' => 'VT',
                'JournalLib' => 'VENTES',
                'EcritureNum' => $reference . '-D',
                'EcritureDate' => $formattedDate,
                'CompteNum' => $clientAccount,
                'CompteLib' => $clientName,
                'CompAuxNum' => $clientAux,
                'CompAuxLib' => $clientName,
                'PieceRef' => $reference,
                'PieceDate' => $formattedDate,
                'EcritureLib' => 'Avoir ' . $reference,
                'Debit' => '0.00',
                'Credit' => number_format($amount, 2, '.', ''),
                'EcritureLet' => '',
                'DateLet' => '',
                'ValidDate' => $formattedDate,
                'Montantdevise' => number_format($amount, 2, '.', ''),
                'Idevise' => $creditNote->currency ?? 'EUR',
            ];

            $entries[] = [
                'JournalCode' => 'VT',
                'JournalLib' => 'VENTES',
                'EcritureNum' => $reference . '-C',
                'EcritureDate' => $formattedDate,
                'CompteNum' => '706000',
                'CompteLib' => 'VENTES DE SERVICES',
                'CompAuxNum' => '',
                'CompAuxLib' => '',
                'PieceRef' => $reference,
                'PieceDate' => $formattedDate,
                'EcritureLib' => 'Avoir ' . $reference,
                'Debit' => number_format($amount, 2, '.', ''),
                'Credit' => '0.00',
                'EcritureLet' => '',
                'DateLet' => '',
                'ValidDate' => $formattedDate,
                'Montantdevise' => number_format($amount, 2, '.', ''),
                'Idevise' => $creditNote->currency ?? 'EUR',
            ];
        }

        $fecContent = $this->formatAsFEC($entries);

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

        // Récupérer la méthode comptable du tenant
        $tenant = \App\Models\Tenant::find($tenantId);
        $accountingMethod = $tenant->accounting_method ?? 'cash';

        // Calculer le total des avoirs selon la méthode comptable
        $creditNotesQuery = CreditNote::where('tenant_id', $tenantId)
            ->whereIn('status', ['issued', 'applied'])
            ->whereBetween('credit_note_date', [$filters['start_date'], $filters['end_date']]);

        if ($accountingMethod === 'cash') {
            // Encaissement : avoirs uniquement sur factures payées
            $creditNotesQuery->whereHas('invoice', function ($q) {
                $q->where('status', 'paid');
            });
        }
        // En engagement : tous les avoirs (pas de filtre supplémentaire)

        if (isset($filters['client_id'])) {
            $creditNotesQuery->where('client_id', $filters['client_id']);
        }

        $totalCreditNotes = $creditNotesQuery->sum('total');

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
                'credit_notes_amount' => $totalCreditNotes,
                'net_revenue' => max(0, $invoices->where('status', 'paid')->sum('total_amount') - $totalCreditNotes),
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
        // Récupérer la méthode comptable du tenant
        $tenant = \App\Models\Tenant::find($tenantId);
        $accountingMethod = $tenant->accounting_method ?? 'cash';

        $query = Project::with(['timeEntries', 'expenses', 'invoices'])
            ->where('tenant_id', $tenantId);

        if (isset($filters['project_id'])) {
            $query->where('id', $filters['project_id']);
        }

        $projects = $query->get()->map(function ($project) use ($filters, $tenantId, $accountingMethod) {
            $timeEntries = $project->timeEntries()
                ->whereBetween('start_time', [$filters['start_date'], $filters['end_date']])
                ->get();

            $expenses = $project->expenses()
                ->whereBetween('expense_date', [$filters['start_date'], $filters['end_date']])
                ->get();

            // Récupérer les factures selon la méthode comptable
            $invoicesQuery = $project->invoices()
                ->whereBetween('issue_date', [$filters['start_date'], $filters['end_date']]);

            if ($accountingMethod === 'accrual') {
                // Comptabilité d'engagement : factures émises
                $invoicesQuery->whereIn('status', ['sent', 'viewed', 'overdue', 'paid']);
            } else {
                // Comptabilité de caisse : factures payées uniquement
                $invoicesQuery->where('status', 'paid');
            }

            $invoices = $invoicesQuery->get();

            // Calculer les avoirs liés aux factures de ce projet
            $invoiceIds = $invoices->pluck('id')->toArray();
            $creditNotesQuery = CreditNote::where('tenant_id', $tenantId)
                ->whereIn('status', ['issued', 'applied'])
                ->whereIn('invoice_id', $invoiceIds)
                ->whereBetween('credit_note_date', [$filters['start_date'], $filters['end_date']]);

            if ($accountingMethod === 'cash') {
                // Encaissement : avoirs uniquement sur factures payées
                $creditNotesQuery->whereHas('invoice', function ($q) {
                    $q->where('status', 'paid');
                });
            }
            // En engagement : tous les avoirs (pas de filtre supplémentaire)

            $creditNotes = $creditNotesQuery->sum('total');

            $revenue = max(0, $invoices->sum('total_amount') - $creditNotes);
            $costs = $expenses->sum('amount');
            $profit = $revenue - $costs;

            return [
                'project_name' => $project->name,
                'revenue' => $revenue,
                'costs' => $costs,
                'credit_notes' => $creditNotes,
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

    private function formatReportForExport(string $reportType, array $data, array $metadata): array
    {
        $rows = [];

        if (isset($metadata['period'])) {
            $this->pushRow($rows, 'Period', 'Start', $metadata['period']['start'] ?? '');
            $this->pushRow($rows, 'Period', 'End', $metadata['period']['end'] ?? '');
        }

        $this->pushRow($rows, 'Metadata', 'Generated By', $metadata['generated_by'] ?? 'system');
        $this->pushRow($rows, 'Metadata', 'Generated At', $metadata['generated_at'] ?? now());

        switch ($reportType) {
            case 'time_summary':
                foreach (($data['summary'] ?? []) as $key => $value) {
                    $this->pushRow($rows, 'Summary', Str::headline($key), $value);
                }

                foreach (collect($data['by_user'] ?? [])->toArray() as $row) {
                    $this->pushRow($rows, 'By User', $row['user'] ?? 'N/A', $row['total_hours'] ?? 0);
                }

                foreach (collect($data['by_project'] ?? [])->toArray() as $row) {
                    $this->pushRow($rows, 'By Project', $row['project'] ?? 'N/A', $row['total_hours'] ?? 0);
                }
                break;

            case 'invoice_summary':
                foreach (($data['summary'] ?? []) as $key => $value) {
                    $this->pushRow($rows, 'Summary', Str::headline($key), $value);
                }

                foreach (collect($data['by_status'] ?? [])->toArray() as $row) {
                    $label = ($row['status'] ?? 'status') . ' (amount)';
                    $this->pushRow($rows, 'By Status', $label, $row['total_amount'] ?? 0);
                }
                break;

            case 'expense_summary':
                foreach (($data['summary'] ?? []) as $key => $value) {
                    $this->pushRow($rows, 'Summary', Str::headline($key), $value);
                }

                foreach (collect($data['by_category'] ?? [])->toArray() as $row) {
                    $this->pushRow($rows, 'By Category', $row['category'] ?? 'N/A', $row['total_amount'] ?? 0);
                }
                break;

            case 'project_profitability':
                foreach (collect($data['projects'] ?? [])->toArray() as $row) {
                    $project = $row['project_name'] ?? 'Projet';
                    $this->pushRow($rows, 'Projects', $project . ' - Revenue', $row['revenue'] ?? 0);
                    $this->pushRow($rows, 'Projects', $project . ' - Costs', $row['costs'] ?? 0);
                    $this->pushRow($rows, 'Projects', $project . ' - Profit', $row['profit'] ?? 0);
                    $this->pushRow($rows, 'Projects', $project . ' - Profit Margin %', $row['profit_margin'] ?? 0);
                }
                break;

            case 'user_productivity':
                foreach (collect($data['users'] ?? [])->toArray() as $row) {
                    $this->pushRow($rows, 'Users', $row['user'] ?? 'N/A', $row['total_hours'] ?? 0);
                    $this->pushRow($rows, 'Users', ($row['user'] ?? 'N/A') . ' - Billable %', $row['billable_percentage'] ?? 0);
                }
                break;
        }

        return $rows;
    }

    private function pushRow(array &$rows, string $section, string $label, $value): void
    {
        $rows[] = [
            'Section' => $section,
            'Label' => $label,
            'Value' => $this->stringifyValue($value),
        ];
    }

    private function stringifyValue($value): string
    {
        if ($value === null) {
            return '';
        }

        if ($value instanceof Carbon) {
            return $value->toDateTimeString();
        }

        if (is_numeric($value)) {
            return number_format((float) $value, 2, '.', '');
        }

        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        return (string) $value;
    }

    private function buildReportFilename(string $reportType, string $extension, array $metadata): string
    {
        $slug = Str::slug($reportType, '_');
        $start = $metadata['period']['start'] ?? now()->format('Ymd');
        $end = $metadata['period']['end'] ?? now()->format('Ymd');

        return sprintf('%s_%s-%s.%s', $slug, $start, $end, $extension);
    }

    /**
     * Format transactions as FEC file
     */
    private function formatAsFEC(array $entries)
    {
        $lines = [implode('|', self::FEC_HEADERS)];

        foreach ($entries as $entry) {
            $ordered = [];
            foreach (self::FEC_HEADERS as $column) {
                $ordered[] = $entry[$column] ?? '';
            }

            $lines[] = implode('|', $ordered);
        }

        return implode("\n", $lines);
    }
}
