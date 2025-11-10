<?php

namespace App\Jobs;

use App\Models\Invoice;
use App\Models\CreditNote;
use App\Models\PdpSubmission;
use App\Services\PdpService;
use App\Services\FacturXService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendToPdpJob implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Nombre de tentatives maximum
     */
    public int $tries = 3;

    /**
     * Timeout en secondes
     */
    public int $timeout = 120;

    /**
     * Modèle à soumettre (Invoice ou CreditNote)
     */
    public Invoice|CreditNote $model;

    /**
     * ID de la soumission PDP
     */
    public string $submissionId;

    /**
     * Chemin du document à soumettre (signé si disponible)
     */
    public ?string $documentPath;

    /**
     * Create a new job instance.
     */
    public function __construct(Invoice|CreditNote $model, string $submissionId, ?string $documentPath = null)
    {
        $this->model = $model;
        $this->submissionId = $submissionId;
        $this->documentPath = $documentPath;
        
        // Queue prioritaire pour les soumissions PDP
        $this->onQueue('pdp');
    }

    /**
     * Execute the job.
     */
    public function handle(PdpService $pdpService, FacturXService $facturXService): void
    {
        try {
            Log::info('PDP submission job started', [
                'submission_id' => $this->submissionId,
                'model_type' => get_class($this->model),
                'model_id' => $this->model->id,
                'attempt' => $this->attempts(),
            ]);

            // Récupérer la soumission
            $submission = PdpSubmission::where('submission_id', $this->submissionId)->firstOrFail();
            
            // Marquer comme en cours d'envoi
            $submission->update([
                'status' => 'submitting',
                'submitted_at' => now(),
            ]);

            // Utiliser le document fourni ou générer le fichier Factur-X si nécessaire
            $facturXPath = $this->documentPath ?: $this->getOrCreateFacturX($facturXService, $submission);
            
            if (!$facturXPath) {
                throw new \Exception('Impossible de générer le fichier Factur-X');
            }

            // Envoyer au PDP
            $result = $pdpService->submitDocument($this->model, $facturXPath, $submission);

            if ($result['success']) {
                $submission->update([
                    'status' => 'submitted',
                    'pdp_id' => $result['pdp_id'] ?? null,
                    'response_data' => $result['response_data'] ?? null,
                ]);

                // Si mode simulation, programmer le traitement
                if (config('pdp.mode') === 'simulation') {
                    ProcessPdpResponseJob::dispatch($submission->id)
                        ->delay(now()->addSeconds(config('pdp.simulation.processing_delay', 30)));
                }

                Log::info('PDP submission successful', [
                    'submission_id' => $this->submissionId,
                    'pdp_id' => $result['pdp_id'] ?? null,
                ]);

            } else {
                throw new \Exception($result['error'] ?? 'Erreur lors de la soumission PDP');
            }

        } catch (\Exception $e) {
            Log::error('PDP submission job failed', [
                'submission_id' => $this->submissionId,
                'error' => $e->getMessage(),
                'attempt' => $this->attempts(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Marquer l'erreur
            $submission = PdpSubmission::where('submission_id', $this->submissionId)->first();
            if ($submission) {
                $submission->markAsError($e->getMessage());
            }

            // Relancer si tentative restante
            if ($this->attempts() < $this->tries) {
                $this->release(60 * $this->attempts()); // Backoff exponentiel
            }
        }
    }

    /**
     * Job failed
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('PDP submission job permanently failed', [
            'submission_id' => $this->submissionId,
            'error' => $exception->getMessage(),
            'attempts' => $this->attempts(),
        ]);

        $submission = PdpSubmission::where('submission_id', $this->submissionId)->first();
        if ($submission) {
            $submission->markAsError(
                'Échec permanent de la soumission PDP: ' . $exception->getMessage(),
                'JOB_FAILED'
            );
        }
    }

    /**
     * Obtient ou crée le fichier Factur-X
     */
    private function getOrCreateFacturX(FacturXService $facturXService, PdpSubmission $submission): ?string
    {
        // Vérifier si le Factur-X existe déjà
        if ($this->model instanceof Invoice) {
            $facturXPath = $facturXService->generateFacturX($this->model);
        } elseif ($this->model instanceof CreditNote) {
            $facturXPath = $facturXService->generateFacturXForCreditNote($this->model);
        } else {
            return null;
        }

        if ($facturXPath) {
            // Mettre à jour la soumission avec les infos du fichier
            $submission->update([
                'facturx_path' => $facturXPath,
                'original_filename' => basename($facturXPath),
                'file_size' => \Storage::size($facturXPath),
                'file_hash' => hash('sha256', \Storage::get($facturXPath)),
            ]);
        }

        return $facturXPath;
    }
}
