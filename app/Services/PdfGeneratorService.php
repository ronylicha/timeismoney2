<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\Invoice;
use App\Models\Quote;
use App\Models\CreditNote;
use Illuminate\Support\Facades\Storage;

class PdfGeneratorService
{
    /**
     * Generate PDF for an invoice
     */
    public function generateInvoicePdf(Invoice $invoice, bool $download = false)
    {
        $invoice->load(['client', 'items', 'tenant']);

        $pdf = Pdf::loadView('pdf.invoice', [
            'invoice' => $invoice,
            'client' => $invoice->client,
            'items' => $invoice->items,
            'tenant' => $invoice->tenant,
        ]);

        $pdf->setPaper('a4', 'portrait');

        $filename = "invoice-{$invoice->invoice_number}.pdf";

        if ($download) {
            return $pdf->download($filename);
        }

        return $pdf;
    }

    /**
     * Generate PDF for a quote
     */
    public function generateQuotePdf(Quote $quote, bool $download = false)
    {
        $quote->load(['client', 'items', 'tenant']);

        $pdf = Pdf::loadView('pdf.quote', [
            'quote' => $quote,
            'client' => $quote->client,
            'items' => $quote->items,
            'tenant' => $quote->tenant,
        ]);

        $pdf->setPaper('a4', 'portrait');

        $filename = "quote-{$quote->quote_number}.pdf";

        if ($download) {
            return $pdf->download($filename);
        }

        return $pdf;
    }

    /**
     * Generate PDF for a credit note
     */
    public function generateCreditNotePdf(CreditNote $creditNote, bool $download = false)
    {
        $creditNote->load(['client', 'items', 'tenant', 'invoice']);

        $pdf = Pdf::loadView('pdf.credit-note', [
            'creditNote' => $creditNote,
            'client' => $creditNote->client,
            'items' => $creditNote->items,
            'tenant' => $creditNote->tenant,
            'invoice' => $creditNote->invoice,
        ]);

        $pdf->setPaper('a4', 'portrait');

        $filename = "credit-note-{$creditNote->credit_note_number}.pdf";

        if ($download) {
            return $pdf->download($filename);
        }

        return $pdf;
    }

    /**
     * Save PDF to storage
     */
    public function savePdfToStorage($pdf, string $path): string
    {
        $output = $pdf->output();
        Storage::disk('local')->put($path, $output);

        return $path;
    }

    /**
     * Generate and save invoice PDF
     */
    public function generateAndSaveInvoicePdf(Invoice $invoice): string
    {
        $pdf = $this->generateInvoicePdf($invoice);
        $path = "invoices/invoice-{$invoice->invoice_number}.pdf";

        return $this->savePdfToStorage($pdf, $path);
    }

    /**
     * Generate and save quote PDF
     */
    public function generateAndSaveQuotePdf(Quote $quote): string
    {
        $pdf = $this->generateQuotePdf($quote);
        $path = "quotes/quote-{$quote->quote_number}.pdf";

        return $this->savePdfToStorage($pdf, $path);
    }

    /**
     * Generate and save credit note PDF
     */
    public function generateAndSaveCreditNotePdf(CreditNote $creditNote): string
    {
        $pdf = $this->generateCreditNotePdf($creditNote);
        $path = "credit-notes/credit-note-{$creditNote->credit_note_number}.pdf";

        return $this->savePdfToStorage($pdf, $path);
    }

    /**
     * Stream PDF inline (for preview)
     */
    public function streamInvoicePdf(Invoice $invoice)
    {
        $pdf = $this->generateInvoicePdf($invoice);
        return $pdf->stream("invoice-{$invoice->invoice_number}.pdf");
    }

    /**
     * Stream quote PDF inline (for preview)
     */
    public function streamQuotePdf(Quote $quote)
    {
        $pdf = $this->generateQuotePdf($quote);
        return $pdf->stream("quote-{$quote->quote_number}.pdf");
    }

    /**
     * Stream credit note PDF inline (for preview)
     */
    public function streamCreditNotePdf(CreditNote $creditNote)
    {
        $pdf = $this->generateCreditNotePdf($creditNote);
        return $pdf->stream("credit-note-{$creditNote->credit_note_number}.pdf");
    }
}
