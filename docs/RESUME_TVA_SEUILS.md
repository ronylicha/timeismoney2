# 📊 Système de Gestion des Seuils de TVA

## ✅ Fonctionnalités implémentées

### 1. **Encart des seuils de TVA - TOUJOURS AFFICHÉ**

L'encart de gestion des seuils de TVA est maintenant **toujours visible** dans les paramètres de facturation, peu importe le statut TVA :

#### 🟦 Mode "Franchise de base" (`vat_subject = false`)
- Encart avec fond **bleu**
- Titre : "Gestion automatique des seuils de TVA"
- Tous les champs sont **éditables**
- Checkbox "Basculer automatiquement en TVA" visible
- Barre de progression montrant le % du seuil atteint
- Alerte si proche du seuil (≥ 90%)

#### 🟧 Mode "Assujetti TVA" (`vat_subject = true`)
- Encart avec fond **orange**
- Titre : "Suivi des seuils de TVA (assujetti)"
- Message d'information : "✓ Vous êtes actuellement assujetti à la TVA"
- Date de dépassement du seuil affichée
- Champs **désactivés** (lecture seule)
- CA annuel affiché en orange
- Message réglementaire adapté

---

### 2. **Bascule automatique en TVA**

Quand `auto_apply_vat_on_threshold = true` :

1. À chaque création de facture, le système vérifie le CA annuel
2. Si le CA dépasse le seuil applicable :
   - `vat_subject` passe automatiquement à `true`
   - `vat_threshold_exceeded_at` est enregistré avec la date
   - `vat_exemption_reason` est vidé
   - **La checkbox "Assujetti à la TVA" est cochée automatiquement**

#### Fichiers modifiés :
- `app/Http/Controllers/Api/InvoiceController.php` (lignes 96-100)
- `app/Http/Controllers/Api/InvoiceTypeController.php` (lignes 120, 256)
- `app/Models/Tenant.php` (méthode `checkVatThreshold()`)

---

### 3. **Réinitialisation annuelle du CA**

#### Commande Artisan
```bash
php artisan vat:reset-annual
```

Cette commande :
- Réinitialise `vat_threshold_year_total` à 0€ pour tous les tenants
- Efface `vat_threshold_exceeded_at`
- **NE MODIFIE PAS** `vat_subject` (les assujettis restent assujettis)

#### Tâche planifiée
Exécution automatique **chaque 1er janvier à 00h01** via le scheduler Laravel.

Fichier : `routes/console.php`
```php
Schedule::command('vat:reset-annual')
    ->yearlyOn(1, 1, '00:01')
    ->name('reset-annual-vat-revenue');
```

#### Pour activer le scheduler :
Ajouter dans le crontab :
```bash
* * * * * cd /var/www/html/timeismoney2 && php artisan schedule:run >> /dev/null 2>&1
```

---

### 4. **Seuils configurables par tenant**

Chaque tenant peut configurer :
- **Type d'activité** : services / marchandises / mixte
- **Seuil services** (défaut : 36 800€)
- **Seuil marchandises** (défaut : 91 900€)
- **Bascule automatique** (activée par défaut)

Le seuil applicable est déterminé selon :
- `services` → utilise `vat_threshold_services`
- `goods` → utilise `vat_threshold_goods`
- `mixed` → utilise le plus restrictif des deux

---

### 5. **Calcul automatique du CA annuel**

Le CA annuel HT est calculé à partir des factures :
- Statut : `paid` ou `sent`
- Date : année en cours uniquement
- Montant : `total_ht` (HT)

Méthode : `Tenant::calculateYearlyRevenue()`

---

## 🗂️ Fichiers créés/modifiés

### Backend
- ✅ `app/Console/Commands/ResetAnnualVatRevenue.php` - Commande de réinitialisation annuelle
- ✅ `app/Models/Tenant.php` - Méthodes : `calculateYearlyRevenue()`, `checkVatThreshold()`, `getDefaultTaxRate()`
- ✅ `app/Http/Controllers/Api/TenantSettingsController.php` - API billing settings
- ✅ `app/Http/Controllers/Api/InvoiceController.php` - Vérification seuil à la création
- ✅ `app/Http/Controllers/Api/InvoiceTypeController.php` - Idem pour acomptes/soldes
- ✅ `routes/console.php` - Tâche planifiée annuelle
- ✅ `routes/api.php` - Endpoint `/vat/status`

### Migrations
- ✅ `2025_11_09_165646_add_vat_threshold_to_tenants_table.php`
- ✅ `2025_11_09_170003_add_business_type_to_tenants_table.php`
- ✅ `2025_11_09_171307_update_existing_tenants_vat_defaults.php`

### Frontend
- ✅ `resources/js/pages/TenantBillingSettings.tsx` - Interface complète

---

## 🎯 Cas d'usage

### Scénario 1 : Micro-entrepreneur débutant
1. Coche "Assujetti à la TVA" = **NON**
2. Saisit sa raison d'exonération (ex: Article 293 B du CGI)
3. L'encart bleu s'affiche avec CA = 0€
4. Crée des factures à 0% de TVA
5. Le CA progresse : 10 000€ → 20 000€ → 33 000€ (90% du seuil ⚠️)
6. Crée une facture qui fait passer à 37 000€
7. **Automatiquement** : `vat_subject` = true, encart devient orange
8. Les prochaines factures sont à 20% de TVA

### Scénario 2 : Société assujettie dès le début
1. Coche "Assujetti à la TVA" = **OUI**
2. L'encart orange s'affiche (lecture seule)
3. Peut quand même voir son CA annuel progresser
4. Toutes les factures sont à 20% de TVA

### Scénario 3 : Changement d'année
- **1er janvier 00h01** : réinitialisation automatique du CA
- Le statut TVA reste inchangé
- L'utilisateur peut manuellement décocher "Assujetti" s'il veut revenir en franchise

---

## 🧪 Commandes de test

### Initialiser les seuils
```bash
php artisan vat:init-thresholds
```

### Réinitialiser le CA annuel
```bash
php artisan vat:reset-annual
```

### Vérifier le statut d'un tenant
```bash
php artisan tinker
>>> $t = Tenant::first()
>>> $t->checkVatThreshold()
>>> $t->vat_subject
>>> $t->vat_threshold_year_total
```

### Supprimer toutes les factures (DEV uniquement)
```bash
php artisan tinker
DB::table('invoice_advances')->delete();
DB::table('payments')->delete();
DB::table('invoice_items')->delete();
DB::table('invoices')->delete();
Tenant::query()->update(['last_invoice_number' => 0, 'vat_threshold_year_total' => 0]);
```

---

## 📋 Conformité légale

### Seuils 2024 (France)
- Prestations de services : **36 800€**
- Ventes de marchandises : **91 900€**

### Règles appliquées
1. Le CA est calculé **HT** (hors taxes)
2. Seules les factures **payées ou envoyées** sont comptées
3. Le calcul se fait sur **l'année civile** (1er janvier → 31 décembre)
4. Le dépassement du seuil **oblige** à la TVA dès le 1er euro de dépassement
5. La réinitialisation annuelle permet de revenir en franchise si le CA redescend

---

## 🚀 Prochaines évolutions possibles

1. **Dashboard widget** : Afficher le % du seuil atteint sur le dashboard
2. **Notifications** : Alerte email à 80%, 90%, 100% du seuil
3. **Rapport PDF** : Historique des passages en TVA
4. **Multi-seuils** : Gérer les seuils de tolérance (seuil majoré 1ère année)
5. **Export FEC** : Inclure les informations de franchise dans le FEC

---

✅ **Système opérationnel et prêt pour la production !**
