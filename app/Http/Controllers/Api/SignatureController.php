<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ElectronicSignature;
use App\Services\ElectronicSignatureService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

/**
 * Contrôleur API pour la gestion des signatures électroniques
 */
class SignatureController extends Controller
{
    public function __construct(
        private ElectronicSignatureService $signatureService
    ) {}

    /**
     * Liste des signatures avec filtres et pagination
     */
    public function index(Request $request): JsonResponse
    {
        $query = ElectronicSignature::query()
            ->with(['signable', 'signer'])
            ->where('tenant_id', tenant()->id);

        // Filtres
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('level')) {
            $query->where('signature_level', $request->level);
        }

        if ($request->filled('signer')) {
            $query->where('signer_name', 'LIKE', '%' . $request->signer . '%');
        }

        if ($request->filled('date_from')) {
            $query->whereDate('signature_time', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('signature_time', '<=', $request->date_to);
        }

        if ($request->filled('document_type')) {
            $query->where('signable_type', 'App\\Models\\' . ucfirst($request->document_type));
        }

        // Tri
        $sortBy = $request->get('sort_by', 'signature_time');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = min($request->get('per_page', 15), 100);
        $signatures = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $signatures->items(),
            'pagination' => [
                'current_page' => $signatures->currentPage(),
                'last_page' => $signatures->lastPage(),
                'per_page' => $signatures->perPage(),
                'total' => $signatures->total(),
                'from' => $signatures->firstItem(),
                'to' => $signatures->lastItem(),
            ],
        ]);
    }

    /**
     * Détails d'une signature
     */
    public function show(ElectronicSignature $signature): JsonResponse
    {
        // Vérifier que la signature appartient au tenant
        if ($signature->tenant_id !== tenant()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Signature non trouvée',
            ], 404);
        }

        $signature->load(['signable', 'signer']);

        return response()->json([
            'success' => true,
            'data' => $signature,
        ]);
    }

    /**
     * Statistiques des signatures
     */
    public function statistics(Request $request): JsonResponse
    {
        $startDate = $request->filled('start_date') 
            ? Carbon::parse($request->start_date) 
            : now()->subMonth();

        $endDate = $request->filled('end_date') 
            ? Carbon::parse($request->end_date) 
            : now();

        $stats = ElectronicSignature::getStatistics($startDate, $endDate);

        // Statistiques détaillées par période
        $dailyStats = ElectronicSignature::query()
            ->where('tenant_id', tenant()->id)
            ->whereBetween('signature_time', [$startDate, $endDate])
            ->selectRaw('DATE(signature_time) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Statistiques par niveau de signature
        $levelStats = ElectronicSignature::query()
            ->where('tenant_id', tenant()->id)
            ->whereBetween('signature_time', [$startDate, $endDate])
            ->selectRaw('signature_level, COUNT(*) as count')
            ->groupBy('signature_level')
            ->get();

        // Statistiques par statut
        $statusStats = ElectronicSignature::query()
            ->where('tenant_id', tenant()->id)
            ->whereBetween('signature_time', [$startDate, $endDate])
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'summary' => $stats,
                'daily' => $dailyStats,
                'by_level' => $levelStats,
                'by_status' => $statusStats,
                'period' => [
                    'start' => $startDate->toDateString(),
                    'end' => $endDate->toDateString(),
                ],
            ],
        ]);
    }

    /**
     * Vérifier une signature
     */
    public function verify(Request $request): JsonResponse
    {
        $request->validate([
            'signature_id' => 'required|string',
        ]);

        $signature = ElectronicSignature::findBySignatureId($request->signature_id);

        if (!$signature || $signature->tenant_id !== tenant()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Signature non trouvée',
            ], 404);
        }

        try {
            $result = $this->signatureService->verifySignature(
                $signature->getSignedFilePath(),
                $signature->signature_id
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'signature' => $signature,
                    'verification' => $result,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la vérification: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Valider un document signé
     */
    public function validate(Request $request): JsonResponse
    {
        $request->validate([
            'signature_id' => 'required|string',
        ]);

        $signature = ElectronicSignature::findBySignatureId($request->signature_id);

        if (!$signature || $signature->tenant_id !== tenant()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Signature non trouvée',
            ], 404);
        }

        try {
            $result = $this->signatureService->validateSignedDocument(
                $signature->getSignedFilePath()
            );

            // Mettre à jour le résultat de validation
            $signature->updateValidationResult($result);

            return response()->json([
                'success' => true,
                'data' => [
                    'signature' => $signature,
                    'validation' => $result,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la validation: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Signer un document
     */
    public function sign(Request $request): JsonResponse
    {
        $request->validate([
            'document_type' => 'required|string|in:invoice,credit_note',
            'document_id' => 'required|integer',
            'signer_name' => 'required|string|max:255',
            'signer_email' => 'nullable|email|max:255',
            'signer_role' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'reason' => 'nullable|string|max:500',
            'signature_level' => 'nullable|string|in:QES,AES,SES',
        ]);

        try {
            // Récupérer le document
            $documentClass = $request->document_type === 'invoice' 
                ? \App\Models\Invoice::class 
                : \App\Models\CreditNote::class;

            $document = $documentClass::findOrFail($request->document_id);

            // Vérifier que le document appartient au tenant
            if ($document->tenant_id !== tenant()->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Document non trouvé',
                ], 404);
            }

            // Vérifier que le document n'est pas déjà signé
            $existingSignature = ElectronicSignature::query()
                ->where('signable_type', $documentClass)
                ->where('signable_id', $document->id)
                ->where('status', 'valid')
                ->first();

            if ($existingSignature) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ce document est déjà signé',
                ], 422);
            }

            // Générer le Factur-X si nécessaire
            $facturXService = app(\App\Services\FacturXService::class);
            $facturXPath = $document->facturx_path ?? $facturXService->generateFacturX($document);

            if (!$facturXPath) {
                return response()->json([
                    'success' => false,
                    'message' => 'Impossible de générer le fichier Factur-X',
                ], 500);
            }

            // Signer le document
            $signerInfo = [
                'name' => $request->signer_name,
                'email' => $request->signer_email,
                'role' => $request->signer_role ?? 'Signataire',
                'location' => $request->location ?? 'France',
                'reason' => $request->reason ?? 'Signature de document Factur-X',
                'level' => $request->signature_level ?? 'QES',
            ];

            $result = $this->signatureService->signFacturXDocument($facturXPath, $signerInfo);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['error'],
                ], 500);
            }

            // Créer l'entrée de signature
            $signature = ElectronicSignature::createSignature([
                'signable_type' => $documentClass,
                'signable_id' => $document->id,
                'signature_id' => $result['signature_info']['id'],
                'signer_name' => $signerInfo['name'],
                'signer_email' => $signerInfo['email'],
                'signer_role' => $signerInfo['role'],
                'signature_level' => $signerInfo['level'],
                'original_file_path' => $facturXPath,
                'signed_file_path' => $result['signed_path'],
                'timestamp_info' => $result['timestamp_info'],
                'validation_result' => $result['validation_result'],
                'processing_time' => $result['processing_time'],
                'status' => $result['validation_result']['valid'] ? 'valid' : 'failed',
                'metadata' => [
                    'document_type' => $request->document_type,
                    'document_id' => $document->id,
                    'signature_method' => 'electronic',
                    'compliance_level' => 'eIDAS ' . $signerInfo['level'],
                ],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Document signé avec succès',
                'data' => [
                    'signature' => $signature,
                    'signed_path' => $result['signed_path'],
                    'processing_time' => $result['processing_time'],
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la signature: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Télécharger un document signé
     */
    public function download(ElectronicSignature $signature): JsonResponse
    {
        // Vérifier que la signature appartient au tenant
        if ($signature->tenant_id !== tenant()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Signature non trouvée',
            ], 404);
        }

        $filePath = $signature->getSignedFilePath();

        if (!\Storage::exists($filePath)) {
            return response()->json([
                'success' => false,
                'message' => 'Fichier non trouvé',
            ], 404);
        }

        return response()->download(
            \Storage::path($filePath),
            basename($filePath),
            [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="' . basename($filePath) . '"',
            ]
        );
    }

    /**
     * Exporter les signatures
     */
    public function export(Request $request): JsonResponse
    {
        $request->validate([
            'format' => 'required|string|in:csv,xlsx,json',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        try {
            $query = ElectronicSignature::query()
                ->where('tenant_id', tenant()->id)
                ->with(['signable', 'signer']);

            // Filtres de date
            if ($request->filled('start_date')) {
                $query->whereDate('signature_time', '>=', $request->start_date);
            }

            if ($request->filled('end_date')) {
                $query->whereDate('signature_time', '<=', $request->end_date);
            }

            $signatures = $query->orderBy('signature_time', 'desc')->get();

            // Préparer les données pour l'export
            $exportData = $signatures->map(function ($signature) {
                return [
                    'ID Signature' => $signature->signature_id,
                    'Signataire' => $signature->signer_name,
                    'Email' => $signature->signer_email,
                    'Rôle' => $signature->signer_role,
                    'Niveau' => $signature->signature_level,
                    'Document' => $signature->signable_type . ' #' . $signature->signable_id,
                    'Date Signature' => $signature->signature_time->format('d/m/Y H:i:s'),
                    'Statut' => $signature->getFormattedStatus(),
                    'Temps Traitement' => $signature->getFormattedProcessingTime(),
                    'Avec Horodatage' => $signature->hasTimestamp() ? 'Oui' : 'Non',
                    'Conforme eIDAS' => $signature->isEidasCompliant() ? 'Oui' : 'Non',
                ];
            });

            $filename = 'signatures_' . now()->format('Y-m-d_H-i-s') . '.' . $request->format;

            // Générer le fichier selon le format
            switch ($request->format) {
                case 'csv':
                    $content = $this->generateCsv($exportData);
                    break;
                case 'xlsx':
                    $content = $this->generateXlsx($exportData);
                    break;
                case 'json':
                    $content = json_encode($exportData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
                    break;
            }

            return response($content)
                ->header('Content-Type', $this->getContentType($request->format))
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Configuration du service de signature
     */
    public function config(): JsonResponse
    {
        $config = $this->signatureService->getConfiguration();

        return response()->json([
            'success' => true,
            'data' => [
                'service' => $config,
                'tenant' => [
                    'id' => tenant()->id,
                    'name' => tenant()->name,
                ],
                'user' => [
                    'id' => Auth::id(),
                    'name' => Auth::user()->name,
                    'email' => Auth::user()->email,
                ],
            ],
        ]);
    }

    /**
     * Générer le contenu CSV
     */
    private function generateCsv($data): string
    {
        $csv = '';
        
        // En-têtes
        if (!empty($data)) {
            $csv .= implode(';', array_keys($data[0])) . "\n";
        }
        
        // Données
        foreach ($data as $row) {
            $csv .= implode(';', array_map(function ($value) {
                return '"' . str_replace('"', '""', $value) . '"';
            }, $row)) . "\n";
        }
        
        return $csv;
    }

    /**
     * Générer le contenu XLSX (simplifié)
     */
    private function generateXlsx($data): string
    {
        // Pour l'instant, retourner CSV (implémenter XLSX réel si nécessaire)
        return $this->generateCsv($data);
    }

    /**
     * Obtenir le content-type selon le format
     */
    private function getContentType(string $format): string
    {
        return match ($format) {
            'csv' => 'text/csv',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'json' => 'application/json',
            default => 'text/plain',
        };
    }
}