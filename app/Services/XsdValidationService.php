<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Service de validation XSD pour les documents Factur-X
 * 
 * Valide les fichiers XML contre les schémas EN 16931 (norme européenne)
 * et les profils Factur-X (BASIC, COMFORT, EXTENDED)
 */
class XsdValidationService
{
    private array $schemas = [];
    private string $schemasPath;

    public function __construct()
    {
        $this->schemasPath = storage_path('schemas/en16931');
        $this->loadSchemas();
    }

    /**
     * Valide un contenu XML contre un schéma XSD
     */
    public function validateXml(string $xmlContent, string $profile = 'BASIC'): array
    {
        try {
            $startTime = microtime(true);

            // Créer un DOMDocument
            $dom = new \DOMDocument();
            $dom->loadXML($xmlContent);

            // Vérifier que le schéma existe
            if (!isset($this->schemas[$profile])) {
                return [
                    'valid' => false,
                    'errors' => ["Profil Factur-X '{$profile}' non supporté"],
                    'warnings' => [],
                    'profile' => $profile,
                    'validation_time' => 0,
                ];
            }

            // Valider contre le XSD
            $schema = $this->schemas[$profile];
            $internalErrors = libxml_use_internal_errors(true);
            $isValid = $dom->schemaValidate($schema);
            $errors = libxml_get_errors();
            libxml_use_internal_errors($internalErrors);

            $validationTime = round((microtime(true) - $startTime) * 1000, 2);

            // Analyser les erreurs
            $formattedErrors = [];
            $warnings = [];

            foreach ($errors as $error) {
                $formattedError = $this->formatXsdError($error);
                
                if ($error->level === LIBXML_ERR_WARNING) {
                    $warnings[] = $formattedError;
                } else {
                    $formattedErrors[] = $formattedError;
                }

                // Détecter les erreurs critiques de conformité
                $this->detectComplianceIssues($error, $formattedErrors, $warnings);
            }

            $result = [
                'valid' => $isValid && empty($formattedErrors),
                'errors' => $formattedErrors,
                'warnings' => $warnings,
                'profile' => $profile,
                'validation_time' => $validationTime,
                'xml_size' => strlen($xmlContent),
                'schema_version' => $this->getSchemaVersion($profile),
            ];

            // Ajouter des métriques de conformité
            $result['compliance_score'] = $this->calculateComplianceScore($result);
            $result['critical_issues'] = $this->getCriticalIssues($formattedErrors);

            Log::info('XSD validation completed', [
                'profile' => $profile,
                'valid' => $result['valid'],
                'errors_count' => count($formattedErrors),
                'warnings_count' => count($warnings),
                'validation_time' => $validationTime,
                'compliance_score' => $result['compliance_score'],
            ]);

            return $result;

        } catch (\Exception $e) {
            Log::error('XSD validation failed', [
                'profile' => $profile,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'valid' => false,
                'errors' => ["Erreur lors de la validation XSD: " . $e->getMessage()],
                'warnings' => [],
                'profile' => $profile,
                'validation_time' => 0,
            ];
        }
    }

    /**
     * Valide un fichier Factur-X complet (PDF + XML embarqué)
     */
    public function validateFacturXFile(string $pdfPath): array
    {
        try {
            if (!Storage::exists($pdfPath)) {
                return [
                    'valid' => false,
                    'errors' => ["Fichier PDF non trouvé: {$pdfPath}"],
                    'warnings' => [],
                ];
            }

            // Extraire le XML du PDF
            $xmlContent = $this->extractXmlFromPdf($pdfPath);
            
            if (!$xmlContent) {
                return [
                    'valid' => false,
                    'errors' => ["Impossible d'extraire le XML du fichier Factur-X"],
                    'warnings' => [],
                ];
            }

            // Détecter le profil Factur-X depuis le XML
            $profile = $this->detectFacturXProfile($xmlContent);

            // Valider le XML
            $xmlValidation = $this->validateXml($xmlContent, $profile);

            // Ajouter les validations spécifiques PDF/A-3
            $pdfValidation = $this->validatePdfCompliance($pdfPath);

            return array_merge($xmlValidation, [
                'pdf_valid' => $pdfValidation['valid'],
                'pdf_errors' => $pdfValidation['errors'],
                'pdf_warnings' => $pdfValidation['warnings'],
                'file_size' => Storage::size($pdfPath),
                'file_path' => $pdfPath,
            ]);

        } catch (\Exception $e) {
            Log::error('Factur-X file validation failed', [
                'pdf_path' => $pdfPath,
                'error' => $e->getMessage(),
            ]);

            return [
                'valid' => false,
                'errors' => ["Erreur lors de la validation du fichier Factur-X: " . $e->getMessage()],
                'warnings' => [],
            ];
        }
    }

    /**
     * Charge les schémas XSD depuis le stockage
     */
    private function loadSchemas(): void
    {
        $schemaFiles = [
            'BASIC' => 'FACTUR-X_BASIC.xsd',
            'COMFORT' => 'FACTUR-X_COMFORT.xsd', 
            'EXTENDED' => 'FACTUR-X_EXTENDED.xsd',
            'EN16931' => 'EN16931_CII-D16B.xsd',
        ];

        foreach ($schemaFiles as $profile => $filename) {
            $schemaPath = $this->schemasPath . '/' . $filename;
            
            if (file_exists($schemaPath)) {
                $this->schemas[$profile] = $schemaPath;
                Log::debug("XSD schema loaded", [
                    'profile' => $profile,
                    'path' => $schemaPath,
                ]);
            } else {
                Log::warning("XSD schema not found", [
                    'profile' => $profile,
                    'path' => $schemaPath,
                ]);
            }
        }
    }

    /**
     * Formate une erreur XSD en message compréhensible
     */
    private function formatXsdError(\LibXMLError $error): array
    {
        return [
            'message' => trim($error->message),
            'code' => $error->code,
            'level' => $this->getErrorLevel($error->level),
            'line' => $error->line,
            'column' => $error->column,
            'file' => $error->file ?: 'XML',
            'type' => $this->getErrorType($error),
            'suggestion' => $this->getErrorSuggestion($error),
        ];
    }

    /**
     * Obtient le niveau d'erreur en français
     */
    private function getErrorLevel(int $level): string
    {
        return match ($level) {
            LIBXML_ERR_ERROR => 'Erreur',
            LIBXML_ERR_FATAL => 'Erreur fatale',
            LIBXML_ERR_WARNING => 'Avertissement',
            default => 'Inconnu',
        };
    }

    /**
     * Détermine le type d'erreur pour suggestions
     */
    private function getErrorType(\LibXMLError $error): string
    {
        $message = strtolower($error->message);

        if (str_contains($message, 'element')) {
            return 'element';
        } elseif (str_contains($message, 'attribute')) {
            return 'attribute';
        } elseif (str_contains($message, 'type')) {
            return 'datatype';
        } elseif (str_contains($message, 'required')) {
            return 'required';
        } elseif (str_contains($message, 'pattern')) {
            return 'pattern';
        }

        return 'general';
    }

    /**
     * Fournit une suggestion pour corriger l'erreur
     */
    private function getErrorSuggestion(\LibXMLError $error): string
    {
        $message = strtolower($error->message);
        $type = $this->getErrorType($error);

        return match ($type) {
            'element' => "Vérifiez que l'élément est autorisé par le schéma EN 16931",
            'attribute' => "Vérifiez que l'attribut est correctement orthographié et autorisé",
            'datatype' => "Vérifiez le format et le type de la valeur",
            'required' => "Ajoutez l'élément ou l'attribut manquant",
            'pattern' => "Corrigez le format pour qu'il corresponde au motif requis",
            default => "Consultez la documentation EN 16931 pour corriger cette erreur",
        };
    }

    /**
     * Détecte les problèmes critiques de conformité
     */
    private function detectComplianceIssues(\LibXMLError $error, array &$errors, array &$warnings): void
    {
        $message = strtolower($error->message);

        // Éléments obligatoires manquants
        if (str_contains($message, 'exchangeddocument') || str_contains($message, 'crossindustryinvoice')) {
            $errors[] = [
                'message' => "Élément racine CrossIndustryInvoice manquant ou invalide",
                'type' => 'critical',
                'suggestion' => "Le document doit contenir l'élément rsm:CrossIndustryInvoice",
            ];
        }

        // Informations vendeur manquantes
        if (str_contains($message, 'sellertrade') || str_contains($message, 'seller')) {
            $errors[] = [
                'message' => "Informations sur le vendeur incomplètes",
                'type' => 'critical',
                'suggestion' => "Ajoutez le nom, l'adresse et le SIRET du vendeur",
            ];
        }

        // Informations acheteur manquantes
        if (str_contains($message, 'buyertrade') || str_contains($message, 'buyer')) {
            $errors[] = [
                'message' => "Informations sur l'acheteur incomplètes",
                'type' => 'critical',
                'suggestion' => "Ajoutez le nom et l'adresse de l'acheteur",
            ];
        }

        // TVA manquante ou incorrecte
        if (str_contains($message, 'vat') || str_contains($message, 'tax')) {
            $errors[] = [
                'message' => "Informations de TVA manquantes ou incorrectes",
                'type' => 'critical',
                'suggestion' => "Vérifiez les taux de TVA et les montants associés",
            ];
        }

        // Numéro de facture manquant
        if (str_contains($message, 'id') && str_contains($message, 'exchangeddocument')) {
            $errors[] = [
                'message' => "Numéro de facture manquant",
                'type' => 'critical',
                'suggestion' => "Ajoutez un numéro de facture unique",
            ];
        }
    }

    /**
     * Calcule un score de conformité (0-100)
     */
    private function calculateComplianceScore(array $validationResult): int
    {
        $errorCount = count($validationResult['errors']);
        $warningCount = count($validationResult['warnings']);
        $criticalCount = count($validationResult['critical_issues'] ?? []);

        // Pénalités
        $score = 100;
        $score -= ($errorCount * 10); // -10 points par erreur
        $score -= ($warningCount * 2); // -2 points par avertissement
        $score -= ($criticalCount * 30); // -30 points par erreur critique

        return max(0, min(100, $score));
    }

    /**
     * Extrait les problèmes critiques
     */
    private function getCriticalIssues(array $errors): array
    {
        return array_filter($errors, fn($error) => ($error['type'] ?? '') === 'critical');
    }

    /**
     * Extrait le XML d'un fichier PDF Factur-X
     */
    private function extractXmlFromPdf(string $pdfPath): ?string
    {
        try {
            $pdfContent = Storage::get($pdfPath);
            
            // Chercher l'attachement XML dans le PDF
            if (preg_match('/<CrossIndustryInvoice.*?<\/CrossIndustryInvoice>/s', $pdfContent, $matches)) {
                return $matches[0];
            }

            // Alternative : utiliser une librairie PDF si disponible
            // Pour l'instant, retourner null si non trouvé
            return null;

        } catch (\Exception $e) {
            Log::error('Failed to extract XML from PDF', [
                'pdf_path' => $pdfPath,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Détecte le profil Factur-X depuis le contenu XML
     */
    private function detectFacturXProfile(string $xmlContent): string
    {
        // Chercher des indicateurs de profil dans le XML
        if (str_contains($xmlContent, 'urn:factur-x.eu:1p0:extended')) {
            return 'EXTENDED';
        } elseif (str_contains($xmlContent, 'urn:factur-x.eu:1p0:comfort')) {
            return 'COMFORT';
        } elseif (str_contains($xmlContent, 'urn:factur-x.eu:1p0:basic')) {
            return 'BASIC';
        }

        // Par défaut, utiliser BASIC
        return 'BASIC';
    }

    /**
     * Valide la conformité PDF/A-3
     */
    private function validatePdfCompliance(string $pdfPath): array
    {
        $errors = [];
        $warnings = [];

        try {
            $pdfContent = Storage::get($pdfPath);
            
            // Vérifications basiques
            if (!str_contains($pdfContent, '/Type /Catalog')) {
                $errors[] = "Le PDF n'est pas un PDF/A valide";
            }

            if (!str_contains($pdfContent, 'CrossIndustryInvoice')) {
                $errors[] = "Le PDF ne contient pas de XML Factur-X embarqué";
            }

            // Vérifier la taille maximale
            $maxSize = 10 * 1024 * 1024; // 10MB
            if (Storage::size($pdfPath) > $maxSize) {
                $warnings[] = "Le fichier PDF dépasse la taille recommandée (10MB)";
            }

        } catch (\Exception $e) {
            $errors[] = "Erreur lors de la validation PDF: " . $e->getMessage();
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'warnings' => $warnings,
        ];
    }

    /**
     * Obtient la version du schéma
     */
    private function getSchemaVersion(string $profile): string
    {
        return match ($profile) {
            'BASIC' => '1.0.0',
            'COMFORT' => '2.0.0', 
            'EXTENDED' => '2.1.0',
            'EN16931' => 'D16B',
            default => 'Unknown',
        };
    }

    /**
     * Télécharge les schémas XSD depuis les sources officielles
     */
    public function downloadSchemas(): bool
    {
        try {
            // Créer le répertoire des schémas
            if (!is_dir($this->schemasPath)) {
                mkdir($this->schemasPath, 0755, true);
            }

            // Vérifier si les schémas existent déjà localement
            $schemaFiles = [
                'BASIC' => 'FACTUR-X_BASIC.xsd',
                'COMFORT' => 'FACTUR-X_COMFORT.xsd',
                'EXTENDED' => 'FACTUR-X_EXTENDED.xsd',
                'EN16931' => 'EN16931_CII-D16B.xsd',
            ];

            $allExist = true;
            foreach ($schemaFiles as $profile => $filename) {
                $schemaPath = $this->schemasPath . '/' . $filename;
                if (!file_exists($schemaPath)) {
                    $allExist = false;
                    break;
                }
            }

            if ($allExist) {
                Log::info("XSD schemas already exist locally");
                $this->loadSchemas();
                return true;
            }

            // Tenter de télécharger depuis les URLs officielles
            $schemasUrl = [
                'BASIC' => 'https://www.ferd-net.de/standards/factur-x/1.0.0/factur-x.xsd',
                'COMFORT' => 'https://www.ferd-net.de/standards/factur-x/2.0.0/factur-x.xsd',
                'EXTENDED' => 'https://www.ferd-net.de/standards/factur-x/2.1.0/factur-x.xsd',
                'EN16931' => 'https://docs.peppol.eu/poacc/billing/3.0/schemas/EN16931_CII-D16B.xsd',
            ];

            foreach ($schemasUrl as $profile => $url) {
                $filename = $schemaFiles[$profile];
                $schemaPath = $this->schemasPath . '/' . $filename;
                
                // Télécharger le schéma
                $content = @file_get_contents($url);
                if ($content === false) {
                    Log::warning("Failed to download XSD schema, using local fallback", [
                        'profile' => $profile,
                        'url' => $url,
                    ]);
                    continue;
                }

                file_put_contents($schemaPath, $content);
                Log::info("XSD schema downloaded", [
                    'profile' => $profile,
                    'path' => $schemaPath,
                ]);
            }

            // Recharger les schémas
            $this->loadSchemas();
            return !empty($this->schemas);

        } catch (\Exception $e) {
            Log::error("Failed to download XSD schemas", [
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Vérifie si les schémas sont disponibles
     */
    public function schemasAvailable(): bool
    {
        return !empty($this->schemas);
    }

    /**
     * Liste les profils disponibles
     */
    public function getAvailableProfiles(): array
    {
        return array_keys($this->schemas);
    }
}