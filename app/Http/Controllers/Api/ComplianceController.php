<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Services\FrenchComplianceService;
use App\Services\FecExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ComplianceController extends Controller
{
    protected FrenchComplianceService $complianceService;

    public function __construct(FrenchComplianceService $complianceService)
    {
        $this->complianceService = $complianceService;
    }

    /**
     * Valider la conformité d'une facture
     */
    public function validateInvoice(Request $request, Invoice $invoice): JsonResponse
    {
        $this->authorize('view', $invoice);

        $result = $this->complianceService->validateInvoiceCompliance($invoice);

        return response()->json([
            'success' => true,
            'data' => $result
        ]);
    }

    /**
     * Vérifier la numérotation séquentielle d'un tenant
     */
    public function checkSequentialNumbering(Request $request): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        
        $result = $this->complianceService->validateSequentialNumbering($tenantId);

        return response()->json([
            'success' => true,
            'data' => $result
        ]);
    }

    /**
     * Générer un rapport d'intégrité annuel
     */
    public function generateIntegrityReport(Request $request): JsonResponse
    {
        $request->validate([
            'year' => 'required|integer|min:2020|max:2050'
        ]);

        $tenantId = auth()->user()->tenant_id;
        $year = $request->input('year');

        $report = $this->complianceService->generateIntegrityReport($tenantId, $year);

        return response()->json([
            'success' => true,
            'data' => $report
        ]);
    }

    /**
     * Générer un QR Code SEPA pour une facture
     */
    public function generateSepaQrCode(Request $request, Invoice $invoice): JsonResponse
    {
        $this->authorize('update', $invoice);

        $success = $this->complianceService->generateAndSaveSepaQrCode($invoice);

        if ($success) {
            return response()->json([
                'success' => true,
                'message' => 'QR Code SEPA généré avec succès',
                'data' => [
                    'qr_code' => $invoice->fresh()->qr_code_sepa
                ]
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Impossible de générer le QR Code. Vérifiez que l\'IBAN est renseigné.'
        ], 400);
    }

    /**
     * Obtenir les métriques de conformité globales
     */
    public function getMetrics(Request $request): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;

        $invoices = Invoice::where('tenant_id', $tenantId)->get();
        
        $totalInvoices = $invoices->count();
        $compliantCount = 0;
        $warningsCount = 0;
        $errorsCount = 0;
        $withQrCode = 0;
        $electronicReady = 0;

        foreach ($invoices as $invoice) {
            $validation = $this->complianceService->validateInvoiceCompliance($invoice);
            
            if ($validation['is_compliant']) {
                $compliantCount++;
            }
            
            $warningsCount += count($validation['warnings']);
            $errorsCount += count($validation['errors']);
            
            if ($invoice->qr_code_sepa) {
                $withQrCode++;
            }
            
            if (in_array($invoice->electronic_format, ['facturx', 'ubl', 'cii'])) {
                $electronicReady++;
            }
        }

        // Vérifier la numérotation
        $sequenceCheck = $this->complianceService->validateSequentialNumbering($tenantId);

        return response()->json([
            'success' => true,
            'data' => [
                'total_invoices' => $totalInvoices,
                'compliant_invoices' => $compliantCount,
                'compliance_rate' => $totalInvoices > 0 ? round(($compliantCount / $totalInvoices) * 100, 2) : 100,
                'pending_validation' => $totalInvoices - $compliantCount,
                'total_warnings' => $warningsCount,
                'total_errors' => $errorsCount,
                'with_qr_code' => $withQrCode,
                'qr_code_rate' => $totalInvoices > 0 ? round(($withQrCode / $totalInvoices) * 100, 2) : 0,
                'electronic_ready' => $electronicReady,
                'electronic_rate' => $totalInvoices > 0 ? round(($electronicReady / $totalInvoices) * 100, 2) : 0,
                'sequence_valid' => $sequenceCheck['valid'],
                'sequence_gaps' => $sequenceCheck['gaps_count'] ?? 0,
                'chorus_sent' => Invoice::where('tenant_id', $tenantId)
                    ->whereNotNull('chorus_sent_at')
                    ->count(),
            ]
        ]);
    }

    /**
     * Obtenir la liste des factures non conformes
     */
    public function getNonCompliantInvoices(Request $request): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        $invoices = Invoice::where('tenant_id', $tenantId)
            ->with('client')
            ->latest()
            ->get();

        $nonCompliant = [];

        foreach ($invoices as $invoice) {
            $validation = $this->complianceService->validateInvoiceCompliance($invoice);
            
            if (!$validation['is_compliant'] || count($validation['warnings']) > 0) {
                $nonCompliant[] = [
                    'id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'client_name' => $invoice->client->name ?? 'N/A',
                    'date' => $invoice->date->format('Y-m-d'),
                    'total' => $invoice->total,
                    'is_compliant' => $validation['is_compliant'],
                    'compliance_score' => $validation['compliance_score'],
                    'errors' => $validation['errors'],
                    'warnings' => $validation['warnings'],
                    'critical_issues' => $validation['critical_issues'],
                ];
            }
        }

        return response()->json([
            'success' => true,
            'data' => $nonCompliant
        ]);
    }

    /**
     * Export FEC (Fichier des Écritures Comptables) pour une période
     */
    public function exportFec(Request $request, FecExportService $fecService): Response
    {
        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'format' => 'in:txt,csv',
            'encoding' => 'in:utf8,cp1252'
        ]);

        $tenantId = auth()->user()->tenant_id;
        $tenant = auth()->user()->tenant;

        $content = $fecService->exportFecForPeriod(
            $tenantId,
            $validated['start_date'],
            $validated['end_date'],
            $validated['format'] ?? 'txt',
            $validated['encoding'] ?? 'utf8'
        );

        $siret = $tenant->legal_mention_siret ?? 'XXXXXXXXXX';
        $startDate = str_replace('-', '', $validated['start_date']);
        $endDate = str_replace('-', '', $validated['end_date']);
        $filename = "FEC_{$siret}_{$startDate}_{$endDate}.txt";

        return response($content)
            ->header('Content-Type', 'text/plain; charset=utf-8')
            ->header('Content-Disposition', "attachment; filename=\"{$filename}\"");
    }

    /**
     * Export audit trail pour une facture spécifique
     */
    public function exportInvoiceAuditTrail(Request $request, Invoice $invoice, FecExportService $fecService): Response
    {
        $this->authorize('view', $invoice);

        $validated = $request->validate([
            'format' => 'in:txt,csv',
            'encoding' => 'in:utf8,cp1252'
        ]);

        $content = $fecService->exportInvoiceAuditTrail(
            $invoice->id,
            $validated['format'] ?? 'txt',
            $validated['encoding'] ?? 'utf8'
        );

        $filename = "Audit_Trail_{$invoice->invoice_number}.txt";

        return response($content)
            ->header('Content-Type', 'text/plain; charset=utf-8')
            ->header('Content-Disposition', "attachment; filename=\"{$filename}\"");
    }

    /**
     * Export audit trail pour un lot de factures
     */
    public function exportBatchAuditTrail(Request $request, FecExportService $fecService): Response
    {
        $validated = $request->validate([
            'invoice_ids' => 'required|array',
            'invoice_ids.*' => 'exists:invoices,id',
            'format' => 'in:txt,csv',
            'encoding' => 'in:utf8,cp1252'
        ]);

        $content = $fecService->exportBatchAuditTrail(
            $validated['invoice_ids'],
            $validated['format'] ?? 'txt',
            $validated['encoding'] ?? 'utf8'
        );

        $filename = "Audit_Trail_Batch_" . date('Ymd_His') . ".txt";

        return response($content)
            ->header('Content-Type', 'text/plain; charset=utf-8')
            ->header('Content-Disposition', "attachment; filename=\"{$filename}\"");
    }
}
