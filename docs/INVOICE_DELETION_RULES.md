# Règles de Suppression des Factures

## 🔒 Conformité Fiscale Française

### Principe fondamental
**Une facture validée NE PEUT JAMAIS être supprimée** pour garantir :
- La numérotation séquentielle sans trou (Article 289 CGI)
- L'inaltérabilité des écritures comptables (NF525)
- La traçabilité complète (LPF Article L47 A)

---

## ✅ Règles implémentées

### Frontend (`InvoiceDetail.tsx`)
```tsx
// Le bouton de suppression n'est affiché QUE pour les brouillons
{invoice.status === 'draft' && (
    <button onClick={() => setShowDeleteConfirm(true)}>
        Supprimer
    </button>
)}
```

**Statuts visibles :**
- ✅ `draft` → Bouton suppression VISIBLE
- ❌ `sent` → Bouton suppression MASQUÉ
- ❌ `paid` → Bouton suppression MASQUÉ
- ❌ `overdue` → Bouton suppression MASQUÉ
- ❌ `cancelled` → Bouton suppression MASQUÉ

---

### Backend (`InvoiceController.php`)

```php
public function destroy(Invoice $invoice)
{
    // SEULES les factures en brouillon peuvent être supprimées
    if ($invoice->status !== 'draft') {
        return response()->json([
            'message' => 'Seules les factures en brouillon peuvent être supprimées',
            'error' => 'INVOICE_NOT_DRAFT'
        ], 422);
    }

    // Vérification supplémentaire du verrou
    if ($invoice->is_locked) {
        return response()->json([
            'message' => 'Cette facture est verrouillée',
            'error' => 'INVOICE_LOCKED'
        ], 422);
    }

    // Suppression autorisée
    $invoice->delete();
}
```

**Validation stricte :**
1. Status DOIT être `draft`
2. Invoice NE DOIT PAS être `locked`

---

## ❌ Que faire avec une facture erronée ?

### Si facture en statut `sent` ou `paid`

**❌ PAS de suppression possible**  
**✅ Solution : Créer un AVOIR**

#### Processus correct :
1. Aller sur la facture erronée
2. Cliquer sur "Créer un avoir"
3. Choisir le type :
   - **Avoir total** : annule complètement la facture
   - **Avoir partiel** : corrige un montant spécifique
4. Indiquer le motif (obligatoire)
5. Valider

**Résultat :**
- La facture originale reste dans la base (numérotation préservée)
- Un avoir est créé avec numéro séquentiel
- Les écritures comptables sont inversées dans le FEC
- La conformité fiscale est respectée

---

## 📊 Tableau récapitulatif

| Statut facture | Suppression autorisée | Action alternative |
|----------------|----------------------|-------------------|
| `draft` | ✅ OUI | - |
| `sent` | ❌ NON | Créer un avoir |
| `paid` | ❌ NON | Créer un avoir |
| `overdue` | ❌ NON | Créer un avoir |
| `cancelled` | ❌ NON | Déjà annulée |

---

## 🔐 Protection en base de données

### Option 1 : Soft Deletes (Recommandé)
Les factures ne sont jamais réellement supprimées, juste marquées `deleted_at`.

**Migration :**
```php
Schema::table('invoices', function (Blueprint $table) {
    $table->softDeletes();
});
```

**Model :**
```php
class Invoice extends Model
{
    use SoftDeletes;
}
```

### Option 2 : Database Trigger (Ultra-strict)
```sql
CREATE TRIGGER prevent_invoice_deletion
BEFORE DELETE ON invoices
FOR EACH ROW
BEGIN
    IF OLD.status != 'draft' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot delete non-draft invoice';
    END IF;
END;
```

---

## 🧪 Tests de conformité

### Test 1 : Suppression brouillon
```bash
# Doit réussir
DELETE /api/invoices/{draft_invoice_id}
# Réponse : 200 OK
```

### Test 2 : Suppression facture envoyée
```bash
# Doit échouer
DELETE /api/invoices/{sent_invoice_id}
# Réponse : 422 Unprocessable Entity
# Body : { "error": "INVOICE_NOT_DRAFT" }
```

### Test 3 : Suppression facture payée
```bash
# Doit échouer
DELETE /api/invoices/{paid_invoice_id}
# Réponse : 422 Unprocessable Entity
```

---

## 📜 Références légales

### Code Général des Impôts (CGI)
- **Article 289** : Numérotation séquentielle obligatoire
- **BOI-TVA-DECLA-30-10-20** : Facturation électronique

### Livre des Procédures Fiscales (LPF)
- **Article L47 A** : Présentation FEC lors d'un contrôle
- **Article A47 A-1** : Format et contenu du FEC

### Norme NF525
- **Inaltérabilité** : Les données validées ne peuvent être modifiées
- **Sécurisation** : Journalisation de toutes les opérations
- **Conservation** : Archivage sur 6 ans minimum

---

## ⚠️ Sanctions en cas de non-conformité

### Suppression de factures validées
- Amende : jusqu'à **15€ par facture** supprimée
- Risque : Rejet de la comptabilité
- Conséquence : Évaluation d'office par l'administration fiscale

### Trous dans la numérotation
- Présomption de fraude
- Obligation de justifier chaque numéro manquant
- Possible redressement fiscal

---

## ✅ Bonnes pratiques

### Pour les développeurs
1. ❌ Ne jamais bypass la validation de statut
2. ✅ Toujours vérifier `status === 'draft'`
3. ✅ Logger toutes les tentatives de suppression
4. ✅ Implémenter soft deletes pour audit trail

### Pour les utilisateurs
1. ❌ Ne jamais demander la suppression d'une facture validée
2. ✅ Utiliser les avoirs pour corriger les erreurs
3. ✅ Vérifier les brouillons avant validation
4. ✅ Former les utilisateurs sur le processus d'avoir

### Pour les administrateurs
1. ✅ Auditer régulièrement les suppressions
2. ✅ Vérifier l'intégrité de la numérotation
3. ✅ Exporter le FEC régulièrement (backup)
4. ✅ Documenter toute procédure exceptionnelle

---

## 🔍 Audit et Monitoring

### Logs à surveiller
```php
Log::warning('Tentative de suppression de facture validée', [
    'invoice_id' => $invoice->id,
    'invoice_number' => $invoice->invoice_number,
    'status' => $invoice->status,
    'user_id' => auth()->id(),
    'ip' => request()->ip()
]);
```

### Métriques à suivre
- Nombre de tentatives de suppression refusées
- Ratio avoirs / factures
- Taux de factures en brouillon supprimées

---

## 📞 Support

En cas de besoin de suppression d'une facture validée :
1. **Contacter l'administrateur système**
2. **Justifier la demande par écrit**
3. **Créer un avoir à la place** (solution recommandée)
4. En dernier recours : **Intervention manuelle en base** avec log complet

**Note :** Toute suppression manuelle doit être justifiée et documentée pour le contrôle fiscal.

---

**Date de mise à jour :** Novembre 2024  
**Version :** 1.0  
**Status :** ✅ Appliqué en production
