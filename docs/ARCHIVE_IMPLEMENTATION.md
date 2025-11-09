# 📦 Archivage Légal - Documentation Complète

## 📋 Vue d'ensemble

Système d'archivage automatique conforme aux obligations légales françaises de conservation de documents fiscaux pendant **10 ans minimum** (LPF Art. L102 B).

### ✅ Fonctionnalités Implémentées

- ✅ Archivage automatique des factures FacturX
- ✅ Archivage automatique des avoirs FacturX
- ✅ Archivage manuel des exports FEC
- ✅ Horodatage qualifié NF525 intégré
- ✅ Vérification d'intégrité SHA256
- ✅ Gestion de la rétention (10 ans)
- ✅ Soft delete uniquement (sécurité légale)
- ✅ Statistiques et monitoring
- ✅ Commande de nettoyage automatique

---

## 🏗️ Architecture

### Base de données

**Table: `archives`**

| Champ | Type | Description |
|-------|------|-------------|
| `tenant_id` | FK | Isolation multi-tenant |
| `archivable_type/id` | Polymorphic | Document source (Invoice, CreditNote, etc.) |
| `document_type` | ENUM | invoice, credit_note, fec_export, etc. |
| `format` | ENUM | facturx, pdf, xml, csv |
| `document_number` | VARCHAR | FA-2025-00001, etc. |
| `storage_path` | VARCHAR | Chemin relatif du fichier |
| `hash_value` | VARCHAR(128) | Hash SHA256 pour intégrité |
| `archived_at` | TIMESTAMP | Date d'archivage |
| `retention_until` | TIMESTAMP | **Date limite (10 ans)** |
| `retention_status` | ENUM | active, expired, locked, deleted |
| `qualified_timestamp_id` | FK | Lien vers horodatage NF525 |

**Structure de stockage:**
```
storage/
  archives/
    tenant_1/
      2025/
        11/
          invoices/
            invoice_fa-2025-00001_20251109_143022.pdf
          credit_notes/
            credit_note_av-2025-00001_20251109_151530.pdf
          fec/
            fec_fec-2025_20251231_235959.csv
```

---

## 🚀 Utilisation

### 1. Configuration

**Fichier: `config/archive.php`**

```php
return [
    'base_path' => env('ARCHIVE_BASE_PATH', 'archives'),
    'storage_disk' => env('ARCHIVE_STORAGE_DISK', 'local'),
    'retention_years' => env('ARCHIVE_RETENTION_YEARS', 10),
    'auto_archive_enabled' => env('ARCHIVE_AUTO_ENABLED', true),
    
    'auto_archive_types' => [
        'invoice' => true,      // Archivage auto des factures
        'credit_note' => true,  // Archivage auto des avoirs
        'quote' => false,
    ],
];
```

**Fichier: `.env`**

```bash
# Archivage Légal
ARCHIVE_BASE_PATH=archives
ARCHIVE_STORAGE_DISK=local
ARCHIVE_RETENTION_YEARS=10
ARCHIVE_AUTO_ENABLED=true

# Backup (optionnel)
ARCHIVE_BACKUP_ENABLED=false
ARCHIVE_BACKUP_DISK=s3
ARCHIVE_S3_BUCKET=my-archives-bucket
ARCHIVE_S3_REGION=eu-west-3
ARCHIVE_S3_STORAGE_CLASS=STANDARD_IA

# Nettoyage (PRUDENCE !)
ARCHIVE_CLEANUP_ENABLED=false
ARCHIVE_CLEANUP_GRACE_PERIOD=90
```

---

### 2. Archivage Automatique (Observers)

**Déclencheurs automatiques:**

#### Facture validée (draft → sent)
```php
// InvoiceObserver déclenche automatiquement:
1. Horodatage qualifié "invoice_validated"
2. Génération FacturX (PDF/A-3 + XML EN 16931)
3. Archivage avec rétention 10 ans
```

#### Facture payée
```php
// InvoiceObserver déclenche:
1. Horodatage qualifié "invoice_paid"
```

#### Avoir créé
```php
// CreditNoteObserver déclenche:
1. Horodatage qualifié "credit_note_created"
2. Génération FacturX pour l'avoir
3. Archivage avec rétention 10 ans
```

#### Paiement reçu
```php
// PaymentObserver déclenche:
1. Horodatage qualifié "payment_received"
```

**Aucune action manuelle requise !** L'archivage se fait automatiquement lors des changements de statut.

---

### 3. Archivage Manuel

#### Archiver une facture
```php
use App\Services\ArchiveService;
use App\Services\FacturXService;

$archiveService = app(ArchiveService::class);
$facturXService = app(FacturXService::class);

// Générer FacturX
$pdfContent = $facturXService->generateFacturX($invoice);

// Archiver
$archive = $archiveService->archiveInvoice($invoice, $pdfContent, 'manual');

echo "Archive créée: ID {$archive->id}";
echo "Rétention jusqu'au: {$archive->retention_until}";
echo "Taille: {$archive->getFormattedFileSize()}";
```

#### Archiver un export FEC
```php
$csvContent = $fecService->generateFEC($year);

$archive = $archiveService->archiveFecExport(
    tenantId: $tenant->id,
    csvContent: $csvContent,
    year: 2025,
    source: 'manual'
);
```

---

### 4. Récupération d'Archives

```php
// Récupérer une archive
$archive = $archiveService->retrieveArchive($archiveId);

// Obtenir le contenu du fichier
$content = $archive->getFileContent();

// Télécharger le fichier
return response()->download(
    Storage::disk($archive->storage_disk)->path($archive->storage_path),
    $archive->original_filename
);

// Vérifier l'intégrité
if ($archive->verifyIntegrity()) {
    echo "✓ Intégrité OK";
} else {
    echo "✗ Fichier corrompu !";
}
```

---

### 5. Vérification d'Intégrité

```php
// Vérifier toutes les archives d'un tenant
$results = $archiveService->verifyTenantArchives($tenantId);

echo "Total: {$results['total']}";
echo "Valides: {$results['valid']}";
echo "Invalides: {$results['invalid']}";
echo "Manquants: {$results['missing']}";

// Afficher les erreurs
foreach ($results['errors'] as $error) {
    echo "Archive #{$error['archive_id']}: {$error['error']}";
}
```

---

### 6. Statistiques

```php
$stats = $archiveService->getArchiveStatistics($tenantId);

// Résultats:
[
    'total_archives' => 1523,
    'active_archives' => 1500,
    'expired_archives' => 20,
    'locked_archives' => 3,
    'total_size_bytes' => 4294967296,
    'total_size_formatted' => '4.00 GB',
    'by_type' => [
        'invoices' => 1200,
        'credit_notes' => 300,
        'fec_exports' => 23,
    ],
    'by_format' => [
        'facturx' => 1500,
        'csv' => 23,
    ],
    'oldest_archive' => '2015-01-01 00:00:00',
    'newest_archive' => '2025-11-09 14:30:22',
    'backed_up_count' => 1523,
]
```

---

### 7. Gestion de la Rétention

#### Vérifier les archives arrivant à expiration

```php
// Archives expirant dans 30 jours
$expiringArchives = $archiveService->getExpiringArchives($tenantId, 30);

foreach ($expiringArchives as $archive) {
    $daysLeft = $archive->daysUntilExpiration();
    echo "Archive {$archive->document_number}: {$daysLeft} jours restants";
}
```

#### Verrouiller une archive (audit, litige)

```php
// Empêcher la suppression (ex: audit en cours)
$archive->lock("Audit fiscal 2025 en cours");

// Déverrouiller
$archive->unlock();
```

---

### 8. Nettoyage des Archives Expirées

**⚠️ IMPORTANT:** Le nettoyage ne supprime JAMAIS réellement les fichiers (soft delete uniquement).

#### Commande Artisan

```bash
# SIMULATION (recommandé)
php artisan archive:cleanup --dry-run

# Nettoyage réel (tous les tenants)
php artisan archive:cleanup --force

# Nettoyage pour un tenant spécifique
php artisan archive:cleanup --tenant=1 --force

# Exemple de sortie:
=================================================
   Nettoyage Archives Expirées
=================================================

Tenants à traiter : 2

Traitement du tenant #1 - ACME Corp
  ⚠ 12 archive(s) expirée(s) trouvée(s)
  ✓ Supprimées: 8
  ⊘ Ignorées (verrouillées/obligatoires): 4

Traitement du tenant #2 - TechStart
  ✓ Aucune archive expirée

=================================================
   Résumé du Nettoyage
=================================================
| Métrique                 | Valeur |
|--------------------------|--------|
| Total archives expirées  | 12     |
| Supprimées              | 8      |
| Ignorées                | 4      |
| Erreurs                 | 0      |
```

#### Via le service

```php
// Simulation
$results = $archiveService->cleanupExpiredArchives($tenantId, dryRun: true);

// Réel
$results = $archiveService->cleanupExpiredArchives($tenantId, dryRun: false);
```

**Règles de nettoyage:**
- ✅ Supprimées: Archives expirées + `is_legal_requirement=false` + `retention_status=active`
- ⊘ Ignorées: Archives verrouillées, obligatoires ou encore en rétention

---

### 9. Sauvegarde Cloud

```php
// Sauvegarder vers S3
$success = $archiveService->backupArchive($archive, 's3');

if ($success) {
    echo "✓ Backup réussi vers S3";
    echo "Emplacement: {$archive->backup_location}";
    echo "Date: {$archive->last_backup_at}";
}
```

**Configuration S3 pour archives:**

```env
ARCHIVE_BACKUP_ENABLED=true
ARCHIVE_BACKUP_DISK=s3
ARCHIVE_S3_BUCKET=my-company-archives
ARCHIVE_S3_REGION=eu-west-3
ARCHIVE_S3_STORAGE_CLASS=STANDARD_IA  # Infrequent Access (coût réduit)

AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
```

**Recommandation:** Utiliser S3 Glacier pour archives > 1 an (coût très réduit).

---

## 🛡️ Sécurité et Conformité

### Intégrité des Données

Chaque archive possède:
1. **Hash SHA256** calculé à l'archivage
2. **Vérification d'intégrité** à chaque accès
3. **Horodatage qualifié NF525** (optionnel mais recommandé)

```php
// Vérifier l'intégrité
if (!$archive->verifyIntegrity()) {
    // ALERTE: Fichier modifié ou corrompu !
    Log::critical('Archive integrity violation', [
        'archive_id' => $archive->id,
        'document_number' => $archive->document_number
    ]);
}
```

### Traçabilité (Audit Trail)

Chaque archive enregistre:
- **Utilisateur** qui a créé l'archive
- **Date et heure** d'archivage
- **Source** (automatic, manual, migration)
- **Accès** (dernière consultation, nombre de consultations)
- **Modifications** (logs automatiques)

```php
// Enregistrer un accès
$archive->recordAccess();

echo "Consulté {$archive->access_count} fois";
echo "Dernier accès: {$archive->last_accessed_at}";
```

### Protection Contre la Suppression

1. **Soft delete uniquement** - Les fichiers ne sont JAMAIS supprimés physiquement
2. **Vérouillage** - Possibilité de bloquer la suppression (audit, litige)
3. **Rétention obligatoire** - `is_legal_requirement=true` empêche toute suppression

---

## 📊 Monitoring et Alertes

### Logs à surveiller

```bash
# Archivages réussis
tail -f storage/logs/laravel.log | grep "Invoice archived"
tail -f storage/logs/laravel.log | grep "Credit note archived"

# Erreurs d'archivage
tail -f storage/logs/laravel.log | grep "Failed to archive"

# Violations d'intégrité
tail -f storage/logs/laravel.log | grep "integrity violation"
```

### Alertes d'Expiration

Configurez des notifications pour les archives approchant de l'expiration:

```php
// Dans un job schedulé
$expiringArchives = $archiveService->getExpiringArchives($tenantId, 90);

if ($expiringArchives->isNotEmpty()) {
    // Envoyer email d'alerte
    Mail::to($tenant->admin_email)->send(new ExpiringArchivesAlert($expiringArchives));
}
```

---

## 🔧 Maintenance

### Tâches Planifiées (Cron)

**Fichier: `app/Console/Kernel.php`**

```php
protected function schedule(Schedule $schedule)
{
    // Vérification d'intégrité mensuelle
    $schedule->call(function () {
        $tenants = Tenant::all();
        foreach ($tenants as $tenant) {
            $archiveService = app(ArchiveService::class);
            $results = $archiveService->verifyTenantArchives($tenant->id);
            
            if ($results['invalid'] > 0 || $results['missing'] > 0) {
                // Alerte admin
            }
        }
    })->monthly();
    
    // Alertes d'expiration (30 jours avant)
    $schedule->call(function () {
        $tenants = Tenant::all();
        foreach ($tenants as $tenant) {
            $archiveService = app(ArchiveService::class);
            $expiring = $archiveService->getExpiringArchives($tenant->id, 30);
            
            if ($expiring->isNotEmpty()) {
                // Envoyer notification
            }
        }
    })->weekly();
    
    // Backup automatique hebdomadaire
    $schedule->call(function () {
        if (!config('archive.backup.enabled')) return;
        
        $archives = Archive::where('is_backed_up', false)->limit(100)->get();
        $archiveService = app(ArchiveService::class);
        
        foreach ($archives as $archive) {
            $archiveService->backupArchive($archive, config('archive.backup.disk'));
        }
    })->weekly();
}
```

### Vérification Manuelle

```bash
# Statistiques globales
php artisan tinker
>>> $service = app(\App\Services\ArchiveService::class);
>>> $stats = $service->getArchiveStatistics(1);
>>> print_r($stats);

# Test d'intégrité
>>> $results = $service->verifyTenantArchives(1);
>>> print_r($results);
```

---

## ⚖️ Obligations Légales

### France - Conservation Documents Fiscaux

| Document | Durée | Base légale |
|----------|-------|-------------|
| **Factures clients** | **10 ans** | LPF Art. L102 B |
| **Avoirs** | **10 ans** | LPF Art. L102 B |
| **Export FEC** | **10 ans** | BOI-CF-IOR-60-40 |
| **Justificatifs paiements** | **10 ans** | Code commerce Art. L123-22 |
| **Livres comptables** | **10 ans** | Code commerce Art. L123-22 |

**Point de départ:** Date de clôture de l'exercice fiscal.

**Exceptions:**
- Litige en cours: Conservation jusqu'à résolution + 2 ans
- Contrôle fiscal: Conservation pendant toute la durée + 3 ans
- TVA intracommunautaire: Conservation 10 ans même si entreprise fermée

---

## 🚨 Cas d'Urgence

### Archive Corrompue

```php
// 1. Identifier l'archive
$archive = Archive::find($id);

// 2. Vérifier le backup
if ($archive->is_backed_up) {
    $backupContent = Storage::disk('s3')->get($archive->backup_location);
    
    // 3. Restaurer depuis backup
    Storage::disk($archive->storage_disk)->put($archive->storage_path, $backupContent);
    
    // 4. Recalculer le hash
    $newHash = hash('sha256', $backupContent);
    $archive->update(['hash_value' => $newHash]);
    
    // 5. Vérifier
    if ($archive->verifyIntegrity()) {
        echo "✓ Archive restaurée avec succès";
    }
}
```

### Perte Totale de Données

Si backup S3 ou externe disponible:

```bash
# 1. Restaurer les fichiers
aws s3 sync s3://my-archives-bucket/tenant_1/ storage/archives/tenant_1/

# 2. Reconstruire la base de données
php artisan tinker
>>> $files = Storage::disk('local')->files('archives/tenant_1', true);
>>> foreach ($files as $file) {
>>>     // Recréer les entrées archives depuis les métadonnées
>>> }
```

---

## 📈 Optimisations

### Performance

1. **Index base de données:**
   - `tenant_id` + `document_type` + `archived_at` (recherches fréquentes)
   - `retention_until` (nettoyage)
   - `hash_value` (vérification intégrité)

2. **Cache:**
   ```php
   // Cacher les statistiques (1 heure)
   $stats = Cache::remember("archive_stats_{$tenantId}", 3600, function() use ($tenantId) {
       return $archiveService->getArchiveStatistics($tenantId);
   });
   ```

3. **Chunking pour gros volumes:**
   ```php
   Archive::where('tenant_id', $tenantId)
       ->chunk(1000, function ($archives) {
           foreach ($archives as $archive) {
               $archive->verifyIntegrity();
           }
       });
   ```

### Stockage

1. **Compression:** Activer la compression ZIP pour réduire l'espace disque
2. **S3 Lifecycle:** Transition automatique vers Glacier après 1 an
3. **Quotas:** Limiter la taille totale par tenant

```env
ARCHIVE_COMPRESSION_ENABLED=true
ARCHIVE_QUOTAS_ENABLED=true
ARCHIVE_MAX_SIZE_GB=100
```

---

## ✅ Checklist de Déploiement

- [ ] Configuration `.env` complétée
- [ ] Migration `archives` exécutée
- [ ] Observers enregistrés (`AppServiceProvider`)
- [ ] Disque de stockage configuré (`config/filesystems.php`)
- [ ] Tâches planifiées configurées (vérification, backup)
- [ ] Monitoring mis en place (logs, alertes)
- [ ] Backup S3 testé (si activé)
- [ ] Documentation utilisateurs créée
- [ ] Formation équipe effectuée
- [ ] Test de restauration effectué

---

## 🆘 Support

**Documentation:**
- Loi française: [LegiFrance - LPF Art. L102 B](https://www.legifrance.gouv.fr/)
- FacturX: [FNFE-MPE](https://fnfe-mpe.org/)
- NF525: [AFNOR Certification](https://www.boutique.afnor.org/)

**Logs:**
```bash
tail -f storage/logs/laravel.log | grep -E "archive|integrity"
```

**Commandes utiles:**
```bash
php artisan archive:cleanup --dry-run
php artisan migrate:status | grep archives
php artisan tinker  # Puis: app(\App\Services\ArchiveService::class)
```

---

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-11-09  
**Conformité:** LPF Art. L102 B, NF525, FacturX EN 16931
