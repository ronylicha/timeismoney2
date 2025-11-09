# TimeIsMoney2 - French Compliance Guide

**Version:** 2.0  
**Last Updated:** 2025-11-09

## 🇫🇷 Overview

This guide covers French invoicing compliance requirements implemented in TimeIsMoney2, including legal requirements, technical implementation, and usage instructions.

## 📋 Legal Requirements

### Mandatory Invoice Elements (French Law)
1. **Seller Information**
   - Company name and address
   - SIREN/SIRET number
   - VAT number (if applicable)

2. **Client Information**
   - Client name and address
   - Client SIRET (for B2B)

3. **Invoice Details**
   - Unique invoice number (sequential)
   - Issue date
   - Due date
   - Payment terms

4. **Financial Information**
   - Amounts before tax (HT)
   - VAT rates and amounts
   - Total amount TTC
   - Currency

5. **Legal Mentions**
   - "TVA non applicable, art. 293 B du CGI" (if no VAT)
   - Penalty information for late payments
   - Legal notice about debt recovery costs

## 🔧 Technical Implementation

### Core Components

#### 1. FrenchComplianceService
```php
class FrenchComplianceService
{
    public function validateInvoice(Invoice $invoice): array
    {
        $errors = [];
        
        // Check mandatory fields
        if (!$invoice->client->siret) {
            $errors[] = 'Client SIRET is required for B2B invoices';
        }
        
        // Validate invoice number format
        if (!$this->isValidInvoiceNumber($invoice->number)) {
            $errors[] = 'Invoice number must be sequential and unique';
        }
        
        return $errors;
    }
    
    public function generateLegalFooter(Invoice $invoice): string
    {
        $footer = [];
        
        if ($invoice->company->siren) {
            $footer[] = "SIREN : {$invoice->company->siren}";
        }
        
        if ($invoice->total_tva === 0) {
            $footer[] = "TVA non applicable, art. 293 B du CGI";
        }
        
        $footer[] = "En cas de retard de paiement, une indemnité forfaitaire de 40€ sera due.";
        
        return implode("\n", $footer);
    }
}
```

#### 2. FacturX Integration
```php
class FacturXService
{
    public function generateFacturX(Invoice $invoice): string
    {
        // Generate XML metadata for FacturX
        $xml = $this->buildFacturXXml($invoice);
        
        // Embed XML in PDF
        return $this->embedXmlInPdf($invoice->pdf_path, $xml);
    }
    
    private function buildFacturXXml(Invoice $invoice): string
    {
        return view('pdf.facturx', [
            'invoice' => $invoice,
            'profile' => 'BASIC', // or COMFORT, EXTENDED
        ])->render();
    }
}
```

#### 3. Chorus Pro Integration
```php
class ChorusProService
{
    public function submitInvoice(Invoice $invoice): array
    {
        $payload = [
            'facture' => [
                'idFacture' => $invoice->number,
                'dateFacture' => $invoice->date->format('Y-m-d'),
                'montantTtc' => $invoice->total_ttc,
                'identifiantDestinataire' => $invoice->client->siret,
            ],
        ];
        
        return $this->api->post('/cxf/factures/v2/pieces', $payload);
    }
}
```

### Database Schema

#### French-specific fields added to existing tables:

```sql
-- Companies table
ALTER TABLE companies ADD COLUMN siren VARCHAR(9);
ALTER TABLE companies ADD COLUMN nic VARCHAR(5);
ALTER TABLE companies ADD COLUMN legal_form VARCHAR(100);
ALTER TABLE companies ADD COLUMN rcs_city VARCHAR(100);

-- Clients table  
ALTER TABLE clients ADD COLUMN siret VARCHAR(14);
ALTER TABLE clients ADD COLUMN vat_number VARCHAR(20);
ALTER TABLE clients ADD COLUMN is_public_administration BOOLEAN DEFAULT FALSE;

-- Invoices table
ALTER TABLE invoices ADD COLUMN facturx_path VARCHAR(255);
ALTER TABLE invoices ADD COLUMN chorus_pro_id VARCHAR(100);
ALTER TABLE invoices ADD COLUMN legal_footer TEXT;
ALTER TABLE invoices ADD COLUMN penalty_rate DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN compensation_amount DECIMAL(10,2) DEFAULT 0.00;
```

## 📊 Advance Invoices (Acomptes)

### Implementation Overview
French law allows for advance invoices (factures d'acompte) for partial payments before final delivery.

### Key Features
1. **Advance Invoice Types**
   - Percentage-based advance (e.g., 30% of total)
   - Fixed amount advance
   - Milestone-based advances

2. **Legal Requirements**
   - Must reference final invoice
   - Clear indication it's an advance
   - Proper VAT calculation
   - Sequential numbering

### Usage Example

```php
// Create advance invoice
$advanceInvoice = $invoiceService->createAdvanceInvoice([
    'parent_invoice_id' => $finalInvoice->id,
    'type' => 'percentage',
    'percentage' => 30.0,
    'description' => 'Acompte de 30% sur commande #' . $finalInvoice->number,
]);

// Generate PDF with FacturX
$pdfPath = $facturXService->generateFacturX($advanceInvoice);
```

## 🖊️ Legal Footer Management

### Dynamic Legal Footer Generation
```php
class LegalFooterService
{
    public function generateFooter(Invoice $invoice): string
    {
        $elements = [];
        
        // Company identification
        if ($invoice->company->siren) {
            $elements[] = "SIREN : {$invoice->company->siren}";
        }
        
        // VAT information
        if ($invoice->total_tva === 0) {
            $elements[] = "TVA non applicable, art. 293 B du CGI";
        } elseif ($invoice->company->vat_number) {
            $elements[] = "N° TVA : {$invoice->company->vat_number}";
        }
        
        // Legal mentions
        $elements[] = "En cas de retard de paiement, une indemnité forfaitaire de 40€ sera due.";
        $elements[] = "Indemnité de 3 fois le taux d'intérêt légal pour retard de paiement.";
        
        return implode("\n", $elements);
    }
}
```

### Customizable Footer Elements
- Company registration information
- VAT exemption clauses
- Late payment penalties
- Bank information
- Legal notices

## 📋 Invoice Validation Rules

### Automatic Validation
```php
class FrenchInvoiceValidator
{
    public function validate(Invoice $invoice): ValidationResult
    {
        $rules = [
            'client.siret' => 'required|size:14',
            'company.siren' => 'required|size:9',
            'number' => 'required|unique:invoices,number,NULL,id,tenant_id,' . $invoice->tenant_id,
            'date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:date',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.vat_rate' => 'required|in:0,5.5,10,20',
        ];
        
        return validator($invoice->toArray(), $rules);
    }
}
```

### Validation Checks
- **Mandatory fields**: All required French invoice elements
- **Format validation**: SIREN/SIRET format validation
- **Business rules**: VAT rate consistency, sequential numbering
- **Legal compliance**: Payment terms, penalty information

## 🔗 Integration Points

### 1. PDF Generation
- FacturX XML embedding
- Legal footer inclusion
- French invoice layout

### 2. Email Templates
- French email templates
- Legal mention inclusion
- Attachment handling

### 3. API Endpoints
```php
// French compliance endpoints
GET /api/invoices/{id}/validate
POST /api/invoices/{id}/generate-facturx
POST /api/invoices/{id}/submit-chorus-pro
GET /api/legal-footer/template
```

## 🎯 Usage Instructions

### For Developers

#### Enabling French Compliance
```php
// config/app.php
'french_compliance' => [
    'enabled' => env('FRENCH_COMPLIANCE_ENABLED', true),
    'facturx_profile' => env('FACTURX_PROFILE', 'BASIC'),
    'auto_validate' => env('AUTO_VALIDATE_INVOICES', true),
],
```

#### Creating Compliant Invoices
```php
$invoice = Invoice::create([
    'client_id' => $client->id, // Client must have SIRET
    'number' => $this->generateInvoiceNumber(),
    'date' => now(),
    'due_date' => now()->addDays(30),
    'legal_footer' => $this->legalFooterService->generateFooter($invoice),
]);

// Add items with proper VAT rates
$invoice->items()->create([
    'description' => 'Prestation de services',
    'quantity' => 10,
    'unit_price' => 100,
    'vat_rate' => 20, // Standard French VAT
]);

// Generate FacturX PDF
$facturXPath = $this->facturXService->generateFacturX($invoice);
$invoice->update(['facturx_path' => $facturXPath]);
```

### For Users

#### Setting Up Company Information
1. Navigate to Settings → Company
2. Enter SIREN number (9 digits)
3. Add legal form and RCS city
4. Configure VAT number if applicable

#### Client Configuration
1. Go to Clients → Add Client
2. Enter client SIRET (14 digits) for B2B
3. Mark as public administration if applicable
4. Set default VAT rate

#### Invoice Creation
1. Create invoice as usual
2. System auto-generates compliant invoice number
3. Legal footer automatically added
4. FacturX PDF generated on download

## 🧪 Testing

### Compliance Tests
```php
class FrenchComplianceTest extends TestCase
{
    public function test_invoice_validation()
    {
        $invoice = Invoice::factory()->create();
        
        $validator = new FrenchInvoiceValidator();
        $result = $validator->validate($invoice);
        
        $this->assertTrue($result->isValid());
    }
    
    public function test_facturx_generation()
    {
        $invoice = Invoice::factory()->create();
        
        $facturXPath = $this->facturXService->generateFacturX($invoice);
        
        $this->assertFileExists($facturXPath);
        $this->assertStringContains('FacturX', file_get_contents($facturXPath));
    }
}
```

## 📈 Monitoring & Reporting

### Compliance Dashboard
- Invoice validation status
- FacturX generation success rate
- Chorus Pro submission tracking
- Legal compliance metrics

### Audit Trail
All French compliance actions are logged:
- Invoice validation attempts
- FacturX generation
- Legal footer modifications
- Chorus Pro submissions

## 🔧 Configuration Options

### Environment Variables
```env
FRENCH_COMPLIANCE_ENABLED=true
FACTURX_PROFILE=BASIC
CHORUS_PRO_API_URL=https://chorus-pro.gouv.fr
CHORUS_PRO_CLIENT_ID=your_client_id
CHORUS_PRO_CLIENT_SECRET=your_client_secret
AUTO_VALIDATE_INVOICES=true
```

### Company Settings
- Legal form selection
- Default VAT rates
- Penalty rate configuration
- Bank information display

## 🚨 Common Issues & Solutions

### Issue: Invalid SIRET/SIREN format
**Solution**: Ensure proper 9-digit SIREN and 14-digit SIRET formats with Luhn checksum validation.

### Issue: FacturX generation fails
**Solution**: Check that all required invoice fields are populated and that the PDF generator has write permissions.

### Issue: Chorus Pro submission rejected
**Solution**: Verify client SIRET is valid and that the invoice format matches Chorus Pro requirements.

## 📚 Additional Resources

- [French Invoice Requirements](https://www.economie.gouv.fr/facturation/factures-obligations)
- [FacturX Documentation](https://fnfe-mpe.org/facturx/)
- [Chorus Pro API](https://chorus-pro.gouv.fr/api)

---

**Note**: This feature is specifically designed for French businesses and can be disabled for non-French deployments.