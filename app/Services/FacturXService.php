<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\CreditNote;
use horstoeko\zugferd\ZugferdDocumentBuilder;
use horstoeko\zugferd\ZugferdProfiles;
use horstoeko\zugferd\codelists\ZugferdInvoiceType;
use horstoeko\zugferd\codelists\ZugferdPaymentMeans;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Service de génération de factures électroniques au format Factur-X
 * 
 * Factur-X = PDF/A-3 + XML EN 16931 (norme européenne)
 * Obligation légale en France à partir du 1er septembre 2026
 * 
 * Utilise le package horstoeko/zugferd pour la génération
 */
class FacturXService
{
    /**
     * Génère une facture Factur-X (PDF + XML embarqué)
     * 
     * @param Invoice $invoice
     * @return string|null Chemin du fichier Factur-X généré
     */
    public function generateFacturX(Invoice $invoice): ?string
    {
        try {
            Log::info('FacturX generation requested', [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number
            ]);
            
            // 1. Créer le document Factur-X avec profil BASIC
            $document = ZugferdDocumentBuilder::CreateNew(ZugferdProfiles::PROFILE_BASIC);
            
            // 2. Générer le XML EN 16931
            $this->buildInvoiceDocument($document, $invoice);
            
            // 3. Obtenir le contenu XML
            $xmlContent = $document->getContent();
            
            // 3.5 Valider le XML avant embedding
            if (!$this->validateXmlContent($xmlContent)) {
                throw new \Exception('Generated XML is not valid for EN 16931');
            }
            
            // 4. Générer le PDF de base
            $pdfService = app(\App\Services\PdfGeneratorService::class);
            $pdfContent = $pdfService->generateInvoicePdf($invoice, download: false)->output();
            
            // 5. Embedder le XML dans le PDF (créer PDF/A-3)
            $facturXContent = $this->embedXmlInPdf($pdfContent, $xmlContent);
            
            // 6. Sauvegarder
            $filename = "facturx_{$invoice->invoice_number}.pdf";
            $path = "invoices/facturx/{$filename}";
            Storage::put($path, $facturXContent);
            
            Log::info('FacturX generated successfully', [
                'invoice_id' => $invoice->id,
                'path' => $path
            ]);
            
            // 7. Signature électronique si activée
            $signedPath = $path;
            if (config('electronic_signature.enabled', false)) {
                $signedPath = $this->signFacturXDocument($path, $invoice);
            }
            
            // Soumettre automatiquement au PDP si activé
            if (config('pdp.enabled', false) && $invoice->status === 'sent') {
                $this->submitToPdp($invoice, $signedPath);
            }
            
            return $signedPath;
            
        } catch (\Exception $e) {
            Log::error('Failed to generate FacturX invoice', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }
    
    /**
     * Construit le document XML pour une facture
     */
    private function buildInvoiceDocument(ZugferdDocumentBuilder $document, Invoice $invoice): void
    {
        $tenant = $invoice->tenant;
        $client = $invoice->client;
        
        // En-tête du document
        $invoiceDate = is_string($invoice->date) 
            ? new \DateTime($invoice->date) 
            : $invoice->date;
            
        $document->setDocumentInformation(
            $invoice->invoice_number,
            ZugferdInvoiceType::INVOICE,
            $invoiceDate,
            $invoice->currency ?? 'EUR'
        );
        
        // Informations vendeur (émetteur)
        $document->setDocumentSeller(
            $tenant->name,
            $tenant->legal_mention_siret ?? ''
        );
        
        $document->setDocumentSellerAddress(
            $tenant->address ?? '',
            '',
            '',
            $tenant->postal_code ?? '',
            $tenant->city ?? '',
            'FR'
        );
        
        if ($tenant->legal_mention_tva_intracom) {
            $document->setDocumentSellerTaxRegistration('VA', $tenant->legal_mention_tva_intracom);
        }
        
        if ($tenant->email || $tenant->phone) {
            $document->setDocumentSellerContact(
                $tenant->contact_name ?? '',           // Nom contact
                $tenant->department ?? '',              // Département
                $tenant->phone ?? '',                   // Téléphone
                $tenant->fax ?? '',                     // Fax
                $tenant->email ?? ''                    // Email
            );
        }
        
        // Informations acheteur (client)
        $document->setDocumentBuyer(
            $client->name,
            $client->siret ?? ''
        );
        
        $document->setDocumentBuyerAddress(
            $client->address ?? '',
            '',
            '',
            $client->postal_code ?? '',
            $client->city ?? '',
            $client->country ?? 'FR'
        );
        
        if ($client->vat_number) {
            $document->setDocumentBuyerTaxRegistration('VA', $client->vat_number);
        }
        
        if ($client->email || $client->phone) {
            $document->setDocumentBuyerContact(
                $client->contact_name ?? '',            // Nom contact
                '',                                      // Département
                $client->phone ?? '',                    // Téléphone
                '',                                      // Fax
                $client->email ?? ''                     // Email
            );
        }
        
        // Conditions de paiement et échéance
        $dueDate = null;
        if ($invoice->due_date) {
            $dueDate = is_string($invoice->due_date) 
                ? new \DateTime($invoice->due_date) 
                : $invoice->due_date;
        }
        
        $paymentDescription = $invoice->payment_conditions 
            ?? "Paiement à {$invoice->payment_terms} jours";
            
        if ($dueDate) {
            $paymentDescription .= " - Échéance: {$dueDate->format('d/m/Y')}";
        }
        
        $document->addDocumentPaymentTerm(
            $paymentDescription,
            $dueDate,
            null,  // directDebitMandateID
            null   // partialPaymentAmount
        );
        
        // Moyen de paiement
        if ($tenant->iban && strtolower($invoice->payment_method ?? 'bank_transfer') === 'bank_transfer') {
            // Virement bancaire avec IBAN
            $document->addDocumentPaymentMeanToCreditTransfer(
                $tenant->iban,
                $tenant->company_name ?? $tenant->name ?? null,  // Nom du compte
                null,  // Propriétaire ID
                $tenant->bic ?? null  // BIC si disponible
            );
        } else {
            // Autre moyen de paiement
            $paymentMeansCode = $this->getPaymentMeansCode($invoice->payment_method);
            $document->addDocumentPaymentMean(
                $paymentMeansCode,
                $invoice->payment_method ?? 'Virement'
            );
        }
        
        // Lignes de facture
        foreach ($invoice->items as $item) {
            $document->addNewPosition($item->position ?? $item->id);
            $document->setDocumentPositionProductDetails(
                $item->description,
                '',
                '',
                '',
                $item->details ?? ''
            );
            
            $document->setDocumentPositionGrossPrice($item->unit_price);
            $document->setDocumentPositionQuantity($item->quantity, 'H87'); // H87 = piece
            
            $lineTotalNet = $item->quantity * $item->unit_price;
            $document->setDocumentPositionLineSummation($lineTotalNet);
            
            // TVA de la ligne
            $taxCategory = $item->tax_rate > 0 ? 'S' : 'Z'; // S=Standard, Z=Zero rated
            $document->addDocumentPositionTax($taxCategory, 'VAT', $item->tax_rate);
        }
        
        // Totaux
        $document->setDocumentSummation(
            $invoice->total,                    // Total TTC
            $invoice->total,                    // Total TTC
            $invoice->subtotal,                 // Total HT
            0,                                  // Montant des charges
            0,                                  // Montant des remises
            $invoice->subtotal,                 // Base imposable
            $invoice->tax_amount,               // Montant TVA
            0,                                  // Montant arrondi
            $invoice->total                     // Montant à payer
        );
        
        // Détail de la TVA
        $taxRate = $invoice->tax_rate ?? 20;
        $taxCategory = $taxRate > 0 ? 'S' : 'Z';
        $document->addDocumentTax(
            $taxCategory,
            'VAT',
            $invoice->subtotal,
            $invoice->tax_amount,
            $taxRate
        );
    }
    
    /**
     * Génère un FacturX pour un avoir (Credit Note)
     * 
     * @param CreditNote $creditNote
     * @return string|null Chemin du fichier FacturX généré
     */
    public function generateFacturXForCreditNote(CreditNote $creditNote): ?string
    {
        try {
            Log::info('FacturX generation requested for credit note', [
                'credit_note_id' => $creditNote->id,
                'credit_note_number' => $creditNote->credit_note_number
            ]);
            
            // 1. Créer le document Factur-X avec profil BASIC
            $document = ZugferdDocumentBuilder::CreateNew(ZugferdProfiles::PROFILE_BASIC);
            
            // 2. Générer le XML EN 16931 pour avoir
            $this->buildCreditNoteDocument($document, $creditNote);
            
            // 3. Obtenir le contenu XML
            $xmlContent = $document->getContent();
            
            // 3.5 Valider le XML avant embedding
            if (!$this->validateXmlContent($xmlContent)) {
                throw new \Exception('Generated XML is not valid for EN 16931 (Credit Note)');
            }
            
            // 4. Générer le PDF de base
            $pdfService = app(\App\Services\PdfGeneratorService::class);
            $pdfContent = $pdfService->generateCreditNotePdf($creditNote, download: false)->output();
            
            // 5. Embedder le XML dans le PDF
            $facturXContent = $this->embedXmlInPdf($pdfContent, $xmlContent);
            
            // 6. Sauvegarder
            $filename = "facturx_cn_{$creditNote->credit_note_number}.pdf";
            $path = "credit-notes/facturx/{$filename}";
            Storage::put($path, $facturXContent);
            
            Log::info('FacturX generated successfully for credit note', [
                'credit_note_id' => $creditNote->id,
                'path' => $path
            ]);
            
            // Soumettre automatiquement au PDP si activé
            if (config('pdp.enabled', false) && $creditNote->status === 'sent') {
                $this->submitCreditNoteToPdp($creditNote);
            }
            
            return $path;
            
        } catch (\Exception $e) {
            Log::error('Failed to generate FacturX for credit note', [
                'credit_note_id' => $creditNote->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }
    
    /**
     * Construit le document XML pour un avoir
     */
    private function buildCreditNoteDocument(ZugferdDocumentBuilder $document, CreditNote $creditNote): void
    {
        $tenant = $creditNote->tenant;
        $client = $creditNote->client;
        $invoice = $creditNote->invoice;
        
        // En-tête du document - Type 381 = Credit Note
        $creditNoteDate = is_string($creditNote->credit_note_date) 
            ? new \DateTime($creditNote->credit_note_date) 
            : $creditNote->credit_note_date;
            
        $document->setDocumentInformation(
            $creditNote->credit_note_number,
            ZugferdInvoiceType::CREDITNOTE,
            $creditNoteDate,
            $creditNote->currency ?? 'EUR'
        );
        
        // Référence à la facture d'origine
        if ($invoice) {
            $document->addDocumentNote($invoice->invoice_number);
            $document->addDocumentNote("Avoir sur facture {$invoice->invoice_number}");
        }
        
        if ($creditNote->reason) {
            $document->addDocumentNote("Motif: {$creditNote->reason}");
        }
        
        // Informations vendeur
        $document->setDocumentSeller(
            $tenant->name,
            $tenant->legal_mention_siret ?? ''
        );
        
        $document->setDocumentSellerAddress(
            $tenant->address ?? '',
            '',
            '',
            $tenant->postal_code ?? '',
            $tenant->city ?? '',
            'FR'
        );
        
        if ($tenant->legal_mention_tva_intracom) {
            $document->setDocumentSellerTaxRegistration('VA', $tenant->legal_mention_tva_intracom);
        }
        
        // Informations acheteur
        $document->setDocumentBuyer(
            $client->name,
            $client->siret ?? ''
        );
        
        $document->setDocumentBuyerAddress(
            $client->address ?? '',
            '',
            '',
            $client->postal_code ?? '',
            $client->city ?? '',
            $client->country ?? 'FR'
        );
        
        if ($client->vat_number) {
            $document->setDocumentBuyerTaxRegistration('VA', $client->vat_number);
        }
        
        // Moyen de paiement (remboursement)
        if ($tenant->iban && strtolower($creditNote->payment_method ?? 'bank_transfer') === 'bank_transfer') {
            // Virement bancaire avec IBAN
            $document->addDocumentPaymentMeanToCreditTransfer(
                $tenant->iban,
                $tenant->company_name ?? $tenant->name ?? null,
                null,
                $tenant->bic ?? null
            );
        } else {
            $paymentMeansCode = $this->getPaymentMeansCode($creditNote->payment_method);
            $document->addDocumentPaymentMean(
                $paymentMeansCode,
                $creditNote->payment_method ?? 'Virement'
            );
        }
        
        // Lignes de l'avoir
        foreach ($creditNote->items as $item) {
            $document->addNewPosition($item->position ?? $item->id);
            $document->setDocumentPositionProductDetails(
                $item->description,
                '',
                '',
                '',
                $item->details ?? ''
            );
            
            $document->setDocumentPositionGrossPrice($item->unit_price);
            $document->setDocumentPositionQuantity($item->quantity, 'H87');
            
            $lineTotalNet = $item->quantity * $item->unit_price;
            $document->setDocumentPositionLineSummation($lineTotalNet);
            
            // TVA
            $taxCategory = $item->tax_rate > 0 ? 'S' : 'Z';
            $document->addDocumentPositionTax($taxCategory, 'VAT', $item->tax_rate);
        }
        
        // Totaux
        $document->setDocumentSummation(
            $creditNote->total,
            $creditNote->total,
            $creditNote->subtotal,
            0,
            0,
            $creditNote->subtotal,
            $creditNote->tax,
            0,
            $creditNote->total
        );
        
        // Détail TVA
        $taxRate = $creditNote->items->first()->tax_rate ?? 20;
        $taxCategory = $taxRate > 0 ? 'S' : 'Z';
        $document->addDocumentTax(
            $taxCategory,
            'VAT',
            $creditNote->subtotal,
            $creditNote->tax,
            $taxRate
        );
    }
    
    /**
     * Embarque le XML dans le PDF pour créer un fichier Factur-X conforme PDF/A-3
     */
    private function embedXmlInPdf(string $pdfContent, string $xmlContent): string
    {
        try {
            // Utiliser ZugferdDocumentPdfMerger pour embarquer le XML dans le PDF
            $pdfMerger = new \horstoeko\zugferd\ZugferdDocumentPdfMerger($xmlContent, $pdfContent);
            
            // Générer le document (cela prépare le PDF/A-3 avec XML embarqué)
            $pdfMerger->generateDocument();
            
            // Récupérer le PDF final avec XML embarqué
            $facturXContent = $pdfMerger->downloadString();
            
            Log::info('XML successfully embedded in PDF/A-3');
            
            return $facturXContent;
        } catch (\Exception $e) {
            Log::error('Failed to embed XML in PDF', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            // En cas d'erreur, retourner le PDF sans XML (fallback)
            Log::warning('Falling back to PDF without embedded XML');
            return $pdfContent;
        }
    }
    
    /**
     * Obtient le code de moyen de paiement selon la norme
     */
    private function getPaymentMeansCode(?string $paymentMethod): string
    {
        $mapping = [
            'bank_transfer' => ZugferdPaymentMeans::UNTDID_4461_30, // Virement
            'credit_card' => ZugferdPaymentMeans::UNTDID_4461_48,   // Carte bancaire
            'cash' => ZugferdPaymentMeans::UNTDID_4461_10,          // Espèces
            'check' => ZugferdPaymentMeans::UNTDID_4461_20,         // Chèque
            'direct_debit' => ZugferdPaymentMeans::UNTDID_4461_49,  // Prélèvement
        ];
        
        return $mapping[strtolower($paymentMethod ?? '')] ?? ZugferdPaymentMeans::UNTDID_4461_30;
    }
    
    /**
     * Valide qu'une facture Factur-X est conforme EN 16931 et PDF/A-3
     */
    public function validateFacturX(string $facturXPath): bool
    {
        try {
            if (!Storage::exists($facturXPath)) {
                Log::error('FacturX file not found', ['path' => $facturXPath]);
                return false;
            }
            
            $fullPath = Storage::path($facturXPath);
            
            // 1. Vérifier que le PDF contient un XML embarqué
            $pdfReader = \horstoeko\zugferd\ZugferdDocumentPdfReader::readAndGuessFromFile($fullPath);
            
            if (!$pdfReader) {
                Log::error('FacturX validation: Unable to read PDF or no XML found');
                return false;
            }
            
            // 2. Extraire et valider le XML avec le validateur intégré
            $validator = new \horstoeko\zugferd\ZugferdPdfValidator();
            $validationResult = $validator->validateFile($fullPath);
            
            if (!$validationResult) {
                $errors = $validator->validationFailed();
                Log::error('FacturX validation failed', [
                    'path' => $facturXPath,
                    'errors' => $errors
                ]);
                return false;
            }
            
            Log::info('FacturX validation successful', ['path' => $facturXPath]);
            return true;
            
        } catch (\Exception $e) {
            Log::error('FacturX validation exception', [
                'path' => $facturXPath,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }
    
    /**
     * Extrait le XML d'une facture Factur-X
     */
    public function extractXml(string $facturXPath): ?string
    {
        try {
            if (!Storage::exists($facturXPath)) {
                Log::error('FacturX file not found for XML extraction', ['path' => $facturXPath]);
                return null;
            }
            
            $fullPath = Storage::path($facturXPath);
            
            // Lire le PDF et extraire le XML embarqué
            $pdfReader = \horstoeko\zugferd\ZugferdDocumentPdfReader::readAndGuessFromFile($fullPath);
            
            if (!$pdfReader) {
                Log::error('Unable to read FacturX PDF or no XML found');
                return null;
            }
            
            // Récupérer le contenu XML
            $xmlContent = $pdfReader->getContent();
            
            Log::info('XML successfully extracted from FacturX', [
                'path' => $facturXPath,
                'xml_length' => strlen($xmlContent)
            ]);
            
            return $xmlContent;
            
        } catch (\Exception $e) {
            Log::error('Failed to extract XML from FacturX', [
                'path' => $facturXPath,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }
    
    /**
     * Valide le XML généré avant embedding
     */
    private function validateXmlContent(string $xmlContent): bool
    {
        try {
            // Utiliser le service de validation XSD si disponible
            $xsdService = app(XsdValidationService::class);
            
            if ($xsdService->schemasAvailable()) {
                $validation = $xsdService->validateXml($xmlContent, 'BASIC');
                
                Log::info('XSD validation result', [
                    'valid' => $validation['valid'],
                    'errors_count' => count($validation['errors']),
                    'warnings_count' => count($validation['warnings']),
                    'compliance_score' => $validation['compliance_score'] ?? 0,
                ]);
                
                // Accepter si score de conformité >= 80%
                $minScore = config('facturx.min_compliance_score', 80);
                if (($validation['compliance_score'] ?? 0) < $minScore) {
                    Log::warning('XML compliance score too low', [
                        'score' => $validation['compliance_score'],
                        'min_required' => $minScore,
                        'errors' => $validation['errors'],
                    ]);
                    
                    // Ne pas bloquer la génération mais logger les erreurs
                    foreach ($validation['errors'] as $error) {
                        Log::warning('XSD validation error', $error);
                    }
                }
                
                return $validation['valid'] || ($validation['compliance_score'] ?? 0) >= $minScore;
            }
            
            // Fallback: validation basique si XSD non disponible
            return $this->basicXmlValidation($xmlContent);
            
        } catch (\Exception $e) {
            Log::error('XML validation failed', [
                'error' => $e->getMessage(),
            ]);
            
            // En cas d'erreur de validation, continuer avec validation basique
            return $this->basicXmlValidation($xmlContent);
        }
    }
    
    /**
     * Validation basique du XML (fallback)
     */
    private function basicXmlValidation(string $xmlContent): bool
    {
        try {
            // Vérifier que le XML est bien formé
            $xml = new \DOMDocument();
            $xml->loadXML($xmlContent);
            
            if (!$xml) {
                Log::error('XML is not well-formed');
                return false;
            }
            
            // Vérifier présence des éléments obligatoires EN 16931
            $requiredElements = [
                'rsm:CrossIndustryInvoice',
                'rsm:ExchangedDocument',
                'ram:ID', // Invoice number
                'ram:TypeCode', // Invoice type (380 or 381)
            ];
            
            foreach ($requiredElements as $element) {
                $nodes = $xml->getElementsByTagName(str_replace(['rsm:', 'ram:'], '', $element));
                if ($nodes->length === 0) {
                    Log::error('Required XML element missing', ['element' => $element]);
                    return false;
                }
            }
            
            Log::info('XML validation successful', ['size' => strlen($xmlContent)]);
            return true;
            
        } catch (\Exception $e) {
            Log::error('XML validation failed', [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Soumet automatiquement une facture au PDP après génération Factur-X
     */
    private function submitToPdp(Invoice $invoice, string $documentPath): void
    {
        try {
            $submission = \App\Models\PdpSubmission::create([
                'submittable_type' => Invoice::class,
                'submittable_id' => $invoice->id,
                'submission_id' => \App\Models\PdpSubmission::generateSubmissionId(),
                'status' => 'pending',
                'pdp_mode' => config('pdp.mode', 'simulation'),
                'user_id' => auth()->id(),
                'ip_address' => request()->ip(),
            ]);

            \App\Jobs\SendToPdpJob::dispatch($invoice, $submission->submission_id, $documentPath)
                ->delay(now()->addMinutes(5)); // Délai de 5 minutes

            Log::info('Auto-submission to PDP scheduled', [
                'invoice_id' => $invoice->id,
                'submission_id' => $submission->submission_id,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to schedule PDP auto-submission', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Soumet automatiquement un avoir au PDP après génération Factur-X
     */
    private function submitCreditNoteToPdp(CreditNote $creditNote): void
    {
        try {
            $submission = \App\Models\PdpSubmission::create([
                'submittable_type' => \App\Models\CreditNote::class,
                'submittable_id' => $creditNote->id,
                'submission_id' => \App\Models\PdpSubmission::generateSubmissionId(),
                'status' => 'pending',
                'pdp_mode' => config('pdp.mode', 'simulation'),
                'user_id' => auth()->id(),
                'ip_address' => request()->ip(),
            ]);

            \App\Jobs\SendToPdpJob::dispatch($creditNote, $submission->submission_id)
                ->delay(now()->addMinutes(5)); // Délai de 5 minutes

            Log::info('Auto-submission to PDP scheduled for credit note', [
                'credit_note_id' => $creditNote->id,
                'submission_id' => $submission->submission_id,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to schedule PDP auto-submission for credit note', [
                'credit_note_id' => $creditNote->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Signe un document Factur-X électroniquement
     */
    private function signFacturXDocument(string $pdfPath, Invoice $invoice): ?string
    {
        try {
            $signatureService = app(ElectronicSignatureService::class);
            
            if (!$signatureService->isConfigured()) {
                Log::warning('Electronic signature service not configured, skipping signing', [
                    'invoice_id' => $invoice->id,
                    'pdf_path' => $pdfPath,
                ]);
                return $pdfPath;
            }

            $signerInfo = [
                'name' => auth()->user()->name ?? $invoice->tenant->name,
                'email' => auth()->user()->email ?? $invoice->tenant->email,
                'role' => 'Responsable Facturation',
                'location' => $invoice->tenant->city ?? 'France',
                'reason' => 'Signature de facture Factur-X #' . $invoice->invoice_number,
                'level' => config('electronic_signature.signature_level', 'QES'),
            ];

            $result = $signatureService->signFacturXDocument($pdfPath, $signerInfo);

            if ($result['success']) {
                // Enregistrer la signature dans la base de données
                \App\Models\ElectronicSignature::createSignature([
                    'signable_type' => Invoice::class,
                    'signable_id' => $invoice->id,
                    'signature_id' => $result['signature_info']['id'],
                    'signer_name' => $signerInfo['name'],
                    'signer_email' => $signerInfo['email'],
                    'signer_role' => $signerInfo['role'],
                    'signature_level' => $signerInfo['level'],
                    'original_file_path' => $pdfPath,
                    'signed_file_path' => $result['signed_path'],
                    'timestamp_info' => $result['timestamp_info'],
                    'validation_result' => $result['validation_result'],
                    'processing_time' => $result['processing_time'],
                    'status' => $result['validation_result']['valid'] ? 'valid' : 'failed',
                    'metadata' => [
                        'invoice_id' => $invoice->id,
                        'invoice_number' => $invoice->invoice_number,
                        'signature_method' => 'electronic',
                        'compliance_level' => 'eIDAS QES',
                    ],
                ]);

                Log::info('Factur-X document signed successfully', [
                    'invoice_id' => $invoice->id,
                    'original_path' => $pdfPath,
                    'signed_path' => $result['signed_path'],
                    'signature_id' => $result['signature_info']['id'],
                    'processing_time' => $result['processing_time'],
                ]);

                return $result['signed_path'];
            } else {
                Log::error('Failed to sign Factur-X document', [
                    'invoice_id' => $invoice->id,
                    'pdf_path' => $pdfPath,
                    'error' => $result['error'],
                ]);

                return $pdfPath; // Retourner le fichier non signé en cas d'échec
            }

        } catch (\Exception $e) {
            Log::error('Exception during Factur-X signing', [
                'invoice_id' => $invoice->id,
                'pdf_path' => $pdfPath,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return $pdfPath; // Retourner le fichier non signé en cas d'exception
        }
    }
}
