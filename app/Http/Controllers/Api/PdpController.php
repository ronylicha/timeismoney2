<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\CreditNote;
use App\Models\PdpSubmission;
use App\Jobs\SendToPdpJob;
use App\Services\PdpService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class PdpController extends Controller
{
    /**
     * Soumettre une facture au PDP
     */
    public function submitInvoice(Request $request, Invoice $invoice): JsonResponse
    {
        $this->authorize('update', $invoice);

        $request->validate([
            'force' => 'boolean',
        ]);

        try {
            // Vérifier si PDP est activé
            if (!config('pdp.enabled', false)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Le portail public de facturation n\'est pas activé',
                ], 403);
            }

            // Vérifier si une soumission existe déjà
            $existingSubmission = PdpSubmission::where('submittable_type', Invoice::class)
                ->where('submittable_id', $invoice->id)
                ->whereIn('status', ['pending', 'submitting', 'submitted', 'processing', 'accepted'])
                ->first();

            if ($existingSubmission && !$request->boolean('force')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cette facture est déjà en cours de soumission au PDP',
                    'submission' => $existingSubmission,
                ], 409);
            }

            // Créer une nouvelle soumission
            $submission = PdpSubmission::create([
                'submittable_type' => Invoice::class,
                'submittable_id' => $invoice->id,
                'submission_id' => PdpSubmission::generateSubmissionId(),
                'status' => 'pending',
                'pdp_mode' => config('pdp.mode', 'simulation'),
                'user_id' => Auth::id(),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            // Lancer le job de soumission
            SendToPdpJob::dispatch($invoice, $submission->submission_id);

            Log::info('Invoice submitted to PDP', [
                'invoice_id' => $invoice->id,
                'submission_id' => $submission->submission_id,
                'user_id' => Auth::id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Facture soumise au PDP avec succès',
                'submission' => $submission,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to submit invoice to PDP', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage(),
                'user_id' => Auth::id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la soumission au PDP: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Soumettre un avoir au PDP
     */
    public function submitCreditNote(Request $request, CreditNote $creditNote): JsonResponse
    {
        $this->authorize('update', $creditNote);

        $request->validate([
            'force' => 'boolean',
        ]);

        try {
            // Vérifier si PDP est activé
            if (!config('pdp.enabled', false)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Le portail public de facturation n\'est pas activé',
                ], 403);
            }

            // Vérifier si une soumission existe déjà
            $existingSubmission = PdpSubmission::where('submittable_type', CreditNote::class)
                ->where('submittable_id', $creditNote->id)
                ->whereIn('status', ['pending', 'submitting', 'submitted', 'processing', 'accepted'])
                ->first();

            if ($existingSubmission && !$request->boolean('force')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cet avoir est déjà en cours de soumission au PDP',
                    'submission' => $existingSubmission,
                ], 409);
            }

            // Créer une nouvelle soumission
            $submission = PdpSubmission::create([
                'submittable_type' => CreditNote::class,
                'submittable_id' => $creditNote->id,
                'submission_id' => PdpSubmission::generateSubmissionId(),
                'status' => 'pending',
                'pdp_mode' => config('pdp.mode', 'simulation'),
                'user_id' => Auth::id(),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            // Lancer le job de soumission
            SendToPdpJob::dispatch($creditNote, $submission->submission_id);

            Log::info('Credit note submitted to PDP', [
                'credit_note_id' => $creditNote->id,
                'submission_id' => $submission->submission_id,
                'user_id' => Auth::id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Avoir soumis au PDP avec succès',
                'submission' => $submission,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to submit credit note to PDP', [
                'credit_note_id' => $creditNote->id,
                'error' => $e->getMessage(),
                'user_id' => Auth::id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la soumission au PDP: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtenir le statut d'une soumission
     */
    public function getSubmissionStatus(Request $request, string $submissionId): JsonResponse
    {
        try {
            $submission = PdpSubmission::where('submission_id', $submissionId)
                ->with(['submittable', 'user'])
                ->firstOrFail();

            // Vérifier les permissions
            $this->authorize('view', $submission->submittable);

            return response()->json([
                'success' => true,
                'submission' => $submission,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to get PDP submission status', [
                'submission_id' => $submissionId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Soumission introuvable',
            ], 404);
        }
    }

    /**
     * Retenter une soumission échouée
     */
    public function retrySubmission(Request $request, string $submissionId): JsonResponse
    {
        try {
            $submission = PdpSubmission::where('submission_id', $submissionId)
                ->with('submittable')
                ->firstOrFail();

            // Vérifier les permissions
            $this->authorize('update', $submission->submittable);

            // Vérifier si la soumission peut être retentée
            if (!$submission->canRetry()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cette soumission ne peut pas être retentée',
                    'reason' => $submission->retry_count >= 3 ? 'Nombre maximum de tentatives atteint' : 'Statut non retentable',
                ], 400);
            }

            // Réinitialiser la soumission
            $submission->update([
                'status' => 'pending',
                'error_message' => null,
                'error_code' => null,
                'next_retry_at' => null,
            ]);

            // Relancer le job
            $model = $submission->submittable;
            SendToPdpJob::dispatch($model, $submission->submission_id);

            Log::info('PDP submission retry', [
                'submission_id' => $submissionId,
                'attempt' => $submission->retry_count + 1,
                'user_id' => Auth::id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Soumission retentée avec succès',
                'submission' => $submission->fresh(),
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to retry PDP submission', [
                'submission_id' => $submissionId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la nouvelle tentative: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Lister les soumissions PDP
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['nullable', 'string', Rule::in([
                'draft', 'pending', 'submitting', 'submitted', 
                'processing', 'accepted', 'rejected', 'error', 'cancelled'
            ])],
            'per_page' => 'nullable|integer|min:1|max:100',
            'page' => 'nullable|integer|min:1',
        ]);

        try {
            $query = PdpSubmission::with(['submittable', 'user'])
                ->orderBy('created_at', 'desc');

            // Filtrer par statut
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            // Filtrer par tenant
            if (Auth::user()->hasRole('tenant_admin')) {
                $query->whereHas('submittable', function ($q) {
                    $q->where('tenant_id', Auth::user()->tenant_id);
                });
            }

            $submissions = $query->paginate($request->input('per_page', 20));

            return response()->json([
                'success' => true,
                'data' => $submissions,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to list PDP submissions', [
                'error' => $e->getMessage(),
                'user_id' => Auth::id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des soumissions',
            ], 500);
        }
    }

    /**
     * Obtenir les statistiques PDP
     */
    public function getStats(Request $request): JsonResponse
    {
        try {
            $query = PdpSubmission::query();

            // Filtrer par tenant si nécessaire
            if (Auth::user()->hasRole('tenant_admin')) {
                $query->whereHas('submittable', function ($q) {
                    $q->where('tenant_id', Auth::user()->tenant_id);
                });
            }

            $stats = [
                'total' => $query->count(),
                'pending' => $query->whereIn('status', ['pending', 'submitting', 'processing'])->count(),
                'successful' => $query->where('status', 'accepted')->count(),
                'failed' => $query->whereIn('status', ['rejected', 'error'])->count(),
                'retryable' => $query->where('status', 'error')->where('retry_count', '<', 3)->count(),
            ];

            // Statistiques des 30 derniers jours
            $thirtyDaysAgo = now()->subDays(30);
            $recentStats = [
                'total' => $query->where('created_at', '>=', $thirtyDaysAgo)->count(),
                'successful' => $query->where('created_at', '>=', $thirtyDaysAgo)->where('status', 'accepted')->count(),
                'failed' => $query->where('created_at', '>=', $thirtyDaysAgo)->whereIn('status', ['rejected', 'error'])->count(),
            ];

            return response()->json([
                'success' => true,
                'stats' => array_merge($stats, [
                    'last_30_days' => $recentStats,
                ]),
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to get PDP stats', [
                'error' => $e->getMessage(),
                'user_id' => Auth::id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques',
            ], 500);
        }
    }
}
