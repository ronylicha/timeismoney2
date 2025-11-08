<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Expense;
use App\Models\TimeEntry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use ZipArchive;

class ExportController extends Controller
{
    /**
     * Generate FEC (Fichier des Écritures Comptables) export for French accounting
     * Required format for French tax administration
     */
    public function fec(Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'format' => 'in:txt,xml'
        ]);

        $tenantId = auth()->user()->tenant_id;
        $tenant = auth()->user()->tenant;

        $startDate = Carbon::parse($validated['start_date'])->startOfDay();
        $endDate = Carbon::parse($validated['end_date'])->endOfDay();
        $format = $validated['format'] ?? 'txt';

        // FEC requires these fields in this exact order
        $fecData = [];

        // Get all invoices in the period
        $invoices = Invoice::where('tenant_id', $tenantId)
            ->whereBetween('date', [$startDate, $endDate])
            ->with(['client', 'items', 'payments'])
            ->get();

        foreach ($invoices as $invoice) {
            // Invoice line (Debit - Client account)
            $fecData[] = [
                'JournalCode' => 'VTE', // Ventes
                'JournalLib' => 'Journal des ventes',
                'EcritureNum' => $invoice->sequential_number,
                'EcritureDate' => $invoice->date->format('Ymd'),
                'CompteNum' => '411' . str_pad($invoice->client_id, 5, '0', STR_PAD_LEFT), // Client account
                'CompteLib' => 'Client - ' . $invoice->client->name,
                'CompAuxNum' => $invoice->client->siret ?? '',
                'CompAuxLib' => $invoice->client->name,
                'PieceRef' => $invoice->invoice_number,
                'PieceDate' => $invoice->date->format('Ymd'),
                'EcritureLib' => 'Facture ' . $invoice->invoice_number . ' - ' . $invoice->client->name,
                'Debit' => number_format($invoice->total, 2, '.', ''),
                'Credit' => '0.00',
                'EcritureLet' => '',
                'DateLet' => '',
                'ValidDate' => $invoice->created_at->format('Ymd'),
                'Montantdevise' => '',
                'Idevise' => '',
                'DateRglt' => $invoice->payment_date ? Carbon::parse($invoice->payment_date)->format('Ymd') : '',
                'ModeRglt' => $invoice->status === 'paid' ? 'VIR' : '',
                'NatOp' => '',
                'IdClient' => $invoice->client_id
            ];

            // Sales line (Credit - Revenue account)
            $fecData[] = [
                'JournalCode' => 'VTE',
                'JournalLib' => 'Journal des ventes',
                'EcritureNum' => $invoice->sequential_number,
                'EcritureDate' => $invoice->date->format('Ymd'),
                'CompteNum' => '706000', // Services revenue
                'CompteLib' => 'Prestations de services',
                'CompAuxNum' => '',
                'CompAuxLib' => '',
                'PieceRef' => $invoice->invoice_number,
                'PieceDate' => $invoice->date->format('Ymd'),
                'EcritureLib' => 'Facture ' . $invoice->invoice_number . ' - Prestations',
                'Debit' => '0.00',
                'Credit' => number_format($invoice->subtotal, 2, '.', ''),
                'EcritureLet' => '',
                'DateLet' => '',
                'ValidDate' => $invoice->created_at->format('Ymd'),
                'Montantdevise' => '',
                'Idevise' => '',
                'DateRglt' => '',
                'ModeRglt' => '',
                'NatOp' => '',
                'IdClient' => ''
            ];

            // VAT line if applicable
            if ($invoice->tax_amount > 0) {
                $fecData[] = [
                    'JournalCode' => 'VTE',
                    'JournalLib' => 'Journal des ventes',
                    'EcritureNum' => $invoice->sequential_number,
                    'EcritureDate' => $invoice->date->format('Ymd'),
                    'CompteNum' => '445710', // TVA collectée
                    'CompteLib' => 'TVA collectée',
                    'CompAuxNum' => '',
                    'CompAuxLib' => '',
                    'PieceRef' => $invoice->invoice_number,
                    'PieceDate' => $invoice->date->format('Ymd'),
                    'EcritureLib' => 'Facture ' . $invoice->invoice_number . ' - TVA',
                    'Debit' => '0.00',
                    'Credit' => number_format($invoice->tax_amount, 2, '.', ''),
                    'EcritureLet' => '',
                    'DateLet' => '',
                    'ValidDate' => $invoice->created_at->format('Ymd'),
                    'Montantdevise' => '',
                    'Idevise' => '',
                    'DateRglt' => '',
                    'ModeRglt' => '',
                    'NatOp' => '',
                    'IdClient' => ''
                ];
            }
        }

        // Get all payments in the period
        $payments = Payment::whereHas('invoice', function ($query) use ($tenantId) {
                $query->where('tenant_id', $tenantId);
            })
            ->whereBetween('payment_date', [$startDate, $endDate])
            ->with(['invoice', 'client'])
            ->get();

        foreach ($payments as $payment) {
            // Bank line (Debit)
            $fecData[] = [
                'JournalCode' => 'BQ',
                'JournalLib' => 'Journal de banque',
                'EcritureNum' => 'P' . $payment->id,
                'EcritureDate' => $payment->payment_date->format('Ymd'),
                'CompteNum' => '512000', // Bank account
                'CompteLib' => 'Banque',
                'CompAuxNum' => '',
                'CompAuxLib' => '',
                'PieceRef' => $payment->reference ?? 'PAY-' . $payment->id,
                'PieceDate' => $payment->payment_date->format('Ymd'),
                'EcritureLib' => 'Paiement facture ' . $payment->invoice->invoice_number,
                'Debit' => number_format($payment->amount, 2, '.', ''),
                'Credit' => '0.00',
                'EcritureLet' => 'A' . $payment->invoice_id,
                'DateLet' => $payment->payment_date->format('Ymd'),
                'ValidDate' => $payment->created_at->format('Ymd'),
                'Montantdevise' => '',
                'Idevise' => '',
                'DateRglt' => $payment->payment_date->format('Ymd'),
                'ModeRglt' => $payment->payment_method,
                'NatOp' => '',
                'IdClient' => ''
            ];

            // Client account (Credit)
            $fecData[] = [
                'JournalCode' => 'BQ',
                'JournalLib' => 'Journal de banque',
                'EcritureNum' => 'P' . $payment->id,
                'EcritureDate' => $payment->payment_date->format('Ymd'),
                'CompteNum' => '411' . str_pad($payment->client_id, 5, '0', STR_PAD_LEFT),
                'CompteLib' => 'Client - ' . $payment->client->name,
                'CompAuxNum' => $payment->client->siret ?? '',
                'CompAuxLib' => $payment->client->name,
                'PieceRef' => $payment->reference ?? 'PAY-' . $payment->id,
                'PieceDate' => $payment->payment_date->format('Ymd'),
                'EcritureLib' => 'Paiement facture ' . $payment->invoice->invoice_number,
                'Debit' => '0.00',
                'Credit' => number_format($payment->amount, 2, '.', ''),
                'EcritureLet' => 'A' . $payment->invoice_id,
                'DateLet' => $payment->payment_date->format('Ymd'),
                'ValidDate' => $payment->created_at->format('Ymd'),
                'Montantdevise' => '',
                'Idevise' => '',
                'DateRglt' => '',
                'ModeRglt' => '',
                'NatOp' => '',
                'IdClient' => $payment->client_id
            ];
        }

        // Get all expenses in the period
        $expenses = Expense::where('tenant_id', $tenantId)
            ->whereBetween('expense_date', [$startDate, $endDate])
            ->with(['category', 'user'])
            ->get();

        foreach ($expenses as $expense) {
            // Expense account (Debit)
            $accountCode = $expense->category ? ('6' . str_pad($expense->category->code ?? '0', 5, '0', STR_PAD_LEFT)) : '606000';

            $fecData[] = [
                'JournalCode' => 'ACH',
                'JournalLib' => 'Journal des achats',
                'EcritureNum' => 'EXP' . $expense->id,
                'EcritureDate' => $expense->expense_date->format('Ymd'),
                'CompteNum' => $accountCode,
                'CompteLib' => $expense->category ? $expense->category->name : 'Achats non stockés',
                'CompAuxNum' => '',
                'CompAuxLib' => '',
                'PieceRef' => 'EXP-' . $expense->id,
                'PieceDate' => $expense->expense_date->format('Ymd'),
                'EcritureLib' => $expense->description,
                'Debit' => number_format($expense->amount, 2, '.', ''),
                'Credit' => '0.00',
                'EcritureLet' => '',
                'DateLet' => '',
                'ValidDate' => $expense->created_at->format('Ymd'),
                'Montantdevise' => '',
                'Idevise' => '',
                'DateRglt' => '',
                'ModeRglt' => '',
                'NatOp' => '',
                'IdClient' => ''
            ];

            // Supplier or bank account (Credit)
            $fecData[] = [
                'JournalCode' => 'ACH',
                'JournalLib' => 'Journal des achats',
                'EcritureNum' => 'EXP' . $expense->id,
                'EcritureDate' => $expense->expense_date->format('Ymd'),
                'CompteNum' => $expense->is_reimbursable ? '467000' : '512000', // Employee debt or Bank
                'CompteLib' => $expense->is_reimbursable ? 'Autres comptes débiteurs' : 'Banque',
                'CompAuxNum' => '',
                'CompAuxLib' => '',
                'PieceRef' => 'EXP-' . $expense->id,
                'PieceDate' => $expense->expense_date->format('Ymd'),
                'EcritureLib' => $expense->description,
                'Debit' => '0.00',
                'Credit' => number_format($expense->amount, 2, '.', ''),
                'EcritureLet' => '',
                'DateLet' => '',
                'ValidDate' => $expense->created_at->format('Ymd'),
                'Montantdevise' => '',
                'Idevise' => '',
                'DateRglt' => '',
                'ModeRglt' => '',
                'NatOp' => '',
                'IdClient' => ''
            ];
        }

        // Sort by date and entry number
        usort($fecData, function ($a, $b) {
            $dateComparison = strcmp($a['EcritureDate'], $b['EcritureDate']);
            if ($dateComparison === 0) {
                return strcmp($a['EcritureNum'], $b['EcritureNum']);
            }
            return $dateComparison;
        });

        if ($format === 'xml') {
            return $this->generateFECXML($fecData, $tenant, $startDate, $endDate);
        } else {
            return $this->generateFECTXT($fecData, $tenant, $startDate, $endDate);
        }
    }

    /**
     * Generate FEC in TXT format (pipe-delimited)
     */
    private function generateFECTXT($fecData, $tenant, $startDate, $endDate)
    {
        $headers = [
            'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate',
            'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib',
            'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit',
            'EcritureLet', 'DateLet', 'ValidDate', 'Montantdevise',
            'Idevise', 'DateRglt', 'ModeRglt', 'NatOp', 'IdClient'
        ];

        $content = implode('|', $headers) . "\r\n";

        foreach ($fecData as $row) {
            $line = [];
            foreach ($headers as $header) {
                $line[] = $row[$header] ?? '';
            }
            $content .= implode('|', $line) . "\r\n";
        }

        $filename = sprintf(
            '%sFEC%s%s.txt',
            $tenant->settings['company_info']['siret'] ?? 'SIRET',
            $startDate->format('Ymd'),
            $endDate->format('Ymd')
        );

        return response($content, 200)
            ->header('Content-Type', 'text/plain; charset=UTF-8')
            ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
    }

    /**
     * Generate FEC in XML format
     */
    private function generateFECXML($fecData, $tenant, $startDate, $endDate)
    {
        $xml = new \SimpleXMLElement('<?xml version="1.0" encoding="UTF-8"?><FEC></FEC>');

        // Add header information
        $header = $xml->addChild('EnTete');
        $header->addChild('Siret', $tenant->settings['company_info']['siret'] ?? '');
        $header->addChild('DateCloture', $endDate->format('Y-m-d'));
        $header->addChild('DateDebut', $startDate->format('Y-m-d'));
        $header->addChild('DateFin', $endDate->format('Y-m-d'));

        // Add entries
        $ecritures = $xml->addChild('Ecritures');
        foreach ($fecData as $row) {
            $ecriture = $ecritures->addChild('Ecriture');
            foreach ($row as $key => $value) {
                $ecriture->addChild($key, htmlspecialchars($value));
            }
        }

        $filename = sprintf(
            '%sFEC%s%s.xml',
            $tenant->settings['company_info']['siret'] ?? 'SIRET',
            $startDate->format('Ymd'),
            $endDate->format('Ymd')
        );

        return response($xml->asXML(), 200)
            ->header('Content-Type', 'application/xml; charset=UTF-8')
            ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
    }

    /**
     * Export invoices
     */
    public function invoices(Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'status' => 'nullable|string',
            'client_id' => 'nullable|exists:clients,id',
            'format' => 'required|in:csv,excel,pdf'
        ]);

        $query = Invoice::where('tenant_id', auth()->user()->tenant_id)
            ->with(['client', 'items'])
            ->whereBetween('date', [
                $validated['start_date'],
                $validated['end_date']
            ]);

        if ($validated['status']) {
            $query->where('status', $validated['status']);
        }

        if ($validated['client_id']) {
            $query->where('client_id', $validated['client_id']);
        }

        $invoices = $query->get();

        switch ($validated['format']) {
            case 'csv':
                return $this->exportInvoicesCSV($invoices);
            case 'excel':
                return $this->exportInvoicesExcel($invoices);
            case 'pdf':
                return $this->exportInvoicesPDF($invoices);
        }
    }

    /**
     * Export invoices as CSV
     */
    private function exportInvoicesCSV($invoices)
    {
        $headers = [
            'Invoice Number', 'Date', 'Due Date', 'Client', 'Status',
            'Subtotal', 'Tax', 'Total', 'Paid Amount', 'Balance'
        ];

        $callback = function() use ($invoices, $headers) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $headers);

            foreach ($invoices as $invoice) {
                fputcsv($file, [
                    $invoice->invoice_number,
                    $invoice->date->format('Y-m-d'),
                    $invoice->due_date->format('Y-m-d'),
                    $invoice->client->name,
                    $invoice->status,
                    $invoice->subtotal,
                    $invoice->tax_amount,
                    $invoice->total,
                    $invoice->paid_amount ?? 0,
                    $invoice->total - ($invoice->paid_amount ?? 0)
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="invoices.csv"',
        ]);
    }

    /**
     * Export invoices as Excel (simplified - would need PHPSpreadsheet for full Excel)
     */
    private function exportInvoicesExcel($invoices)
    {
        // This would require PHPSpreadsheet library
        // For now, returning CSV with .xls extension
        return $this->exportInvoicesCSV($invoices);
    }

    /**
     * Export invoices as PDF (batch)
     */
    private function exportInvoicesPDF($invoices)
    {
        // This would require generating a PDF with all invoices
        // For now, creating a ZIP of individual PDFs

        $zip = new ZipArchive();
        $zipFileName = 'invoices_' . time() . '.zip';
        $zipPath = storage_path('app/temp/' . $zipFileName);

        if ($zip->open($zipPath, ZipArchive::CREATE) === TRUE) {
            foreach ($invoices as $invoice) {
                // Generate PDF for each invoice
                $pdf = \PDF::loadView('invoices.pdf', [
                    'invoice' => $invoice,
                    'tenant' => auth()->user()->tenant
                ]);

                $pdfContent = $pdf->output();
                $zip->addFromString(
                    'invoice_' . $invoice->invoice_number . '.pdf',
                    $pdfContent
                );
            }
            $zip->close();
        }

        return response()->download($zipPath)->deleteFileAfterSend(true);
    }
}