<?php

namespace App\Notifications;

use App\Models\PdpSubmission;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Messages\DatabaseMessage;

class PdpSubmissionAccepted extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        private PdpSubmission $submission,
        private mixed $document
    ) {}

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $documentType = $this->document instanceof \App\Models\Invoice ? 'facture' : 'avoir';
        $documentNumber = $this->document->invoice_number ?? $this->document->credit_note_number;

        return (new MailMessage)
            ->subject('✅ Document accepté par le Portail Public de Facturation')
            ->greeting('Bonjour ' . $notifiable->name . ',')
            ->line("Votre {$documentType} n°{$documentNumber} a été acceptée avec succès par le Portail Public de Facturation.")
            ->line('Détails de la soumission :')
            ->line('- ID de soumission : ' . $this->submission->submission_id)
            ->line('- Référence PDP : ' . ($this->submission->pdp_id ?? 'N/A'))
            ->line('- Date d\'acceptation : ' . $this->submission->accepted_at?->format('d/m/Y H:i'))
            ->action('Voir le document', $this->getDocumentUrl())
            ->line('Le document est maintenant conforme aux exigences de facturation électronique B2B.')
            ->salutation('Cordialement, l\'équipe TimeIsMoney');
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray(object $notifiable): array
    {
        $documentType = $this->document instanceof \App\Models\Invoice ? 'facture' : 'avoir';
        $documentNumber = $this->document->invoice_number ?? $this->document->credit_note_number;

        return [
            'type' => 'pdp_submission_accepted',
            'title' => 'Document accepté par le PDP',
            'message' => "La {$documentType} n°{$documentNumber} a été acceptée par le Portail Public de Facturation.",
            'submission_id' => $this->submission->id,
            'document_type' => get_class($this->document),
            'document_id' => $this->document->id,
            'document_number' => $documentNumber,
            'pdp_id' => $this->submission->pdp_id,
            'accepted_at' => $this->submission->accepted_at,
        ];
    }

    /**
     * Get the database representation of the notification.
     */
    public function toDatabase(object $notifiable): DatabaseMessage
    {
        return new DatabaseMessage($this->toArray($notifiable));
    }

    /**
     * Get the URL for the document
     */
    private function getDocumentUrl(): string
    {
        $baseUrl = config('app.url');
        
        if ($this->document instanceof \App\Models\Invoice) {
            return "{$baseUrl}/invoices/{$this->document->id}";
        } elseif ($this->document instanceof \App\Models\CreditNote) {
            return "{$baseUrl}/credit-notes/{$this->document->id}";
        }

        return $baseUrl;
    }
}