<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\CreditNote;
use App\Models\PdpSubmission;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Service d'intégration avec le Portail Public de Facturation (PDP)
 * 
 * Ce service gère la communication avec le PDP de la DGFIP pour la
 * facturation électronique B2B obligatoire en France.
 */
class PdpService
{
    private string $baseUrl;
    private string $oauthUrl;
    private ?string $accessToken = null;
    private ?\DateTime $tokenExpires = null;

    public function __construct()
    {
        $this->baseUrl = config('pdp.base_url');
        $this->oauthUrl = config('pdp.oauth_url');
    }

    /**
     * Soumet un document au PDP
     */
    public function submitDocument(Invoice|CreditNote $model, string $facturXPath, PdpSubmission $submission): array
    {
        try {
            if (config('pdp.mode') === 'simulation') {
                return $this->simulateSubmission($model, $facturXPath, $submission);
            }

            return $this->realSubmission($model, $facturXPath, $submission);

        } catch (\Exception $e) {
            Log::error('PDP submission failed', [
                'model_type' => get_class($model),
                'model_id' => $model->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Vérifie le statut d'une soumission auprès du PDP
     */
    public function checkStatus(PdpSubmission $submission): array
    {
        try {
            if (config('pdp.mode') === 'simulation') {
                return $this->simulateStatusCheck($submission);
            }

            return $this->realStatusCheck($submission);

        } catch (\Exception $e) {
            Log::error('PDP status check failed', [
                'submission_id' => $submission->id,
                'pdp_id' => $submission->pdp_id,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Simulation de soumission (mode développement/tests)
     */
    private function simulateSubmission(Invoice|CreditNote $model, string $facturXPath, PdpSubmission $submission): array
    {
        Log::info('PDP simulation mode - submitting document', [
            'model_type' => get_class($model),
            'model_id' => $model->id,
            'submission_id' => $submission->submission_id,
        ]);

        // Simuler une validation basique
        if (!$this->validateDocumentForSimulation($model, $facturXPath)) {
            return [
                'success' => false,
                'error' => 'Document invalide pour la simulation PDP',
            ];
        }

        // Simuler une erreur aléatoire si configuré
        $errorRate = config('pdp.simulation.error_rate', 0);
        if ($errorRate > 0 && rand(1, 100) <= $errorRate) {
            return [
                'success' => false,
                'error' => 'Erreur simulée du PDP',
                'error_code' => 'SIM_ERROR',
            ];
        }

        // Générer un ID PDP simulé
        $pdpId = 'SIM-' . date('Y') . '-' . strtoupper(Str::random(8));

        return [
            'success' => true,
            'pdp_id' => $pdpId,
            'response_data' => [
                'message' => 'Document soumis avec succès (simulation)',
                'pdp_reference' => 'REF-' . $pdpId,
                'processing_time' => config('pdp.simulation.processing_delay', 30) . ' seconds',
                'mode' => 'simulation',
            ],
        ];
    }

    /**
     * Simulation de vérification de statut
     */
    private function simulateStatusCheck(PdpSubmission $submission): array
    {
        Log::info('PDP simulation mode - checking status', [
            'submission_id' => $submission->submission_id,
            'pdp_id' => $submission->pdp_id,
        ]);

        // Simuler différents statuts selon le temps écoulé
        $timeSinceSubmission = now()->diffInSeconds($submission->submitted_at ?? now());
        $processingDelay = config('pdp.simulation.processing_delay', 30);

        if ($timeSinceSubmission < $processingDelay / 2) {
            // Première moitié du temps : en traitement
            return [
                'success' => true,
                'status' => 'processing',
                'response_data' => [
                    'message' => 'Document en cours de traitement (simulation)',
                    'estimated_completion' => $processingDelay - $timeSinceSubmission . ' seconds',
                ],
            ];
        } elseif ($timeSinceSubmission < $processingDelay) {
            // Seconde moitié : toujours en traitement
            return [
                'success' => true,
                'status' => 'processing',
                'response_data' => [
                    'message' => 'Traitement presque terminé (simulation)',
                    'estimated_completion' => $processingDelay - $timeSinceSubmission . ' seconds',
                ],
            ];
        } else {
            // Après le délai : succès (sauf si erreur simulée)
            $errorRate = config('pdp.simulation.error_rate', 0);
            if ($errorRate > 0 && rand(1, 100) <= $errorRate) {
                return [
                    'success' => true,
                    'status' => 'rejected',
                    'response_data' => [
                        'message' => 'Document rejeté (simulation)',
                        'error_message' => 'Format de fichier invalide',
                        'error_code' => 'SIM_REJECT',
                    ],
                ];
            }

            return [
                'success' => true,
                'status' => 'accepted',
                'response_data' => [
                    'message' => 'Document accepté avec succès (simulation)',
                    'acceptance_date' => now()->toISOString(),
                    'pdp_reference' => $submission->pdp_id,
                ],
            ];
        }
    }

    /**
     * Soumission réelle au PDP
     */
    private function realSubmission(Invoice|CreditNote $model, string $facturXPath, PdpSubmission $submission): array
    {
        // Obtenir le token d'accès
        $token = $this->getAccessToken();
        if (!$token) {
            throw new \Exception('Impossible d\'obtenir le token d\'accès PDP');
        }

        // Préparer les données de soumission
        $submissionData = $this->prepareSubmissionData($model, $facturXPath);

        // Envoyer la requête
        $response = Http::timeout(config('pdp.timeout', 30))
            ->withToken($token)
            ->post($this->baseUrl . '/api/' . config('pdp.api_version', 'v1') . '/invoices', $submissionData);

        if (!$response->successful()) {
            throw new \Exception('Erreur PDP: ' . $response->status() . ' - ' . $response->body());
        }

        $responseData = $response->json();

        return [
            'success' => true,
            'pdp_id' => $responseData['id'] ?? null,
            'response_data' => $responseData,
        ];
    }

    /**
     * Vérification réelle du statut
     */
    private function realStatusCheck(PdpSubmission $submission): array
    {
        if (!$submission->pdp_id) {
            throw new \Exception('ID PDP manquant pour la vérification du statut');
        }

        $token = $this->getAccessToken();
        if (!$token) {
            throw new \Exception('Impossible d\'obtenir le token d\'accès PDP');
        }

        $response = Http::timeout(config('pdp.timeout', 30))
            ->withToken($token)
            ->get($this->baseUrl . '/api/' . config('pdp.api_version', 'v1') . '/invoices/' . $submission->pdp_id);

        if (!$response->successful()) {
            throw new \Exception('Erreur PDP: ' . $response->status() . ' - ' . $response->body());
        }

        $responseData = $response->json();

        return [
            'success' => true,
            'status' => $responseData['status'] ?? 'unknown',
            'response_data' => $responseData,
        ];
    }

    /**
     * Obtient un token d'accès OAuth 2.0
     */
    private function getAccessToken(): ?string
    {
        // Vérifier si le token actuel est encore valide
        if ($this->accessToken && $this->tokenExpires && $this->tokenExpires > now()) {
            return $this->accessToken;
        }

        // Obtenir un nouveau token
        $response = Http::asForm()->post($this->oauthUrl, [
            'grant_type' => 'client_credentials',
            'client_id' => config('pdp.client_id'),
            'client_secret' => config('pdp.client_secret'),
            'scope' => config('pdp.scope'),
        ]);

        if (!$response->successful()) {
            Log::error('PDP OAuth token request failed', [
                'status' => $response->status(),
                'response' => $response->body(),
            ]);
            return null;
        }

        $data = $response->json();
        $this->accessToken = $data['access_token'] ?? null;
        $this->tokenExpires = now()->addSeconds($data['expires_in'] ?? 3600);

        return $this->accessToken;
    }

    /**
     * Prépare les données de soumission pour le PDP
     */
    private function prepareSubmissionData(Invoice|CreditNote $model, string $facturXPath): array
    {
        $fileContent = Storage::get($facturXPath);
        $base64Content = base64_encode($fileContent);

        $data = [
            'file_name' => basename($facturXPath),
            'file_content' => $base64Content,
            'file_format' => 'facturx',
            'metadata' => [
                'document_type' => $model instanceof Invoice ? 'invoice' : 'credit_note',
                'document_number' => $model->invoice_number ?? $model->credit_note_number,
                'document_date' => $model->date ?? $model->credit_note_date,
                'issuer' => [
                    'name' => $model->tenant->name,
                    'siret' => $model->tenant->legal_mention_siret,
                    'vat_number' => $model->tenant->legal_mention_tva_intracom,
                ],
                'recipient' => [
                    'name' => $model->client->name,
                    'siret' => $model->client->siret,
                    'vat_number' => $model->client->vat_number,
                ],
                'amounts' => [
                    'total' => $model->total,
                    'currency' => $model->currency ?? 'EUR',
                ],
            ],
        ];

        return $data;
    }

    /**
     * Validation basique pour le mode simulation
     */
    private function validateDocumentForSimulation(Invoice|CreditNote $model, string $facturXPath): bool
    {
        // Vérifier que le fichier existe
        if (!Storage::exists($facturXPath)) {
            Log::error('Factur-X file not found for PDP simulation', [
                'path' => $facturXPath,
            ]);
            return false;
        }

        // Vérifier la taille du fichier
        $fileSize = Storage::size($facturXPath);
        $maxSize = config('pdp.files.max_size', 10 * 1024 * 1024);
        if ($fileSize > $maxSize) {
            Log::error('Factur-X file too large for PDP', [
                'size' => $fileSize,
                'max_size' => $maxSize,
            ]);
            return false;
        }

        // Vérifier les données obligatoires du modèle
        if (!$model->tenant || !$model->client) {
            Log::error('Missing tenant or client for PDP submission');
            return false;
        }

        return true;
    }
}