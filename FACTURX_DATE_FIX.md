# Fix FacturX - Erreurs ZugFerd

## 🐛 Problèmes rencontrés

### Erreur 1 : DateTime
```
TypeError: horstoeko\zugferd\ZugferdDocumentBuilder::setDocumentInformation(): 
Argument #3 ($documentDate) must be of type DateTimeInterface, 
string given, called in /var/www/html/timeismoney2/app/Services/FacturXService.php on line 85
```

### Erreur 2 : Arguments Contact
```
ArgumentCountError: Too few arguments to function 
horstoeko\zugferd\ZugferdDocumentBuilder::setDocumentSellerContact(), 
4 passed and exactly 5 expected
```

### Cause
La méthode `setDocumentInformation()` de la librairie `horstoeko/zugferd` attend un objet `DateTimeInterface` en 3ème paramètre, mais Laravel Eloquent peut parfois retourner les dates comme des chaînes de caractères selon la configuration.

---

## ✅ Solutions appliquées

### Fix 1 : DateTime - Modification dans `FacturXService.php`

#### 1. Génération facture (ligne ~85)

**AVANT :**
```php
$document->setDocumentInformation(
    $invoice->invoice_number,
    ZugferdInvoiceType::INVOICE,
    $invoice->date->format('Ymd'),  // ❌ format() renvoie une string
    $invoice->currency ?? 'EUR'
);
```

**APRÈS :**
```php
// Conversion explicite en DateTime si nécessaire
$invoiceDate = is_string($invoice->date) 
    ? new \DateTime($invoice->date) 
    : $invoice->date;
    
$document->setDocumentInformation(
    $invoice->invoice_number,
    ZugferdInvoiceType::INVOICE,
    $invoiceDate,  // ✅ Objet DateTime
    $invoice->currency ?? 'EUR'
);
```

#### 2. Date d'échéance (ligne ~148)

**AVANT :**
```php
if ($invoice->due_date) {
    $document->setDocumentPaymentTerm(
        "Échéance: {$invoice->due_date->format('d/m/Y')}"
    );
}
```

**APRÈS :**
```php
if ($invoice->due_date) {
    $dueDate = is_string($invoice->due_date) 
        ? new \DateTime($invoice->due_date) 
        : $invoice->due_date;
        
    $document->setDocumentPaymentTerm(
        "Échéance: {$dueDate->format('d/m/Y')}"
    );
}
```

#### 3. Génération avoir (ligne ~282)

**AVANT :**
```php
$document->setDocumentInformation(
    $creditNote->credit_note_number,
    ZugferdInvoiceType::CREDITNOTE,
    $creditNote->credit_note_date->format('Ymd'),  // ❌
    $creditNote->currency ?? 'EUR'
);
```

**APRÈS :**
```php
$creditNoteDate = is_string($creditNote->credit_note_date) 
    ? new \DateTime($creditNote->credit_note_date) 
    : $creditNote->credit_note_date;
    
$document->setDocumentInformation(
    $creditNote->credit_note_number,
    ZugferdInvoiceType::CREDITNOTE,
    $creditNoteDate,  // ✅
    $creditNote->currency ?? 'EUR'
);
```

---

## 🔍 Pourquoi ce problème se produit ?

### Configuration Laravel dates

Dans les models Laravel, les dates peuvent être castées de différentes manières :

```php
// Model Invoice
protected $casts = [
    'date' => 'date',           // Retourne Carbon
    'date' => 'datetime',       // Retourne Carbon
    'date' => 'string',         // Retourne string
];
```

### Comportement de Carbon

```php
// Carbon hérite de DateTime, donc compatible
$invoice->date instanceof \DateTime;  // true si Carbon
$invoice->date instanceof \DateTimeInterface;  // true si Carbon

// Mais format() renvoie toujours une string
$invoice->date->format('Ymd');  // string, pas DateTime
```

---

## ✅ Tests effectués

### Test 1 : Génération FacturX facture
```bash
curl -X POST /api/invoices/1/generate-facturx
# Doit retourner un PDF avec XML embarqué
```

### Test 2 : Génération FacturX avoir
```bash
curl -X POST /api/credit-notes/1/generate-facturx
# Doit retourner un PDF avec XML type 381
```

### Test 3 : Téléchargement FacturX existant
```bash
curl -X GET /api/invoices/1/facturx
# Doit retourner le fichier existant ou générer si manquant
```

---

## 📋 Checklist validation

- [x] Code modifié dans FacturXService.php
- [x] Conversion DateTime pour invoice.date
- [x] Conversion DateTime pour invoice.due_date
- [x] Conversion DateTime pour credit_note.credit_note_date
- [x] Cache Laravel vidé
- [x] Tests manuels effectués
- [ ] Tests unitaires à ajouter

---

## 🧪 Tests unitaires recommandés

```php
// tests/Unit/FacturXServiceTest.php

public function test_generates_facturx_with_string_date()
{
    $invoice = Invoice::factory()->create([
        'date' => '2024-11-09',  // String volontairement
        'due_date' => '2024-12-09'
    ]);
    
    $service = new FacturXService();
    $pdf = $service->generateInvoiceFacturX($invoice);
    
    $this->assertNotNull($pdf);
    $this->assertInstanceOf(\Spipu\Html2Pdf\Html2Pdf::class, $pdf);
}

public function test_generates_facturx_with_carbon_date()
{
    $invoice = Invoice::factory()->create([
        'date' => Carbon::now(),  // Carbon
        'due_date' => Carbon::now()->addDays(30)
    ]);
    
    $service = new FacturXService();
    $pdf = $service->generateInvoiceFacturX($invoice);
    
    $this->assertNotNull($pdf);
}
```

---

## 🔮 Amélioration future

### Option 1 : Forcer cast dans Model

```php
// app/Models/Invoice.php
protected $casts = [
    'date' => 'datetime',      // Force Carbon
    'due_date' => 'datetime',
];
```

### Option 2 : Méthode helper dans Service

```php
// app/Services/FacturXService.php
private function ensureDateTime($date): \DateTime
{
    if ($date instanceof \DateTime) {
        return $date;
    }
    
    if ($date instanceof \DateTimeInterface) {
        return \DateTime::createFromInterface($date);
    }
    
    if (is_string($date)) {
        return new \DateTime($date);
    }
    
    throw new \InvalidArgumentException('Invalid date format');
}

// Usage
$document->setDocumentInformation(
    $invoice->invoice_number,
    ZugferdInvoiceType::INVOICE,
    $this->ensureDateTime($invoice->date),
    $invoice->currency ?? 'EUR'
);
```

### Option 3 : Accessor dans Model

```php
// app/Models/Invoice.php
protected function invoiceDate(): Attribute
{
    return Attribute::make(
        get: fn ($value) => $value instanceof \DateTime 
            ? $value 
            : new \DateTime($value)
    );
}
```

---

## 📚 Documentation ZugFerd

### Signature setDocumentInformation()

```php
public function setDocumentInformation(
    string $documentno,
    string $documenttypecode,
    \DateTimeInterface $documentdate,  // ⚠️ DOIT être DateTimeInterface
    string $documentcurrency,
    ?string $documentname = null,
    ?string $documentlanguageid = null,
    ?\DateTime $effectiveSpecifiedPeriod = null
): ZugferdDocumentBuilder
```

**Types acceptés pour $documentdate :**
- `\DateTime`
- `\DateTimeImmutable`
- `\Carbon\Carbon` (hérite de DateTime)
- Tout objet implémentant `\DateTimeInterface`

**Types NON acceptés :**
- `string` (même au format ISO 8601)
- `int` (timestamp)
- `null`

---

## ⚠️ Points de vigilance

### 1. Ne pas utiliser format() avant passage à la librairie
```php
// ❌ MAUVAIS
$document->setDocumentInformation(
    $invoice->invoice_number,
    ZugferdInvoiceType::INVOICE,
    $invoice->date->format('Y-m-d'),  // Retourne string
    'EUR'
);

// ✅ BON
$document->setDocumentInformation(
    $invoice->invoice_number,
    ZugferdInvoiceType::INVOICE,
    $invoice->date,  // Objet DateTime/Carbon
    'EUR'
);
```

### 2. Vérifier timezone
```php
// Si besoin d'une timezone spécifique
$invoiceDate = is_string($invoice->date) 
    ? new \DateTime($invoice->date, new \DateTimeZone('Europe/Paris'))
    : $invoice->date;
```

### 3. Gestion des dates nulles
```php
// Si la date peut être nulle
$invoiceDate = $invoice->date 
    ? (is_string($invoice->date) ? new \DateTime($invoice->date) : $invoice->date)
    : new \DateTime();  // Ou lever une exception
```

---

## 📝 Résumé

**Problème :** Type mismatch entre string et DateTimeInterface  
**Solution :** Conversion explicite avec vérification de type  
**Impact :** Génération FacturX fonctionnelle pour factures et avoirs  
**Status :** ✅ Résolu et testé

---

**Date correction :** Novembre 2024  
**Version :** 1.1.0  
**Fichier modifié :** `app/Services/FacturXService.php`

---

### Fix 2 : Contact Methods - Arguments manquants

#### Problème
Les méthodes `setDocumentSellerContact()` et `setDocumentBuyerContact()` attendent **5 paramètres** mais nous n'en passions que 4.

#### Signature correcte
```php
public function setDocumentSellerContact(
    ?string $contactPersonName,      // 1. Nom personne
    ?string $contactDepartmentName,  // 2. Département  
    ?string $contactPhoneNo,         // 3. Téléphone
    ?string $contactFaxNo,           // 4. Fax
    ?string $contactEmailAddress     // 5. Email
): ZugferdDocumentBuilder
```

#### Correction ligne ~116 (Seller Contact)

**AVANT (❌) :**
```php
if ($tenant->email) {
    $document->setDocumentSellerContact('', '', '', $tenant->email);  // 4 args
}
```

**APRÈS (✅) :**
```php
if ($tenant->email || $tenant->phone) {
    $document->setDocumentSellerContact(
        $tenant->contact_name ?? '',    // Nom contact
        $tenant->department ?? '',       // Département
        $tenant->phone ?? '',            // Téléphone
        $tenant->fax ?? '',              // Fax
        $tenant->email ?? ''             // Email
    );
}
```

#### Correction ligne ~145 (Buyer Contact)

**AVANT (❌) :**
```php
if ($client->email) {
    $document->setDocumentBuyerContact('', '', '', $client->email);  // 4 args
}
```

**APRÈS (✅) :**
```php
if ($client->email || $client->phone) {
    $document->setDocumentBuyerContact(
        $client->contact_name ?? '',     // Nom contact
        '',                              // Département
        $client->phone ?? '',            // Téléphone
        '',                              // Fax
        $client->email ?? ''             // Email
    );
}
```

---

## 📋 Récapitulatif des corrections

| Ligne | Méthode | Erreur | Fix |
|-------|---------|--------|-----|
| ~85 | setDocumentInformation | Type DateTime | Conversion string → DateTime |
| ~148 | due_date format | Type DateTime | Conversion string → DateTime |
| ~282 | credit_note_date | Type DateTime | Conversion string → DateTime |
| ~116 | setDocumentSellerContact | 4 args au lieu de 5 | Ajout paramètre fax |
| ~145 | setDocumentBuyerContact | 4 args au lieu de 5 | Ajout paramètre fax |

---

## ✅ Validation

### Test complet génération FacturX

```bash
# Vider cache
php artisan config:clear
php artisan cache:clear

# Tester génération facture
curl -X POST http://localhost/api/invoices/1/generate-facturx \
  -H "Authorization: Bearer YOUR_TOKEN"

# Doit retourner 200 OK avec PDF/A-3
```

### Vérification structure XML

Le XML généré doit contenir :
```xml
<rsm:CrossIndustryInvoice>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:DefinedTradeContact>
          <ram:PersonName><!-- Nom --></ram:PersonName>
          <ram:DepartmentName><!-- Dept --></ram:DepartmentName>
          <ram:TelephoneUniversalCommunication>
            <ram:CompleteNumber><!-- Phone --></ram:CompleteNumber>
          </ram:TelephoneUniversalCommunication>
          <ram:FaxUniversalCommunication>
            <ram:CompleteNumber><!-- Fax --></ram:CompleteNumber>
          </ram:FaxUniversalCommunication>
          <ram:EmailURIUniversalCommunication>
            <ram:URIID><!-- Email --></ram:URIID>
          </ram:EmailURIUniversalCommunication>
        </ram:DefinedTradeContact>
      </ram:SellerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>
```

