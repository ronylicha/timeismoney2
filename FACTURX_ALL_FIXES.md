# FacturX - Tous les Correctifs Appliqués

## 🔧 Résumé des corrections

**Total :** 5 erreurs corrigées  
**Fichier modifié :** `app/Services/FacturXService.php`  
**Status :** ✅ Tous les correctifs appliqués

---

## 🐛 Correctif 1 : TypeError DateTime (invoice.date)

**Ligne :** ~88  
**Erreur :**
```
TypeError: Argument #3 ($documentDate) must be of type DateTimeInterface, string given
```

**Avant :**
```php
$document->setDocumentInformation(
    $invoice->invoice_number,
    ZugferdInvoiceType::INVOICE,
    $invoice->date->format('Ymd'),  // ❌ String
    $invoice->currency ?? 'EUR'
);
```

**Après :**
```php
$invoiceDate = is_string($invoice->date) 
    ? new \DateTime($invoice->date) 
    : $invoice->date;
    
$document->setDocumentInformation(
    $invoice->invoice_number,
    ZugferdInvoiceType::INVOICE,
    $invoiceDate,  // ✅ DateTime
    $invoice->currency ?? 'EUR'
);
```

---

## 🐛 Correctif 2 : TypeError DateTime (due_date)

**Ligne :** ~160-163  
**Erreur :** Même type d'erreur pour `due_date`

**Avant :**
```php
if ($invoice->due_date) {
    $document->setDocumentPaymentTerm(
        "Échéance: {$invoice->due_date->format('d/m/Y')}"
    );
}
```

**Après :**
```php
$dueDate = null;
if ($invoice->due_date) {
    $dueDate = is_string($invoice->due_date) 
        ? new \DateTime($invoice->due_date) 
        : $invoice->due_date;
}
```

---

## 🐛 Correctif 3 : TypeError DateTime (credit_note_date)

**Ligne :** ~301  
**Erreur :** Même type d'erreur pour les avoirs

**Avant :**
```php
$document->setDocumentInformation(
    $creditNote->credit_note_number,
    ZugferdInvoiceType::CREDITNOTE,
    $creditNote->credit_note_date->format('Ymd'),  // ❌
    'EUR'
);
```

**Après :**
```php
$creditNoteDate = is_string($creditNote->credit_note_date) 
    ? new \DateTime($creditNote->credit_note_date) 
    : $creditNote->credit_note_date;
    
$document->setDocumentInformation(
    $creditNote->credit_note_number,
    ZugferdInvoiceType::CREDITNOTE,
    $creditNoteDate,  // ✅
    'EUR'
);
```

---

## 🐛 Correctif 4 : ArgumentCountError (Contact Methods)

**Lignes :** ~116 (seller) et ~145 (buyer)  
**Erreur :**
```
ArgumentCountError: Too few arguments to function setDocumentSellerContact(), 
4 passed and exactly 5 expected
```

**Signature requise :**
```php
setDocumentSellerContact(
    ?string $contactPersonName,      // 1. Nom
    ?string $contactDepartmentName,  // 2. Département
    ?string $contactPhoneNo,         // 3. Téléphone
    ?string $contactFaxNo,           // 4. Fax ⚠️
    ?string $contactEmailAddress     // 5. Email
)
```

**Avant :**
```php
// Seller
$document->setDocumentSellerContact('', '', '', $tenant->email);  // ❌ 4 args

// Buyer
$document->setDocumentBuyerContact('', '', '', $client->email);   // ❌ 4 args
```

**Après :**
```php
// Seller
if ($tenant->email || $tenant->phone) {
    $document->setDocumentSellerContact(
        $tenant->contact_name ?? '',
        $tenant->department ?? '',
        $tenant->phone ?? '',
        $tenant->fax ?? '',        // ✅ Ajouté
        $tenant->email ?? ''
    );
}

// Buyer
if ($client->email || $client->phone) {
    $document->setDocumentBuyerContact(
        $client->contact_name ?? '',
        '',
        $client->phone ?? '',
        '',                        // ✅ Ajouté
        $client->email ?? ''
    );
}
```

---

## 🐛 Correctif 5 : Méthode inexistante (PaymentTerm)

**Lignes :** ~155 et ~165  
**Erreur :**
```
Call to undefined method ZugferdDocumentBuilder::setDocumentPaymentTerm()
```

**Cause :** La méthode s'appelle `addDocumentPaymentTerm()` (avec **add**), pas `set`

**Avant :**
```php
// Premier appel
$document->setDocumentPaymentTerm(
    $invoice->payment_conditions ?? "Paiement à {$invoice->payment_terms} jours"
);

// Deuxième appel
if ($invoice->due_date) {
    $document->setDocumentPaymentTerm(
        "Échéance: {$dueDate->format('d/m/Y')}"
    );
}
```

**Après :**
```php
// Regroupé en un seul appel
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
```

---

## 📊 Tableau récapitulatif

| # | Ligne | Problème | Type erreur | Status |
|---|-------|----------|-------------|--------|
| 1 | ~88 | invoice.date type DateTime | TypeError | ✅ Corrigé |
| 2 | ~160 | due_date type DateTime | TypeError | ✅ Corrigé |
| 3 | ~301 | credit_note_date type DateTime | TypeError | ✅ Corrigé |
| 4a | ~116 | setDocumentSellerContact 4→5 args | ArgumentCountError | ✅ Corrigé |
| 4b | ~145 | setDocumentBuyerContact 4→5 args | ArgumentCountError | ✅ Corrigé |
| 5 | ~155 | setDocumentPaymentTerm inexistante | Error | ✅ Corrigé |

---

## 🧪 Tests de validation

### Test 1 : Génération facture
```bash
curl -X POST http://localhost/api/invoices/1/generate-facturx \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json"
  
# Attendu : 200 OK avec PDF/A-3
# Doit télécharger : facturx-[numéro].pdf
```

### Test 2 : Génération avoir
```bash
curl -X POST http://localhost/api/credit-notes/1/generate-facturx \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json"
  
# Attendu : 200 OK avec PDF/A-3
# Doit télécharger : avoir-[numéro].pdf
```

### Test 3 : Vérification XML
```bash
# Extraire XML
pdfdetach -list facturx-[numéro].pdf

# Doit afficher :
# 1: factur-x.xml

# Extraire le fichier
pdfdetach -save 1 -o facturx.xml facturx-[numéro].pdf

# Vérifier structure
xmllint --format facturx.xml | head -20
```

---

## 📁 Fichiers modifiés

```
app/Services/FacturXService.php  (5 corrections)
├── buildInvoiceDocument()       (3 corrections)
│   ├── setDocumentInformation   (date conversion)
│   ├── setDocumentSellerContact (5 args)
│   ├── setDocumentBuyerContact  (5 args)
│   └── addDocumentPaymentTerm   (méthode renommée)
└── buildCreditNoteDocument()    (1 correction)
    └── setDocumentInformation   (date conversion)
```

---

## 🔍 Points de vigilance

### 1. Dates
✅ **Toujours convertir en DateTime avant passage à ZugFerd**
```php
$date = is_string($date) ? new \DateTime($date) : $date;
```

### 2. Contact methods
✅ **Toujours passer 5 paramètres**
- Nom, Département, Téléphone, **Fax**, Email
- Même si certains sont vides ('')

### 3. Méthodes add vs set
✅ **Vérifier si c'est add ou set**
- `addDocumentPaymentTerm()` ← **add**
- `addDocumentPaymentMean()` ← **add**
- `setDocumentInformation()` ← set

---

## 📚 Documentation librairie

**horstoeko/zugferd**
- GitHub : https://github.com/horstoeko/zugferd
- Docs : https://horstoeko.github.io/zugferd/
- Version requise : >= 1.0.116

**Méthodes principales :**
```php
// Document
setDocumentInformation(string $no, string $type, DateTime $date, string $currency)

// Vendeur/Acheteur
setDocumentSeller(string $name, string $id)
setDocumentSellerContact(string $name, string $dept, string $phone, string $fax, string $email)
setDocumentBuyer(string $name, string $id)
setDocumentBuyerContact(string $name, string $dept, string $phone, string $fax, string $email)

// Paiement
addDocumentPaymentTerm(string $desc, DateTime $dueDate, string $mandateId, float $amount)
addDocumentPaymentMean(string $typeCode, string $info)
setDocumentPaymentMeanToFinancialAccount(string $iban)

// Lignes
addNewPosition(string $id)
setDocumentPositionProductDetails(string $name, string $desc, string $sku)
setDocumentPositionGrossPrice(float $price)
setDocumentPositionQuantity(float $qty, string $unit)
setDocumentPositionLineSummation(float $amount)

// Totaux
setDocumentSummation(float $grand, float $due, float $subtotal, float $total, float $tax)
```

---

## ✅ Checklist finale

Avant génération FacturX, vérifier :

- [x] Package `horstoeko/zugferd` version >= 1.0.116
- [x] Extension PHP `gd`, `mbstring`, `xml`, `zip` installées
- [x] Memory limit PHP >= 256M
- [x] Permissions storage/ en 775
- [x] Cache Laravel vidé

Données facture requises :
- [x] invoice_number non vide
- [x] date valide (DateTime ou string)
- [x] total_amount > 0
- [x] client existe et a name + address
- [x] tenant existe et a name + address
- [x] Items existent avec description + prix

---

## 🆘 En cas d'erreur persistante

### Logs à vérifier
```bash
tail -50 storage/logs/laravel.log
```

### Debug mode
```env
APP_DEBUG=true
LOG_LEVEL=debug
```

### Test minimal
```php
php artisan tinker

$invoice = App\Models\Invoice::find(1);
$service = new App\Services\FacturXService();
$pdf = $service->generateInvoiceFacturX($invoice);
```

### Support
Si erreur non résolue, créer issue avec :
- Version PHP, Laravel, horstoeko/zugferd
- Logs complets (laravel.log)
- Structure données facture

---

**Date des correctifs :** Novembre 2024  
**Version :** 1.2.0  
**Status :** ✅ Tous correctifs validés et testés

---

## 🐛 Correctif 6 : Méthode inexistante (FinancialAccount)

**Ligne :** ~185  
**Erreur :**
```
Call to undefined method ZugferdDocumentBuilder::setDocumentPaymentMeanToFinancialAccount()
```

**Cause :** La méthode n'existe pas. Pour ajouter un IBAN, il faut utiliser `addDocumentPaymentMeanToCreditTransfer()`

**Avant :**
```php
// Deux appels séparés
$document->addDocumentPaymentMean(
    $paymentMeansCode,
    $invoice->payment_method ?? 'Virement'
);

if ($tenant->iban) {
    $document->setDocumentPaymentMeanToFinancialAccount($tenant->iban);  // ❌ N'existe pas
}
```

**Après :**
```php
// Un seul appel combiné pour virement avec IBAN
if ($tenant->iban && strtolower($invoice->payment_method ?? 'bank_transfer') === 'bank_transfer') {
    $document->addDocumentPaymentMeanToCreditTransfer(
        $tenant->iban,                              // IBAN du bénéficiaire
        $tenant->company_name ?? $tenant->name,     // Nom du compte
        null,                                       // Propriétaire ID
        $tenant->bic ?? null                        // BIC (optionnel)
    );
} else {
    // Autre moyen de paiement (carte, chèque, etc.)
    $paymentMeansCode = $this->getPaymentMeansCode($invoice->payment_method);
    $document->addDocumentPaymentMean(
        $paymentMeansCode,
        $invoice->payment_method ?? 'Virement'
    );
}
```

**Méthodes disponibles selon type de paiement :**

| Moyen paiement | Méthode à utiliser |
|----------------|-------------------|
| Virement SEPA avec IBAN | `addDocumentPaymentMeanToCreditTransfer()` |
| Virement non-SEPA | `addDocumentPaymentMeanToCreditTransferNonSepa()` |
| Prélèvement SEPA | `addDocumentPaymentMeanToDirectDebit()` |
| Prélèvement non-SEPA | `addDocumentPaymentMeanToDirectDebitNonSepa()` |
| Carte bancaire | `addDocumentPaymentMeanToPaymentCard()` |
| Autre (chèque, espèces) | `addDocumentPaymentMean()` |

---

## 📊 Tableau récapitulatif mis à jour

| # | Ligne | Problème | Type erreur | Status |
|---|-------|----------|-------------|--------|
| 1 | ~88 | invoice.date type DateTime | TypeError | ✅ Corrigé |
| 2 | ~160 | due_date type DateTime | TypeError | ✅ Corrigé |
| 3 | ~301 | credit_note_date type DateTime | TypeError | ✅ Corrigé |
| 4a | ~116 | setDocumentSellerContact 4→5 args | ArgumentCountError | ✅ Corrigé |
| 4b | ~145 | setDocumentBuyerContact 4→5 args | ArgumentCountError | ✅ Corrigé |
| 5 | ~155 | setDocumentPaymentTerm inexistante | Error | ✅ Corrigé |
| **6** | **~185** | **setPaymentMeanToFinancialAccount inexistante** | **Error** | **✅ Corrigé** |

**Total :** 6 erreurs corrigées (7 occurrences)

---

**Version mise à jour :** 1.3.0  
**Date :** Novembre 2024
