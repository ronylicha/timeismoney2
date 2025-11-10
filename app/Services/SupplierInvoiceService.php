<?php

namespace App\Services;

use App\Models\SupplierInvoice;
use App\Models\SupplierInvoiceLine;
use App\Models\Tenant;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Service pour la réception des factures fournisseurs via le PDP
 */
class SupplierInvoiceService
{
    private ?Tenant $tenant;

    public function __construct()
    {
        $this->tenant = tenant();
        
        if (!$this->tenant || !$this->tenant->hasPdpConfigured()) {
            throw new \Exception('PDP n\'est pas configuré pour ce tenant.');
        }
    }

    /**
     * Récupère les nouvelles factures depuis le PDP
     */
    public function fetchInvoicesFromPdp(): array
    {
        try {
            $token = $this->getPdpAccessToken();
            if (!$token) {
                throw new \Exception('Impossible d\'obtenir le token d\'accès PDP');
            }

            $response = Http::timeout($this->tenant->getPdpTimeout())
                ->withToken($token)
                ->get($this->tenant->getPdpBaseUrl() . '/api/' . config('pdp.api_version', 'v1') . '/invoices/incoming');

            if (!$response->successful()) {
                throw new \Exception('Erreur PDP: ' . $response->status() . ' - ' . $response->body());
            }

            $invoices = $response->json('data', []);
            $processedCount = 0;

            foreach ($invoices as $invoiceData) {
                if ($this->processInvoiceData($invoiceData)) {
                    $processedCount++;
                }
            }

            return [
                'success' => true,
                'processed' => $processedCount,
                'total' => count($invoices),
            ];

        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des factures PDP', [
                'tenant_id' => $this->tenant->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Traite les données d'une facture reçue du PDP
     */
    private function processInvoiceData(array $invoiceData): bool
    {
        try {
            // Vérifier si la facture existe déjà
            if ($invoiceData['reference'] && 
                SupplierInvoice::where('pdp_reference', $invoiceData['reference'])->exists()) {
                return false; // Déjà traitée
            }

            // Télécharger le fichier
            $fileContent = $this->downloadInvoiceFile($invoiceData['file_url']);
            if (!$fileContent) {
                throw new \Exception('Impossible de télécharger le fichier de la facture');
            }

            // Stocker le fichier
            $fileName = $invoiceData['file_name'] ?? 'facture-' . Str::uuid() . '.pdf';
            $filePath = 'supplier-invoices/' . $this->tenant->id . '/' . $fileName;
            Storage::put($filePath, $fileContent);

            // Créer la facture
            $invoice = SupplierInvoice::create([
                'tenant_id' => $this->tenant->id,
                'invoice_number' => $invoiceData['invoice_number'] ?? SupplierInvoice::generateInvoiceNumber(),
                'pdp_reference' => $invoiceData['reference'] ?? null,
                'uuid' => Str::uuid(),
                'supplier_name' => $invoiceData['supplier']['name'],
                'supplier_siret' => $invoiceData['supplier']['siret'] ?? null,
                'supplier_vat_number' => $invoiceData['supplier']['vat_number'] ?? null,
                'supplier_address' => $invoiceData['supplier']['address'] ?? null,
                'supplier_email' => $invoiceData['supplier']['email'] ?? null,
                'supplier_phone' => $invoiceData['supplier']['phone'] ?? null,
                'invoice_date' => $invoiceData['invoice_date'],
                'due_date' => $invoiceData['due_date'],
                'delivery_date' => $invoiceData['delivery_date'] ?? null,
                'total_ht' => $invoiceData['amounts']['total_ht'],
                'total_tva' => $invoiceData['amounts']['total_vat'],
                'total_ttc' => $invoiceData['amounts']['total_ttc'],
                'currency' => $invoiceData['currency'] ?? 'EUR',
                'vat_breakdown' => $invoiceData['vat_breakdown'] ?? null,
                'status' => 'pending',
                'file_path' => $filePath,
                'file_name' => $fileName,
                'file_mime_type' => $invoiceData['file_mime_type'] ?? 'application/pdf',
                'file_size' => strlen($fileContent),
                'file_hash' => hash('sha256', $fileContent),
                'pdp_metadata' => $invoiceData,
                'pdp_received_at' => now(),
            ]);

            // Créer les lignes de facture si disponibles
            if (isset($invoiceData['lines']) && is_array($invoiceData['lines'])) {
                foreach ($invoiceData['lines'] as $lineData) {
                    SupplierInvoiceLine::create([
                        'supplier_invoice_id' => $invoice->id,
                        'description' => $lineData['description'],
                        'product_code' => $lineData['product_code'] ?? null,
                        'product_reference' => $lineData['product_reference'] ?? null,
                        'quantity' => $lineData['quantity'],
                        'unit' => $lineData['unit'] ?? 'unit',
                        'unit_price' => $lineData['unit_price'],
                        'discount_rate' => $lineData['discount_rate'] ?? 0,
                        'discount_amount' => $lineData['discount_amount'] ?? 0,
                        'vat_rate' => $lineData['vat_rate'],
                        'total_ht' => $lineData['total_ht'],
                        'total_tva' => $lineData['total_vat'],
                        'total_ttc' => $lineData['total_ttc'],
                    ]);
                }
            }

            Log::info('Facture fournisseur traitée avec succès', [
                'tenant_id' => $this->tenant->id,
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'pdp_reference' => $invoice->pdp_reference,
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error('Erreur lors du traitement de la facture PDP', [
                'tenant_id' => $this->tenant->id,
                'invoice_data' => $invoiceData,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Télécharge le fichier d'une facture depuis le PDP
     */
    private function downloadInvoiceFile(string $fileUrl): ?string
    {
        try {
            $token = $this->getPdpAccessToken();
            if (!$token) {
                return null;
            }

            $response = Http::timeout($this->tenant->getPdpTimeout())
                ->withToken($token)
                ->get($fileUrl);

            if (!$response->successful()) {
                return null;
            }

            return $response->body();

        } catch (\Exception $e) {
            Log::error('Erreur lors du téléchargement du fichier facture', [
                'tenant_id' => $this->tenant->id,
                'file_url' => $fileUrl,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Obtient un token d'accès PDP
     */
    private function getPdpAccessToken(): ?string
    {
        try {
            $response = Http::asForm()->post($this->tenant->getPdpOAuthUrl(), [
                'grant_type' => 'client_credentials',
                'client_id' => $this->tenant->getPdpClientId(),
                'client_secret' => $this->tenant->getPdpClientSecret(),
                'scope' => $this->tenant->getPdpScope(),
            ]);

            if (!$response->successful()) {
                Log::error('PDP OAuth token request failed', [
                    'tenant_id' => $this->tenant->id,
                    'status' => $response->status(),
                    'response' => $response->body(),
                ]);
                return null;
            }

            $data = $response->json();
            return $data['access_token'] ?? null;

        } catch (\Exception $e) {
            Log::error('Exception lors de l\'obtention du token PDP', [
                'tenant_id' => $this->tenant->id,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Valide une facture fournisseur
     */
    public function validateInvoice(SupplierInvoice $invoice, ?int $validatedBy = null, ?string $notes = null): bool
    {
        try {
            if (!$invoice->canBeValidated()) {
                throw new \Exception('Cette facture ne peut pas être validée');
            }

            $invoice->validate($validatedBy, $notes);

            // Envoyer une confirmation au PDP si nécessaire
            $this->notifyPdpOfValidation($invoice);

            Log::info('Facture fournisseur validée', [
                'tenant_id' => $this->tenant->id,
                'invoice_id' => $invoice->id,
                'validated_by' => $validatedBy,
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error('Erreur lors de la validation de la facture', [
                'tenant_id' => $this->tenant->id,
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Rejette une facture fournisseur
     */
    public function rejectInvoice(SupplierInvoice $invoice, ?int $rejectedBy = null, ?string $reason = null): bool
    {
        try {
            if (!$invoice->canBeRejected()) {
                throw new \Exception('Cette facture ne peut pas être rejetée');
            }

            $invoice->reject($rejectedBy, $reason);

            // Envoyer une confirmation au PDP si nécessaire
            $this->notifyPdpOfRejection($invoice, $reason);

            Log::info('Facture fournisseur rejetée', [
                'tenant_id' => $this->tenant->id,
                'invoice_id' => $invoice->id,
                'rejected_by' => $rejectedBy,
                'reason' => $reason,
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error('Erreur lors du rejet de la facture', [
                'tenant_id' => $this->tenant->id,
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Notifie le PDP de la validation d'une facture
     */
    private function notifyPdpOfValidation(SupplierInvoice $invoice): void
    {
        try {
            $token = $this->getPdpAccessToken();
            if (!$token || !$invoice->pdp_reference) {
                return;
            }

            Http::timeout($this->tenant->getPdpTimeout())
                ->withToken($token)
                ->post($this->tenant->getPdpBaseUrl() . '/api/' . config('pdp.api_version', 'v1') . '/invoices/' . $invoice->pdp_reference . '/validate', [
                    'validated_at' => $invoice->validated_at->toISOString(),
                    'status' => 'validated',
                ]);

        } catch (\Exception $e) {
            Log::warning('Impossible de notifier le PDP de la validation', [
                'tenant_id' => $this->tenant->id,
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Notifie le PDP du rejet d'une facture
     */
    private function notifyPdpOfRejection(SupplierInvoice $invoice, ?string $reason = null): void
    {
        try {
            $token = $this->getPdpAccessToken();
            if (!$token || !$invoice->pdp_reference) {
                return;
            }

            Http::timeout($this->tenant->getPdpTimeout())
                ->withToken($token)
                ->post($this->tenant->getPdpBaseUrl() . '/api/' . config('pdp.api_version', 'v1') . '/invoices/' . $invoice->pdp_reference . '/reject', [
                    'rejected_at' => $invoice->rejected_at->toISOString(),
                    'status' => 'rejected',
                    'rejection_reason' => $reason,
                ]);

        } catch (\Exception $e) {
            Log::warning('Impossible de notifier le PDP du rejet', [
                'tenant_id' => $this->tenant->id,
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}