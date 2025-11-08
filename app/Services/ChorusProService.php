<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Client;
use GuzzleHttp\Client as HttpClient;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Exception;

/**
 * Service for Chorus Pro integration
 * Chorus Pro is the French government platform for B2G (Business to Government) invoicing
 * All invoices to French public entities must be sent through this platform
 */
class ChorusProService
{
    protected $httpClient;
    protected $apiUrl;
    protected $certificatePath;
    protected $privateKeyPath;
    protected $technicalUsername;
    protected $technicalPassword;
    protected $isProduction;

    public function __construct()
    {
        $this->isProduction = config('services.chorus_pro.production', false);

        // Use different endpoints for production and sandbox
        $this->apiUrl = $this->isProduction
            ? 'https://chorus-pro.gouv.fr/cpp/service'
            : 'https://sandbox-chorus-pro.gouv.fr/cpp/service';

        $this->certificatePath = config('services.chorus_pro.certificate_path');
        $this->privateKeyPath = config('services.chorus_pro.private_key_path');
        $this->technicalUsername = config('services.chorus_pro.technical_username');
        $this->technicalPassword = config('services.chorus_pro.technical_password');

        // Initialize HTTP client with certificate authentication
        $this->httpClient = new HttpClient([
            'base_uri' => $this->apiUrl,
            'timeout' => 30,
            'verify' => true,
            'cert' => [$this->certificatePath, config('services.chorus_pro.certificate_password')],
            'ssl_key' => $this->privateKeyPath,
            'headers' => [
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ]
        ]);
    }

    /**
     * Send invoice to Chorus Pro
     *
     * @param Invoice $invoice
     * @return array
     * @throws Exception
     */
    public function sendInvoice(Invoice $invoice): array
    {
        // Validate that the client is a government entity
        if ($invoice->client->client_type !== 'government') {
            throw new Exception('Cette facture n\'est pas destinée à une entité publique');
        }

        // Validate required fields for Chorus Pro
        $this->validateInvoiceForChorus($invoice);

        // Prepare the invoice data in Chorus Pro format
        $chorusData = $this->prepareInvoiceData($invoice);

        try {
            // Authenticate and get token
            $token = $this->authenticate();

            // Submit the invoice
            $response = $this->submitInvoice($chorusData, $token);

            // Update invoice with Chorus Pro reference
            $invoice->chorus_status = 'sent';
            $invoice->chorus_reference = $response['numeroFactureCPP'];
            $invoice->chorus_sent_at = Carbon::now();
            $invoice->save();

            // Log the submission
            $this->logSubmission($invoice, $response, 'success');

            return [
                'success' => true,
                'message' => 'Facture transmise avec succès à Chorus Pro',
                'reference' => $response['numeroFactureCPP'],
                'status' => $response['statutFacture'] ?? 'DEPOSEE'
            ];

        } catch (Exception $e) {
            // Log the error
            $this->logSubmission($invoice, ['error' => $e->getMessage()], 'error');

            throw new Exception('Erreur lors de l\'envoi à Chorus Pro: ' . $e->getMessage());
        }
    }

    /**
     * Check invoice status on Chorus Pro
     *
     * @param Invoice $invoice
     * @return array
     * @throws Exception
     */
    public function checkInvoiceStatus(Invoice $invoice): array
    {
        if (!$invoice->chorus_reference) {
            throw new Exception('Cette facture n\'a pas de référence Chorus Pro');
        }

        try {
            $token = $this->authenticate();

            $response = $this->httpClient->post('/consulter/facture/v1', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token
                ],
                'json' => [
                    'numeroFactureCPP' => $invoice->chorus_reference
                ]
            ]);

            $data = json_decode($response->getBody()->getContents(), true);

            // Update invoice status
            $invoice->chorus_status = $this->mapChorusStatus($data['statutFacture']);
            $invoice->save();

            return [
                'status' => $data['statutFacture'],
                'details' => $data,
                'mapped_status' => $invoice->chorus_status
            ];

        } catch (Exception $e) {
            throw new Exception('Erreur lors de la consultation du statut: ' . $e->getMessage());
        }
    }

    /**
     * Authenticate with Chorus Pro API
     *
     * @return string JWT token
     * @throws Exception
     */
    protected function authenticate(): string
    {
        try {
            $response = $this->httpClient->post('/authentifier/v1', [
                'json' => [
                    'identifiantTechnique' => $this->technicalUsername,
                    'motDePasseTechnique' => $this->technicalPassword
                ]
            ]);

            $data = json_decode($response->getBody()->getContents(), true);

            if (!isset($data['jeton'])) {
                throw new Exception('Authentification échouée: pas de jeton reçu');
            }

            return $data['jeton'];

        } catch (Exception $e) {
            throw new Exception('Erreur d\'authentification Chorus Pro: ' . $e->getMessage());
        }
    }

    /**
     * Submit invoice to Chorus Pro
     *
     * @param array $invoiceData
     * @param string $token
     * @return array
     * @throws Exception
     */
    protected function submitInvoice(array $invoiceData, string $token): array
    {
        try {
            $response = $this->httpClient->post('/deposer/facture/v1', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token
                ],
                'json' => $invoiceData
            ]);

            $data = json_decode($response->getBody()->getContents(), true);

            if ($data['codeRetour'] !== 0) {
                throw new Exception($data['libelleRetour'] ?? 'Erreur inconnue');
            }

            return $data;

        } catch (Exception $e) {
            throw new Exception('Erreur lors du dépôt de la facture: ' . $e->getMessage());
        }
    }

    /**
     * Prepare invoice data in Chorus Pro format
     *
     * @param Invoice $invoice
     * @return array
     */
    protected function prepareInvoiceData(Invoice $invoice): array
    {
        $tenant = $invoice->tenant;
        $client = $invoice->client;

        return [
            'formatFacture' => 'PDF_SIGNE',
            'typeFacture' => 'FACTURE',
            'numeroFactureFournisseur' => $invoice->invoice_number,
            'dateFacture' => $invoice->invoice_date->format('Y-m-d'),
            'dateEcheance' => $invoice->due_date->format('Y-m-d'),

            // Emetteur (fournisseur)
            'emetteur' => [
                'typeIdentifiant' => 'SIRET',
                'identifiant' => $tenant->settings['company_info']['siret'] ?? '',
                'raisonSociale' => $tenant->settings['company_info']['name'] ?? $tenant->name,
                'adresse' => [
                    'ligneAdresse1' => $tenant->settings['company_info']['address'] ?? '',
                    'codePostal' => $tenant->settings['company_info']['postal_code'] ?? '',
                    'ville' => $tenant->settings['company_info']['city'] ?? '',
                    'pays' => 'FR'
                ]
            ],

            // Destinataire (client public)
            'destinataire' => [
                'typeIdentifiant' => 'SIRET',
                'identifiant' => $client->siret ?? '',
                'codeService' => $client->chorus_service_code ?? '',
                'numeroEngagement' => $client->chorus_engagement_number ?? ''
            ],

            // Montants
            'montants' => [
                'montantHT' => $invoice->subtotal,
                'montantTVA' => $invoice->tax_amount,
                'montantTTC' => $invoice->total,
                'tauxTVA' => $invoice->tax_rate
            ],

            // Lignes de facture
            'lignesFacture' => $this->prepareLinesData($invoice),

            // Pièces jointes (PDF de la facture)
            'piecesJointes' => [
                [
                    'nomFichier' => 'facture_' . $invoice->invoice_number . '.pdf',
                    'typeMime' => 'application/pdf',
                    'contenu' => $this->getInvoicePdfBase64($invoice)
                ]
            ],

            // Références
            'references' => [
                'numeroMarche' => $invoice->project->chorus_market_number ?? '',
                'numeroBonCommande' => $invoice->project->purchase_order_number ?? ''
            ]
        ];
    }

    /**
     * Prepare invoice lines data
     *
     * @param Invoice $invoice
     * @return array
     */
    protected function prepareLinesData(Invoice $invoice): array
    {
        $lines = [];

        foreach ($invoice->items as $index => $item) {
            $lines[] = [
                'numeroLigne' => $index + 1,
                'designation' => $item->description,
                'quantite' => $item->quantity,
                'prixUnitaire' => $item->unit_price,
                'montantHT' => $item->total,
                'tauxTVA' => $item->tax_rate ?? $invoice->tax_rate,
                'montantTVA' => $item->tax_amount
            ];
        }

        return $lines;
    }

    /**
     * Get invoice PDF as base64
     *
     * @param Invoice $invoice
     * @return string
     */
    protected function getInvoicePdfBase64(Invoice $invoice): string
    {
        $pdf = \PDF::loadView('invoices.pdf', [
            'invoice' => $invoice->load(['client', 'items', 'tenant']),
            'tenant' => $invoice->tenant
        ]);

        return base64_encode($pdf->output());
    }

    /**
     * Validate invoice for Chorus Pro requirements
     *
     * @param Invoice $invoice
     * @throws Exception
     */
    protected function validateInvoiceForChorus(Invoice $invoice): void
    {
        $errors = [];

        // Check tenant SIRET
        if (!isset($invoice->tenant->settings['company_info']['siret'])) {
            $errors[] = 'Le SIRET de votre entreprise est requis';
        }

        // Check client SIRET
        if (!$invoice->client->siret) {
            $errors[] = 'Le SIRET du client est requis';
        }

        // Check service code
        if (!$invoice->client->chorus_service_code) {
            $errors[] = 'Le code service Chorus Pro du client est requis';
        }

        // Check if invoice is already sent
        if ($invoice->chorus_status === 'sent' && $invoice->chorus_reference) {
            $errors[] = 'Cette facture a déjà été envoyée à Chorus Pro';
        }

        // Check invoice status
        if ($invoice->status !== 'sent' && $invoice->status !== 'pending') {
            $errors[] = 'La facture doit être en statut "envoyée" ou "en attente"';
        }

        if (!empty($errors)) {
            throw new Exception('Validation échouée: ' . implode(', ', $errors));
        }
    }

    /**
     * Map Chorus Pro status to internal status
     *
     * @param string $chorusStatus
     * @return string
     */
    protected function mapChorusStatus(string $chorusStatus): string
    {
        $mapping = [
            'DEPOSEE' => 'deposited',
            'EN_COURS_ACHEMINEMENT' => 'in_transit',
            'MISE_A_DISPOSITION' => 'available',
            'SUSPENDUE' => 'suspended',
            'REJETEE' => 'rejected',
            'MANDATEE' => 'mandated',
            'MISE_EN_PAIEMENT' => 'payment_processing',
            'PAYEE' => 'paid',
            'ANNULEE' => 'cancelled'
        ];

        return $mapping[$chorusStatus] ?? 'unknown';
    }

    /**
     * Log Chorus Pro submission
     *
     * @param Invoice $invoice
     * @param array $response
     * @param string $status
     */
    protected function logSubmission(Invoice $invoice, array $response, string $status): void
    {
        Log::channel('chorus_pro')->info('Chorus Pro submission', [
            'invoice_id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'status' => $status,
            'response' => $response,
            'timestamp' => Carbon::now()->toIso8601String()
        ]);
    }

    /**
     * Download invoice receipt from Chorus Pro
     *
     * @param Invoice $invoice
     * @return array
     * @throws Exception
     */
    public function downloadReceipt(Invoice $invoice): array
    {
        if (!$invoice->chorus_reference) {
            throw new Exception('Cette facture n\'a pas de référence Chorus Pro');
        }

        try {
            $token = $this->authenticate();

            $response = $this->httpClient->post('/telecharger/attestation/v1', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token
                ],
                'json' => [
                    'numeroFactureCPP' => $invoice->chorus_reference
                ]
            ]);

            $data = json_decode($response->getBody()->getContents(), true);

            return [
                'filename' => 'attestation_' . $invoice->invoice_number . '.pdf',
                'content' => base64_decode($data['contenuAttestation']),
                'mime_type' => 'application/pdf'
            ];

        } catch (Exception $e) {
            throw new Exception('Erreur lors du téléchargement de l\'attestation: ' . $e->getMessage());
        }
    }

    /**
     * Get list of public entities from Chorus Pro
     *
     * @param string $search
     * @return array
     */
    public function searchPublicEntities(string $search): array
    {
        try {
            $token = $this->authenticate();

            $response = $this->httpClient->post('/rechercher/structure/v1', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $token
                ],
                'json' => [
                    'recherche' => $search,
                    'typeRecherche' => 'DENOMINATION'
                ]
            ]);

            $data = json_decode($response->getBody()->getContents(), true);

            return $data['structures'] ?? [];

        } catch (Exception $e) {
            Log::error('Chorus Pro entity search error', ['error' => $e->getMessage()]);
            return [];
        }
    }
}