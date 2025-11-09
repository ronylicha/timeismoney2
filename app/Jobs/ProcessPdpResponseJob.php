<?php

namespace App\Jobs;

use App\Models\PdpSubmission;
use App\Services\PdpService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessPdpResponseJob implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    /**
     * ID de la soumission PDP
     */
    public int $submissionId;

    /**
     * Create a new job instance.
     */
    public function __construct(int $submissionId)
    {
        $this->submissionId = $submissionId;
        $this->onQueue('pdp');
    }

    /**
     * Execute the job.
     */
    public function handle(PdpService $pdpService): void
    {
        try {
            $submission = PdpSubmission::findOrFail($this->submissionId);
            
            Log::info('Processing PDP response', [
                'submission_id' => $this->submissionId,
                'pdp_id' => $submission->pdp_id,
                'current_status' => $submission->status,
            ]);

            // Marquer comme en traitement
            $submission->update(['status' => 'processing']);

            // Simuler la vérification du statut auprès du PDP
            $result = $pdpService->checkStatus($submission);

            if ($result['success']) {
                $status = $result['status'];
                $responseData = $result['response_data'] ?? [];

                switch ($status) {
                    case 'accepted':
                        $submission->markAsAccepted($responseData);
                        
                        // Notifier l'utilisateur
                        $this->notifySuccess($submission);
                        break;
                        
                    case 'rejected':
                        $errorMessage = $responseData['error_message'] ?? 'Facture rejetée par le PDP';
                        $errorCode = $responseData['error_code'] ?? 'REJECTED';
                        $submission->markAsRejected($errorMessage, $errorCode, $responseData);
                        
                        // Notifier l'utilisateur
                        $this->notifyRejection($submission);
                        break;
                        
                    case 'processing':
                        // Toujours en traitement, programmer une nouvelle vérification
                        $submission->update(['status' => 'processing']);
                        
                        ProcessPdpResponseJob::dispatch($this->submissionId)
                            ->delay(now()->addMinutes(2));
                        break;
                        
                    default:
                        throw new \Exception("Statut PDP inconnu: {$status}");
                }

                Log::info('PDP response processed', [
                    'submission_id' => $this->submissionId,
                    'new_status' => $status,
                ]);

            } else {
                throw new \Exception($result['error'] ?? 'Erreur lors de la vérification du statut PDP');
            }

        } catch (\Exception $e) {
            Log::error('PDP response processing failed', [
                'submission_id' => $this->submissionId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $submission = PdpSubmission::find($this->submissionId);
            if ($submission) {
                $submission->markAsError($e->getMessage(), 'RESPONSE_PROCESSING_ERROR');
            }
        }
    }

    /**
     * Notifie le succès de la soumission
     */
    private function notifySuccess(PdpSubmission $submission): void
    {
        try {
            $user = $submission->user;
            $model = $submission->submittable;
            
            if ($user && $model) {
                // Envoyer notification
                $user->notify(new \App\Notifications\PdpSubmissionAccepted($submission, $model));
                
                // Envoyer email si configuré
                if (config('pdp.notifications.email_enabled', true)) {
                    \Mail::to($user->email)->send(
                        new \App\Mail\PdpSubmissionAcceptedMail($submission, $model)
                    );
                }
            }
        } catch (\Exception $e) {
            Log::error('Failed to send PDP success notification', [
                'submission_id' => $submission->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Notifie le rejet de la soumission
     */
    private function notifyRejection(PdpSubmission $submission): void
    {
        try {
            $user = $submission->user;
            $model = $submission->submittable;
            
            if ($user && $model) {
                // Envoyer notification
                $user->notify(new \App\Notifications\PdpSubmissionRejected($submission, $model));
                
                // Envoyer email si configuré
                if (config('pdp.notifications.email_enabled', true)) {
                    \Mail::to($user->email)->send(
                        new \App\Mail\PdpSubmissionRejectedMail($submission, $model)
                    );
                }
            }
        } catch (\Exception $e) {
            Log::error('Failed to send PDP rejection notification', [
                'submission_id' => $submission->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
