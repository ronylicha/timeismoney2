<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PdpSubmission;
use App\Models\SupplierInvoice;
use App\Services\PdpService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Controller for handling PDP webhooks
 */
class PdpWebhookController extends Controller
{
    /**
     * Handle incoming PDP webhook
     */
    public function handleWebhook(Request $request): JsonResponse
    {
        Log::info('PDP webhook received', [
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'payload' => $request->getContent(),
        ]);

        try {
            // Verify webhook signature if configured
            $this->verifyWebhookSignature($request);

            $payload = $request->json()->all();
            
            // Process webhook based on event type
            $eventType = $payload['event_type'] ?? null;
            
            switch ($eventType) {
                case 'submission.status_changed':
                    $this->handleSubmissionStatusChanged($payload);
                    break;
                    
                case 'submission.accepted':
                    $this->handleSubmissionAccepted($payload);
                    break;
                    
                case 'submission.rejected':
                    $this->handleSubmissionRejected($payload);
                    break;
                    
                case 'submission.processed':
                    $this->handleSubmissionProcessed($payload);
                    break;
                    
                case 'invoice.available':
                    $this->handleInvoiceAvailable($payload);
                    break;
                    
                default:
                    Log::warning('Unknown PDP webhook event type', [
                        'event_type' => $eventType,
                        'payload' => $payload,
                    ]);
            }

            return response()->json(['status' => 'success']);

        } catch (\Exception $e) {
            Log::error('Failed to process PDP webhook', [
                'error' => $e->getMessage(),
                'payload' => $request->getContent(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to process webhook',
            ], 500);
        }
    }

    /**
     * Verify webhook signature
     */
    private function verifyWebhookSignature(Request $request): void
    {
        $signature = $request->header('X-PDP-Signature');
        $tenantId = $request->header('X-Tenant-ID');

        if (!$signature || !$tenantId) {
            throw new \Exception('Missing webhook signature headers');
        }

        // Find tenant by ID
        $tenant = \App\Models\Tenant::find($tenantId);
        if (!$tenant) {
            throw new \Exception('Invalid tenant ID');
        }

        $webhookSecret = $tenant->pdp_webhook_secret;
        if (!$webhookSecret) {
            throw new \Exception('Webhook secret not configured for tenant');
        }

        // Verify signature (HMAC-SHA256)
        $expectedSignature = hash_hmac('sha256', $request->getContent(), $webhookSecret);
        
        if (!hash_equals($expectedSignature, $signature)) {
            throw new \Exception('Invalid webhook signature');
        }
    }

    /**
     * Handle submission status change
     */
    private function handleSubmissionStatusChanged(array $payload): void
    {
        $submissionId = $payload['submission_id'] ?? null;
        $newStatus = $payload['new_status'] ?? null;
        $message = $payload['message'] ?? null;

        if (!$submissionId || !$newStatus) {
            Log::warning('Invalid submission status changed payload', ['payload' => $payload]);
            return;
        }

        $submission = PdpSubmission::where('submission_id', $submissionId)->first();
        if (!$submission) {
            Log::warning('Submission not found for webhook', ['submission_id' => $submissionId]);
            return;
        }

        $oldStatus = $submission->status;
        $submission->update([
            'status' => $newStatus,
            'response_data' => array_merge($submission->response_data ?? [], [
                'webhook_received_at' => now()->toIso8601String(),
                'message' => $message,
                'payload' => $payload,
            ]),
        ]);

        Log::info('PDP submission status updated via webhook', [
            'submission_id' => $submissionId,
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'tenant_id' => $submission->tenant_id,
        ]);

        // Send notification if configured
        if ($submission->tenant->pdp_notifications_email_enabled) {
            $this->sendStatusChangeNotification($submission, $oldStatus, $newStatus, $message);
        }
    }

    /**
     * Handle submission accepted
     */
    private function handleSubmissionAccepted(array $payload): void
    {
        $submissionId = $payload['submission_id'] ?? null;
        $acceptanceData = $payload['acceptance_data'] ?? [];

        if (!$submissionId) {
            Log::warning('Invalid submission accepted payload', ['payload' => $payload]);
            return;
        }

        $submission = PdpSubmission::where('submission_id', $submissionId)->first();
        if (!$submission) {
            Log::warning('Submission not found for acceptance webhook', ['submission_id' => $submissionId]);
            return;
        }

        $submission->update([
            'status' => 'accepted',
            'response_data' => array_merge($submission->response_data ?? [], [
                'accepted_at' => now()->toIso8601String(),
                'acceptance_data' => $acceptanceData,
                'webhook_type' => 'accepted',
            ]),
        ]);

        Log::info('PDP submission accepted via webhook', [
            'submission_id' => $submissionId,
            'tenant_id' => $submission->tenant_id,
            'acceptance_data' => $acceptanceData,
        ]);

        // Send acceptance notification
        if ($submission->tenant->pdp_notifications_email_enabled) {
            $this->sendAcceptanceNotification($submission, $acceptanceData);
        }
    }

    /**
     * Handle submission rejected
     */
    private function handleSubmissionRejected(array $payload): void
    {
        $submissionId = $payload['submission_id'] ?? null;
        $rejectionReason = $payload['rejection_reason'] ?? null;
        $rejectionCode = $payload['rejection_code'] ?? null;

        if (!$submissionId) {
            Log::warning('Invalid submission rejected payload', ['payload' => $payload]);
            return;
        }

        $submission = PdpSubmission::where('submission_id', $submissionId)->first();
        if (!$submission) {
            Log::warning('Submission not found for rejection webhook', ['submission_id' => $submissionId]);
            return;
        }

        $submission->update([
            'status' => 'rejected',
            'response_data' => array_merge($submission->response_data ?? [], [
                'rejected_at' => now()->toIso8601String(),
                'rejection_reason' => $rejectionReason,
                'rejection_code' => $rejectionCode,
                'webhook_type' => 'rejected',
            ]),
        ]);

        Log::info('PDP submission rejected via webhook', [
            'submission_id' => $submissionId,
            'tenant_id' => $submission->tenant_id,
            'rejection_reason' => $rejectionReason,
            'rejection_code' => $rejectionCode,
        ]);

        // Send rejection notification
        if ($submission->tenant->pdp_notifications_email_enabled) {
            $this->sendRejectionNotification($submission, $rejectionReason, $rejectionCode);
        }
    }

    /**
     * Handle submission processed
     */
    private function handleSubmissionProcessed(array $payload): void
    {
        $submissionId = $payload['submission_id'] ?? null;
        $processingData = $payload['processing_data'] ?? [];

        if (!$submissionId) {
            Log::warning('Invalid submission processed payload', ['payload' => $payload]);
            return;
        }

        $submission = PdpSubmission::where('submission_id', $submissionId)->first();
        if (!$submission) {
            Log::warning('Submission not found for processed webhook', ['submission_id' => $submissionId]);
            return;
        }

        $submission->update([
            'status' => 'processed',
            'response_data' => array_merge($submission->response_data ?? [], [
                'processed_at' => now()->toIso8601String(),
                'processing_data' => $processingData,
                'webhook_type' => 'processed',
            ]),
        ]);

        Log::info('PDP submission processed via webhook', [
            'submission_id' => $submissionId,
            'tenant_id' => $submission->tenant_id,
            'processing_data' => $processingData,
        ]);
    }

    /**
     * Handle new invoice available from PDP
     */
    private function handleInvoiceAvailable(array $payload): void
    {
        $tenantId = $payload['tenant_id'] ?? null;
        $invoiceData = $payload['invoice_data'] ?? [];

        if (!$tenantId || !$invoiceData) {
            Log::warning('Invalid invoice available payload', ['payload' => $payload]);
            return;
        }

        $tenant = \App\Models\Tenant::find($tenantId);
        if (!$tenant) {
            Log::warning('Tenant not found for invoice webhook', ['tenant_id' => $tenantId]);
            return;
        }

        try {
            // Create or update supplier invoice from PDP data
            $supplierInvoice = $this->createSupplierInvoiceFromPdpData($tenant, $invoiceData);

            Log::info('Supplier invoice created from PDP webhook', [
                'supplier_invoice_id' => $supplierInvoice->id,
                'invoice_number' => $supplierInvoice->invoice_number,
                'tenant_id' => $tenantId,
            ]);

            // Send notification if configured
            if ($tenant->pdp_notifications_email_enabled) {
                $this->sendNewInvoiceNotification($supplierInvoice);
            }

        } catch (\Exception $e) {
            Log::error('Failed to create supplier invoice from PDP webhook', [
                'tenant_id' => $tenantId,
                'invoice_data' => $invoiceData,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Create supplier invoice from PDP data
     */
    private function createSupplierInvoiceFromPdpData(\App\Models\Tenant $tenant, array $invoiceData): SupplierInvoice
    {
        return SupplierInvoice::create([
            'tenant_id' => $tenant->id,
            'supplier_name' => $invoiceData['supplier_name'],
            'supplier_siret' => $invoiceData['supplier_siret'] ?? null,
            'supplier_vat_number' => $invoiceData['supplier_vat_number'] ?? null,
            'supplier_address' => $invoiceData['supplier_address'] ?? null,
            'invoice_number' => $invoiceData['invoice_number'],
            'invoice_date' => $invoiceData['invoice_date'],
            'due_date' => $invoiceData['due_date'] ?? null,
            'total_amount' => $invoiceData['total_amount'],
            'vat_amount' => $invoiceData['vat_amount'],
            'currency' => $invoiceData['currency'] ?? 'EUR',
            'status' => 'received',
            'notes' => $invoiceData['notes'] ?? null,
            'pdp_source' => true,
            'pdp_data' => $invoiceData,
        ]);
    }

    /**
     * Send status change notification
     */
    private function sendStatusChangeNotification(PdpSubmission $submission, string $oldStatus, string $newStatus, ?string $message): void
    {
        // Implementation would depend on your notification system
        // This is a placeholder for email notification logic
        Log::info('PDP status change notification would be sent', [
            'submission_id' => $submission->submission_id,
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'message' => $message,
            'tenant_id' => $submission->tenant_id,
        ]);
    }

    /**
     * Send acceptance notification
     */
    private function sendAcceptanceNotification(PdpSubmission $submission, array $acceptanceData): void
    {
        // Implementation would depend on your notification system
        Log::info('PDP acceptance notification would be sent', [
            'submission_id' => $submission->submission_id,
            'acceptance_data' => $acceptanceData,
            'tenant_id' => $submission->tenant_id,
        ]);
    }

    /**
     * Send rejection notification
     */
    private function sendRejectionNotification(PdpSubmission $submission, ?string $reason, ?string $code): void
    {
        // Implementation would depend on your notification system
        Log::info('PDP rejection notification would be sent', [
            'submission_id' => $submission->submission_id,
            'rejection_reason' => $reason,
            'rejection_code' => $code,
            'tenant_id' => $submission->tenant_id,
        ]);
    }

    /**
     * Send new invoice notification
     */
    private function sendNewInvoiceNotification(SupplierInvoice $invoice): void
    {
        // Implementation would depend on your notification system
        Log::info('New supplier invoice notification would be sent', [
            'supplier_invoice_id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'supplier_name' => $invoice->supplier_name,
            'tenant_id' => $invoice->tenant_id,
        ]);
    }
}