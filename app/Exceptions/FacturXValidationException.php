<?php

namespace App\Exceptions;

use Exception;
use App\Models\Invoice;

/**
 * Exception levée lorsque la validation FacturX échoue
 * Contient des détails structurés sur les champs manquants
 */
class FacturXValidationException extends Exception
{
    protected array $validationErrors;
    protected array $missingFields;
    protected ?Invoice $invoice;

    public function __construct(
        string $message,
        array $validationErrors = [],
        array $missingFields = [],
        ?Invoice $invoice = null
    ) {
        parent::__construct($message);

        $this->validationErrors = $validationErrors;
        $this->missingFields = $missingFields;
        $this->invoice = $invoice;
    }

    /**
     * Obtenir les erreurs de validation
     */
    public function getValidationErrors(): array
    {
        return $this->validationErrors;
    }

    /**
     * Obtenir les champs manquants groupés par entité
     */
    public function getMissingFields(): array
    {
        return $this->missingFields;
    }

    /**
     * Obtenir la facture concernée
     */
    public function getInvoice(): ?Invoice
    {
        return $this->invoice;
    }

    /**
     * Formater le message d'erreur pour l'API
     */
    public function toApiResponse(): array
    {
        return [
            'message' => 'Génération FacturX impossible - Champs obligatoires manquants',
            'error' => 'FACTURX_VALIDATION_ERROR',
            'validation_errors' => $this->validationErrors,
            'missing_fields' => $this->missingFields,
            'invoice_id' => $this->invoice?->id,
            'invoice_number' => $this->invoice?->invoice_number,
            'formatted_message' => $this->formatUserMessage(),
        ];
    }

    /**
     * Formater un message lisible pour l'utilisateur
     */
    public function formatUserMessage(): string
    {
        $message = "❌ Impossible de générer le FacturX - Champs obligatoires manquants:\n\n";

        foreach ($this->missingFields as $entity => $fields) {
            $entityLabel = match($entity) {
                'tenant' => '🏢 Paramètres de votre entreprise',
                'client' => '👤 Informations du client',
                'invoice' => '📄 Données de la facture',
                default => ucfirst($entity)
            };

            $message .= "{$entityLabel}:\n";

            foreach ($fields as $field) {
                $message .= sprintf(
                    "  • %s: %s\n    📍 %s\n",
                    $field['label'],
                    $field['description'],
                    $field['location']
                );
            }

            $message .= "\n";
        }

        $message .= "💡 Complétez ces informations puis réessayez la génération FacturX.";

        return $message;
    }

    /**
     * Vérifier si l'erreur concerne les paramètres du tenant
     */
    public function hasTenantIssues(): bool
    {
        return !empty($this->missingFields['tenant']);
    }

    /**
     * Vérifier si l'erreur concerne les données client
     */
    public function hasClientIssues(): bool
    {
        return !empty($this->missingFields['client']);
    }

    /**
     * Vérifier si l'erreur concerne la facture
     */
    public function hasInvoiceIssues(): bool
    {
        return !empty($this->missingFields['invoice']);
    }
}
