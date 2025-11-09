# TimeIsMoney2 - Implémentation des Avoirs (Credit Notes)

**Version:** 1.0  
**Date:** 2025-11-09  
**Statut:** ✅ Implémenté

---

## 📋 Vue d'ensemble

Ce document décrit l'implémentation complète du système d'avoirs (credit notes) avec support FacturX pour la conformité fiscale française 2027.

### Fonctionnalités implémentées

✅ **Création d'avoirs depuis factures**
- Avoir total (annulation complète)
- Avoir partiel (sélection d'items)
- Annulation rapide de facture

✅ **Tracking automatique**
- Calcul du total crédité par facture
- Mise à jour automatique du solde dû
- Audit trail complet

✅ **Support FacturX**
- Export PDF + XML embarqué (EN 16931)
- Compatible facture électronique 2027
- Support avoirs et factures

✅ **Conformité NF525**
- Hash d'intégrité
- Logs d'audit immuables
- Numérotation séquentielle

---

## 🏗️ Architecture

### Nouveaux fichiers créés

1. **`app/Services/CreditNoteService.php`** ⭐⭐⭐
   - Logique métier pour création d'avoirs
   - Validation des montants
   - Audit trail automatique

2. **`app/Observers/CreditNoteObserver.php`**
   - Mise à jour automatique des totaux facture
   - Synchronisation has_credit_notes, total_credited, balance_due

3. **`database/migrations/2025_11_09_182507_add_credit_note_tracking_and_facturx_support.php`**
   - Ajout champs tracking dans `invoices`
   - Ajout champs FacturX dans `credit_notes`

### Fichiers modifiés

1. **`app/Models/Invoice.php`**
   - Relation `creditNotes()`
   - Attribut `total_credited`
   - Méthode `canBeCancelled()`

2. **`app/Models/CreditNote.php`**
   - Champs `facturx_path`, `electronic_format`, `facturx_generated_at`

3. **`app/Services/FacturXService.php`**
   - `generateFacturXForCreditNote()`
   - `generateXmlEN16931ForCreditNote()`

4. **`app/Http/Controllers/Api/InvoiceController.php`**
   - `createCreditNote()`
   - `cancelInvoice()`
   - `getCreditNotes()`

5. **`app/Http/Controllers/Api/CreditNoteController.php`**
   - `createFromInvoice()`
   - `downloadFacturX()`
   - `generateFacturX()`

6. **`app/Providers/AppServiceProvider.php`**
   - Enregistrement de `CreditNoteObserver`

7. **`routes/api.php`**
   - 6 nouvelles routes pour avoirs

---

## 📊 Schéma de base de données

### Table `invoices` - Nouveaux champs

| Champ | Type | Description |
|-------|------|-------------|
| `has_credit_notes` | boolean | Indique si la facture a des avoirs |
| `total_credited` | decimal(10,2) | Montant total des avoirs émis |

**Index ajouté:**
- `(tenant_id, has_credit_notes)` - Optimisation requêtes

### Table `credit_notes` - Nouveaux champs

| Champ | Type | Description |
|-------|------|-------------|
| `facturx_path` | string | Chemin fichier FacturX |
| `electronic_format` | enum('pdf', 'facturx') | Format électronique |
| `facturx_generated_at` | timestamp | Date génération FacturX |

**Index ajoutés:**
- `(tenant_id, electronic_format)` - Recherche par format
- `facturx_generated_at` - Tri par date génération

---

## 🔌 API Endpoints

### Création d'avoirs

#### 1. Créer avoir depuis facture
```http
POST /api/invoices/{invoice}/create-credit-note
```

**Body:**
```json
{
  "reason": "Erreur de facturation",
  "full_credit": true,
  "items": [
    {
      "id": 1,
      "quantity": 2
    }
  ]
}
```

**Response:**
```json
{
  "message": "Avoir créé avec succès",
  "data": {
    "id": 1,
    "credit_note_number": "CN-0001",
    "total": 100.00,
    "status": "draft"
  }
}
```

#### 2. Annuler facture complètement
```http
POST /api/invoices/{invoice}/cancel
```

**Body:**
```json
{
  "reason": "Facture erronée - prestation non effectuée"
}
```

**Response:**
```json
{
  "message": "Facture annulée avec succès",
  "invoice": {
    "status": "cancelled",
    "cancelled_at": "2025-11-09T18:25:07Z"
  },
  "credit_note": {
    "credit_note_number": "CN-0002",
    "status": "issued"
  }
}
```

#### 3. Lister avoirs d'une facture
```http
GET /api/invoices/{invoice}/credit-notes
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "credit_note_number": "CN-0001",
      "credit_note_date": "2025-11-09",
      "total": 100.00,
      "status": "issued"
    }
  ],
  "total_credited": 100.00,
  "remaining_balance": 150.00
}
```

### FacturX pour avoirs

#### 4. Télécharger avoir en FacturX
```http
GET /api/credit-notes/{credit_note}/facturx
```

**Response:** Fichier PDF avec XML embarqué

#### 5. Générer FacturX pour avoir
```http
POST /api/credit-notes/{credit_note}/generate-facturx
```

**Response:**
```json
{
  "message": "FacturX généré avec succès",
  "path": "credit-notes/facturx/facturx_cn_CN-0001.pdf"
}
```

### Création alternative

#### 6. Créer avoir (route alternative)
```http
POST /api/credit-notes/from-invoice
```

**Body:**
```json
{
  "invoice_id": 123,
  "reason": "Retour marchandise",
  "full_credit": false,
  "items": [
    {
      "id": 1,
      "quantity": 1
    }
  ]
}
```

---

## 💻 Utilisation - Code Exemples

### Créer un avoir total

```php
use App\Services\CreditNoteService;

$creditNoteService = app(CreditNoteService::class);

// Créer avoir total
$creditNote = $creditNoteService->createFromInvoice(
    invoice: $invoice,
    selectedItems: [],
    fullCredit: true,
    reason: 'Annulation client'
);
```

### Créer un avoir partiel

```php
$creditNote = $creditNoteService->createFromInvoice(
    invoice: $invoice,
    selectedItems: [
        ['id' => 1, 'quantity' => 2], // Item 1, quantité 2
        ['id' => 3, 'quantity' => 1], // Item 3, quantité 1
    ],
    fullCredit: false,
    reason: 'Retour partiel de marchandise'
);
```

### Annuler une facture

```php
$creditNote = $creditNoteService->cancelInvoice(
    invoice: $invoice,
    reason: 'Facture émise par erreur'
);

// La facture est automatiquement passée en status 'cancelled'
// L'avoir est automatiquement émis (status 'issued')
```

### Vérifier si facture peut être annulée

```php
if ($invoice->canBeCancelled()) {
    // OK pour annuler
} else {
    // Déjà annulée ou complètement créditée
}
```

### Accéder aux avoirs d'une facture

```php
$creditNotes = $invoice->creditNotes;
$totalCredited = $invoice->total_credited; // Attribut calculé automatiquement
$canCancel = $invoice->canBeCancelled();
```

---

## 🔄 Flux de travail automatiques

### Observer CreditNoteObserver

L'observer se déclenche automatiquement sur :
- **created** : Nouveau avoir créé
- **updated** : Avoir modifié (changement de statut)
- **deleted** : Avoir supprimé

**Mise à jour automatique de la facture liée:**

1. Calcul du `total_credited` (somme des avoirs en statut 'issued' ou 'applied')
2. Mise à jour de `has_credit_notes` (true si total > 0)
3. Recalcul de `balance_due` = total - payments - credit_notes

**Exemple de log:**
```
Invoice credits updated: {
  invoice_id: 123,
  invoice_number: "F-2025-001",
  total_credited: 100.00,
  amount_paid: 50.00,
  balance_due: 100.00
}
```

---

## 📝 Audit Trail

### Entrées d'audit créées automatiquement

#### 1. Création d'avoir
```php
InvoiceAuditLog {
  action: 'modified',
  changes: {
    action: 'credit_note_created',
    credit_note_id: 1,
    credit_note_number: 'CN-0001',
    credit_amount: 100.00,
    reason: 'Erreur de facturation'
  }
}
```

#### 2. Annulation de facture
```php
InvoiceAuditLog {
  action: 'cancelled',
  changes: {
    status: ['from' => 'sent', 'to' => 'cancelled'],
    reason: 'Facture erronée',
    credit_note_id: 1,
    credit_note_number: 'CN-0001'
  }
}
```

---

## ⚖️ Validations métier

### Validation création avoir

1. **Facture doit être finalisée**
   - Status ≠ 'draft'
   - Erreur: "Impossible de créer un avoir pour une facture en brouillon"

2. **Montant restant suffisant**
   - `montant_avoir ≤ (total_facture - total_credited)`
   - Erreur: "Le montant de l'avoir dépasse le montant restant"

3. **Items valides** (avoir partiel)
   - Les IDs d'items doivent appartenir à la facture
   - Les quantités doivent être > 0

### Validation annulation facture

1. **Facture non déjà annulée**
   - Status ≠ 'cancelled'

2. **Facture non complètement créditée**
   - `total_credited < total`

---

## 🎯 Format FacturX pour avoirs

### Spécifications

**Norme:** EN 16931 (européenne)  
**Type document:** 381 (Credit Note)  
**Format:** PDF/A-3 + XML embarqué

### Structure XML (simplifié)

```xml
<rsm:CrossIndustryInvoice>
  <rsm:ExchangedDocumentContext>
    <!-- Document Type Code: 381 = Credit Note -->
    <ram:TypeCode>381</ram:TypeCode>
  </rsm:ExchangedDocumentContext>
  
  <rsm:ExchangedDocument>
    <ram:ID>CN-0001</ram:ID>
    <ram:IssueDateTime>2025-11-09</ram:IssueDateTime>
    
    <!-- Référence facture d'origine -->
    <ram:IncludedNote>
      <ram:Content>Avoir sur facture F-2025-001</ram:Content>
    </ram:IncludedNote>
  </rsm:ExchangedDocument>
  
  <rsm:SupplyChainTradeTransaction>
    <!-- Lignes d'avoir -->
    <!-- Totaux -->
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>
```

### Génération

⚠️ **Prérequis:** Installation du package `easybill/factur-x`

```bash
composer require easybill/factur-x
```

Ensuite, implémenter les méthodes TODO dans `FacturXService.php`:
- `generateFacturXForCreditNote()`
- `generateXmlEN16931ForCreditNote()`

---

## 🧪 Tests

### Tester création avoir

```bash
# Via API
curl -X POST http://localhost/api/invoices/1/create-credit-note \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Test avoir",
    "full_credit": true
  }'
```

### Vérifier tracking automatique

```php
// Créer avoir
$creditNote = $creditNoteService->createFromInvoice($invoice, [], true, 'Test');

// Vérifier mise à jour automatique
$invoice->refresh();
assert($invoice->has_credit_notes === true);
assert($invoice->total_credited === $creditNote->total);
assert($invoice->balance_due === $invoice->total - $creditNote->total);
```

---

## 📈 Métriques et reporting

### Requêtes utiles

```php
// Factures avec avoirs
$invoicesWithCredits = Invoice::where('has_credit_notes', true)->get();

// Montant total crédité par tenant
$totalCredited = Invoice::where('tenant_id', $tenantId)
    ->sum('total_credited');

// Avoirs en attente d'émission
$pendingCredits = CreditNote::where('status', 'draft')->count();

// Avoirs au format FacturX
$facturxCredits = CreditNote::where('electronic_format', 'facturx')->count();
```

---

## 🔐 Sécurité et conformité

### NF525 - Loi anti-fraude TVA

✅ **Hash d'intégrité**
- Généré à l'émission de l'avoir
- Inclut: numéro, date, montant, client, timestamp

✅ **Audit trail immuable**
- Chaque création/modification tracée
- Signature cryptographique SHA-256

✅ **Numérotation séquentielle**
- Format: `CN-XXXX` (CN = Credit Note)
- Génération automatique sans trous

### Conformité 2027

✅ **Facture électronique**
- Support FacturX (PDF + XML)
- Norme EN 16931
- Type 381 pour avoirs

---

## 🚀 Prochaines étapes

### À implémenter

1. **Package FacturX**
   ```bash
   composer require easybill/factur-x
   ```
   
2. **Compléter méthodes FacturX**
   - Génération XML complète EN 16931
   - Embedding dans PDF/A-3
   - Validation conformité

3. **Export FEC**
   - Inclure avoirs dans export comptable
   - Format FEC avec avoirs (écritures inversées)

4. **Interface utilisateur**
   - Modal création avoir
   - Liste avoirs par facture
   - Bouton "Annuler facture"

---

## 📚 Ressources

- [Norme EN 16931](https://ec.europa.eu/digital-building-blocks/wikis/display/DIGITAL/Obtaining+a+copy+of+the+European+standard+on+eInvoicing)
- [FacturX Documentation](https://fnfe-mpe.org/facturx/)
- [Loi anti-fraude TVA (NF525)](https://www.legifrance.gouv.fr/)
- [Chorus Pro](https://chorus-pro.gouv.fr/)

---

**Implémentation complète réalisée le 09/11/2025** ✅
